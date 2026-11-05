package main

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// Revokasi sesi. Yang dibuktikan file ini satu kalimat: sesudah admin menekan keluar, kredensial
// yang lama benar-benar tidak bisa dipakai lagi — di peramban mana pun ia tersimpan. Sebelum ada
// ambang, "keluar" hanya menghapus cookie pemanggil dan token JWT-nya tetap sah sampai exp (24 jam),
// jadi sesi yang tertinggal di laptop kantor atau di peramban yang salah tidak bisa diusir.

func kosongkanAmbang(t *testing.T) {
	t.Helper()
	ambangRevokasi.Store(nil)
	t.Cleanup(func() { ambangRevokasi.Store(nil) })
}

// pasangPenyimpanAmbang menukar titik sisip tulisRevokasi/bacaRevokasi dengan lemari memori,
// meniru GREATEST di SQL: ambang hanya boleh naik. go test berjalan tanpa Postgres, dan
// tulis-baca-inilah jalurnya.
func pasangPenyimpanAmbang(t *testing.T) *time.Time {
	t.Helper()
	lamaTulis, lamaBaca := tulisRevokasi, bacaRevokasi
	lemari := new(time.Time)
	tulisRevokasi = func(ambang time.Time) error {
		if ambang.After(*lemari) {
			*lemari = ambang
		}
		return nil
	}
	bacaRevokasi = func() (time.Time, error) { return *lemari, nil }
	t.Cleanup(func() { tulisRevokasi, bacaRevokasi = lamaTulis, lamaBaca })
	return lemari
}

func tulisAmbangGagal(t *testing.T) {
	t.Helper()
	lama := tulisRevokasi
	tulisRevokasi = func(time.Time) error { return errors.New("db tidak terjangkau") }
	t.Cleanup(func() { tulisRevokasi = lama })
}

// sesiBaru membuka sesi lewat handler asli dan mengembalikan kredensialnya persis seperti
// peramban memegangnya: nilai cookie.
func sesiBaru(t *testing.T) string {
	t.Helper()
	return cariCookie(t, loginLewatProxy(t, hostProduksi)).Value
}

// masukDengan memakai cookie saja, tanpa header: persis cara peramban membawa sesi.
func masukDengan(token string) int {
	return aksesTerproteksi(func(r *http.Request) {
		r.AddCookie(&http.Cookie{Name: namaCookieSesi, Value: token})
	}).Code
}

func keluar(t *testing.T, token string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/api/auth/logout", nil)
	req.Host = hostProduksi
	if token != "" {
		req.AddCookie(&http.Cookie{Name: namaCookieSesi, Value: token})
	}
	rec := httptest.NewRecorder()
	r := gin.New()
	r.POST("/api/auth/logout", handleLogout)
	r.ServeHTTP(rec, req)
	return rec
}

func tandaTanganSesi(t *testing.T, claims jwt.MapClaims) string {
	t.Helper()
	// SignedString menghasilkan error hanya kalau method-nya tidak dikenal; tanda tangan yang
	// cacat tidak boleh lolos jadi string kosong lalu diuji sebagai "token palsu".
	s, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(jwtSecret)
	if err != nil {
		t.Fatalf("tanda tangan uji tidak bisa dibuat: %v", err)
	}
	return s
}

func TestLogoutMencabutSesiYangDibawanya(t *testing.T) {
	kosongkanAmbang(t)
	lemari := pasangPenyimpanAmbang(t)
	sesi := sesiBaru(t)

	if got := masukDengan(sesi); got != http.StatusOK {
		t.Fatalf("sesi baru seharusnya masuk, dapat %d", got)
	}
	if rec := keluar(t, sesi); rec.Code != http.StatusOK {
		t.Fatalf("logout dengan sesi sah harap 200, dapat %d: %s", rec.Code, rec.Body.String())
	}
	if lemari.IsZero() {
		t.Fatal("logout tidak menulis ambang revokasi: keluar masih cuma hapus cookie")
	}
	if got := masukDengan(sesi); got != http.StatusUnauthorized {
		t.Fatalf("sesi yang baru saja keluar masih diterima: %d", got)
	}
}

// Rute logout publik. Kalau siapa pun boleh menggeser ambang, satu POST tanpa kredensial cukup
// untuk mengusir admin yang sedang bekerja — penolakan layanan jadi efek samping tombol keluar.
func TestLogoutTanpaKredensialTidakMengusirSesiYangSedangBekerja(t *testing.T) {
	kosongkanAmbang(t)
	lemari := pasangPenyimpanAmbang(t)
	sesi := sesiBaru(t)

	if rec := keluar(t, ""); rec.Code != http.StatusOK {
		t.Fatalf("logout anonim harap 200 (cookie pemanggil tetap dihapus), dapat %d", rec.Code)
	}
	if !lemari.IsZero() {
		t.Fatalf("logout anonim menggeser ambang ke %v", *lemari)
	}
	if got := masukDengan(sesi); got != http.StatusOK {
		t.Fatalf("satu POST anonim membuat sesi admin mati: %d", got)
	}
}

func TestLogoutKredensialPalsuTidakMenulisAmbang(t *testing.T) {
	kosongkanAmbang(t)
	lemari := pasangPenyimpanAmbang(t)

	if rec := keluar(t, "bukan-jwt"); rec.Code != http.StatusOK {
		t.Fatalf("logout dengan cookie palsu harap 200, dapat %d", rec.Code)
	}
	if !lemari.IsZero() {
		t.Fatalf("tanda tangan palsu menggeser ambang ke %v", *lemari)
	}
}

// Login yang terjadi sesaat sesudah keluar harus tetap bisa masuk. Aturan ambang membandingkan
// waktu terbit token, dan token yang diterbitkan dalam detik yang sama dengan logout akan ikut
// tercabut kalau iat dibulatkan ke detik — kegagalan yang munculnya acak dan sulit ditelusuri.
func TestSesiBaruSetelahLogoutTetapDiterima(t *testing.T) {
	kosongkanAmbang(t)
	pasangPenyimpanAmbang(t)

	keluar(t, sesiBaru(t))
	pengganti := sesiBaru(t)
	if got := masukDengan(pengganti); got != http.StatusOK {
		t.Fatalf("login segera setelah keluar ditolak: %d", got)
	}
}

// Cloud Run menScale ke nol. Tanpa membaca ambang dari DB saat boot, setiap pencabutan lupa begitu
// instance berikutnya naik dan sesi yang sudah keluar kembali sah.
func TestMuatRevokasiMemulihkanAmbang(t *testing.T) {
	kosongkanAmbang(t)
	lemari := pasangPenyimpanAmbang(t)
	sesi := sesiBaru(t)

	keluar(t, sesi)
	ambangRevokasi.Store(nil)
	if got := masukDengan(sesi); got == http.StatusUnauthorized {
		t.Fatal("cache dibersihkan tapi sesi tetap ditolak: yang menilai bukan ambang")
	}

	muatRevokasi()
	if lemari.IsZero() {
		t.Fatal("ambang lemari kosong, muatRevokasi tidak punya apa pun untuk dipulihkan")
	}
	if got := masukDengan(sesi); got != http.StatusUnauthorized {
		t.Fatalf("sesi cabut kembali hidup setelah proses dingin: %d", got)
	}
}

// Sesi yang terbit sebelum #revokasi tidak punya iat. Dia tidak bisa dibandingkan, jadi dia hanya
// diterima selama belum pernah ada yang keluar — sesudah logout pertama, yang tidak bisa dicabut
// harus ditolak, bukan dibiarkan kebal.
func TestTokenTanpaIatKehilanganHakSetelahRevokasiPertama(t *testing.T) {
	kosongkanAmbang(t)
	pasangPenyimpanAmbang(t)
	// sesiBaru sekali lagi dibutuhkan: jwtSecret dipasang oleh loginLewatProxy, dan tanpa itu
	// tanda tangan di bawah tidak akan cocok dengan apa pun yang bisa dinilai sesiSah.
	pegangan := sesiBaru(t)

	lama := tandaTanganSesi(t, jwt.MapClaims{
		"username": userAdmin,
		"exp":      time.Now().Add(masaSesi).Unix(),
	})
	if err := sesiSah("Bearer " + lama); err != nil {
		t.Fatalf("sesi lama tanpa iat ditolak sebelum ada revokasi: %v", err)
	}

	keluar(t, pegangan)
	if err := sesiSah("Bearer " + lama); err == nil {
		t.Fatal("token tanpa iat tembus setelah revokasi: tidak ada jalan mencabutnya")
	}
}

// Kalau pencabutan gagal ditulis, respons tidak boleh mengaku sesi sudah tertutup. Cookie sudah
// hilang dari peramban pemanggil, tapi kredensialnya masih hidup — itu harus terdengar.
func TestLogoutGagalTulisBersikapJujur(t *testing.T) {
	kosongkanAmbang(t)
	pasangPenyimpanAmbang(t)
	sesi := sesiBaru(t)

	tulisAmbangGagal(t)
	rec := keluar(t, sesi)
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("revokasi gagal tapi respons %d: %s", rec.Code, rec.Body.String())
	}
	if !revokasiTerpasang().IsZero() {
		t.Fatalf("gagal tulis tapi ambang di cache tetap dinaikkan: %v", revokasiTerpasang())
	}
}

// exp masih harus menilai sendiri: ambang bukan alasan untuk menerima token kedaluwarsa.
func TestSesiKedaluwarsaTetapDitolakSetelahRevokasi(t *testing.T) {
	kosongkanAmbang(t)
	pasangPenyimpanAmbang(t)
	sesiBaru(t)

	kedaluwarsa := tandaTanganSesi(t, jwt.MapClaims{
		"username": userAdmin,
		"iat":      time.Now().Add(-time.Hour).UTC().Truncate(time.Second).Unix(),
		"exp":      time.Now().Add(-time.Minute).Unix(),
	})
	keluar(t, sesiBaru(t))
	if got := masukDengan(kedaluwarsa); got != http.StatusUnauthorized {
		t.Fatalf("token kedaluwarsa diterima: %d", got)
	}
}
