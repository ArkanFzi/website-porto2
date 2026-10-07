package mailer

import (
	"crypto/tls"
	"errors"
	"fmt"
	"net"
	"net/mail"
	"net/smtp"
	"os"
	"strconv"
	"strings"
	"time"

	"gopkg.in/gomail.v2"
)

// ErrNotConfigured membedakan "kredensial memang belum terpasang" dari SMTP yang
// menolak. Tanpa pembeda ini setiap pesan membuka koneksi ke Gmail untuk sesuatu
// yang pasti gagal, dan log-nya menyebut itu "gagal kirim".
var ErrNotConfigured = errors.New("EMAIL_USER/EMAIL_PASS belum terpasang")

// Endpoint SMTP dibakar di paket, bukan di parameter, karena satu-satunya penyedia
// yang didukung adalah Gmail. Variabel (bukan konstanta) supaya percakapan SMTP bisa
// diarahkan ke stub lokal di test: tanpa itu, jalur "SMTP menolak" hanya bisa dibuktikan
// dengan menolak akun Gmail yang sungguhan.
var (
	smtpHost = "smtp.gmail.com"
	smtpPort = 587
)

// batasKoneksi mempertahankan angka yang selama ini dipakai gomail: 10s itu hardcoded di
// smtp.go:61 dan tidak bisa diubah dari luar, jadi nilai ini bukan perubahan perilaku.
//
// batasPercakapan adalah yang sebelumnya tidak ada. Dialer gomail tidak punya field
// Timeout — `d.Timeout undefined (type *gomail.Dialer has no field or method Timeout)` —
// dan yang diikatnya hanya connect, bukan greeting/EHLO/STARTTLS/AUTH/MAIL/RCPT/DATA
// sesudahnya. Server yang menerima koneksi lalu diam membuat pengiriman menggantung
// tanpa batas; pengiriman jalan di goroutine latar setelah pengunjung pulang dengan 201
// (main.go:669), jadi yang bocor bukan respons pengunjung melainkan goroutine + socket
// tanpa satu baris log pun. SetDeadline memotongnya dan membuat kegagalannya kelihatan.
var (
	batasKoneksi    = 10 * time.Second
	batasPercakapan = 12 * time.Second
)

// SendEmail mengirim pesan ke satu penerima. Batas total tetap milik main.go: ia menghitung
// kiriman ini di WaitGroup dan memberi tenggat saat proses ditutup (batasMatikan, 12s).
// Yang ditambahkan di sini hanya agar satu percakapan SMTP tidak bisa melebihi bagiannya.
func SendEmail(to string, replyTo string, subject string, body string) error {
	user := os.Getenv("EMAIL_USER")
	pass := os.Getenv("EMAIL_PASS")
	if user == "" || pass == "" {
		return ErrNotConfigured
	}

	return kirim(user, pass, to, newMessage(user, to, replyTo, subject, body))
}

// kirim memisahkan percakapan SMTP dari pembentukan pesan supaya tenggatnya bisa dibuktikan
// terhadap stub lokal, dan agar newMessage tetap diuji sebagai pembangun MIME saja.
func kirim(user, pass, to string, msg *gomail.Message) error {
	addr := net.JoinHostPort(smtpHost, strconv.Itoa(smtpPort))

	conn, err := (&net.Dialer{Timeout: batasKoneksi, KeepAlive: 30 * time.Second}).Dial("tcp", addr)
	if err != nil {
		return fmt.Errorf("SMTP %s: %w", addr, err)
	}
	defer conn.Close()

	// Sekali di sini, absolut, dan mencakup seluruh percakapan: handshake TLS ikut memakai
	// conn yang sama karena tls.Client hanya membungkusnya.
	if err := conn.SetDeadline(time.Now().Add(batasPercakapan)); err != nil {
		return fmt.Errorf("SMTP %s: memasang batas waktu: %w", addr, err)
	}

	c, err := smtp.NewClient(conn, smtpHost)
	if err != nil {
		return fmt.Errorf("SMTP %s: greeting: %w", addr, err)
	}

	// EHLO eksplisit, dengan localName sama seperti yang dipasang net/smtp sendiri:
	// Client.Extension menelan error hello() dan hanya mengembalikan false, jadi tanpa
	// langkah ini server yang diam setelah greeting tampak seperti "tidak mendukung
	// STARTTLS" dan error-nya baru muncul jauh dari tempat yang sebenarnya.
	if err := c.Hello("localhost"); err != nil {
		return fmt.Errorf("SMTP %s: EHLO: %w", addr, err)
	}

	// Gmail hanya mengiklankan AUTH sesudah STARTTLS, jadi urutannya tidak bisa dibalik.
	if ok, _ := c.Extension("STARTTLS"); ok {
		if err := c.StartTLS(&tls.Config{ServerName: smtpHost}); err != nil {
			return fmt.Errorf("SMTP %s: STARTTLS: %w", addr, err)
		}
	}

	mekanisme, err := pilihMekanisme(c, user, pass)
	if err != nil {
		return fmt.Errorf("SMTP %s: %w", addr, err)
	}
	if err := c.Auth(mekanisme); err != nil {
		return fmt.Errorf("SMTP %s: AUTH: %w", addr, err)
	}

	// Amplop pengirim = akun yang diautentikasi, sama seperti sebelumnya: gomail mengambil
	// MAIL FROM dari header From, dan From diisi user (lihat newMessage).
	if err := c.Mail(user); err != nil {
		return fmt.Errorf("SMTP %s: MAIL FROM: %w", addr, err)
	}
	if err := c.Rcpt(to); err != nil {
		return fmt.Errorf("SMTP %s: RCPT TO: %w", addr, err)
	}

	w, err := c.Data()
	if err != nil {
		return fmt.Errorf("SMTP %s: DATA: %w", addr, err)
	}
	if _, err := msg.WriteTo(w); err != nil {
		w.Close()
		return fmt.Errorf("SMTP %s: menulis pesan: %w", addr, err)
	}
	// Close-lah yang mengirim <CR><LF>.<CR><LF> dan membaca balasan 250 queued. Kegagalan
	// di sini berarti pesan tidak diterima; WriteTo di atas baru selesai menulis ke socket.
	if err := w.Close(); err != nil {
		return fmt.Errorf("SMTP %s: menutup pesan: %w", addr, err)
	}

	// Nilai Quit diabaikan: pesan sudah dijawab queued, dan socket ditutup oleh defer di atas.
	c.Quit()
	return nil
}

// pilihMekanisme menyalin urutan seleksi gomail (smtp.go:90-105) apa adanya: CRAM-MD5, lalu
// LOGIN hanya kalau PLAIN tidak diiklankan, lalu PLAIN. Disalin, bukan disederhanakan, supaya
// perintah AUTH yang dikirim ke Gmail tidak berubah karena perubahan ini — satu-satunya hal
// soal Gmail yang memang tidak bisa kuukur dari mesin ini.
func pilihMekanisme(c *smtp.Client, user, pass string) (smtp.Auth, error) {
	ok, diiklankan := c.Extension("AUTH")
	if !ok {
		// Bukan sekadar "tidak perlu login": mengirim tanpa kredensial ke relay terbuka
		// akan tetap menyerahkan pesan ke internet.
		return nil, errors.New("server tidak mengiklankan mekanisme AUTH")
	}
	switch {
	case strings.Contains(diiklankan, "CRAM-MD5"):
		return smtp.CRAMMD5Auth(user, pass), nil
	case strings.Contains(diiklankan, "LOGIN") && !strings.Contains(diiklankan, "PLAIN"):
		return &loginAuth{username: user, password: pass, host: smtpHost}, nil
	default:
		return smtp.PlainAuth("", user, pass, smtpHost), nil
	}
}

// loginAuth adalah mekanisme SASL LOGIN: dua tantangan 334 berturut-turut, masing-masing
// dijawab satu baris kredensial. Plaintextnya identik dengan punya gomail (auth.go:10-46);
// nama tipenya dipertahankan supaya perbandingan dengan pustaka itu tetap terbaca.
type loginAuth struct {
	username string
	password string
	host     string
}

func (a *loginAuth) Start(server *smtp.ServerInfo) (string, []byte, error) {
	if !server.TLS {
		advertised := false
		for _, mekanisme := range server.Auth {
			if mekanisme == "LOGIN" {
				advertised = true
				break
			}
		}
		if !advertised {
			return "", nil, errors.New("mailer: koneksi tidak terenkripsi")
		}
	}
	if server.Name != a.host {
		return "", nil, fmt.Errorf("mailer: nama server %q bukan %q", server.Name, a.host)
	}
	return "LOGIN", nil, nil
}

// Next menerima tantangan yang sudah di-base64-decode oleh net/smtp (smtp.go:214), jadi yang
// dibandingkan di sini teks aslinya, bukan "VXNlcm5hbWU6".
func (a *loginAuth) Next(challenge []byte, more bool) ([]byte, error) {
	if !more {
		return nil, nil
	}
	switch teks := strings.ToLower(strings.TrimSpace(string(challenge))); {
	case strings.Contains(teks, "user"):
		return []byte(a.username), nil
	case strings.Contains(teks, "pass"):
		return []byte(a.password), nil
	default:
		return nil, fmt.Errorf("mailer: tantangan LOGIN tidak dikenal: %q", challenge)
	}
}

// newMessage memisahkan pembentukan pesan dari pengiriman supaya aturan Gmail bisa
// diuji tanpa menyentuh jaringan.
func newMessage(from string, to string, replyTo string, subject string, body string) *gomail.Message {
	m := gomail.NewMessage()

	// Gmail menolak From yang bukan akun yang diautentikasi; dari dulu nilai ini
	// dibakar sebagai literal, jadi pengirim non-Gmail akan selalu ditolak.
	m.SetHeader("From", from)
	m.SetHeader("To", to)
	// Reply-To supaya balasan admin sampai ke pengunjung, bukan ke akun pengirim.
	// Nilainya dari form, dan header tidak menerima sesuatu yang bukan alamat:
	// yang tidak lolos ParseAddress membuat header ini tidak dipasang sama sekali.
	if _, err := mail.ParseAddress(replyTo); err == nil {
		m.SetHeader("Reply-To", replyTo)
	}
	m.SetHeader("Subject", subject)
	m.SetBody("text/plain", body)

	return m
}
