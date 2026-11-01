import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MIN_TOTAL_MS,
  hopsDari,
  pecahanJejak,
  penggaris,
  panjangPx,
  totalMs,
} from "./jejakArsitektur.ts";

// Hukum garis waktu arsitektur dipakai dua penampil (baris DOM di panel dan jejak instans di
// panggung), jadi yang dikunci di sini adalah hukumnya: angka mana yang boleh jadi panjang,
// dan panjangnya harus kembali ke angka itu lewat penggaris yang sama.

describe("tidak ada bentuk tanpa angka", () => {
  it("tanpa bacaan tidak ada hop sama sekali", () => {
    assert.deepEqual(hopsDari(null, 3), []);
    assert.deepEqual(hopsDari(Number.NaN, 3), []);
  });

  it("PostgreSQL tidak pernah punya angka, jadi tidak pernah punya bentuk", () => {
    const hops = hopsDari(12, 4);
    const db = hops.find((h) => h.id === "database");
    assert.equal(db?.ms, null);
    assert.equal(panjangPx(db?.ms ?? null, 5), 0);
    assert.equal(pecahanJejak(db?.ms ?? null, totalMs(hops)), 0);
  });

  it("backend tidak tercapai: durasi backend tidak diukur, tidak dilukis", () => {
    const hops = hopsDari(800, null);
    const node = hops.find((h) => h.id === "node");
    const backend = hops.find((h) => h.id === "backend");
    // Seluruh waktu handler tetap terukur dan seluruhnya milik hop Node.
    assert.equal(node?.ms, 800);
    assert.equal(backend?.ms, null);
    assert.equal(totalMs(hops), 800);
    assert.equal(panjangPx(backend?.ms ?? null, 1), 0);
  });
});

describe("panjang segmen kembali ke angka yang diukur", () => {
  it("selisihnya hop Node, jumlah keduanya persis latencyMs", () => {
    const hops = hopsDari(12, 4);
    assert.equal(hops.find((h) => h.id === "node")?.ms, 8);
    assert.equal(hops.find((h) => h.id === "backend")?.ms, 4);
    assert.equal(totalMs(hops), 12);
  });

  it("rtt yang lebih besar dari total tidak melahirkan pembagian karangan", () => {
    // Server membulatkan kedua angka terpisah, jadi pembacaan yang tidak mungkin bisa
    // muncul dari payload yang diutak-atik. Yang boleh disimpan hanyalah totalnya.
    const hops = hopsDari(5, 6);
    assert.equal(hops.find((h) => h.id === "node")?.ms, 5);
    assert.equal(hops.find((h) => h.id === "backend")?.ms, null);
    assert.equal(totalMs(hops), 5);
    assert.equal(panjangPx(0, 20), 0);
  });

  it("satu penggaris: px dibagi kembali menjadi ms yang sama", () => {
    const hops = hopsDari(12, 4);
    const total = totalMs(hops);
    const pxPerMs = penggaris(300, total);
    assert.equal(pxPerMs, 300 / 12);
    for (const h of hops) {
      assert.equal(panjangPx(h.ms, pxPerMs) / pxPerMs, h.ms ?? 0);
    }
  });

  it("rasio dua segmen adalah rasio dua angka, bukan selera", () => {
    const hops = hopsDari(12, 4);
    const pxPerMs = penggaris(300, totalMs(hops));
    const node = panjangPx(hopsDari(12, 4)[0].ms, pxPerMs);
    const backend = panjangPx(hopsDari(12, 4)[1].ms, pxPerMs);
    assert.equal(node / backend, 8 / 4);
  });

  it("total kecil tidak memanjangkan penggaris: lantai MIN_TOTAL_MS", () => {
    const hops = hopsDari(3, 2);
    const total = totalMs(hops);
    assert.equal(total, 3);
    assert.equal(penggaris(200, total), 200 / MIN_TOTAL_MS);
    // Karena itu segmen 1 ms tidak pernah lebih panjang dari 1/8 anggaran.
    assert.ok(pecahanJejak(1, total) <= 1 / MIN_TOTAL_MS + 1e-12);
  });

  it("tanpa anggaran atau tanpa angka, penggarisnya nol", () => {
    assert.equal(penggaris(0, 12), 0);
    assert.equal(penggaris(300, 0), 0);
    assert.equal(pecahanJejak(-1, 12), 0);
    assert.equal(pecahanJejak(Number.NaN, 12), 0);
  });

  it("DOM dan panggung membaca pecahan yang sama", () => {
    const hops = hopsDari(12, 4);
    const total = totalMs(hops);
    const pxPerMs = penggaris(640, total);
    for (const h of hops) {
      const panggung = panjangPx(h.ms, pxPerMs) / 640;
      assert.ok(Math.abs(pecahanJejak(h.ms, total) - panggung) < 1e-12);
    }
  });
});
