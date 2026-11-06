#!/usr/bin/env node
// Mengadili blok JSON-LD di artefak build, bukan di sumber.
//
// Kenapa gerbang ini perlu: application/ld+json tidak dieksekusi peramban, jadi JSON yang
// rusak tidak memicu satu pun error di test frontend, di build, atau di layar siapa pun —
// ia hanya membuat Google dan Bing diam-diam kehilangan data terstruktur. Yang diukur di
// sini adalah HTML yang benar-benar dikirim ke crawler.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const AKAR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const APP = join(AKAR, "nextjs-frontend", ".next", "server", "app");

if (!existsSync(APP)) {
  console.error(`Tidak ada ${APP}. Jalankan "npm run build" di nextjs-frontend dulu.`);
  process.exit(1);
}

const html = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? html(join(d, e.name)) : e.name.endsWith(".html") ? [join(d, e.name)] : [],
  );

// Tipe yang harus ada di build ini, dan kenapa: Person + WebSite di layout, Article di
// setiap esai. Satu tipe hilang = satu klaim rich result hilang.
const WAJIB = new Set(["Person", "WebSite", "Article"]);

const terlihat = new Set();
let blok = 0;
for (const f of html(APP)) {
  const isi = readFileSync(f, "utf8");
  for (const m of isi.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    let data;
    try {
      data = JSON.parse(m[1]);
    } catch (e) {
      console.error(`JSON-LD rusak di ${f.slice(AKAR.length)}: ${e.message}`);
      process.exit(1);
    }
    for (const o of [].concat(data)) {
      if (!o || typeof o !== "object" || !o["@type"]) {
        console.error(`JSON-LD tanpa "@type" di ${f.slice(AKAR.length)}`);
        process.exit(1);
      }
      terlihat.add(o["@type"]);
    }
    blok++;
  }
}

const kurang = [...WAJIB].filter((t) => !terlihat.has(t));
console.log(`blok JSON-LD ter-parse: ${blok} | tipe: ${[...terlihat].sort().join(", ")}`);
if (kurang.length) {
  console.error(`tipe yang hilang dari build: ${kurang.join(", ")}`);
  process.exit(1);
}
console.log("JSON-LD sah dan lengkap di artefak build.");
