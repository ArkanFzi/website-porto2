// ────────────────────────────────────────────────────────────────────────────
// Whitelist bahasa yang PUNYA bentuk logo di panggung, dan nama persisnya
// seperti yang dikeluarkan generator. Berkas ini sengaja TIDAK menyimpan data
// path (itu ada di logoPath.ts): aturan koreografi mengimpornya, dan aturan itu
// dipakai juga oleh komponen DOM di chunk awal. Satu path SVG ±1 KB, empat-nya
// ±4,4 KB — cukup untuk membuat "hanya kanvas yang menanggung SVG" jadi bohong.
//
// Sumber nama: tools/ci/ukur-kartu.mjs PETA_EKSTENSI; sumber geometri:
// simple-icons CC0-1.0, lihat logoBahasa-LICENSE.txt.
// ────────────────────────────────────────────────────────────────────────────

/** Kunci tetap (closed whitelist). Bahasa yang tidak ada di sini TIDAK punya
 *  objek — ia mengembalikan null dan barisnya tetap berupa kartu, bukan tebakan
 *  bentuk. */
export type BahasaId = "javascript" | "typescript" | "python" | "go";

/** Nama bahasa seperti yang dikeluarkan generator (`PETA_EKSTENSI`) untuk tiap id di
 *  whitelist. Ini satu-satunya tempat label pengukuran bertemu bentuk, dan test pasangan
 *  di src/lib/logoBahasa.test.ts mengikat nama-nama ini ke generator + berkas lisensi. */
export const LABEL_BAHASA: Record<BahasaId, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  go: "Go",
};

/** Petakan nama bahasa hasil pengukuran ke bentuk logo. Perbandingan tidak peka
 *  huruf besar/kecil supaya "typescript" dari artefak tua tetap dikenali. */
const OLEH_LABEL: Record<string, BahasaId> = Object.fromEntries(
  (Object.keys(LABEL_BAHASA) as BahasaId[]).map((id) => [LABEL_BAHASA[id].toLowerCase(), id]),
);

export const logoUntuk = (bahasa: string | null | undefined): BahasaId | null =>
  bahasa ? OLEH_LABEL[bahasa.toLowerCase()] ?? null : null;
