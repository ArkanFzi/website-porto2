package main

import (
	"testing"
	"time"
)

func newBatas() *pembatasLaju {
	return &pembatasLaju{token: kontakBurst, burst: kontakBurst, refill: kontakRefillEach}
}

// Burst harus persis kontakBurst, tidak lebih dan tidak kurang: kalau ledakan pertama
// bisa menembus 11, remnya bukan rem.
func TestPembatasLajuBurstTepat(t *testing.T) {
	p := newBatas()
	t0 := time.Unix(1700000000, 0)
	diterima := 0
	for i := 0; i < kontakBurst+3; i++ {
		if p.boleh(t0) {
			diterima++
		}
	}
	if diterima != kontakBurst {
		t.Fatalf("pada satu titik waktu: harap %d diterima, dapat %d", kontakBurst, diterima)
	}
}

// Satu token per kontakRefillEach, bukan per permintaan: setelah 90 detik hanya satu
// yang boleh lewat, setelah 120 detik dua.
func TestPembatasLajuPulihSesuaiJendela(t *testing.T) {
	p := newBatas()
	t0 := time.Unix(1700000000, 0)
	for i := 0; i < kontakBurst; i++ {
		if !p.boleh(t0) {
			t.Fatalf("token ke-%d ditolak padahal burst belum habis", i+1)
		}
	}
	if p.boleh(t0) {
		t.Fatal("masih menerima setelah burst habis pada waktu yang sama")
	}
	if p.boleh(t0.Add(30 * time.Second)) {
		t.Fatal("pulih dalam 30 detik, harap 60")
	}
	if !p.boleh(t0.Add(60 * time.Second)) {
		t.Fatal("tidak pulih setelah satu jendela refill")
	}
	if p.boleh(t0.Add(90 * time.Second)) {
		t.Fatal("pulih dua token dalam 90 detik, harap satu")
	}
	if !p.boleh(t0.Add(120 * time.Second)) {
		t.Fatal("token kedua tidak muncul setelah dua jendela")
	}
}

// Waktu kosong tidak menambah token: tanpa batas atas ini, satu proses yang menganggur
// semalaman punya ledakan tak terbatas pada jam pertama.
func TestPembatasLajuTidakMenumpukLebihDariBurst(t *testing.T) {
	p := newBatas()
	t0 := time.Unix(1700000000, 0)
	diterima := 0
	for i := 0; i < kontakBurst*3; i++ {
		if p.boleh(t0.Add(24 * time.Hour)) {
			diterima++
		}
	}
	if diterima != kontakBurst {
		t.Fatalf("setelah sehari menganggur: harap %d diterima, dapat %d", kontakBurst, diterima)
	}
}

// Jam kontainer bisa mundur karena koreksi NTP. Satu lompatan mundur tidak boleh
// menghapus token yang sudah ada.
func TestPembatasLajuJamMundurTidakMengunci(t *testing.T) {
	p := newBatas()
	t0 := time.Unix(1700000000, 0)
	for i := 0; i < kontakBurst-1; i++ {
		p.boleh(t0)
	}
	if !p.boleh(t0.Add(-time.Hour)) {
		t.Fatal("jam mundur satu jam membuat rute terkunci")
	}
}

// Pembatas dipakai bersama dari banyak goroutine; tanpa mutex angka burst di atas
// hanya berlaku kebetulan. Semua panggilan memakai titik waktu yang sama, jadi jumlahnya
// pasti: yang lewat persis burst, bukan cuma "tidak lebih dari burst".
func TestPembatasLajuAmanUntukConcurrency(t *testing.T) {
	p := newBatas()
	t0 := time.Unix(1700000000, 0)
	diterima := make(chan bool, kontakBurst*4)
	for i := 0; i < kontakBurst*4; i++ {
		go func() { diterima <- p.boleh(t0) }()
	}
	ya := 0
	for i := 0; i < kontakBurst*4; i++ {
		if <-diterima {
			ya++
		}
	}
	if ya != kontakBurst {
		t.Fatalf("concurrency merusak hitungan: %d diterima dari burst %d", ya, kontakBurst)
	}
}
