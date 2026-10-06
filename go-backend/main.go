package main

import (
	"errors"
	"flag"
	"fmt"
	"log"
	"net/http"
	"net/mail"
	"os"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	"github.com/arkanFzi/website-porto2/go-backend/mailer"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var (
	jwtSecret []byte
	adminUser string
	adminPass string
)

// Bentuk uuid yang dihasilkan gen_random_uuid(); id cacat ditolak sebelum dikirim ke DB.
var uuidRe = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

// maxBodyBytes dibatasi sebelum handler sempat membaca: tanpa batas ini, satu POST publik
// 20 MB sudah habis terserap ke memori (BE cuma 512Mi) sebelum cek panjang di handler jalan.
const maxBodyBytes = 1 << 20

func batasiBody() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.ContentLength > maxBodyBytes {
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": "Body terlalu besar"})
			c.Abort()
			return
		}
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBodyBytes)
		c.Next()
	}
}

// Satu POST /api/contact yang sah memicu satu pengiriman SMTP sungguhan (di belakang, via go func)
// dan satu baris contact_messages. Kuota SMTP dan inbox admin adalah milik bersama, jadi remnya
// juga global — bukan per-IP. Alasannya terukur, bukan dugaan: pada 2026-10-06, 12 POST ke rute
// yang sama tercatat di log BE dari 11 remoteIp, dan IP terbanyak (136.124.34.25, 7 POST) adalah
// pool egress Cloud Run milik frontend — artinya semua pengunjung yang masuk lewat rewrite Next
// berbagi satu alamat yang sama. Kunci per-IP akan membatasi seluruh pengunjung sekaligus, dan
// X-Forwarded-For boleh diisi sendiri oleh pengirimnya.
//
// Bucket ini hidup di satu proses; Cloud Run dapat menjalankan lebih dari satu replika, jadi
// angkanya rem, bukan jaminan lintas-replika.
const (
	kontakBurst      = 10
	kontakRefillEach = time.Minute
)

type pembatasLaju struct {
	mu     sync.Mutex
	token  float64
	tikum  time.Time
	burst  float64
	refill time.Duration
}

// boleh memakai waktu yang diberikan, bukan waktu sistem, supaya pengisian ulang bisa diuji
// tanpa tidur sungguhan.
func (p *pembatasLaju) boleh(kini time.Time) bool {
	p.mu.Lock()
	defer p.mu.Unlock()
	if p.tikum.IsZero() {
		p.tikum = kini
	}
	terlempar := kini.Sub(p.tikum).Seconds() / p.refill.Seconds()
	if terlempar < 0 {
		// Jam kontainer bisa mundur koreksi NTP; tanpa guard ini satu lompatan mundur
		// menghapus token dan mengunci rute sampai jamnya menyusul.
		terlempar = 0
	}
	p.token += terlempar
	p.tikum = kini
	if p.token > p.burst {
		p.token = p.burst
	}
	if p.token < 1 {
		return false
	}
	p.token--
	return true
}

var pembatasKontak = &pembatasLaju{token: kontakBurst, burst: kontakBurst, refill: kontakRefillEach}

type isianTeks struct {
	Label string
	Value string
	Max   int
}

// cekIsian menutup dua lubang yang ditinggalkan tag `not null`: kolom TEXT menerima string
// kosong, dan tanpa batas panjang satu baris 100 KB kembali utuh di setiap GET publik.
func cekIsian(isian ...isianTeks) (string, bool) {
	for _, it := range isian {
		if strings.TrimSpace(it.Value) == "" {
			return it.Label + " wajib diisi", false
		}
		if utf8.RuneCountInString(it.Value) > it.Max {
			return it.Label + " terlalu panjang (maks " + strconv.Itoa(it.Max) + " karakter)", false
		}
	}
	return "", true
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func requireEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("%s must be set", key)
	}
	return v
}

// parseToken satu-satunya jalan menilai Bearer token: HS256 dengan secret kita, tidak kedaluwarsa.
func parseToken(authHeader string) error {
	if !strings.HasPrefix(authHeader, "Bearer ") {
		return errors.New("tidak ada Bearer token")
	}
	_, err := jwt.Parse(authHeader[7:], func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return jwtSecret, nil
	})
	return err
}

// AuthMiddleware validates JWT tokens for protected routes
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if !strings.HasPrefix(authHeader, "Bearer ") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			c.Abort()
			return
		}
		if err := parseToken(authHeader); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}
		c.Next()
	}
}

// -- Models --

type Certificate struct {
	ID        string    `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Title     string    `gorm:"not null" json:"title"`
	Issuer    string    `gorm:"not null" json:"issuer"`
	Date      string    `gorm:"not null" json:"date"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type Experience struct {
	ID        string    `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Role      string    `gorm:"not null" json:"role"`
	Company   string    `gorm:"not null" json:"company"`
	Period    string    `gorm:"not null" json:"period"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type ContactMessage struct {
	ID        string    `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name      string    `gorm:"size:200;not null" json:"name"`
	Email     string    `gorm:"size:320;not null" json:"email"`
	Subject   string    `gorm:"size:500" json:"subject"`
	Body      string    `gorm:"not null" json:"body"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

var DB *gorm.DB

// managedTables adalah tabel yang harus sudah ada sebelum satu request pun dilayani.
var managedTables = []string{"certificates", "experiences", "contact_messages"}

func migrateSchema() {
	if err := DB.AutoMigrate(&Certificate{}, &Experience{}, &ContactMessage{}); err != nil {
		log.Fatalf("migrate: gagal menyiapkan skema: %v", err)
	}
	log.Println("migrate: skema siap")
}

// verifySchema dipakai jalur serve. AutoMigrate sengaja tidak lagi berjalan di sini: skema
// berubah karena perintah, bukan karena sebuah proses dingin kebetulan naik. Kalau tabel belum
// ada, boot menolak keras — kegagalan terdengar di deploy, bukan di request pengunjung.
func verifySchema() {
	var got int64
	err := DB.Raw(`select count(distinct table_name) from information_schema.tables
		where table_schema = current_schema() and table_name in (?)`, managedTables).Scan(&got).Error
	if err != nil {
		log.Fatalf("db: gagal memeriksa skema: %v", err)
	}
	if got != int64(len(managedTables)) {
		log.Fatalf("db: %d/%d tabel belum ada (%v); jalankan `%s -migrate` dulu",
			got, len(managedTables), managedTables, os.Args[0])
	}
	log.Println("Database connection established; skema terverifikasi.")
}

func initDB() {
	// Try loading .env file if exists
	_ = godotenv.Load()

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "host=localhost user=root password=rootpassword dbname=portfolio_db port=5433 sslmode=disable TimeZone=Asia/Jakarta"
	}

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
}

func main() {
	migrate := flag.Bool("migrate", false, "siapkan skema lalu keluar; tidak dipakai saat melayani request")
	flag.Parse()

	initDB()

	// -migrate berjalan sebelum ada tabel, jadi ia tidak boleh melewati verifySchema.
	if *migrate {
		migrateSchema()
		return
	}

	verifySchema()

	jwtSecret = []byte(requireEnv("JWT_SECRET"))
	adminUser = getEnv("ADMIN_USER", "admin")
	adminPass = requireEnv("ADMIN_PASS")

	r := gin.Default()

	corsOrigins := []string{"http://localhost:3000", "https://arkfazone-portofolio.elarisnoir.my.id"}
	if env := os.Getenv("CORS_ORIGINS"); env != "" {
		corsOrigins = strings.Split(env, ",")
	}

	// CORS Setup - Allow the Next.js frontend to access
	r.Use(cors.New(cors.Config{
		AllowOrigins:     corsOrigins, // Next.js port
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	r.Use(batasiBody())

	// Middleware per-group tidak berjalan untuk path yang tidak terdaftar, jadi guard ini yang
	// membuat seluruh subtree admin tertutup. 401 untuk yang tidak berhak — tapi token yang
	// memang valid harus bertemu 404: /api/admin/projects tidak ada, dan menjawabnya dengan 401
	// membuat authFetch frontend membuang sesi admin yang masih berlaku.
	r.NoRoute(func(c *gin.Context) {
		if strings.HasPrefix(c.Request.URL.Path, "/api/admin/") {
			if err := parseToken(c.GetHeader("Authorization")); err != nil {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
				return
			}
			c.JSON(http.StatusNotFound, gin.H{"error": "Not found"})
			return
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "Not found"})
	})

	// --- Public API Routes ---
	api := r.Group("/api")

	// Login Route. Dua path untuk satu handler: /api/login dipakai halaman admin lama
	// (admin/page.tsx), /api/auth/login dipakai halaman login yang aktif (admin/login/page.tsx).
	api.POST("/login", handleLogin)
	api.POST("/auth/login", handleLogin)

	// Public GET routes
	api.GET("/certificates", func(c *gin.Context) {
		var certs []Certificate
		if err := DB.Order("created_at desc").Find(&certs).Error; err != nil {
			log.Printf("GET /api/certificates: gagal membaca: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membaca sertifikat"})
			return
		}
		c.JSON(http.StatusOK, certs)
	})

	api.GET("/experience", func(c *gin.Context) {
		var exps []Experience
		if err := DB.Order("created_at desc").Find(&exps).Error; err != nil {
			log.Printf("GET /api/experience: gagal membaca: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membaca pengalaman"})
			return
		}
		c.JSON(http.StatusOK, exps)
	})

	api.GET("/health", func(c *gin.Context) {
		sqlDB, err := DB.DB()
		if err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "unavailable", "db": "error"})
			return
		}
		if err := sqlDB.Ping(); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "unavailable", "db": "error"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ok", "db": "ok"})
	})

	// --- Protected API Routes ---
	protected := api.Group("/")
	protected.Use(AuthMiddleware())

	// Hanya tiga kolom yang boleh datang dari klien: id, createdAt, updatedAt dihasilkan DB.
	// Dibinding ke struct model sebelumnya membuat POST mengabulkan id dan timestamp kiriman
	// klien, termasuk urutan created_at desc yang dipakai situs publik dan render PDF.
	protected.POST("/certificates", func(c *gin.Context) {
		var in struct {
			Title  string `json:"title"`
			Issuer string `json:"issuer"`
			Date   string `json:"date"`
		}
		if err := c.ShouldBindJSON(&in); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Format data salah"})
			return
		}
		cert := Certificate{
			Title:  strings.TrimSpace(in.Title),
			Issuer: strings.TrimSpace(in.Issuer),
			Date:   strings.TrimSpace(in.Date),
		}
		if pesan, ok := cekIsian(
			isianTeks{Label: "Judul", Value: cert.Title, Max: 200},
			isianTeks{Label: "Penerbit", Value: cert.Issuer, Max: 200},
			isianTeks{Label: "Tanggal", Value: cert.Date, Max: 100},
		); !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": pesan})
			return
		}
		if err := DB.Create(&cert).Error; err != nil {
			log.Printf("POST /api/certificates: gagal menyimpan: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan sertifikat"})
			return
		}
		c.JSON(http.StatusCreated, cert)
	})

	protected.DELETE("/certificates/:id", func(c *gin.Context) {
		id := c.Param("id")
		if !uuidRe.MatchString(id) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Format id tidak valid"})
			return
		}
		res := DB.Delete(&Certificate{}, "id = ?", id)
		if res.Error != nil {
			log.Printf("DELETE /api/certificates/%s: gagal menghapus: %v", id, res.Error)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus sertifikat"})
			return
		}
		if res.RowsAffected == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "Sertifikat tidak ditemukan"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"deleted": res.RowsAffected})
	})

	protected.POST("/experience", func(c *gin.Context) {
		var in struct {
			Role    string `json:"role"`
			Company string `json:"company"`
			Period  string `json:"period"`
		}
		if err := c.ShouldBindJSON(&in); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Format data salah"})
			return
		}
		exp := Experience{
			Role:    strings.TrimSpace(in.Role),
			Company: strings.TrimSpace(in.Company),
			Period:  strings.TrimSpace(in.Period),
		}
		if pesan, ok := cekIsian(
			isianTeks{Label: "Posisi", Value: exp.Role, Max: 200},
			isianTeks{Label: "Perusahaan", Value: exp.Company, Max: 200},
			isianTeks{Label: "Periode", Value: exp.Period, Max: 100},
		); !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": pesan})
			return
		}
		if err := DB.Create(&exp).Error; err != nil {
			log.Printf("POST /api/experience: gagal menyimpan: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan pengalaman"})
			return
		}
		c.JSON(http.StatusCreated, exp)
	})

	protected.DELETE("/experience/:id", func(c *gin.Context) {
		id := c.Param("id")
		if !uuidRe.MatchString(id) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Format id tidak valid"})
			return
		}
		res := DB.Delete(&Experience{}, "id = ?", id)
		if res.Error != nil {
			log.Printf("DELETE /api/experience/%s: gagal menghapus: %v", id, res.Error)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus pengalaman"})
			return
		}
		if res.RowsAffected == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "Pengalaman tidak ditemukan"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"deleted": res.RowsAffected})
	})

	// --- Rute admin: inbox pesan kontak ---
	admin := api.Group("/admin")
	admin.Use(AuthMiddleware())

	// inboxLimit membatasi baris yang dikirim, bukan jumlah pesan yang ada. Tanpa header total,
	// admin yang melihat 500 baris tidak bisa membedakan "inboxnya memang 500" dari
	// "sisanya terpotong diam-diam".
	const inboxLimit = 500

	admin.GET("/contact", func(c *gin.Context) {
		var total int64
		if err := DB.Model(&ContactMessage{}).Count(&total).Error; err != nil {
			log.Printf("admin: gagal menghitung pesan: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membaca pesan"})
			return
		}
		var msgs []ContactMessage
		if err := DB.Order("created_at desc").Limit(inboxLimit).Find(&msgs).Error; err != nil {
			log.Printf("admin: gagal membaca pesan: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membaca pesan"})
			return
		}
		c.Header("X-Total-Count", strconv.FormatInt(total, 10))
		c.Header("X-Returned-Count", strconv.Itoa(len(msgs)))
		c.Header("X-Inbox-Truncated", strconv.FormatBool(int64(len(msgs)) < total))
		c.JSON(http.StatusOK, msgs)
	})

	admin.DELETE("/contact/:id", func(c *gin.Context) {
		id := c.Param("id")
		if !uuidRe.MatchString(id) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Format id tidak valid"})
			return
		}
		res := DB.Delete(&ContactMessage{}, "id = ?", id)
		if res.Error != nil {
			log.Printf("admin: gagal menghapus %s: %v", id, res.Error)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus pesan"})
			return
		}
		if res.RowsAffected == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "Pesan tidak ditemukan"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"deleted": res.RowsAffected})
	})

	//api contact
	api.POST("/contact", func(c *gin.Context) {
		var msg struct {
			Name    string `json:"name"`
			Email   string `json:"email"`
			Subject string `json:"subject"`
			Body    string `json:"body"`
		}

		if err := c.ShouldBindJSON(&msg); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Format data salah"})
			return
		}

		row := ContactMessage{
			Name:    strings.TrimSpace(msg.Name),
			Email:   strings.ToLower(strings.TrimSpace(msg.Email)),
			Subject: strings.TrimSpace(msg.Subject),
			Body:    strings.TrimSpace(msg.Body),
		}

		if row.Name == "" || row.Email == "" || row.Body == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Nama, email, dan pesan wajib diisi"})
			return
		}
		if _, err := mail.ParseAddress(row.Email); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Format email tidak valid"})
			return
		}
		if utf8.RuneCountInString(row.Name) > 200 ||
			utf8.RuneCountInString(row.Email) > 320 ||
			utf8.RuneCountInString(row.Subject) > 500 ||
			utf8.RuneCountInString(row.Body) > 20000 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Isian terlalu panjang"})
			return
		}

		// Dicek setelah validasi isian: muatan cacat sudah pulang dengan 400 tanpa menghabiskan
		// token, jadi yang dihitung hanya pesan yang benar-benar akan disimpan dan dikirim.
		if !pembatasKontak.boleh(time.Now()) {
			log.Printf("contact: laju ditolak (client %s)", c.ClientIP())
			c.Header("Retry-After", strconv.Itoa(int(kontakRefillEach.Seconds())))
			c.JSON(http.StatusTooManyRequests, gin.H{"error": "Terlalu banyak pesan dalam waktu singkat, coba lagi beberapa menit"})
			return
		}

		if err := DB.Create(&row).Error; err != nil {
			log.Printf("contact: gagal menyimpan pesan: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Pesan gagal tersimpan, coba lagi"})
			return
		}

		adminEmail := getEnv("ADMIN_EMAIL", "muhammadarkanfauzi9@gmail.com")
		fullBody := fmt.Sprintf("Pesan dari: %s (%s)\n\nIsi Pesan:\n%s", row.Name, row.Email, row.Body)

		go func() {
			err := mailer.SendEmail(adminEmail, row.Email, "Contact Form: "+row.Subject, fullBody)
			switch {
			case err == nil:
				log.Printf("contact %s: email terkirim ke %s", row.ID, adminEmail)
			case errors.Is(err, mailer.ErrNotConfigured):
				log.Printf("contact %s: email dilewati, %v", row.ID, err)
			default:
				log.Printf("contact %s: gagal kirim email: %v", row.ID, err)
			}
		}()

		c.JSON(http.StatusCreated, gin.H{
			"id":      row.ID,
			"message": "Pesan kamu tersimpan, terima kasih!",
		})
	})

	log.Println("Server running on port 8080")
	// gin mengembalikan error bind, dan membuangnya berarti "address already in use"
	// keluar dengan rc=0 — container yang tidak pernah mendengarkan terlihat sehat.
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("server: gagal listen di :8080: %v", err)
	}

}

func handleLogin(c *gin.Context) {
	var creds struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&creds); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload"})
		return
	}

	if creds.Username == adminUser && creds.Password == adminPass {
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
			"username": creds.Username,
			"exp":      time.Now().Add(time.Hour * 24).Unix(), // 1 day expiration
		})
		tokenString, err := token.SignedString(jwtSecret)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not generate token"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"token": tokenString})
	} else {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or password"})
	}
}
