package mailer

import (
	"gopkg.in/gomail.v2"
	"os"
)

func SendEmail(to string, subject string, body string) error {
	// Create a new message
	m := gomail.NewMessage()

	m.SetHeader("From", "muhammadarkanfauzi9@gmail.com")
	m.SetHeader("To", to)
	m.SetHeader("Subject", subject)

	m.SetBody("text/plain", body)

	user := os.Getenv("EMAIL_USER")
	pass := os.Getenv("EMAIL_PASS")
	// Send the email
	d := gomail.NewDialer("smtp.gmail.com", 587, user, pass)

	if err := d.DialAndSend(m); err != nil {
		return err
	}
	return nil
}
