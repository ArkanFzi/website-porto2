package main

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

// kontakSah adalah muatan yang lolos seluruh validasi, jadi satu-satunya hal yang
// menghentikannya di jalur test adalah batas laju.
const kontakSah = `{"name":"Uji","email":"pengunjung@example.test","subject":"Halo","body":"Isi pesan"}`

// bilikKontak memasang keadaan satu-satu untuk satu test: bucket laju dan WaitGroup
// pengiriman yang baru. Tanpa grup baru, watcher dari test sebelumnya masih menunggu di
// grup yang sama dan Add test berikutnya menabrak kontrak sync.WaitGroup.
func bilikKontak(t *testing.T) {
	t.Helper()
	lama, lamaUngg := pembatasKontak, undungEmail
	pembatasKontak = &pembatasLaju{token: kontakBurst, burst: kontakBurst, refill: kontakRefillEach}
	undungEmail = &sync.WaitGroup{}
	t.Cleanup(func() { pembatasKontak, undungEmail = lama, lamaUngg })
}

// sisipContact mengganti dua titik sisip keluaran dan memastikan keduanya dipulihkan.
func sisipContact(t *testing.T, simpan func(*ContactMessage) error, kirim func(string, string, string, string) error) {
	t.Helper()
	lamaSimpan, lamaKirim := simpanPesan, pengirimEmail
	t.Cleanup(func() { simpanPesan, pengirimEmail = lamaSimpan, lamaKirim })
	simpanPesan, pengirimEmail = simpan, kirim
}

func postContact() *httptest.ResponseRecorder {
	r := gin.New()
	r.POST("/api/contact", handleContact)
	req := httptest.NewRequest(http.MethodPost, "/api/contact", strings.NewReader(kontakSah))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	return rec
}

// Inti D1: pengunjung sudah pulang dengan 201 sementara SMTP masih di udara, dan proses
// yang menutup pada detik itu wajib menyelesaikan kiriman tersebut. Kalau WaitGroup tidak
// dipakai, pesan yang sudah tersimpan di DB hilang diam-diam dari inbox admin justru saat
// scale-down, tanpa satu baris log pun yang menyebutnya.
func TestMenutupMenungguEmailYangMasihBerjalan(t *testing.T) {
	bilikKontak(t)

	var selesai atomic.Bool
	mulai := make(chan struct{})
	lepas := make(chan struct{})
	const tertahan = 60 * time.Millisecond
	simpan := func(*ContactMessage) error { return nil }
	kirim := func(string, string, string, string) error {
		close(mulai)
		<-lepas
		time.Sleep(tertahan) // masih di udara beberapa saat setelah proses mulai menutup
		selesai.Store(true)
		return nil
	}
	sisipContact(t, simpan, kirim)

	rec := postContact()
	if rec.Code != http.StatusCreated {
		t.Fatalf("harap 201, dapat %d: %s", rec.Code, rec.Body.String())
	}
	<-mulai // pengiriman benar-benar sedang di udara saat handler pulang

	if selesai.Load() {
		t.Fatal("email selesai sebelum diminta: test ini tidak membuktikan apa-apa")
	}

	mulaTunggu := time.Now()
	close(lepas)
	if !tungguSelesai(undungEmail, 2*time.Second) {
		t.Fatal("tungguSelesai melepas padahal pengiriman belum selesai")
	}
	if !selesai.Load() {
		t.Fatal("tungguSelesai pulang true tapi email tidak pernah dikirim sampai akhir")
	}
	if lampau := time.Since(mulaTunggu); lampau < tertahan {
		t.Fatalf("tungguSelesai pulang dalam %v, lebih cepat dari kiriman %v: ia tidak menunggu",
			lampau, tertahan)
	}
}

// Arah sebaliknya: satu percakapan SMTP yang tidak pernah dijawab tidak boleh membuat
// proses menahan shutdown selamanya. Batasnya hanya terbukti bekerja kalau waktu tunggu
// terukur di bawah batas.
func TestMenutupMelepasSaatBatasHabis(t *testing.T) {
	bilikKontak(t)

	lepas := make(chan struct{})
	t.Cleanup(func() {
		select {
		case <-lepas:
		default:
			close(lepas)
		}
	})
	simpan := func(*ContactMessage) error { return nil }
	kirim := func(string, string, string, string) error {
		<-lepas
		return nil
	}
	sisipContact(t, simpan, kirim)

	if rec := postContact(); rec.Code != http.StatusCreated {
		t.Fatalf("harap 201, dapat %d: %s", rec.Code, rec.Body.String())
	}

	batas := 150 * time.Millisecond
	mula := time.Now()
	if tungguSelesai(undungEmail, batas) {
		t.Fatal("tungguSelesai melaporkan bersih padahal pengiriman masih tertahan")
	}
	if lampau := time.Since(mula); lampau > 2*batas {
		t.Fatalf("batas %v dilanggar: tungguSelesai makan %v", batas, lampau)
	}

	// Bersihkan: goroutine di atas masih memegang satu token WaitGroup. Dibiarkan begitu
	// saja, Done() susulan masuk ke test berikutnya dan mengacaukan hitungannya.
	close(lepas)
	if !tungguSelesai(undungEmail, 2*time.Second) {
		t.Fatal("goroutine test gagal melepas WaitGroup")
	}
}

// Done() harus terpasang lewat defer: satu pesan yang ditolak server tidak boleh
// meninggalkan pembilang di atas nol, karena itu berarti proses tidak pernah bisa
// menutup bersih.
func TestEmailGagalTidakMengunciPembilang(t *testing.T) {
	bilikKontak(t)

	simpan := func(*ContactMessage) error { return nil }
	kirim := func(string, string, string, string) error { return errors.New("535 5.7.8 ditolak") }
	sisipContact(t, simpan, kirim)

	if rec := postContact(); rec.Code != http.StatusCreated {
		t.Fatalf("harap 201, dapat %d: %s", rec.Code, rec.Body.String())
	}
	if !tungguSelesai(undungEmail, 2*time.Second) {
		t.Fatal("kiriman gagal meninggalkan pembilang tidak nol")
	}
}
