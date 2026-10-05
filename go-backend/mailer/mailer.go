package mailer

import (
	"errors"
	"os"

	"gopkg.in/gomail.v2"
)

// ErrNotConfigured membedakan "kredensial memang belum terpasang" dari SMTP yang
// menolak. Tanpa pembeda ini setiap pesan membuka koneksi ke Gmail untuk sesuatu
// yang pasti gagal, dan log-nya menyebut itu "gagal kirim".
var ErrNotConfigured = errors.New("EMAIL_USER/EMAIL_PASS belum terpasang")

func SendEmail(to string, subject string, body string) error {
	user := os.Getenv("EMAIL_USER")
	pass := os.Getenv("EMAIL_PASS")
	if user == "" || pass == "" {
		return ErrNotConfigured
	}

	d := gomail.NewDialer("smtp.gmail.com", 587, user, pass)
	return d.DialAndSend(newMessage(user, to, subject, body))
}

// newMessage memisahkan pembentukan pesan dari pengiriman supaya aturan Gmail bisa
// diuji tanpa menyentuh jaringan.
func newMessage(from string, to string, subject string, body string) *gomail.Message {
	m := gomail.NewMessage()

	// Gmail menolak From yang bukan akun yang diautentikasi; dari dulu nilai ini
	// dibakar sebagai literal, jadi pengirim non-Gmail akan selalu ditolak.
	m.SetHeader("From", from)
	m.SetHeader("To", to)
	m.SetHeader("Subject", subject)
	m.SetBody("text/plain", body)

	return m
}
