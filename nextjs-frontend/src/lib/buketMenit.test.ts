import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BATAS_MS,
  JUMLAH_BUKET,
  isiSlot,
  jadiBuket,
  kunciMenit,
  pecahanTinggi,
  rasioAmbang,
  selisihMenit,
  tambunBaru,
  tambahLaporan,
  tinggiBilah,
} from "./buketMenit.ts";

// Hukum bentuk bilah hidup di satu modul dan dipakai dua sisi (panel DOM dan panggung WebGL),
// jadi test ini mengunci HUKUMNYA, bukan tangkapan layar. Yang di bawah adalah klaim yang kalau
// sampai salah, dua lukisan berhenti menceritakan angka yang sama.

describe("tidak ada bentuk tanpa angka", () => {
  it("rasio nol menghasilkan tinggi nol, bukan bilah pendek", () => {
    assert.equal(tinggiBilah(0), 0);
    assert.equal(pecahanTinggi(0), 0);
  });

  it("nilai yang tidak masuk akal juga tidak berbentuk", () => {
    assert.equal(tinggiBilah(-5), 0);
    assert.equal(tinggiBilah(Number.NaN), 0);
    // Infinity bukan "sangat tinggi": tanpa angka yang nyata tidak ada yang boleh digambar.
    assert.equal(tinggiBilah(Number.POSITIVE_INFINITY), 0);
  });

  it("gumpalan tanpa laporan tidak punya tinggi di sisi mana pun", () => {
    const kosong = jadiBuket(tambunBaru("2026-11-02T07:05"));
    assert.equal(kosong.laporan, 0);
    assert.equal(tinggiBilah(rasioAmbang(kosong.p95RerataMs)), 0);
  });
});

describe("linear di bawah ambang, dipadatkan di atasnya", () => {
  it("p95 tepat di ambang 33 ms = tinggi dasar", () => {
    assert.equal(rasioAmbang(BATAS_MS), 1);
    assert.equal(tinggiBilah(1), 1);
  });

  it("setengah ambang = setengah tinggi (tidak ada kurva yang ditutup-tutupi)", () => {
    assert.equal(tinggiBilah(0.5), 0.5);
  });

  it("kelebihan di atas ambang tetap terbaca sebagai kelebihan", () => {
    assert.equal(tinggiBilah(2), 1.35);
    assert.ok(tinggiBilah(2) < tinggiBilah(3), "makin lambat harus makin tinggi");
  });

  it("langit-langit menahan bilah tapi tidak meratakan overshoot di bawahnya", () => {
    const jenuh = tinggiBilah(1_000);
    assert.ok(tinggiBilah(3) < jenuh);
    assert.equal(tinggiBilah(10_000), jenuh);
  });
});

describe("DOM dan WebGL menggambar angka yang sama", () => {
  it("pecahan tinggi adalah tinggi yang sama dengan pembagi jenuh yang sama", () => {
    const jenuh = tinggiBilah(1_000);
    for (const r of [0.2, 0.5, 1, 1.7, 3, 500]) {
      assert.ok(
        Math.abs(pecahanTinggi(r) * jenuh - tinggiBilah(r)) < 1e-12,
        `r=${r}: dua sisi memakai konstanta yang berbeda`
      );
    }
    assert.equal(pecahanTinggi(1_000), 1);
  });
});

describe("gumpalan ditaruh di slot menit yang benar", () => {
  it("kunci menit dipangkas sampai menit, UTC eksplisit", () => {
    assert.equal(kunciMenit(0), "1970-01-01T00:00Z");
    assert.equal(kunciMenit(90_000), "1970-01-01T00:01Z");
    assert.equal(kunciMenit(119_999), "1970-01-01T00:01Z");
  });

  // Regresinya nyata: kunci tanpa "Z" diparsing JavaScript sebagai waktu lokal, jadi browser
  // WIB melihat menit server 7 jam di masa lalu dan seluruh deret jatuh keluar jendela.
  it("kunci menit dipahami sebagai UTC di zona apa pun", () => {
    const jam = Date.UTC(2026, 10, 2, 7, 5, 12);
    assert.equal(selisihMenit(kunciMenit(jam), new Date(jam).toISOString()), 0);
    assert.equal(selisihMenit(kunciMenit(jam - 120_000), new Date(jam).toISOString()), 2);
  });

  it("selisih menit dihitung tanpa perlu zona waktu", () => {
    assert.equal(selisihMenit("2026-11-02T07:03Z", "2026-11-02T07:05Z"), 2);
    assert.equal(selisihMenit("2026-11-02T07:05Z", "2026-11-02T07:05Z"), 0);
  });

  it("menit ini ada di kanan, menit tanpa laporan tetap ada tapi kosong", () => {
    const kini = "2026-11-02T07:05Z";
    const slot = isiSlot(
      [
        { ...jadiBuket(tambunBaru("2026-11-02T07:05Z")), laporan: 1, p95RerataMs: 40 },
        { ...jadiBuket(tambunBaru("2026-11-02T07:03Z")), laporan: 1, p95RerataMs: 20 },
      ],
      kini
    );
    assert.equal(slot.length, JUMLAH_BUKET);
    assert.equal(slot[5]?.menit, "2026-11-02T07:05Z");
    assert.equal(slot[3]?.menit, "2026-11-02T07:03Z");
    // Slot yang tidak berisi tidak boleh digambar apa pun: null, bukan nol yang jadi bilah.
    assert.deepEqual(
      slot.map((s, i) => (s === null ? i : -1)).filter((i) => i >= 0),
      [0, 1, 2, 4]
    );
  });

  it("menit yang sudah keluar jendela dibuang, bukan dirapatkan ke kiri", () => {
    const slot = isiSlot([{ ...jadiBuket(tambunBaru("2026-11-02T06:50Z")), laporan: 1 }], "2026-11-02T07:05Z");
    assert.ok(slot.every((s) => s === null));
  });
});

describe("isi gumpalan adalah rerata lintas laporan", () => {
  it("dua laporan dalam satu menit menjadi satu angka yang bisa dijelaskan", () => {
    const t = tambunBaru("2026-11-02T07:05");
    tambahLaporan(t, { fps: 60, medianMs: 16, p95Ms: 30, over33ms: 2, frames: 300 });
    tambahLaporan(t, { fps: 51.2, medianMs: 20, p95Ms: 36, over33ms: 5, frames: 100 });
    const b = jadiBuket(t);
    assert.equal(b.laporan, 2);
    assert.equal(b.frame, 400);
    assert.equal(b.medianRerataMs, 18);
    assert.equal(b.p95RerataMs, 33, "rerata, bukan persentil lintas frame — namanya harus jujur");
    assert.equal(b.fpsTerendah, 51.2, "yang rendah yang dipakai, bukan yang rata-rata");
    assert.equal(b.shareLambatPct, 1.8);
    // p95 rerata 33 ms = tepat ambang = tinggi dasar, di kedua sisi.
    assert.equal(tinggiBilah(rasioAmbang(b.p95RerataMs)), 1);
  });
});
