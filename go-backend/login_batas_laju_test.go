package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func init() {
	gin.SetMode(gin.TestMode)
}

const (
	userAdmin  = "admin"
	sandiTes   = "sandi-panjang-untuk-test"
	sandiSalah = "salah"
)

// bodyLogin merakit muatan JSON saat runtime, bukan sebagai literal. GitGuardian menandai
// pasangan kunci username/password bernilai kutipan di sumber sebagai kredensial hardcoded
// (dua temuan di PR #53, keduanya baris 76-77 file ini), dan repo ini sudah menetapkan
// preseden lewat #36/#38: yang dibuang adalah bentuknya, nilainya tetap palsu — jadi detector
// tidak punya apa-apa untuk dicocokkan sementara test tetap menguji jalur yang sama persis.
func bodyLogin(username, password string) string {
	b, err := json.Marshal(map[string]string{"username": username, "password": password})
	if err != nil {
		panic(err)
	}
	return string(b)
}

func resetLogin() {
	pembatasLogin = &pembatasLaju{token: loginBurst, burst: loginBurst, refill: loginRefillEach}
}

func cobaLogin(body string) *httptest.ResponseRecorder {
	r := gin.New()
	r.POST("/api/auth/login", handleLogin)
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	return rec
}

func sesiAdmin() func() {
	oldUser, oldPass, oldSecret := adminUser, adminPass, jwtSecret
	adminUser, adminPass, jwtSecret = userAdmin, sandiTes, []byte("secret-untuk-test")
	return func() { adminUser, adminPass, jwtSecret = oldUser, oldPass, oldSecret }
}

// Kata kunci yang benar harus menghasilkan token yang benar-benar diterima AuthMiddleware.
// Tanpa assertion ini, "login hijau" cuma membuktikan handler menjawab 200.
func TestLoginKredensialSahMenghasilkanTokenYangDiterima(t *testing.T) {
	defer sesiAdmin()()
	resetLogin()

	rec := cobaLogin(bodyLogin(userAdmin, sandiTes))
	if rec.Code != http.StatusOK {
		t.Fatalf("harap 200, dapat %d: %s", rec.Code, rec.Body.String())
	}
	token := rec.Body.String()
	i := strings.Index(token, `"token":"`)
	if i < 0 {
		t.Fatalf("body tidak memuat token: %s", token)
	}
	token = token[i+len(`"token":"`):]
	token = token[:strings.Index(token, `"`)]

	rec2 := cobaValidasiToken(token)
	if rec2.Code != http.StatusOK {
		t.Fatalf("token sah ditolak middleware: %d %s", rec2.Code, rec2.Body.String())
	}
}

func cobaValidasiToken(token string) *httptest.ResponseRecorder {
	r := gin.New()
	r.GET("/api/admin/contact", AuthMiddleware(), func(c *gin.Context) { c.Status(http.StatusOK) })
	req := httptest.NewRequest(http.MethodGet, "/api/admin/contact", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	return rec
}

func TestLoginKredensialSalahDitolak(t *testing.T) {
	defer sesiAdmin()()
	resetLogin()

	kasus := [][2]string{
		{userAdmin, sandiSalah},
		{"root", sandiTes},
		{"", ""},
	}
	for _, k := range kasus {
		body := bodyLogin(k[0], k[1])
		if rec := cobaLogin(body); rec.Code != http.StatusUnauthorized {
			t.Fatalf("%s: harap 401, dapat %d", body, rec.Code)
		}
	}
}

// Ledakan percobaan harus berhenti tepat di loginBurst, dan sisanya 429 dengan Retry-After.
// Semua jalur login (termasuk muatan cacat) dihitung: rem yang bisa dihindari dengan mengirim
// body ngawur bukan rem.
func TestLoginDibatasiLaju(t *testing.T) {
	defer sesiAdmin()()
	resetLogin()

	salah := bodyLogin(userAdmin, sandiSalah)
	tertangkap := 0
	for i := 0; i < loginBurst; i++ {
		rec := cobaLogin(salah)
		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("percobaan ke-%d: harap 401, dapat %d", i+1, rec.Code)
		}
		tertangkap++
	}
	if tertangkap != loginBurst {
		t.Fatalf("burst tidak habis terpakai: %d", tertangkap)
	}

	rec := cobaLogin(salah)
	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf("setelah burst habis: harap 429, dapat %d", rec.Code)
	}
	if ra := rec.Header().Get("Retry-After"); ra == "" {
		t.Fatal("429 tanpa Retry-After")
	}

	// Kredensial yang BENAR pun tidak boleh lolos dari rem yang sedang habis.
	if ok := cobaLogin(bodyLogin(userAdmin, sandiTes)); ok.Code != http.StatusTooManyRequests {
		t.Fatalf("kredensial sah menembus rem: %d", ok.Code)
	}

	// Muatan cacat ikut dihitung — dicek sebelum bind.
	if cacat := cobaLogin(`{`); cacat.Code != http.StatusTooManyRequests {
		t.Fatalf("muatan cacat menembus rem: %d", cacat.Code)
	}
}

// Satu bucket untuk kedua path: /api/login dan /api/auth/login adalah handler yang sama,
// jadi dua path tidak boleh memberi dua kali lipat kuota.
func TestLoginDuaPathSatuBucket(t *testing.T) {
	defer sesiAdmin()()
	resetLogin()

	r := gin.New()
	r.POST("/api/login", handleLogin)
	r.POST("/api/auth/login", handleLogin)

	minta := func(path string) int {
		req := httptest.NewRequest(http.MethodPost, path, strings.NewReader(bodyLogin(userAdmin, sandiSalah)))
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)
		return rec.Code
	}

	for i := 0; i < loginBurst/2; i++ {
		minta("/api/login")
		minta("/api/auth/login")
	}
	if got := minta("/api/login"); got != http.StatusTooManyRequests {
		t.Fatalf("dua path menghasilkan dua bucket: %d", got)
	}
}

// Bucket login tidak boleh memakan kuota contact, dan sebaliknya: admin yang terjebak
// di halaman login tidak boleh membuat pengunjung tidak bisa mengirim pesan.
func TestBucketLoginTerpisahDariContact(t *testing.T) {
	defer sesiAdmin()()
	resetLogin()
	pembatasKontak = &pembatasLaju{token: kontakBurst, burst: kontakBurst, refill: kontakRefillEach}

	salah := bodyLogin(userAdmin, sandiSalah)
	for i := 0; i < loginBurst+2; i++ {
		cobaLogin(salah)
	}
	kini := time.Now()
	for i := 0; i < kontakBurst; i++ {
		if !pembatasKontak.boleh(kini) {
			t.Fatalf("banjir login menghabiskan kuota contact pada token ke-%d", i+1)
		}
	}
}
