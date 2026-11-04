import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { LOGO_BAHASA, logoUntuk, type BahasaId } from "../data/logoBahasa.ts";
import { METRIK_KARTU } from "../data/metrikKartu.ts";

// Whitelist bentuk adalah satu-satunya tempat "bahasa dominan" bertemu geometri, dan ia
// dikepang dengan generator lewat STRING, bukan lewat tipe. Kalau salah satu sisi berubah
// nama — PETA_EKSTENSI menulis "Typescript", atau path simple-icons disalin ulang sampai
// beda satu karakter — kegagalannya senyap di layar: baris itu kehilangan objeknya dan
// tetap tercetak normal. Test ini yang membuatnya berisik.
//
// Yang TIDAK diuji di sini dan memang tidak bisa: jumlah segitiga dan determinisme
// ekstrusi. Bentuknya dibangun oleh SVGLoader yang butuh DOMParser, dan Node tidak punya
// DOM (tidak ada jsdom/linkedom di repo ini, dan menambahnya hanya demi test jauh lebih
// mahal dari yang diuji). Itu diukur di browser lewat docs/verify/ekstra-probe.mjs seksi 10b.

const ID = Object.keys(LOGO_BAHASA) as BahasaId[];

describe("data logo hanya boleh berisi path resmi yang utuh", () => {
  it("setiap entri satu path SVG dalam viewBox 24×24", () => {
    assert.ok(ID.length >= 1, "peta logo kosong");
    for (const id of ID) {
      const logo = LOGO_BAHASA[id];
      assert.equal(logo.viewBox, "0 0 24 24", `${id}: viewBox berubah, skala bentuk ikut`);
      assert.ok(logo.d.startsWith("M"), `${id}: path harus dimulai dengan M`);
      // Bentuk yang sah tidak pernah mengandung markup: ini penjaga terhadap salinan
      // yang keliru menempel seluruh berkas SVG, bukan hanya atribut d-nya.
      assert.ok(!logo.d.includes("<"), `${id}: ada markup di dalam data path`);
      assert.ok(logo.label.length > 0 && logo.label === logo.label.trim(), `${id}: label kosong`);
    }
  });

  it("byte path sama dengan yang dicatat di berkas atribusi", () => {
    const lisensi = readFileSync(new URL("../data/logoBahasa-LICENSE.txt", import.meta.url), "utf8");
    for (const id of ID) {
      const sha = createHash("sha256").update(LOGO_BAHASA[id].d).digest("hex");
      assert.ok(lisensi.includes(sha), `${id}: sha256 ${sha} tidak tercatat di LICENSE — data berubah dari sumber`);
    }
  });
});

describe("pemetaan nama terukur ke bentuk", () => {
  it("kenal huruf besar/kecil dan tolak bahasa tanpa bentuk", () => {
    for (const id of ID) {
      const logo = LOGO_BAHASA[id];
      assert.equal(logoUntuk(logo.label), id, `${logo.label} harus memetakan ke ${id}`);
      assert.equal(logoUntuk(logo.label.toLowerCase()), id, "pencocokan tidak boleh peka kasus");
    }
    // Bash menang di beberapa korpus sebagai runner-up dan bisa saja dominan nanti; ia
    // sengaja tidak punya bentuk, dan null adalah jawaban yang benar — bukan tebakan.
    assert.equal(logoUntuk("Bash"), null);
    assert.equal(logoUntuk("Rust"), null);
    assert.equal(logoUntuk(""), null);
    assert.equal(logoUntuk(null), null);
    assert.equal(logoUntuk(undefined), null);
  });

  it("setiap bahasa yang terukur di artefak punya bentuk", () => {
    const terukur = Object.values(METRIK_KARTU.bahasa).filter((b) => b !== null);
    assert.ok(terukur.length > 0, "artefak tidak membawa pengukuran bahasa sama sekali");
    for (const ukur of terukur) {
      assert.notEqual(logoUntuk(ukur.bahasa), null, `${ukur.bahasa} terukur tapi tidak ada bentuknya`);
    }
  });

  it("setiap bentuk yang dijanjikan bisa benar-benar diukur generator", () => {
    // Sumber kebenaran nama ada di PETA_EKSTENSI generator. Logo yang tidak pernah bisa
    // muncul dari sana adalah kode mati yang mengira dirinya fitur.
    const generator = readFileSync(new URL("../../../tools/ci/ukur-kartu.mjs", import.meta.url), "utf8");
    const blok = generator.match(/const PETA_EKSTENSI = \{([\s\S]*?)\};/);
    assert.ok(blok, "PETA_EKSTENSI tidak ditemukan di generator — test ini harus ditinjau");
    const nama = new Set([...blok![1].matchAll(/:\s*'([^']+)'/g)].map((m) => m[1]));
    for (const id of ID) {
      assert.ok(nama.has(LOGO_BAHASA[id].label), `${LOGO_BAHASA[id].label} tidak mungkin dihasilkan generator`);
    }
  });
});
