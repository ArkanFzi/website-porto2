import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { LABEL_BAHASA, logoUntuk, type BahasaId } from "../data/logoBahasa.ts";
import { PATH_BAHASA } from "../data/logoPath.ts";
import { METRIK_KARTU } from "../data/metrikKartu.ts";

// Whitelist bentuk adalah satu-satunya tempat "bahasa dominan" bertemu geometri, dan ia
// dikepang dengan generator lewat STRING, bukan lewat tipe. Kalau salah satu sisi berubah
// nama — PETA_EKSTENSI menulis "Typescript", atau path simple-icons disalin ulang sampai
// beda satu karakter — kegagalannya senyap di layar: baris itu kehilangan objeknya dan
// tetap tercetak normal. Test ini yang membuatnya berisik.
//
// Bentuknya dipecah dua berkas karena satu alasan yang bisa diuji: aturan koreografi harus
// boleh bertanya "bahasa ini punya bentuk?" tanpa menarik ±4,4 KB path SVG ke chunk awal.
// Jadi logoBahasa.ts = whitelist + nama (ringan, impor di mana saja), logoPath.ts = geometri
// (hanya subtree kanvas). Pemecahan itu sendiri dijaga oleh test terakhir di bawah.
//
// Yang TIDAK diuji di sini dan memang tidak bisa: jumlah segitiga dan determinisme
// ekstrusi. Bentuknya dibangun oleh SVGLoader yang butuh DOMParser, dan Node tidak punya
// DOM (tidak ada jsdom/linkedom di repo ini, dan menambahnya hanya demi test jauh lebih
// mahal dari yang diuji). Itu diukur di browser lewat docs/verify/ekstra-probe.mjs seksi 10b.

const ID = Object.keys(PATH_BAHASA) as BahasaId[];

describe("data logo hanya boleh berisi path resmi yang utuh", () => {
  it("setiap entri satu path SVG dalam viewBox 24×24", () => {
    assert.ok(ID.length >= 1, "peta logo kosong");
    for (const id of ID) {
      const logo = PATH_BAHASA[id];
      assert.equal(logo.viewBox, "0 0 24 24", `${id}: viewBox berubah, skala bentuk ikut`);
      assert.ok(logo.d.startsWith("M"), `${id}: path harus dimulai dengan M`);
      // Bentuk yang sah tidak pernah mengandung markup: ini penjaga terhadap salinan
      // yang keliru menempel seluruh berkas SVG, bukan hanya atribut d-nya.
      assert.ok(!logo.d.includes("<"), `${id}: ada markup di dalam data path`);
      const label = LABEL_BAHASA[id];
      assert.ok(label.length > 0 && label === label.trim(), `${id}: label kosong`);
    }
  });

  it("whitelist nama dan peta bentuk berisi bahasa yang sama persis", () => {
    // Kalau salah satu sisi bertambah sendiri, kegagalannya senyap: nama tanpa path
    // berarti baris yang memanggil objek dan tidak menemukan bentuknya, path tanpa nama
    // berarti geometri yang tak akan pernah terpasang.
    assert.deepEqual(Object.keys(PATH_BAHASA).sort(), Object.keys(LABEL_BAHASA).sort());
  });

  it("byte path sama dengan yang dicatat di berkas atribusi", () => {
    const lisensi = readFileSync(new URL("../data/logoBahasa-LICENSE.txt", import.meta.url), "utf8");
    for (const id of ID) {
      const sha = createHash("sha256").update(PATH_BAHASA[id].d).digest("hex");
      assert.ok(lisensi.includes(sha), `${id}: sha256 ${sha} tidak tercatat di LICENSE — data berubah dari sumber`);
    }
  });
});

describe("pemetaan nama terukur ke bentuk", () => {
  it("kenal huruf besar/kecil dan tolak bahasa tanpa bentuk", () => {
    for (const id of ID) {
      const label = LABEL_BAHASA[id];
      assert.equal(logoUntuk(label), id, `${label} harus memetakan ke ${id}`);
      assert.equal(logoUntuk(label.toLowerCase()), id, "pencocokan tidak boleh peka kasus");
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
      assert.ok(nama.has(LABEL_BAHASA[id]), `${LABEL_BAHASA[id]} tidak mungkin dihasilkan generator`);
    }
  });

  it("aturan panggung bertanya tanpa menarik data path ke chunk awal", () => {
    // Ini test pemecahan berkas, bukan selera: koreografi.ts adalah satu dari sedikit modul
    // yang diimpor DOM Editorial DAN kanvas. Kalau ia mengimpor logoPath.ts, ±4,4 KB SVG
    // masuk chunk awal dan tidak ada yang melihatnya — chunk kanvas di-dynamic(), jadi
    // perf-budget.mjs buta terhadap beban itu. Yang boleh diimpor hanyalah whitelist.
    const aturan = readFileSync(
      new URL("../components/Three/stage/koreografi.ts", import.meta.url),
      "utf8",
    );
    // Specifier-nya boleh alias "@/data/..." atau relative "../../../data/..." (yang kedua
    // dipakai di sana karena koreografi.test.ts dijalankan `node --test`, dan Node tidak
    // mengenal alias dari tsconfig) — yang diuji adalah MODUL-nya, bukan gayanya.
    assert.match(
      aturan,
      /from "(?:@\/data|\.\.\/\.\.\/\.\.\/data)\/logoBahasa(\.ts)?"/,
      "koreografi harus mengimpor whitelist, bukan bentuk",
    );
    assert.ok(
      !/logoPath/.test(aturan),
      "koreografi mengimpor logoPath: SVG masuk ke chunk awal",
    );
    const ringan = readFileSync(new URL("../data/logoBahasa.ts", import.meta.url), "utf8");
    assert.ok(!ringan.includes("viewBox"), "data path bocor ke modul whitelist");
  });
});
