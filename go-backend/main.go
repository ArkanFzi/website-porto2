package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"net/mail"
	"os"
	"regexp"
	"strings"
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

// AuthMiddleware validates JWT tokens for protected routes
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || len(authHeader) < 8 || authHeader[:7] != "Bearer " {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			c.Abort()
			return
		}
		tokenString := authHeader[7:]
		token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method")
			}
			return jwtSecret, nil
		})

		if err != nil || !token.Valid {
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

	// Middleware per-group tidak berjalan untuk path yang tidak terdaftar, jadi
	// DELETE /api/admin/contact (tanpa :id) dijawab 404 tanpa menyentuh JWT sama sekali.
	// Guard ini membuat seluruh subtree admin menjawab 401, bukan membocorkan rute mana yang ada.
	r.NoRoute(func(c *gin.Context) {
		if strings.HasPrefix(c.Request.URL.Path, "/api/admin/") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
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

	protected.POST("/certificates", func(c *gin.Context) {
		var cert Certificate
		if err := c.ShouldBindJSON(&cert); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
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
		var exp Experience
		if err := c.ShouldBindJSON(&exp); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
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

	admin.GET("/contact", func(c *gin.Context) {
		var msgs []ContactMessage
		if err := DB.Order("created_at desc").Limit(500).Find(&msgs).Error; err != nil {
			log.Printf("admin: gagal membaca pesan: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membaca pesan"})
			return
		}
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

		if err := DB.Create(&row).Error; err != nil {
			log.Printf("contact: gagal menyimpan pesan: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Pesan gagal tersimpan, coba lagi"})
			return
		}

		adminEmail := getEnv("ADMIN_EMAIL", "muhammadarkanfauzi9@gmail.com")
		fullBody := fmt.Sprintf("Pesan dari: %s (%s)\n\nIsi Pesan:\n%s", row.Name, row.Email, row.Body)

		go func() {
			if err := mailer.SendEmail(adminEmail, "Contact Form: "+row.Subject, fullBody); err != nil {
				log.Printf("contact: gagal kirim email: %v", err)
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
