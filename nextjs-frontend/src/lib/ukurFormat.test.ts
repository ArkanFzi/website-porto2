import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { peringkatPerBaris, saringMetrik, barisKartu } from "./ukurFormat.ts";
import { BATAS_USIA_HARI } from "../data/metrikKartu.ts";
import { METRIK_KARTU } from "../data/metrikKartu.ts";
import type { MetrikKartu } from "../data/metrikKartu.ts";

// `saringMetrik` adalah satu-satunya gerbang antara artefak ukur dan angka yang tercetak di
// kartu. Test ini mengunci hukum "gelap lebih jujur dari angka tanpa sumber", termasuk bentuk
// kegagalan yang tidak kelihatan: stempel yang tidak terbaca menghasilkan NaN, dan
// `NaN > batas` itu false — tanpa penjaga eksplisit kartu justru mencetak angka lama seolah
// baru diukur. Hari tetap dipakai sebagai satuan karena `batasUsiaHari` memang dalam hari.

const HARI_MS = 86_400_000;
const SAI = Date.parse("2026-11-03T00:00:00.000Z");

const kartu = (dihasilkanPada: string, batasUsiaHari = BATAS_USIA_HARI): MetrikKartu => ({
  versi: 1,
  dihasilkanPada,
  batasUsiaHari,
  kartu: {
    "01": { jumlah: 6, nama: ["noir-clock@arkan"], sumber: "fixtures test" },
    "02": null,
    "03": null,
    "04": null,
    "05": null,
  },
  bahasa: { "01": null, "02": null, "03": null, "04": null, "05": null },
});

describe("umur artefak menentukan kartu tercetak atau tidak", () => {
  it("artefak segar mengembalikan kartunya sendiri, bukan salinan kosong", () => {
    const m = kartu(new Date(SAI - HARI_MS).toISOString());
    assert.equal(saringMetrik(m, SAI), m.kartu);
    assert.equal(barisKartu("01", saringMetrik(m, SAI)), "6 EKSTENSI DALAM-PROSES · TANPA DAEMON");
  });

  it("artefak lewat batas usia membuat kartu gelap", () => {
    const m = kartu(new Date(SAI - (BATAS_USIA_HARI + 1) * HARI_MS).toISOString());
    assert.equal(saringMetrik(m, SAI), null);
    // Gelap harus merambat sampai kalimat: kartu tanpa angka tidak boleh punya baris kecil.
    assert.equal(barisKartu("01", saringMetrik(m, SAI)), null);
  });

  it("tepat di batas masih dianggap terukur — hukumnya `>`, bukan `>=`", () => {
    const m = kartu(new Date(SAI - BATAS_USIA_HARI * HARI_MS).toISOString());
    assert.notEqual(saringMetrik(m, SAI), null);
  });
});

describe("stempel yang tidak terbaca tidak pernah meluluskan angka", () => {
  for (const [label, stempel] of [
    ["hilang", ""],
    ["null dipaksa jadi string", String(null)],
    ["bukan tanggal", "kemarin"],
  ] as const) {
    it(`stempel ${label} membuat kartu gelap, bukan mencetak angka lama`, () => {
      assert.equal(saringMetrik(kartu(stempel), SAI), null);
    });
  }
});

describe("strip menyebut SELURUH peringkat bahasa, bukan hanya yang menang", () => {
  const BARIS = ["01", "02", "03", "04", "05"] as const;

  it("artefak gelap membuat kalimatnya hilang, bukan kosong", () => {
    assert.deepEqual(peringkatPerBaris(null), [null, null, null, null, null]);
  });

  it("kalimatnya memuat pemenang, runner-up, dan rasio yang sama dengan artefaknya", () => {
    const kalimat = peringkatPerBaris({ bahasa: METRIK_KARTU.bahasa });
    for (const [i, indeks] of BARIS.entries()) {
      const u = METRIK_KARTU.bahasa[indeks];
      if (!u) {
        assert.equal(kalimat[i], null, `${indeks}: tidak terukur tapi kalimatnya terkarang`);
        continue;
      }
      const k = kalimat[i]!;
      assert.ok(k.startsWith(`${u.bahasa} `), `${indeks}: harus dimulai dengan bahasa dominan`);
      for (const p of u.peringkat.slice(1)) {
        assert.ok(k.includes(p.bahasa), `${indeks}: ${p.bahasa} tidak ikut tercetak`);
      }
      if (u.peringkat.length > 1) {
        const rasio = (u.byte / u.peringkat[1].byte).toFixed(2).replace(".", ",");
        assert.ok(k.includes(`unggul ${rasio}× atas ${u.peringkat[1].bahasa}`), `${indeks}: ${k}`);
      } else {
        assert.ok(!k.includes("unggul"), `${indeks}: rasio tanpa pembanding`);
        assert.ok(k.includes("tidak ada bahasa lain yang terklasifikasi"), `${indeks}: ${k}`);
      }
      assert.ok(k.includes(`${u.jumlahBerkas} berkas`), `${indeks}: korpus tidak disebut`);
    }
  });

  it("keunggulan tipis /02 tetap terbaca sebagai angka", () => {
    // Alasan baris ini ada: "TypeScript" saja menyamarkan bahwa Pickertime hanya unggul
    // tipis atas JavaScript. Yang diuji bukan nilainya (itu data), tapi bahwa selisihnya
    // ikut tercetak.
    const u = METRIK_KARTU.bahasa["02"];
    assert.ok(u && u.peringkat.length > 1, "artefak /02 berubah bentuk");
    const k = peringkatPerBaris({ bahasa: METRIK_KARTU.bahasa })[1]!;
    assert.match(k, /unggul \d+,\d\d× atas /);
  });
});
