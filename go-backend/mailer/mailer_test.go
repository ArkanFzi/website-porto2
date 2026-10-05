package mailer

import (
	"errors"
	"testing"
)

func TestSendEmailTanpaKredensialBerhentiSebelumSMTP(t *testing.T) {
	cases := []struct {
		nama string
		user string
		pass string
	}{
		{"keduanya kosong", "", ""},
		{"pass belum diisi", "pengirim@example.test", ""},
		{"user belum diisi", "", "rahasia"},
	}
	for _, c := range cases {
		t.Run(c.nama, func(t *testing.T) {
			t.Setenv("EMAIL_USER", c.user)
			t.Setenv("EMAIL_PASS", c.pass)
			if err := SendEmail("penerima@example.test", "halo", "isi"); !errors.Is(err, ErrNotConfigured) {
				t.Fatalf("harusnya ErrNotConfigured, dapat %v", err)
			}
		})
	}
}

func TestPengirimAdalahAkunYangDiautentikasi(t *testing.T) {
	m := newMessage("pengirim@example.test", "penerima@example.test", "Contact Form: uji", "pesan")

	for _, h := range []struct {
		field string
		want  string
	}{
		{"From", "pengirim@example.test"},
		{"To", "penerima@example.test"},
		{"Subject", "Contact Form: uji"},
	} {
		got := m.GetHeader(h.field)
		if len(got) != 1 || got[0] != h.want {
			t.Fatalf("header %s = %q, seharusnya [%q]", h.field, got, h.want)
		}
	}
}
