package mailer

import (
	"bufio"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"fmt"
	"math/big"
	"net"
	"testing"
	"time"
)

// Kedua stub SMTP di paket ini dulu berbicara plaintext penuh, dan mailer.go membiarkannya:
// `if ok { StartTLS }` berarti server tanpa STARTTLS lolos sampai AUTH. Begitu jalur itu
// ditutup, setiap stub yang ingin sampai ke AUTH harus bisa naik ke TLS — file ini tempat
// plumbing itu tinggal, supaya kedua stub tidak menyalin generate-sertifikat.

// sertifikatTLSStub membuat sertifikat self-signed yang berlaku untuk 127.0.0.1, plus pool yang
// memercayainya. Kunci dan sertifikatnya hanya hidup di dalam proses test: tidak ada yang ditulis
// ke disk, dan tidak ada yang dipercaya di luar test ini.
func sertifikatTLSStub(t *testing.T) (tls.Certificate, *x509.CertPool) {
	t.Helper()

	kunci, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}

	template := &x509.Certificate{
		SerialNumber:          big.NewInt(1),
		Subject:               pkix.Name{CommonName: "stub.test"},
		NotBefore:             time.Now().Add(-time.Hour),
		NotAfter:              time.Now().Add(time.Hour),
		KeyUsage:              x509.KeyUsageDigitalSignature | x509.KeyUsageCertSign,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		BasicConstraintsValid: true,
		IsCA:                  true,
		IPAddresses:           []net.IP{net.ParseIP("127.0.0.1")},
	}

	der, err := x509.CreateCertificate(rand.Reader, template, template, &kunci.PublicKey, kunci)
	if err != nil {
		t.Fatalf("create certificate: %v", err)
	}

	parsed, err := x509.ParseCertificate(der)
	if err != nil {
		t.Fatalf("parse certificate: %v", err)
	}

	pool := x509.NewCertPool()
	pool.AddCert(parsed)

	return tls.Certificate{Certificate: [][]byte{der}, PrivateKey: kunci}, pool
}

// pasangCAStub menyuntik pool ke tlsRootCAs — jalur mailer.go memakai RootCAs sistem kalau
// variabelnya nil — dan mengembalikannya setelah test supaya tidak ada test yang mewarisi CA
// stub milik test lain.
func pasangCAStub(t *testing.T, pool *x509.CertPool) {
	t.Helper()

	lama := tlsRootCAs
	t.Cleanup(func() { tlsRootCAs = lama })
	tlsRootCAs = pool
}

// naikTLS menjawab 220 untuk STARTTLS lalu mengganti saluran plaintext dengan koneksi TLS
// server-side. Error dikembalikan, bukan t.Fatalf: pemanggilnya berjalan di goroutine server,
// dan *testing.T tidak boleh dipakai dari sana. Saluran yang lama berhenti disentuh begitu
// handshake mulai, sesuai aturan RFC 3207.
func naikTLS(s *saluranStub) error {
	fmt.Fprintf(s.conn, "220 Ready to start TLS\r\n")
	tlsConn := tls.Server(s.conn, &tls.Config{Certificates: []tls.Certificate{s.cert}})
	if err := tlsConn.Handshake(); err != nil {
		return err
	}
	s.conn = tlsConn
	s.r = bufio.NewReader(tlsConn)
	return nil
}

// saluranStub adalah conn+reader yang bisa ditukar di tengah percakapan — kebutuhan yang tidak
// ada selama stub hanya plaintext, dan wajib ada begitu STARTTLS ikut dimainkan.
type saluranStub struct {
	conn net.Conn
	r    *bufio.Reader
	cert tls.Certificate
}
