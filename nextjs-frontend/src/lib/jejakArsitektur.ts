/** Hukum garis waktu arsitektur: durasi terukur per lompatan, dan panjang yang boleh
 *  dilukis dari durasi itu.
 *
 *  Modul ini sengaja tidak tahu apa-apa tentang React, three, atau DOM. Dua penampil —
 *  baris ARCHITECTURE TRACE di panel telemetri dan jejak instancedMesh di panggung WebGL —
 *  membaca angka dari sini, jadi keduanya pasti melukis rasio yang sama. Kalau salah satu
 *  menyisipkan konstantanya sendiri, yang dilukis berhenti sama dengan yang diukur.
 *
 *  Aturan yang ditegakkan: TIDAK ADA BENTUK TANPA ANGKA. Lompatan yang tidak punya
 *  pengukuran durasi mengembalikan `ms = null` dan penampil wajib tidak melukis apa pun
 *  untuk hop itu — bukan kotak pendek, bukan garis acuan. Itu berlaku untuk PostgreSQL:
 *  go-backend hanya menjawab "ok"/"error" di /api/health dan tidak pernah mengembalikan
 *  milidetik ping, jadi hop ketiga tidak akan pernah punya bentuk di halaman ini. */

export type HopId = "node" | "backend" | "database";

export interface Hop {
  id: HopId;
  /** Durasi milidetik yang benar-benar terukur pada request /api/telemetry.
   *  `null` = tidak ada pengukuran, jadi tidak ada panjang yang boleh dihitung. */
  ms: number | null;
}

const adaAngka = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0;

/** Bagi durasi request server menjadi lompatan yang benar-benar terukur.
 *
 *  `latencyMs` adalah waktu seluruh handler GET /api/telemetry, dan `rttMs` adalah waktu
 *  fetch ke go-backend yang terjadi DI DALAM handler itu. Selisihnya karena itu adalah
 *  waktu Node di luar probe — dan jumlah kedua hop tidak pernah melebihi totalnya.
 *
 *  Kalau backend tidak tercapai, `rttMs` null: tidak ada durasi backend yang terukur,
 *  jadi seluruh `latencyMs` tetap jadi satu hop Node dan hop backend tidak berbentuk.
 *  Pembagian juga ditolak kalau `rttMs` lebih besar dari total — dua-duanya dibulatkan
 *  terpisah, dan angka yang tidak mungkin itu tidak boleh melahirkan hop karangan. */
export const hopsDari = (
  latencyMs: number | null | undefined,
  rttMs: number | null | undefined
): Hop[] => {
  if (!adaAngka(latencyMs)) return [];
  const backend = adaAngka(rttMs) && rttMs <= latencyMs ? rttMs : null;
  const node = backend === null ? latencyMs : latencyMs - backend;
  return [
    { id: "node", ms: node },
    { id: "backend", ms: backend },
    { id: "database", ms: null },
  ];
};

/** Total yang benar-benar terukur: hanya hop punya angka yang ikut menjumlah.
 *  Dengan `rttMs` terukur, totalnya persis `latencyMs`. */
export const totalMs = (hops: Hop[]): number => hops.reduce((a, h) => a + (h.ms ?? 0), 0);

/** Lantai sumbu waktu. Di bawah total ini penggarisnya tidak ikut memanjang, supaya satu
 *  milidetik hasil ukur tidak dilukis sepanjang kanvas hanya karena angkanya kecil. */
export const MIN_TOTAL_MS = 8;

/** Pixel CSS per milidetik untuk anggaran selebar `lebarPx`. 0 = tidak ada yang dilukis. */
export const penggaris = (lebarPx: number, total: number): number =>
  total > 0 && lebarPx > 0 ? lebarPx / Math.max(total, MIN_TOTAL_MS) : 0;

/** Panjang segmen satu lompatan. Hop tanpa angka (atau berangka 0) mendapat 0. */
export const panjangPx = (ms: number | null, pxPerMs: number): number =>
  adaAngka(ms) && ms > 0 ? ms * pxPerMs : 0;

/** Versi ternormalisasi untuk penampil DOM: pecahan dari anggaran yang sama, dipakai
 *  sebagai lebar dalam persen supaya tidak ada angka pixel yang harus ditebak CSS. */
export const pecahanJejak = (ms: number | null, total: number): number => {
  const r = panjangPx(ms, 1);
  return r > 0 ? Math.min(r / Math.max(total, MIN_TOTAL_MS), 1) : 0;
};
