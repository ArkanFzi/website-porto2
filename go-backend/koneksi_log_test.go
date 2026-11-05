package main

import (
	"strings"
	"testing"
)

// Log boot tidak boleh mengulang identitas koneksi. Rantainya di bawah adalah pesan nyata dari
// pgx saat Postgres mati (diukur, bukan dirangkai): nama pengguna + alamat instance mengikuti
// "failed to connect to", dan itu yang tidak boleh masuk log Cloud Run.

const pesanPgxTerukur = "failed to connect to `user=porto_admin database=portfolio`: " +
	"127.0.0.1:65432 (127.0.0.1): dial error: dial tcp 127.0.0.1:65432: connect: connection refused"

func TestSebabKoneksiMembuangIdentitas(t *testing.T) {
	got := sebabKoneksi(pesanPgxTerukur)
	harap := "127.0.0.1:65432 (127.0.0.1): dial error: dial tcp 127.0.0.1:65432: connect: connection refused"
	if got != harap {
		t.Fatalf("sebab tidak terpotong benar:\n  dapat %q\n  harap %q", got, harap)
	}
	if !strings.Contains(got, "connection refused") {
		t.Errorf("sebabnya ikut hilang: %q", got)
	}
	for _, bocor := range []string{"porto_admin", "database=portfolio"} {
		if strings.Contains(got, bocor) {
			t.Errorf("identitas masih ikut tercetak: %q", got)
		}
	}
}

// Bentuk pesan lain tidak boleh kehilangan sebabnya: penyensoran ini best-effort, dan kegagalan
// yang diam lebih mahal daripada kegagalan yang menyebut nama pengguna.
func TestSebabKoneksiPesanTanpaKonfigurasi(t *testing.T) {
	got := sebabKoneksi("password authentication failed")
	if got != "password authentication failed" {
		t.Fatalf("pesan tanpa backtick diubah jadi %q", got)
	}
}
