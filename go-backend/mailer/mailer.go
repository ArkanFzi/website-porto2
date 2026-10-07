package mailer

import (
	"errors"
	"net/mail"
	"os"

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

// SendEmail mengirim pesan ke satu penerima. Bind deadline TIDAK ada di sini: gomail.v2
// hanya membatasi koneksi TCP (10s, hardcoded di smtp.go:61 Dial()) dan Dialer tidak
// punya field Timeout — `d.Timeout undefined (type *gomail.Dialer has no field or method
// Timeout)` — jadi percakapan SMTP setelah koneksi terbentuk bisa menggantung tanpa batas
// dan tidak ada pegangan dari luar untuk memotongnya. Yang menahan adalah pemanggilnya:
// main.go menghitung kiriman ini di WaitGroup dan memberi batas total saat proses ditutup.
func SendEmail(to string, replyTo string, subject string, body string) error {
	user := os.Getenv("EMAIL_USER")
	pass := os.Getenv("EMAIL_PASS")
	if user == "" || pass == "" {
		return ErrNotConfigured
	}

	d := gomail.NewDialer(smtpHost, smtpPort, user, pass)
	return d.DialAndSend(newMessage(user, to, replyTo, subject, body))
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
