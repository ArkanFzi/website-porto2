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

// File ini menguji dua hal yang tidak terlihat dari luar: kunci-pengunjung benar-benar hash
// (bukan alamat IP yang disamarkan sedikit) dan kontrak JSON GET /api/visits tidak berubah bentuk.
// Jalur yang menyentuh DB diuji end-to-end terhadap Postgres, bukan di sini — tidak ada driver
// kedua di go.mod, dan meniru agregasi SQL di Go hanya akan menguji salinannya sendiri.

const (
	ipTes   = "203.0.113.7"
	hariTes = "2026-11-01"
	saltTes = "rahasia-untuk-test"
)

// Nilai harapan dihitung di luar Go, bukan dari fungsi ini:
// printf '203.0.113.7|2026-11-01|rahasia-untuk-test' | sha256sum
func TestKunciPengunjungAdalahSha256IpHariSalt(t *testing.T) {
	got := kunciPengunjung(ipTes, hariTes, []byte("rahasia-untuk-test"))
	const harap = "64de12baafe82c6bb82a2bca9a9b8e9d62beb89725161a1bbefc10938ffef852"
	if got != harap {
		t.Fatalf("kunci bukan SHA-256(ip|hari|salt):\n got %s\nwant %s", got, harap)
	}
	if len(got) != 64 {
		t.Fatalf("kunci harap 64 karakter hex, dapat %d: %q", len(got), got)
	}
}

// Satu orang pada satu hari yang sama menghasilkan satu kunci yang sama — inilah dasar dedupe:
// hit keduanya jatuh ke baris yang sama, jadi uniqueLast24h tidak naik dua kali.
func TestKunciPengunjungStabilUntukOrangDanHariYangSama(t *testing.T) {
	a := kunciPengunjung(ipTes, hariTes, []byte(saltTes))
	b := kunciPengunjung(ipTes, hariTes, []byte(saltTes))
	if a != b {
		t.Fatalf("input sama menghasilkan kunci berbeda: %s vs %s", a, b)
	}
}

func TestKunciPengunjungBedaUntukHariIPAtauSaltBeda(t *testing.T) {
	basis := kunciPengunjung(ipTes, hariTes, []byte(saltTes))
	kasus := map[string]string{
		"hari-lain": kunciPengunjung(ipTes, "2026-11-02", []byte(saltTes)),
		"ip-lain":   kunciPengunjung("203.0.113.8", hariTes, []byte(saltTes)),
		"salt-lain": kunciPengunjung(ipTes, hariTes, []byte("salt-ganti")),
	}
	for nama, got := range kasus {
		if got == basis {
			t.Errorf("%s: kunci sama dengan basis %s", nama, basis)
		}
	}
}

// Yang disimpan di kolom kunci adalah hash. Kalau alamat IP masih terbaca di dalamnya — apa pun
// bentuknya — seluruh alasan tabel ini ada hilang.
func TestKunciPengunjungTidakMemuatIPMentah(t *testing.T) {
	kasus := []string{
		ipTes,
		"203.0.113",
		"203.0",
		"113.7",
		strings.ReplaceAll(ipTes, ".", ""),
	}
	got := kunciPengunjung(ipTes, hariTes, []byte(saltTes))
	for _, ip := range kasus {
		if strings.Contains(got, ip) {
			t.Fatalf("potongan IP %q muncul di kunci %s", ip, got)
		}
	}
	for _, r := range got {
		if !strings.ContainsRune("0123456789abcdef", r) {
			t.Fatalf("kunci berisi karakter di luar hex lowercase: %q", r)
		}
	}
}

// Ambang hari mengikuti WIB, bukan jam UTC kontainer. Tanpa ini, separuh jam pertama setiap hari
// di Indonesia masih tercatat sebagai hari kemarin sementara halaman depan sudah menghitungnya
// sebagai hari ini.
func TestHariKunjunganPakaiAmbangWIB(t *testing.T) {
	kasus := []struct {
		utc  time.Time
		hari string
	}{
		// 17.30 UTC = 00.30 WIB sehari berikutnya.
		{time.Date(2026, 10, 31, 17, 30, 0, 0, time.UTC), "2026-11-01"},
		// 16.59 UTC = 23.59 WIB hari yang sama.
		{time.Date(2026, 10, 31, 16, 59, 0, 0, time.UTC), "2026-10-31"},
		{time.Date(2026, 11, 1, 17, 0, 0, 0, time.UTC), "2026-11-02"},
	}
	for _, k := range kasus {
		if got := hariKunjungan(k.utc); got != k.hari {
			t.Errorf("%s: harap %s, dapat %s", k.utc.Format(time.RFC3339), k.hari, got)
		}
	}
}

// Kontrak halaman depan: tiga angka, nama dan urutan field persis. Field tambahan atau perubahan
// nama membuat frontend membaca undefined dan menampilkan 0 tanpa satu pesan pun.
func TestBentukJSONRingkasanKunjungan(t *testing.T) {
	b, err := json.Marshal(ringkasanKunjungan{Total: 2, HariIni: 2, Unik24Jam: 1})
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	const harap = `{"total":2,"today":2,"uniqueLast24h":1}`
	if string(b) != harap {
		t.Fatalf("bentuk JSON berubah:\n got %s\nwant %s", b, harap)
	}
}

// POST /api/visit dipanggil setiap muatan halaman, jadi ia adalah satu-satunya rute publik yang
// menulis tanpa validasi apa pun. Rem harus berbunyi 429 + Retry-After, bukan hit yang hilang
// diam-diam — dan sebelum DB disentuh.
func TestKunjunganDibatasiLajuSebelumMenulis(t *testing.T) {
	pulihkan := pembatasKunjungan
	t.Cleanup(func() { pembatasKunjungan = pulihkan })
	pembatasKunjungan = &pembatasLaju{token: kunjunganBurst, burst: kunjunganBurst, refill: kunjunganRefillEach}

	kini := time.Now()
	for i := 0; i < kunjunganBurst; i++ {
		if !pembatasKunjungan.boleh(kini) {
			t.Fatalf("token ke-%d ditolak padahal burst belum habis", i+1)
		}
	}

	r := gin.New()
	r.POST("/api/visit", handleKunjungan)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/visit", nil))

	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf("setelah burst habis: harap 429, dapat %d: %s", rec.Code, rec.Body.String())
	}
	if ra := rec.Header().Get("Retry-After"); ra == "" {
		t.Error("429 tanpa Retry-After")
	}
	// DB tidak pernah dibuka saat test ini berjalan. Handler yang sempat menyentuh
	// catatKunjungan akan panic di DB.Create — 429 di atas adalah bukti jalur itu dilewati.
}

// Bucket kunjungan tidak boleh memakan kuota login atau contact, dan sebaliknya: satu halaman
// yang di-refresh berkali-kali tidak boleh membuat admin tidak bisa masuk.
func TestBucketKunjunganTerpisahDariLoginDanContact(t *testing.T) {
	pulihkan := [3]*pembatasLaju{pembatasKunjungan, pembatasLogin, pembatasKontak}
	t.Cleanup(func() {
		pembatasKunjungan, pembatasLogin, pembatasKontak = pulihkan[0], pulihkan[1], pulihkan[2]
	})
	pembatasKunjungan = &pembatasLaju{token: kunjunganBurst, burst: kunjunganBurst, refill: kunjunganRefillEach}
	pembatasLogin = &pembatasLaju{token: loginBurst, burst: loginBurst, refill: loginRefillEach}
	pembatasKontak = &pembatasLaju{token: kontakBurst, burst: kontakBurst, refill: kontakRefillEach}

	kini := time.Now()
	for i := 0; i < kunjunganBurst+2; i++ {
		pembatasKunjungan.boleh(kini)
	}
	for i := 0; i < loginBurst; i++ {
		if !pembatasLogin.boleh(kini) {
			t.Fatalf("banjir kunjungan menghabiskan kuota login pada token ke-%d", i+1)
		}
	}
	for i := 0; i < kontakBurst; i++ {
		if !pembatasKontak.boleh(kini) {
			t.Fatalf("banjir kunjungan menghabiskan kuota contact pada token ke-%d", i+1)
		}
	}
}
