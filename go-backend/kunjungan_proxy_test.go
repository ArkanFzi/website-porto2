package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

// Kepercayaan proxy bukan detail transport di aplikasi ini: c.ClientIP() adalah satu-satunya bahan
// kunci pengunjung (kunciPengunjung = SHA-256(IP + hari + salt)). File ini mengunci sebabnya
// default gin (trust-all) dipertahankan, supaya yang menutupnya nanti tidak merusak statistik
// kunjungan diam-diam.

// pembacaClientIP memasang satu rute pembaca dan mengembalikan fungsi penanya. Satu engine,
// banyak request: mendaftarkan rute yang dua kali membuat gin panic.
func pembacaClientIP(t *testing.T, r *gin.Engine) func(xff string) string {
	t.Helper()
	r.GET("/uji", func(c *gin.Context) { c.String(http.StatusOK, c.ClientIP()) })
	return func(xff string) string {
		req := httptest.NewRequest(http.MethodGet, "/uji", nil)
		if xff != "" {
			req.Header.Set("X-Forwarded-For", xff)
		}
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)
		return strings.TrimSpace(rec.Body.String())
	}
}

func TestKepercayaanProxyMenentukanJumlahPengunjung(t *testing.T) {
	pulihkan := sesiAdmin()
	t.Cleanup(pulihkan)
	hari := "2026-11-05"

	terbuka := pembacaClientIP(t, gin.New())
	satu, dua := terbuka("203.0.113.1"), terbuka("198.51.100.9")
	if satu == dua {
		t.Fatalf("trust-all pun tidak membedakan pengunjung (%s) — uji ini buta", satu)
	}
	if kunciPengunjung(satu, hari, jwtSecret) == kunciPengunjung(dua, hari, jwtSecret) {
		t.Fatal("dua alamat berbeda menghasilkan kunci kunjungan yang sama")
	}

	engineTutup := gin.New()
	if err := engineTutup.SetTrustedProxies(nil); err != nil {
		t.Fatalf("SetTrustedProxies(nil): %v", err)
	}
	tutup := pembacaClientIP(t, engineTutup)
	s, d := tutup("203.0.113.1"), tutup("198.51.100.9")
	if s != d {
		t.Fatalf("trust-none masih membedakan pengunjung (%q vs %q) — sebab di bawah tidak berlaku", s, d)
	}
	if kunciPengunjung(s, hari, jwtSecret) != kunciPengunjung(d, hari, jwtSecret) {
		t.Fatal("kunci tidak ikut menyatu: yang dinilai bukan ClientIP")
	}
	t.Logf("terukur: trust-none menyatukan dua pengunjung di bawah satu proxy pada kunci %s…",
		kunciPengunjung(s, hari, jwtSecret)[:12])
}
