package mailer

import (
	"bufio"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"net"
	"os"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"
)

// perpendekBatasPercakapan memadtatkan tenggat 12s supaya suite tetap cepat: menunggu
// 12 detik di tiap run CI tidak menambah bukti apa pun.
func perpendekBatasPercakapan(t *testing.T, d time.Duration) {
	t.Helper()

	lama := batasPercakapan
	t.Cleanup(func() { batasPercakapan = lama })
	batasPercakapan = d
}

// cekTenggat membuktikan bahwa yang memutus percakapan adalah tenggat, bukan sesuatu yang
// kebetulan gagal lebih dulu: error harus tetap ErrDeadlineExceeded DAN durasinya harus dekat
// ke tenggat. Tanpa batas bawah, "err != nil" bisa berarti apa saja dan testnya tetap hijau.
func cekTenggat(t *testing.T, err error, mulai time.Time, tenggat time.Duration) {
	t.Helper()

	lepas := time.Since(mulai)
	if err == nil {
		t.Fatal("server diam tapi SendEmail mengembalikan nil")
	}
	if !errors.Is(err, os.ErrDeadlineExceeded) {
		t.Fatalf("yang memutus bukan tenggat, dapat %v", err)
	}
	if lepas < tenggat/2 {
		t.Fatalf("putus setelah %v padahal tenggat %v — ini bukan tenggat yang bekerja", lepas.Round(time.Millisecond), tenggat)
	}
	if lepas > 5*time.Second {
		t.Fatalf("putus setelah %v, jauh melewati tenggat %v", lepas.Round(time.Millisecond), tenggat)
	}
	t.Logf("dipotong setelah %v (tenggat %v)", lepas.Round(time.Millisecond), tenggat)
}

// perekam mencatat baris yang benar-benar diterima stub, apa adanya. Mutexnya bukan hiasan:
// percakapan berjalan di goroutine server sementara test membacanya, dan `go test -race`
// menyebut itu balapan kalau tidak dikunci. Baris disimpan raw (bukan di-uppercase) karena
// jawaban tantangan AUTH adalah base64 yang huruf besar-kecilnya berarti.
type perekam struct {
	mu    sync.Mutex
	baris []string
}

func (p *perekam) tulis(line string) {
	p.mu.Lock()
	p.baris = append(p.baris, line)
	p.mu.Unlock()
}

func (p *perekam) semua() []string {
	p.mu.Lock()
	defer p.mu.Unlock()
	return append([]string(nil), p.baris...)
}

func (p *perekam) ada(want string) bool {
	for _, baris := range p.semua() {
		if strings.Contains(strings.ToUpper(baris), strings.ToUpper(want)) {
			return true
		}
	}
	return false
}

// stubSMTP adalah server SMTP yang bisa disuruh diam di satu titik. "Diam" di sini berarti
// koneksi TETAP TERBUKA dan tidak membalas apa-apa: stub yang langsung menutup socket
// menghasilkan EOF, dan EOF bukan kondisi yang diuji. Yang diuji justru server yang menerima
// koneksi lalu macet.
type stubSMTP struct {
	address string
	rec     perekam

	// AUTH yang diiklankan, mis. "PLAIN" atau "LOGIN". Ini yang menentukan mekanisme
	// mana yang dipilih pilihMekanisme.
	iklankanAUTH string

	// "" = percakapan lengkap sampai queued. "greeting" = jawab 220 lalu diam.
	// "DATA" = bicara normal sampai 354 lalu diam terhadap titik penutup pesan.
	diamPada string
}

func startStub(t *testing.T, iklankanAUTH, diamPada string) *stubSMTP {
	t.Helper()

	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen: %v", err)
	}
	t.Cleanup(func() { ln.Close() })

	s := &stubSMTP{address: ln.Addr().String(), iklankanAUTH: iklankanAUTH, diamPada: diamPada}
	tahan := make(chan struct{})
	t.Cleanup(func() { close(tahan) })

	go func() {
		conn, err := ln.Accept()
		if err != nil {
			return
		}
		defer conn.Close()
		s.serve(conn, bufio.NewReader(conn), tahan)
	}()

	return s
}

func (s *stubSMTP) serve(conn net.Conn, r *bufio.Reader, tahan <-chan struct{}) {
	fmt.Fprintf(conn, "220 stub.test ESMTP\r\n")
	if s.diamPada == "greeting" {
		<-tahan
		return
	}

	var (
		badanPesan bool
		loginTahap int
	)
	kredensialDiterima := func() {
		fmt.Fprintf(conn, "235 2.7.0 Authentication successful\r\n")
	}

	for {
		line, err := r.ReadString('\n')
		if err != nil {
			return
		}
		s.rec.tulis(line)
		up := strings.ToUpper(strings.TrimRight(line, "\r\n"))

		switch {
		case badanPesan && up != ".":
			// Baris badan pesan: bukan perintah, tidak dibalas.
		case strings.HasPrefix(up, "EHLO"), strings.HasPrefix(up, "HELO"):
			fmt.Fprintf(conn, "250-stub.test\r\n250-AUTH %s\r\n250 8BITMIME\r\n", s.iklankanAUTH)
		case strings.HasPrefix(up, "AUTH LOGIN"):
			loginTahap = 1
			fmt.Fprintf(conn, "334 VXNlcm5hbWU6\r\n") // "Username:"
		case strings.HasPrefix(up, "AUTH"):
			// AUTH PLAIN: kredensial sudah ikut di baris ini.
			kredensialDiterima()
		case loginTahap == 1:
			loginTahap = 2
			fmt.Fprintf(conn, "334 UGFzc3dvcmQ6\r\n") // "Password:"
		case loginTahap == 2:
			loginTahap = 0
			kredensialDiterima()
		case strings.HasPrefix(up, "MAIL FROM"):
			fmt.Fprintf(conn, "250 2.1.0 Ok\r\n")
		case strings.HasPrefix(up, "RCPT TO"):
			fmt.Fprintf(conn, "250 2.1.5 Ok\r\n")
		case strings.HasPrefix(up, "DATA"):
			fmt.Fprintf(conn, "354 End data with <CR><LF>.<CR><LF>\r\n")
			if s.diamPada == "DATA" {
				// Body dan baris titik tetap mengalir masuk, tapi tidak pernah dijawab.
				io.Copy(io.Discard, r)
				<-tahan
				return
			}
			badanPesan = true
		case up == ".":
			badanPesan = false
			fmt.Fprintf(conn, "250 2.0.0 Ok: queued\r\n")
		case strings.HasPrefix(up, "QUIT"):
			fmt.Fprintf(conn, "221 2.0.0 Bye\r\n")
			return
		default:
			fmt.Fprintf(conn, "250 2.0.0 Ok\r\n")
		}
	}
}

// arah memindahkan endpoint SMTP ke stub ini, memakai penandaan yang sudah ada di
// smtp_ditolak_test.go.
func (s *stubSMTP) arah(t *testing.T) {
	t.Helper()

	host, portStr, err := net.SplitHostPort(s.address)
	if err != nil {
		t.Fatalf("SplitHostPort(%q): %v", s.address, err)
	}
	port, err := strconv.Atoi(portStr)
	if err != nil {
		t.Fatalf("port %q: %v", portStr, err)
	}
	arahkanDialer(t, host, port)
}

func kredensialStub(t *testing.T) {
	t.Helper()

	t.Setenv("EMAIL_USER", "kuis@stub.test")
	t.Setenv("EMAIL_PASS", strings.Repeat("x", 16))
}

// Server menjawab greeting lalu diam. Titik paling awal yang bisa macet.
func TestServerDiamSetelahGreetingDipotongTenggat(t *testing.T) {
	const tenggat = 600 * time.Millisecond
	perpendekBatasPercakapan(t, tenggat)

	stub := startStub(t, "PLAIN", "greeting")
	stub.arah(t)
	kredensialStub(t)

	mulai := time.Now()
	err := SendEmail("penerima@example.test", "balas@example.test", "halo", "isi")
	cekTenggat(t, err, mulai, tenggat)

	if !strings.Contains(err.Error(), "EHLO") {
		t.Errorf("error tidak menyebut langkah yang macet, dapat: %v", err)
	}
}

// Server berbicara normal sampai DATA lalu diam terhadap titik penutup pesan. Cabang paling
// berbahaya: MAIL FROM dan RCPT TO sudah diterima, jadi pesan secara logika "hampir terkirim",
// dan tanpa tenggat goroutine pengirim menunggu selamanya tanpa menulis satu baris log pun
// (main.go:669 menjalankannya di latar, setelah pengunjung pulang dengan 201).
func TestServerDiamMenutupPesanDipotongTenggat(t *testing.T) {
	const tenggat = 800 * time.Millisecond
	perpendekBatasPercakapan(t, tenggat)

	stub := startStub(t, "PLAIN", "DATA")
	stub.arah(t)
	kredensialStub(t)

	mulai := time.Now()
	err := SendEmail("penerima@example.test", "balas@example.test", "halo", "isi")
	cekTenggat(t, err, mulai, tenggat)

	// Tanpa ini, error tenggat yang sama bisa datang dari percakapan yang tidak pernah
	// sampai DATA dan testnya menguji hal yang salah.
	for _, wajib := range []string{"AUTH", "MAIL FROM", "RCPT TO", "DATA"} {
		if !stub.rec.ada(wajib) {
			t.Errorf("stub tidak pernah menerima %s.\nDiterima: %v", wajib, stub.rec.semua())
		}
	}
	if !strings.Contains(err.Error(), "menutup pesan") {
		t.Errorf("error tidak menunjuk Close() sebagai tempat macet, dapat: %v", err)
	}
}

// Stub yang hanya mengiklankan AUTH LOGIN: satu-satunya kondisi yang membuat cabang loginAuth
// dipakai. Gmail mengiklankan LOGIN *dan* PLAIN sehingga cabang ini tidak akan berjalan di
// produksi — tetap diuji supaya loginAuth bukan kode mati yang tidak terbukti.
func TestMekanismeLoginDipakaiSaatPlainTidakDiiklankan(t *testing.T) {
	stub := startStub(t, "LOGIN", "")
	stub.arah(t)
	kredensialStub(t)

	if err := SendEmail("penerima@example.test", "balas@example.test", "halo", "isi"); err != nil {
		t.Fatalf("AUTH LOGIN gagal: %v\nDiterima stub: %v", err, stub.rec.semua())
	}

	seen := stub.rec.semua()
	if !stub.rec.ada("AUTH LOGIN") {
		t.Fatalf("mekanisme yang dipakai bukan LOGIN, jadi loginAuth tidak terbukti.\nDiterima: %v", seen)
	}
	if stub.rec.ada("AUTH PLAIN") {
		t.Fatalf("AUTH PLAIN dikirim padahal server tidak mengiklankannya.\nDiterima: %v", seen)
	}

	// Dua tantangan 334 harus dijawab dua baris terpisah, masing-masing dengan kredensial yang
	// benar. Itu seluruh isi loginAuth; tanpa cek ini testnya bisa lulus walau tantangannya
	// tidak pernah dijawab sama sekali.
	i := -1
	for n, baris := range seen {
		if strings.HasPrefix(strings.ToUpper(baris), "AUTH LOGIN") {
			i = n
			break
		}
	}
	if i < 0 || i+2 >= len(seen) {
		t.Fatalf("tidak ada dua balasan setelah AUTH LOGIN.\nDiterima: %v", seen)
	}
	for n, mau := range []string{"kuis@stub.test", strings.Repeat("x", 16)} {
		isi, err := base64.StdEncoding.DecodeString(strings.TrimSpace(seen[i+n+1]))
		if err != nil {
			t.Fatalf("balasan tantangan %d bukan base64: %q", n, seen[i+n+1])
		}
		if string(isi) != mau {
			t.Fatalf("balasan tantangan %d = %q, seharusnya %q", n, isi, mau)
		}
	}
}
