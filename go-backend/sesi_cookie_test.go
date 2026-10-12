package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

// Sesi admin pindah dari body JSON + localStorage ke cookie HttpOnly. Yang diuji di file ini
// bukan "login menghasilkan string", tapi tiga hal yang bisa hilang diam-diam saat pemindahan:
// atribut keras pada Set-Cookie, cookie sebagai satu-satunya kredensial yang cukup, dan body
// login yang benar-benar tidak lagi memuat token.

func cariCookie(t *testing.T, rec *httptest.ResponseRecorder) *http.Cookie {
	t.Helper()
	for _, k := range rec.Result().Cookies() {
		if k.Name == namaCookieSesi {
			return k
		}
	}
	t.Fatalf("tidak ada cookie %s di respons.\nSet-Cookie: %v\nBody: %s",
		namaCookieSesi, rec.Header().Values("Set-Cookie"), rec.Body.String())
	return nil
}

// loginLewatProxy memasang kredensial + jwtSecret sendiri lewat t.Cleanup — bukan defer di dalam
// fungsi ini. Defer menaruh secret kembali begitu helper pulang, jadi request verifikasi susulan
// menilai cookie dengan secret kosong dan seluruh test "sesi sah" gagal 401: kegagalan yang
// bunyinya seperti bug middleware, padahal bug test.
func loginLewatProxy(t *testing.T, xfForwardedProto string) *httptest.ResponseRecorder {
	t.Helper()
	pulihkan := sesiAdmin()
	t.Cleanup(pulihkan)
	resetLogin()
	r := gin.New()
	r.POST("/api/auth/login", handleLogin)
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", strings.NewReader(bodyLogin(userAdmin, sandiTes)))
	req.Header.Set("Content-Type", "application/json")
	if xfForwardedProto != "" {
		req.Header.Set("X-Forwarded-Proto", xfForwardedProto)
	}
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("login sah harap 200, dapat %d: %s", rec.Code, rec.Body.String())
	}
	return rec
}

// Kredensial hanya lewat cookie. Kalau field token masih muncul di body, seluruh isi file ini
// jadi hiasan: skrip di halaman login tinggal membaca respons yang sedang lewat.
func TestBodyLoginTidakLagiMemuatToken(t *testing.T) {
	rec := loginLewatProxy(t, "https")
	body := rec.Body.String()
	if strings.Contains(body, `"token"`) {
		t.Fatalf("body login masih memuat token: %s", body)
	}
	if !strings.Contains(body, `"sesi"`) {
		t.Fatalf("login sukses tapi body tidak menjelaskan keadaannya: %s", body)
	}
}

func TestSesiCookieDipasangDenganAtributKeras(t *testing.T) {
	rec := loginLewatProxy(t, "https")
	cookie := cariCookie(t, rec)

	if !cookie.HttpOnly {
		t.Error("HttpOnly tidak dipasang: document.cookie masih bisa membaca kredensial")
	}
	if !cookie.Secure {
		t.Error("Secure tidak dipasang padahal X-Forwarded-Proto: https")
	}
	if cookie.SameSite != http.SameSiteLaxMode {
		t.Errorf("SameSite harap Lax(%d), dapat %d", http.SameSiteLaxMode, cookie.SameSite)
	}
	if cookie.Path != "/" {
		t.Errorf("Path harap /, dapat %q", cookie.Path)
	}
	// exp JWT dan Max-Age cookie memakai satu konstanta; kalau keduanya beda panjang, sesi di
	// peramban tetap ada setelah token mati (401 tanpa sebab) atau sebaliknya.
	if cookie.MaxAge != int(masaSesi.Seconds()) {
		t.Errorf("Max-Age harap %d (= masaSesi), dapat %d", int(masaSesi.Seconds()), cookie.MaxAge)
	}
	if cookie.Value == "" {
		t.Error("cookie dipasang tapi kosong")
	}
}

// Development berjalan di http://localhost dan browser membuang cookie Secure di luar HTTPS.
// Tanpa kelonggaran ini login lokal tampak rusak tanpa pesan error apa pun.
func TestSesiCookieTanpaSecureDiLokasiNonTLS(t *testing.T) {
	rec := loginLewatProxy(t, "")
	if cookie := cariCookie(t, rec); cookie.Secure {
		t.Fatal("Secure dipaksa di jalur non-TLS: development local tidak bisa login")
	} else if !cookie.HttpOnly {
		t.Error("HttpOnly ikut hilang padahal yang dilonggarkan hanya Secure")
	}
}

func routerTerproteksi() *gin.Engine {
	r := gin.New()
	r.GET("/api/admin/contact", AuthMiddleware(), func(c *gin.Context) { c.String(http.StatusOK, "inbox") })
	return r
}

func aksesTerproteksi(ubah func(*http.Request)) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodGet, "/api/admin/contact", nil)
	if ubah != nil {
		ubah(req)
	}
	rec := httptest.NewRecorder()
	routerTerproteksi().ServeHTTP(rec, req)
	return rec
}

// Inti pemindahan: cookie saja, tanpa header apa pun, sudah cukup untuk masuk.
func TestCookieSajaDiterimaMiddleware(t *testing.T) {
	rec := loginLewatProxy(t, "https")
	nilai := cariCookie(t, rec).Value

	got := aksesTerproteksi(func(r *http.Request) { r.AddCookie(&http.Cookie{Name: namaCookieSesi, Value: nilai}) })
	if got.Code != http.StatusOK {
		t.Fatalf("cookie sesi sah ditolak: %d %s", got.Code, got.Body.String())
	}
}

func TestCookiePalsuDitolak(t *testing.T) {
	got := aksesTerproteksi(func(r *http.Request) { r.AddCookie(&http.Cookie{Name: namaCookieSesi, Value: "bukan-jwt"}) })
	if got.Code != http.StatusUnauthorized {
		t.Fatalf("cookie palsu tembus: %d", got.Code)
	}
}

func TestTanpaKredensialSamaSekaliDitolak(t *testing.T) {
	if got := aksesTerproteksi(nil); got.Code != http.StatusUnauthorized {
		t.Fatalf("request kosong kredensial: %d", got.Code)
	}
}

// Jalur lama tetap hidup selama rollout: sesi yang sudah tersimpan di localStorage pengunjung
// sebelum deploy tidak boleh berubah jadi 401 tanpa penjelasan, dan ia kedaluwarsa sendiri.
func TestBearerLamaTetapDiterima(t *testing.T) {
	rec := loginLewatProxy(t, "https")
	nilai := cariCookie(t, rec).Value

	got := aksesTerproteksi(func(r *http.Request) { r.Header.Set("Authorization", "Bearer "+nilai) })
	if got.Code != http.StatusOK {
		t.Fatalf("Bearer lama (dari cookie yang sama) ditolak: %d", got.Code)
	}
}

// "Keluar" harus benar-benar menghapus kredensial di peramban. JWT di sini tidak punya daftar
// hitam, jadi satu-satunya jalan membuat tombol keluar berarti adalah Max-Age negatif.
func TestLogoutMenghapusCookieSesi(t *testing.T) {
	defer sesiAdmin()()

	r := gin.New()
	r.POST("/api/auth/logout", handleLogout)
	req := httptest.NewRequest(http.MethodPost, "/api/auth/logout", nil)
	req.Header.Set("X-Forwarded-Proto", "https")
	req.AddCookie(&http.Cookie{Name: namaCookieSesi, Value: "sesi-lama"})
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("logout harap 200, dapat %d", rec.Code)
	}
	if strings.Contains(rec.Body.String(), `"token"`) {
		t.Fatalf("respons logout ikut memuat token: %s", rec.Body.String())
	}
	k := cariCookie(t, rec)
	if k.MaxAge >= 0 || k.Value != "" {
		t.Fatalf("cookie tidak dihapus: value=%q maxAge=%d", k.Value, k.MaxAge)
	}
	if !k.HttpOnly || !k.Secure {
		t.Errorf("cookie penghapusan kehilangan atribut keras: HttpOnly=%v Secure=%v", k.HttpOnly, k.Secure)
	}
}
