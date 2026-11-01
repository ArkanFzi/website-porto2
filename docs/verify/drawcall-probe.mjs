// Verifier anggaran draw call panggung WebGL.
//
//   node docs/verify/drawcall-probe.mjs            # laporkan
//   node docs/verify/drawcall-probe.mjs --batas 3  # gagal bila puncak aktif > 3
//
// Dua hal yang diukur per bab, pada 1440x900:
//   AKTIF  = puncak gl.info.render.calls selama 1,5 s setelah gulir (frame jalan)
//   DIAM   = adakah frame yang masih ditulis 7 s setelah gulir terakhir
//            (IDLE_MS kanvas = 4000 ms, jadi setelah 7 s loop harus sudah demand dan
//            tidak ada satu pun penulisan ulang window.__render)
// Butuh `next dev`; window.__render ditulis stage/PengukurRender hanya di development.
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../nextjs-frontend/package.json', import.meta.url));
const puppeteer = require('puppeteer');
const FE = process.env.FE_URL ?? 'http://localhost:3001';
const BAB = [1, 2, 3, 4];

const argv = process.argv.slice(2);
const iBatas = argv.indexOf('--batas');
const batas = iBatas >= 0 ? Number(argv[iBatas + 1]) : Infinity;
if (iBatas >= 0 && !Number.isFinite(batas)) {
  console.error('--batas butuh angka, contoh: --batas 3');
  process.exit(2);
}

const browser = await puppeteer.launch({
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
const galat = [];
page.on('pageerror', (e) => galat.push(String(e).slice(0, 200)));
await page.goto(FE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await new Promise((r) => setTimeout(r, 6000));
const ada = await page.evaluate(() => '__render' in window);
if (!ada) {
  console.error('window.__render tidak ada — probe ini butuh `next dev` (stage/PengukurRender mount hanya di development).');
  await browser.close();
  process.exit(1);
}

const puncakAktif = await page.evaluate(async () => {
  const maks = document.documentElement.scrollHeight - window.innerHeight;
  window.scrollTo(0, Math.round(0.4 * maks));
  let puncak = 0;
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 100));
    if (window.__render) puncak = Math.max(puncak, window.__render.calls);
  }
  return puncak;
});

console.log('bab  puncak_aktif  frame_saat_diam  keterangan');
let buruk = 0;
for (const bab of BAB) {
  const hasil = await page.evaluate(async (n) => {
    const el = document.querySelector(`[data-portal="${n}"]`);
    if (!el) return { aktif: -1, diam: -1 };
    const r = el.getBoundingClientRect();
    const maks = document.documentElement.scrollHeight - window.innerHeight;
    const target = Math.max(0, Math.min(maks, window.scrollY + r.top + r.height / 2 - window.innerHeight / 2));
    window.scrollTo(0, target);
    let puncak = 0;
    for (let i = 0; i < 15; i++) {
      await new Promise((r2) => setTimeout(r2, 100));
      if (window.__render) puncak = Math.max(puncak, window.__render.calls);
    }
    // Setelah 1,5 s halaman masih bergerak; tunggu sampai melewati IDLE_MS lalu
    // lihat apakah ada frame baru yang ditulis.
    await new Promise((r2) => setTimeout(r2, 5500));
    window.__render = null;
    await new Promise((r2) => setTimeout(r2, 1500));
    return { aktif: puncak, diam: window.__render ? window.__render.calls : 0 };
  }, bab);
  const diamBaik = hasil.diam === 0;
  const aktifBaik = hasil.aktif <= batas;
  if (!diamBaik || !aktifBaik) buruk++;
  console.log(
    `${String(bab).padStart(3)}  ${String(hasil.aktif).padStart(12)}  ${String(hasil.diam).padStart(15)}  ` +
      `${diamBaik ? 'loop berhenti saat diam' : 'MASIH MENGGAMBAR SAAT DIAM'}${aktifBaik ? '' : ` | lewat batas ${batas}`}`
  );
}
await browser.close();
console.log(`puncak draw call global sebelum per-bab: ${puncakAktif}`);
if (galat.length) console.log('pageerror:', galat.slice(0, 3));
console.log(buruk ? `LEWAT: ${buruk} bab tidak memenuhi anggaran` : 'SEMUA BAB MEMENUHI: 0 frame saat diam');
process.exit(buruk ? 1 : 0);
