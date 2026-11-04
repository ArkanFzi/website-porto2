#!/usr/bin/env node
/**
 * Gerbang anggaran performa halaman depan.
 *
 * Yang diukur: aset yang benar-benar disuruh ambil ke browser oleh HTML hasil build
 * (script, stylesheet, preload font) + aset yang selalu ditarik halaman tapi tidak
 * terlihat di HTML (tekstur WebGL, diisi lewat budget.asetTambahan). Bukan ukuran
 * folder .next keseluruhan — itu mencakup 40 rute yang tidak pernah dibuka pengunjung
 * pertama kali.
 *
 * Angka gzip dihitung dengan level default zlib, sama seperti yang dipakai server
 * standalone saat mengirim teks, jadi angka ini adalah transfer yang dilihat
 * pengunjung, bukan angka terbaik yang mungkin.
 *
 * Budget dibaca dari perf-budget.json. File itu adalah hasil ukur hari ini + ruang
 * tumbuh, BUKAN target yang diarang-arang. Cara memperbarui yang jujur:
 *   node tools/ci/perf-budget.mjs --tulis   # tulis angka terkini + ruang 8%
 * lalu baca diff-nya dan putuskan apakah pertumbuhannya memang disengaja.
 */
import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const AKAR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const WEB = join(AKAR, "nextjs-frontend");
const BUILD = join(WEB, ".next");
const HALAMAN = join(BUILD, "server", "app", "index.html");
const BUDGET_FILE = join(AKAR, "tools", "ci", "perf-budget.json");

const KB = (b) => (b / 1024).toFixed(1).padStart(7);

const bacaHtml = () => {
  if (!existsSync(HALAMAN)) {
    console.error(`TIDAK ADA ${HALAMAN}. Jalankan "npm run build" di nextjs-frontend dulu.`);
    process.exit(1);
  }
  const html = readFileSync(HALAMAN, "utf8");
  const pola = [
    /<script[^>]+src="(\/_next\/static\/[^"]+)"/g,
    /<link[^>]+rel="stylesheet"[^>]+href="(\/_next\/static\/[^"]+)"/g,
    /<link[^>]+href="(\/_next\/static\/[^"]+)"[^>]*rel="(?:stylesheet|preload)"/g,
    /<link[^>]+rel="preload"[^>]+href="(\/_next\/static\/[^"]+)"/g,
  ];
  const url = new Set();
  for (const p of pola) for (const m of html.matchAll(p)) url.add(m[1]);
  return [...url];
};

const ukur = (abs) => {
  const isi = readFileSync(abs);
  const mentah = isi.length;
  // woff2 dan webp sudah terkompresi di dalam formatnya; gzip tidak menambah apa pun
  // selain header, jadi hitung ukuran file apa adanya untuk yang itu.
  const sudah = /\.(woff2|webp|png|jpe?g|avif)$/i.test(abs);
  const kirim = sudah ? mentah : gzipSync(isi).length;
  return { mentah, kirim };
};

const jalurBerkas = (url) => {
  const rel = url.replace(/^\/_next\//, "").replace(/^\//, "");
  const kandidat = [join(BUILD, rel), join(WEB, "public", rel), join(BUILD, "static", rel)];
  return kandidat.find((k) => existsSync(k) && statSync(k).isFile()) ?? null;
};

const budget = existsSync(BUDGET_FILE) ? JSON.parse(readFileSync(BUDGET_FILE, "utf8")) : {};
const aset = [];
const terlihat = new Set();
for (const url of [...bacaHtml(), ...(budget.asetTambahan ?? [])]) {
  // Satu URL dihitung sekali meski muncul di HTML dan di daftar tambahan.
  if (terlihat.has(url)) continue;
  terlihat.add(url);
  const abs = jalurBerkas(url);
  if (!abs) {
    console.error(`GAGAL: HTML merujuk aset yang tidak ada di hasil build: ${url}`);
    process.exit(1);
  }
  const kategori = /\/static\/media\//.test(url)
    ? "font"
    : /\.css$/i.test(url)
      ? "css"
      : /\.js$/i.test(url)
        ? "js"
        : "aset";
  const { mentah, kirim } = ukur(abs);
  aset.push({ url, kategori, mentah, kirim });
}

const total = (k) => aset.reduce((a, x) => a + (k ? x[k] : 0), 0);
const perKategori = {};
for (const a of aset) perKategori[a.kategori] = (perKategori[a.kategori] ?? 0) + a.kirim;

if (process.argv.includes("--tulis")) {
  const ruang = 1.08;
  const keluaran = {
    _catatan:
      "Hasil ukur `node tools/ci/perf-budget.mjs --tulis` dikali ruang tumbuh 8%. " +
      "Diukur dari aset yang dirujuk HTML hasil build rute / (bukan besar folder .next). " +
      "'kirim' = gzip level default untuk teks, ukuran file apa adanya untuk woff2/webp.",
    diukurPada: new Date().toISOString().slice(0, 10),
    asetTambahan: budget?.asetTambahan ?? ["/FotoDiriFix.webp"],
    maksTotalKirim: Math.ceil((total("kirim") * ruang) / 1024),
    maksPerKategori: Object.fromEntries(
      Object.entries(perKategori).map(([k, v]) => [k, Math.ceil((v * ruang) / 1024)])
    ),
    maksAsetTunggal: Math.ceil((Math.max(...aset.map((a) => a.kirim)) * ruang) / 1024),
  };
  writeFileSync(BUDGET_FILE, JSON.stringify(keluaran, null, 2) + "\n");
  console.log("ditulis", BUDGET_FILE);
  process.exit(0);
}

aset.sort((a, b) => b.kirim - a.kirim);
console.log("aset awal halaman / (ukur dari HTML hasil build)");
for (const a of aset) {
  console.log(`  ${KB(a.kirim)} KB kirim ${KB(a.mentah)} KB mentah  ${a.kategori.padEnd(5)} ${a.url.replace(/^\/_next\/static\//, "")}`);
}
console.log(`  ${KB(total("kirim"))} KB total kirim, ${KB(total("mentah"))} KB mentah, ${aset.length} aset`);
for (const [k, v] of Object.entries(perKategori)) console.log(`  ${k}: ${KB(v)} KB`);

const langgar = [];
if (total("kirim") > budget.maksTotalKirim * 1024)
  langgar.push(`total ${(total("kirim") / 1024).toFixed(1)} KB > anggaran ${budget.maksTotalKirim} KB`);
if (budget.maksAsetTunggal && Math.max(...aset.map((a) => a.kirim)) > budget.maksAsetTunggal * 1024)
  langgar.push(`aset terbesar ${(Math.max(...aset.map((a) => a.kirim)) / 1024).toFixed(1)} KB > anggaran ${budget.maksAsetTunggal} KB`);
for (const [k, v] of Object.entries(perKategori)) {
  const maks = budget.maksPerKategori?.[k];
  if (maks && v > maks * 1024) langgar.push(`${k} ${(v / 1024).toFixed(1)} KB > anggaran ${maks} KB`);
}

if (langgar.length) {
  console.error("\nANGGARAN TERLEWATI:");
  for (const l of langgar) console.error("  - " + l);
  console.error(`\nAnggaran di ${BUDGET_FILE} (diukur ${budget.diukurPada ?? "??"}).`);
  console.error('Perbarui dengan "node tools/ci/perf-budget.mjs --tulis" HANYA kalau tumbuhnya disengaja.');
  process.exit(1);
}
console.log(`\nDalam anggaran (total ${budget.maksTotalKirim} KB, diukur ${budget.diukurPada ?? "??"}).`);
