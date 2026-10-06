package mailer

import (
	"bytes"
	"errors"
	"strings"
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
			if err := SendEmail("penerima@example.test", "balas@example.test", "halo", "isi"); !errors.Is(err, ErrNotConfigured) {
				t.Fatalf("harusnya ErrNotConfigured, dapat %v", err)
			}
		})
	}
}

func TestPengirimAdalahAkunYangDiautentikasi(t *testing.T) {
	m := newMessage("pengirim@example.test", "penerima@example.test", "balas@example.test", "Contact Form: uji", "pesan")

	for _, h := range []struct {
		field string
		want  string
	}{
		{"From", "pengirim@example.test"},
		{"To", "penerima@example.test"},
		{"Reply-To", "balas@example.test"},
		{"Subject", "Contact Form: uji"},
	} {
		got := m.GetHeader(h.field)
		if len(got) != 1 || got[0] != h.want {
			t.Fatalf("header %s = %q, seharusnya [%q]", h.field, got, h.want)
		}
	}
}

// Reply-To datang dari input pengunjung. Yang bukan alamat tidak boleh menempel
// di header; sisanya harus tetap terkirim.
func TestReplyToBukanAlamatTidakMasukHeader(t *testing.T) {
	cases := []string{
		"",
		"bukan-alamat",
		"a b@example.test",
		"ok@example.test\r\nX-Injected: bukti",
		"\"quoted\r\nnewline\"@example.test",
		"ok@example.test\n",
	}
	for _, raw := range cases {
		m := newMessage("pengirim@example.test", "penerima@example.test", raw, "Contact Form: uji", "pesan")
		if got := m.GetHeader("Reply-To"); len(got) != 0 {
			t.Fatalf("replyTo %q masih menempel: %q", raw, got)
		}
		for _, wajib := range []string{"From", "To", "Subject"} {
			if len(m.GetHeader(wajib)) != 1 {
				t.Fatalf("replyTo %q merusak header %s", raw, wajib)
			}
		}
	}
}

// Batas bawah: gomail menetralkan CRLF di nilai header menjadi satu encoded-word,
// jadi pesan tidak pernah punya baris header tambahan. Test ini mengunci alasan
// TestReplyToBukanAlamatTidakMasukHeader adalah soal kebersihan header, bukan
// satu-satunya pagar antara input pengunjung dan SMTP.
func TestCRLFTidakMenjadiBarisHeaderBaru(t *testing.T) {
	m := newMessage("pengirim@example.test", "penerima@example.test", "x@example.test", "Contact Form: uji", "isi")
	m.SetHeader("Reply-To", "hit@example.test\r\nX-Injected: bukti")

	var b bytes.Buffer
	if _, err := m.WriteTo(&b); err != nil {
		t.Fatalf("WriteTo: %v", err)
	}
	block, _, _ := strings.Cut(b.String(), "\r\n\r\n")
	lines := strings.Split(block, "\r\n")

	n := 0
	for _, l := range lines {
		if strings.HasPrefix(strings.ToLower(l), "reply-to:") {
			n++
		}
	}
	if n != 1 {
		t.Fatalf("baris Reply-To = %d, seharusnya 1:\n%s", n, block)
	}
	for _, l := range lines {
		if strings.HasPrefix(l, "X-Injected") {
			t.Fatalf("header asing jadi baris sendiri:\n%s", block)
		}
	}
}
