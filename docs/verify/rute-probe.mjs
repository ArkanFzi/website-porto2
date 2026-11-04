// Bukti gerak halaman rute (docs/verify/rute-probe.mjs). Empat klaim yang dijanjikan
// src/components/Editorial/GerakRute.tsx, diuji per rute dari browser nyata:
//
//   1. Tidak ada konteks WebGL baru di rute dokumen — canvas nol, __panggung tidak ada.
//   2. Server mencetak isi lengkap dan tanpa satu pun style gerak, jadi halaman yang
//      pembacanya mematikan JS tetap terbaca penuh.
// 3. Yang disembunyikan hanya blok di BAWAH lipatan; yang sudah terlihat saat load
//      tidak pernah dibuat transparan (itu yang menjaga elemen LCP tidak dipadamkan),
//      dan sesudah disapu tidak ada blok yang tertinggal dalam keadaan tersembunyi.
//   4. prefers-reduced-motion menang: tidak ada style inline yang ditulis sama sekali.
//
// plus dua klaim bentuk: parallax pointer bergerak tapi dibatasi 8px, dan penandaan
// atribut tidak menambah kotak pembungkus di dalam grid.
//
//   node docs/verify/rute-probe.mjs [outdir]      butuh `next dev`
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const require = createRequire(new URL('../../nextjs-frontend/package.json', import.meta.url));
const puppeteer = require('puppeteer');
const FE = process.env.FE_URL ?? 'http://localhost:3001';
const OUT = process.argv[2] ?? '/tmp/rute';
mkdirSync(OUT, { recursive: true });

// JARAK_PX di GerakRute; kalau sumbernya berubah, gerbang besaran ini yang pertama merah.
const JARAK_PX = 8;

const RUTE = [
  { href: '/tentang', teks: 'YANG SEDANG DAN PERNAH SAYA KERJAKAN', grid: 'rekaman-kerja' },
  { href: '/kontak', teks: 'SATU HAL YANG BELUM KOHEREN', grid: 'saluran' },
  { href: '/tulisan', teks: 'REPOSITORIES', grid: null },
  { href: '/tulisan/esai/zero-frames-when-idle', teks: 'WHAT THIS TEXT POINTS AT', grid: null },
];

const browser = await puppeteer.launch({
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

const hasil = [];
const galat = [];
const cek = (nama, dapat, harus) => {
  hasil.push({ nama, ok: dapat === harus, dapat: String(dapat), harus: String(harus) });
};
const cekMin = (nama, dapat, harus) => {
  hasil.push({ nama, ok: dapat >= harus, dapat: String(dapat), harus: `>=${harus}` });
};
const diamkan = (ms) => new Promise((r) => setTimeout(r, ms));

/** Semua klaim dihitung dari style yang dibaca browser, bukan dari atribut yang ditulis
 *  React: `el.style.opacity` membedakan "tidak pernah disentuh" (string kosong) dari
 *  "disentuh lalu dinolkan" ("0"), dan itu perselisihan yang sedang dijaga. */
const bacaTerbit = () =>
  Array.from(document.querySelectorAll('[data-gerak="terbit"]')).map((el) => {
    const g = getComputedStyle(el);
    return {
      inline: el.style.opacity,
      opacity: Number(g.opacity),
      atas: el.getBoundingClientRect().top,
      tinggi: el.getBoundingClientRect().height,
    };
  });

const bacaGeser = () => {
  const el = document.querySelector('[data-gerak="geser"]');
  if (!el) return null;
  const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
  return { x: m.m41, y: m.m42, inline: el.style.transform };
};

for (const rute of RUTE) {
  const label = rute.href;
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => galat.push(`${label}: ${String(e).slice(0, 160)}`));

  // ── 1 · apa yang dicetak server, sebelum satu byte JS jalan ──
  const html = await (await fetch(FE + rute.href)).text();
  cek(`[${label}] server mencetak isi halamannya`, html.includes(rute.teks), true);
  cek(
    `[${label}] HTML tanpa JS tidak membawa satu pun style gerak`,
    /data-gerak="terbit"[^>]*style=|style="[^"]*opacity/.test(html),
    false
  );
  cekMin(`[${label}] HTML tanpa JS menandai blok yang bisa muncul`, (html.match(/data-gerak="terbit"/g) ?? []).length, 2);

  // ── 2 · rute dokumen tidak membuka konteks WebGL ──
  await page.goto(FE + rute.href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await diamkan(1800);
  cek(
    `[${label}] tidak ada kanvas WebGL di halaman dokumen`,
    await page.evaluate(() => document.querySelectorAll('canvas').length),
    0
  );
  cek(
    `[${label}] panggung editorial tidak ikut terpasang di sini`,
    await page.evaluate(() => typeof window.__panggung),
    'undefined'
  );

  const daftar = await page.evaluate(bacaTerbit);
  cekMin(`[${label}] blok bertanda terhitung di DOM yang sudah hidup`, daftar.length, 2);
  const terlihat = daftar.filter((d) => d.atas < 900);
  const tersembunyi = daftar.filter((d) => d.atas >= 900);
  cek(
    `[${label}] yang sudah terlihat saat load tidak pernah dibuat transparan`,
    terlihat.every((d) => d.opacity === 1),
    true
  );
  console.log('lipat    ', label, `di bawah lipatan ${tersembunyi.length} dari ${daftar.length} blok`);
  cek(
    `[${label}] blok di bawah lipatan disembunyikan lewat style, bukan lewat HTML`,
    tersembunyi.every((d) => d.inline === '0' && d.opacity === 0),
    true
  );

  // ── 3 · disapu sampai bawah: tidak boleh ada yang tertinggal ──
  const maks = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  for (let y = 0; y <= maks; y += 500) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await diamkan(160);
  }
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await diamkan(900);
  const sesudah = await page.evaluate(bacaTerbit);
  const tinggal = sesudah.filter((d) => d.opacity !== 1);
  if (tinggal.length) console.log('tinggal  ', label, JSON.stringify(tinggal.slice(0, 4)));
  cek(
    `[${label}] semua blok muncul setelah disapu`,
    tinggal.length,
    0
  );

  // ── 4 · penandaan atribut tidak menambah kotak pembungkus ──
  if (rute.grid) {
    const bentuk = await page.evaluate((id) => {
      // Bagian menaruh id pada <h2>, bukan pada <section> (aria-labelledby), jadi
      // grid-nya dicari dari induk section elemen ber-id itu.
      const berId = document.getElementById(id);
      const section = berId?.closest('section') ?? berId?.parentElement;
      const grid = section?.querySelector('div[class*="grid"]');
      const anak = Array.from(grid?.children ?? []).map((el) => ({
        bertanda: el.getAttribute('data-gerak') === 'terbit',
        pembungkus: el.children.length === 1 && el.firstElementChild?.getAttribute('data-gerak') === 'terbit',
      }));
      return { jumlah: anak.length, tanda: anak.filter((a) => a.bertanda).length, bungkus: anak.filter((a) => a.pembungkus).length };
    }, rute.grid);
    cekMin(`[${label}] tiap baris grid adalah target geraknya sendiri`, bentuk.tanda, 2);
    cek(`[${label}] tidak ada pembungkus tambahan di dalam grid`, bentuk.bungkus, 0);
  }

  // ── 5 · parallax pointer: bergerak, dan dibatasi ──
  await page.evaluate(() => window.scrollTo(0, 0));
  await diamkan(400);
  const diam = await page.evaluate(bacaGeser);
  await page.mouse.move(120, 140);
  await diamkan(500);
  const miring = await page.evaluate(bacaGeser);
  const jarak = miring ? Math.hypot(miring.x, miring.y) : 0;
  console.log(
    'geser    ',
    label,
    `diam (${diam?.x.toFixed(2)}, ${diam?.y.toFixed(2)}) → (120,140) (${miring?.x.toFixed(2)}, ${miring?.y.toFixed(2)})`
  );
  cek(`[${label}] header punya jalur parallax`, miring !== null, true);
  cek(`[${label}] parallax benar-benar bergerak`, jarak > 0.5, true);
  // JARAK_PX adalah amplitude PER SUMBU (pointer di sudut = 8px horizontal DAN 8px
  // vertikal), jadi diagonalnya memang bisa 11,3px. Yang ditagih: tidak ada sumbu yang
  // melewati satu jarak itu.
  cek(
    `[${label}] parallax tidak melebihi ${JARAK_PX}px per sumbu`,
    Math.abs(miring?.x ?? 99) <= JARAK_PX + 0.2 && Math.abs(miring?.y ?? 99) <= JARAK_PX + 0.2,
    true
  );
  await page.mouse.move(720, 450);
  await diamkan(500);
  const tengah = await page.evaluate(bacaGeser);
  cek(
    `[${label}] pointer di tengah layar mengembalikan header ke tempatnya`,
    Math.hypot(tengah?.x ?? 99, tengah?.y ?? 99) < 0.6,
    true
  );

  await page.screenshot({ path: `${OUT}/${label.replace(/[^a-z0-9]+/gi, '-')}-bawah.png` });
  await page.close();

  // ── 6 · prefers-reduced-motion: tidak ada style yang ditulis, titik ──
  const pageKecil = await browser.newPage();
  await pageKecil.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await pageKecil.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  pageKecil.on('pageerror', (e) => galat.push(`${label} reduce: ${String(e).slice(0, 160)}`));
  await pageKecil.goto(FE + rute.href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await diamkan(1500);
  const kec = await pageKecil.evaluate(bacaTerbit);
  cek(
    `[${label}] reduce-motion: tidak ada blok yang disembunyikan`,
    kec.every((d) => d.inline === '' && d.opacity === 1),
    true
  );
  const geserKec = await pageKecil.evaluate(bacaGeser);
  cek(
    `[${label}] reduce-motion: header tidak diberi jalur parallax`,
    geserKec ? geserKec.inline === '' : true,
    true
  );
  await pageKecil.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await diamkan(700);
  cek(
    `[${label}] reduce-motion: isi di bawah lipatan tetap tercantum penuh`,
    (await pageKecil.evaluate(bacaTerbit)).every((d) => d.opacity === 1),
    true
  );
  await pageKecil.close();
}

if (galat.length) console.log('pageerror:', galat.slice(0, 8));
const galatAll = hasil.filter((h) => !h.ok);
for (const h of hasil) console.log(`${h.ok ? 'LULUS' : 'GAGAL'}  ${h.nama}: dapat ${h.dapat}, harus ${h.harus}`);
console.log(`${hasil.length - galatAll.length}/${hasil.length} gerbang lulus — foto di ${OUT}`);
if (galatAll.length) process.exit(1);
