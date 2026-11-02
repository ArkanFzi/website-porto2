// Verifier anggaran draw call panggung WebGL.
//
//   node docs/verify/drawcall-probe.mjs            # laporkan
//   node docs/verify/drawcall-probe.mjs --batas 3  # gagal bila puncak aktif > 3
//   node docs/verify/drawcall-probe.mjs --tulis docs/verify/anggaran.json  # + simpan angka
//
// Dua hal yang diukur per bab, pada 1440x900:
//   AKTIF  = puncak gl.info.render.calls selama 1,5 s setelah gulir (frame jalan)
//   DIAM   = adakah frame yang masih ditulis 7 s setelah gulir terakhir
//            (IDLE_MS kanvas = 4000 ms, jadi setelah 7 s loop harus sudah demand dan
//            tidak ada satu pun penulisan ulang window.__render)
// Butuh `next dev`; window.__render ditulis stage/PengukurRender hanya di development.
//
// --tulis menyimpan anggaran per bab apa adanya: panggilan, segitiga, titik, garis,
// alokasi geometri/tekstur, laju frame, dan sensus objek pada frame tersibuk. Tidak ada
// angka byte GPU di dalamnya karena three tidak mengekspos ukuran per geometri/tekstur;
// yang ditulis hanyalah yang benar-benar terbaca.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
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
const iTulis = argv.indexOf('--tulis');
if (iTulis >= 0 && !argv[iTulis + 1]) {
  console.error('--tulis butuh path, contoh: --tulis docs/verify/anggaran.json');
  process.exit(2);
}
const jalurTulis = iTulis >= 0 ? resolve(argv[iTulis + 1]) : null;

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

const perBab = [];
let buruk = 0;
console.log('bab  puncak_aktif  frame_saat_diam  keterangan');
for (const bab of BAB) {
  const hasil = await page.evaluate(async (n) => {
    const el = document.querySelector(`[data-portal="${n}"]`);
    if (!el) return { aktif: -1, diam: -1, sampel: 0, puncak: null, fps: null, objek: [] };
    const r = el.getBoundingClientRect();
    const maks = document.documentElement.scrollHeight - window.innerHeight;
    const target = Math.max(0, Math.min(maks, window.scrollY + r.top + r.height / 2 - window.innerHeight / 2));
    window.scrollTo(0, target);
    const AMBIL = () => window.__render ?? null;
    const puncak = { calls: 0, segitiga: 0, titik: 0, garis: 0, geometri: 0, tekstur: 0 };
    let sampel = 0;
    let objek = [];
    let awal = null;
    let akhir = null;
    for (let i = 0; i < 15; i++) {
      await new Promise((r2) => setTimeout(r2, 100));
      const x = AMBIL();
      if (!x) continue;
      sampel++;
      const t = performance.now();
      if (!awal) awal = { t, frame: x.frame };
      akhir = { t, frame: x.frame };
      for (const k of Object.keys(puncak)) if (x[k] > puncak[k]) puncak[k] = x[k];
      if (x.calls >= puncak.calls) objek = x.objek;
    }
    // Setelah 1,5 s halaman masih bergerak; tunggu sampai melewati IDLE_MS lalu
    // lihat apakah ada frame baru yang ditulis.
    await new Promise((r2) => setTimeout(r2, 5500));
    window.__render = null;
    await new Promise((r2) => setTimeout(r2, 1500));
    const selangMs = awal && akhir ? akhir.t - awal.t : 0;
    const lampan = awal && akhir ? akhir.frame - awal.frame : 0;
    return {
      aktif: puncak.calls,
      diam: window.__render ? window.__render.calls : 0,
      sampel,
      puncak: sampel ? puncak : null,
      objek,
      fps: selangMs > 0 ? (lampan * 1000) / selangMs : null,
    };
  }, bab);
  const diamBaik = hasil.diam === 0;
  const aktifBaik = hasil.aktif <= batas;
  if (!diamBaik || !aktifBaik) buruk++;
  perBab.push({
    bab,
    frame_terukur: hasil.sampel,
    puncak: hasil.puncak,
    objek: hasil.objek,
    fps: hasil.fps === null ? null : Math.round(hasil.fps * 10) / 10,
    frame_saat_diam: hasil.diam,
  });
  console.log(
    `${String(bab).padStart(3)}  ${String(hasil.aktif).padStart(12)}  ${String(hasil.diam).padStart(15)}  ` +
      `${diamBaik ? 'loop berhenti saat diam' : 'MASIH MENGGAMBAR SAAT DIAM'}${aktifBaik ? '' : ` | lewat batas ${batas}`}`
  );
}

// Byte aset yang benar-benar diunduh halaman (bukan taksiran): resource timing untuk
// model dan gambar, dibaca setelah keempat bab dikunjungi supaya glb arsip ikut tercatat.
const aset = await page.evaluate(() =>
  performance
    .getEntriesByType('resource')
    .filter((e) => /\.(glb|gltf|ktx2|basis|webp|png|jpe?g|wasm)(\?|$)/i.test(new URL(e.name).pathname))
    .map((e) => ({ nama: new URL(e.name).pathname.split('/').pop(), mb: Math.round((e.encodedBodySize / 1048576) * 100) / 100 }))
);
const perangkat = await page.evaluate(() => {
  const kanvas = document.createElement('canvas');
  const gl = kanvas.getContext('webgl2') || kanvas.getContext('webgl');
  const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
  return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : 'renderer tidak dilaporkan';
});
await browser.close();

if (jalurTulis) {
  const anggaran = {
    dibuat: new Date().toISOString(),
    sumber: 'docs/verify/drawcall-probe.mjs --tulis',
    jendela_ukur: { lebar: 1440, tinggi: 900, dpr: 1, perangkat_gambar: perangkat },
    catatan: [
      'fps diukur dari selisih counter frame PengukurRender selama 1,5 s jendela ukur, bukan rata-rata browser.',
      'perangkat_gambar bukan GPU keras: angka dipakai untuk membandingkan antar-run di mesin yang sama, bukan sebagai target 60fps pengguna.',
      'puncak geometri/tekstur adalah jumlah alokasi yang masih hidup (gl.info.memory), bukan byte — three tidak mengekspos ukuran per alokasi.',
      'aset_unduhan.mb = encodedBodySize yang diterima browser (termampatkan), jadi lebih kecil dari ukuran file di disk.',
      'objek = sensus objek yang ikut digambar pada frame tersibuk bab itu.',
      'puncak null dan frame_terukur 0 berarti kanvas tidak menulis satu pun frame selama 1,5 s jendela ukur — bukan nol alokasi.',
    ],
    puncak_aktif_global: puncakAktif,
    aset_unduhan: aset,
    bab: perBab,
  };
  mkdirSync(dirname(jalurTulis), { recursive: true });
  writeFileSync(jalurTulis, JSON.stringify(anggaran, null, 2) + '\n');
}

console.log(`puncak draw call global sebelum per-bab: ${puncakAktif}`);
console.log(`perangkat gambar: ${perangkat}`);
if (jalurTulis) {
  console.log(`anggaran ditulis: ${jalurTulis}`);
  for (const b of perBab) {
    const p = b.puncak;
    console.log(
      `  bab ${b.bab}: ${
        p ? `panggilan ${p.calls} · segitiga ${p.segitiga} · titik ${p.titik} · garis ${p.garis} · geometri ${p.geometri} · tekstur ${p.tekstur}` : 'tidak ada frame tergambar di jendela ukur'
      } · fps ${b.fps ?? '-'} · objek ${b.objek.length}`
    );
  }
  for (const a of aset) console.log(`  aset ${a.nama}: ${a.mb} MB`);
}
if (galat.length) console.log('pageerror:', galat.slice(0, 3));
console.log(buruk ? `LEWAT: ${buruk} bab tidak memenuhi anggaran` : 'SEMUA BAB MEMENUHI: 0 frame saat diam');
process.exit(buruk ? 1 : 0);
