package mailer

import (
	"bufio"
	"errors"
	"fmt"
	"net"
	"strconv"
	"strings"
	"testing"
	"time"
)

// smtpStub adalah server SMTP minimal di dalam proses. Ia ada supaya dua cabang dari
// switch di main.go (terkirim / gagal kirim) bisa dibuktikan tanpa menyentuh akun Gmail
// yang sungguhan — dan supaya "err != nil" di test di bawah tidak bisa kebetulan lulus
// karena koneksi ke host yang mati: tiap test membaca kembali daftar perintah yang
// benar-benar diterima stub.
//
// AUTH sengaja diiklankan. Penolakan yang paling mungkin terjadi di produksi adalah akun
// yang aplikasi-password-nya dicabut, dan itu terjadi di AUTH — bukan di RCPT.
type smtpStub struct {
	addr    string
	cmds    chan []string
	ditolak bool
}

func startSMTPStub(t *testing.T, authDitolak bool) *smtpStub {
	t.Helper()

	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen: %v", err)
	}
	t.Cleanup(func() { ln.Close() })

	s := &smtpStub{addr: ln.Addr().String(), cmds: make(chan []string, 1), ditolak: authDitolak}
	go s.serve(ln)
	return s
}

func (s *smtpStub) serve(ln net.Listener) {
	var seen []string

	conn, err := ln.Accept()
	if err != nil {
		s.cmds <- seen
		return
	}
	defer conn.Close()
	fmt.Fprintf(conn, "220 stub.test ESMTP\r\n")

	r := bufio.NewReader(conn)
	var (
		badanPesan bool
		loginTahap int // 1 = menunggu username, 2 = menunggu sandi
	)
	balasKredensial := func() {
		if s.ditolak {
			fmt.Fprintf(conn, "535 5.7.8 Username and Password not accepted\r\n")
		} else {
			fmt.Fprintf(conn, "235 2.7.0 Authentication successful\r\n")
		}
	}
	for {
		line, err := r.ReadString('\n')
		if err != nil {
			s.cmds <- seen
			return
		}
		line = strings.TrimRight(line, "\r\n")
		seen = append(seen, line)
		up := strings.ToUpper(line)

		switch {
		case badanPesan && up != ".":
			// Bagian dari badan pesan: jangan dibalas, jangan dianggap perintah.
		case strings.HasPrefix(up, "EHLO"), strings.HasPrefix(up, "HELO"):
			fmt.Fprintf(conn, "250-stub.test\r\n250-AUTH LOGIN PLAIN\r\n250 8BITMIME\r\n")
		case strings.HasPrefix(up, "AUTH LOGIN"):
			// LOGIN mengirim username dan sandi di dua baris menyusul, masing-masing
			// diawali tantangan 334. Penolakan baru sah setelah baris yang kedua.
			loginTahap = 1
			fmt.Fprintf(conn, "334 VXNlcm5hbWU6\r\n")
		case strings.HasPrefix(up, "AUTH"):
			// AUTH PLAIN dan bentuk lain: kredensial sudah ikut di baris ini.
			loginTahap = 0
			balasKredensial()
		case strings.HasPrefix(up, "MAIL FROM"):
			fmt.Fprintf(conn, "250 2.1.0 Ok\r\n")
		case strings.HasPrefix(up, "RCPT TO"):
			fmt.Fprintf(conn, "250 2.1.5 Ok\r\n")
		case strings.HasPrefix(up, "DATA"):
			badanPesan = true
			fmt.Fprintf(conn, "354 End data with <CR><LF>.<CR><LF>\r\n")
		case up == ".":
			badanPesan = false
			fmt.Fprintf(conn, "250 2.0.0 Ok: queued\r\n")
		case strings.HasPrefix(up, "QUIT"):
			fmt.Fprintf(conn, "221 2.0.0 Bye\r\n")
			s.cmds <- seen
			return
		case loginTahap == 1:
			loginTahap = 2
			fmt.Fprintf(conn, "334 UGFzc3dvcmQ6\r\n")
		case loginTahap == 2:
			loginTahap = 0
			balasKredensial()
		default:
			fmt.Fprintf(conn, "250 2.0.0 Ok\r\n")
		}
	}
}

// arahkanDialer memindahkan endpoint ke stub lokal dan mengembalikan nilainya setelah test.
func arahkanDialer(t *testing.T, host string, port int) {
	t.Helper()

	oldHost, oldPort := smtpHost, smtpPort
	t.Cleanup(func() { smtpHost, smtpPort = oldHost, oldPort })
	smtpHost, smtpPort = host, port
}

func alamatStub(t *testing.T, s *smtpStub) (string, int) {
	t.Helper()

	host, portStr, err := net.SplitHostPort(s.addr)
	if err != nil {
		t.Fatalf("SplitHostPort(%q): %v", s.addr, err)
	}
	port, err := strconv.Atoi(portStr)
	if err != nil {
		t.Fatalf("port %q: %v", portStr, err)
	}
	return host, port
}

func percakapan(t *testing.T, s *smtpStub) []string {
	t.Helper()

	select {
	case seen := <-s.cmds:
		return seen
	case <-time.After(10 * time.Second):
		t.Fatal("stub tidak menyelesaikan percakapan SMTP")
		return nil
	}
}

// Kredensial ada, tapi server menolaknya. Persis kondisi yang membuat cabang `default:`
// di main.go harus menyebut "gagal kirim", bukan "dilewati".
func TestAutentikasiDitolakBukanErrNotConfigured(t *testing.T) {
	stub := startSMTPStub(t, true)
	host, port := alamatStub(t, stub)
	arahkanDialer(t, host, port)

	t.Setenv("EMAIL_USER", "kuis@stub.test")
	t.Setenv("EMAIL_PASS", strings.Repeat("x", 16))

	err := SendEmail("penerima@example.test", "balas@example.test", "halo", "isi")
	if err == nil {
		t.Fatal("AUTH ditolak tapi SendEmail mengembalikan nil")
	}
	if errors.Is(err, ErrNotConfigured) {
		t.Fatalf("penolakan server diklasifikasikan sebagai kredensial belum ada: %v", err)
	}
	if !strings.Contains(err.Error(), "5.7.8") {
		t.Fatalf("error tidak berasal dari penolakan server, dapat: %v", err)
	}

	seen := percakapan(t, stub)
	if !strings.Contains(strings.ToUpper(strings.Join(seen, "\n")), "AUTH") {
		t.Fatalf("stub tidak pernah ditanya login, jadi penolakan ini tidak membuktikan apa-apa.\nPercakapan:\n%s",
			strings.Join(seen, "\n"))
	}
}

// Arah sebaliknya dari switch yang sama: server menerima → SendEmail mengembalikan nil.
// Tanpa kasus ini, "err == nil" bisa saja berarti testnya tidak pernah sampai ke server.
func TestServerMenerimaPesanKembalikanNil(t *testing.T) {
	stub := startSMTPStub(t, false)
	host, port := alamatStub(t, stub)
	arahkanDialer(t, host, port)

	t.Setenv("EMAIL_USER", "kuis@stub.test")
	t.Setenv("EMAIL_PASS", strings.Repeat("x", 16))

	if err := SendEmail("penerima@example.test", "balas@example.test", "halo", "isi"); err != nil {
		t.Fatalf("server menerima tapi SendEmail gagal: %v", err)
	}

	seen := percakapan(t, stub)
	atas := strings.ToUpper(strings.Join(seen, "\n"))
	for _, wajib := range []string{"AUTH", "MAIL FROM", "RCPT TO", "DATA"} {
		if !strings.Contains(atas, wajib) {
			t.Errorf("stub tidak pernah menerima %s.\nPercakapan:\n%s", wajib, strings.Join(seen, "\n"))
		}
	}
}
