// Verifier anggaran draw call panggung WebGL.
//
//   node docs/verify/drawcall-probe.mjs            # laporkan
//   node docs/verify/drawcall-probe.mjs --batas 3  # gagal bila puncak aktif > 3
//   node docs/verify/drawcall-probe.mjs --tulis docs/verify/anggaran.json  # + simpan angka
//
// Dua hal yang diukur per bab, pada 1440x900:
//   AKTIF  = puncak gl.info.render.calls selama 1,5 s setelah gulir (frame jalan)
//   DIAM   = adakah frame yang masih ditulis setelah halaman benar-benar berhenti
//            (counter frame tidak naik lagi ≥ 1,2 s, batas tunggu 30 s) dan satu
//            jendela 1,5 s sesudahnya. Dulu jendela ini dibuka pada jam tetap 7 s
//            setelah gulir; sejak hub menambah satu portal lagi (dan satu kanvas lagi)
//            di antara bab 02 dan 03, satu lompatan jauh masih punya sisa perjalanan
//            pada 7 s — terukur: benang rosso hidup sampai ±10 s di SwiftShader. Yang
//            ditagih hukum diam, bukan kecepatan mesin, jadi jendelanya dibuka setelah
//            sepi, bukan setelah jam.
//            (counter frame PengukurRender dipakai bersama semua kanvas di halaman ini;
//            sensus objek pada tiap sampel menyebut kanvas mana yang menulis terakhir.)
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
// Bab yang ditagih lewat section-nya sendiri (anchor #chapter-0N di aluraman). Hub (bab 5)
// sengaja tidak ikut daftar ini: angkanya hidup di kanvas kedua, dan sejak PengukurRender
// mencatat per root, bacaannya ada di window.__renders.hub — bukan di window.__render yang
// jadi milik kanvas editorial. Panggung hub sekarang 40 call / 35 objek (alas, bayangan
// kontak, sirkuit garis, 32 mesh livery sf26-livery.glb); enam objek panggung-gelap —
// kisi lantai, ban cahaya, kolam sorot, dan tiga kerucut sorot — ikut dibuang bersama
// kotak hitamnya di belakang kanvas. Yang ditagih 5f halaman-probe bukan angka ini tapi
// nol frame saat diam, dan itu tetap berlaku: 40 call hanya ada selama yaw mengejar.
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
    // Jangkar = section di aliraman, bukan kartu: [data-portal] itu position:fixed, jadi
    // rect-nya melekat pada layar dan "target" yang dihitung darinya nyaris sama dengan
    // scrollY saat ini — probe tidak pernah benar-benar berpindah bab, dan puncak yang
    // tercatat adalah kanvas di tempat page kebetulan berhenti (bukan bab yang ditagih).
    const el = document.querySelector(`#chapter-${String(n).padStart(2, '0')}`);
    if (!el) return { aktif: -1, diam: -1, sampel: 0, puncak: null, fps: null, objek: [] };
    const r = el.getBoundingClientRect();
    const maks = document.documentElement.scrollHeight - window.innerHeight;
    const target = Math.max(0, Math.min(maks, window.scrollY + r.top + r.height / 2 - window.innerHeight / 2));
    window.scrollTo(0, target);
    // Jeda dulu sebelum menagih. Scroll ini melompat dari tempat bab sebelumnya berdiri, dan
    // gerbang "terlihat" kanvas tetangga baru dievaluasi IntersectionObserver beberapa
    // milidetik kemudian — tanpa jeda, frame terakhir yang sedang dilewati (mis. panggung
    // hub saat menuju bab 01) ikut tercatat sebagai puncak bab yang ditagih.
    await new Promise((r2) => setTimeout(r2, 700));
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
    // Setelah 1,5 s halaman masih bergerak: fase "always" hukum diam (4000 ms dari peristiwa
    // terakhir) plus sisa perjalanan kartu ke portal baru. Tunggu counter benar-benar
    // berhenti, baru tagih nol frame.
    const mulaiSepi = performance.now();
    let frameLalu = AMBIL()?.frame ?? -1;
    let saatNaik = mulaiSepi;
    while (performance.now() - mulaiSepi < 30000) {
      await new Promise((r2) => setTimeout(r2, 250));
      const x = AMBIL();
      const f = x ? x.frame : -1;
      if (f !== frameLalu) { frameLalu = f; saatNaik = performance.now(); }
      // Tenang harus lebih panjang dari IDLE_MS (4000 ms) plus satu margin: perpindahan
      // "always" -> "demand" itu sendiri masih melukis frame terakhir, dan burst itu datang
      // persis 4 s sesudah peristiwa terakhir — jendela 1,2 s terbukti menangkapnya.
      else if (performance.now() - saatNaik >= 5200) break;
    }
    const sepiMs = Math.round(performance.now() - mulaiSepi);
    window.__render = null;
    await new Promise((r2) => setTimeout(r2, 1500));
    const sepi = AMBIL();
    const selangMs = awal && akhir ? akhir.t - awal.t : 0;
    const lampan = awal && akhir ? akhir.frame - awal.frame : 0;
    return {
      aktif: puncak.calls,
      diam: sepi ? sepi.calls : 0,
      diamObjek: sepi ? sepi.objek : [],
      sampel,
      puncak: sampel ? puncak : null,
      objek,
      sepiMs,
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
    sepi_setelah_ms: hasil.sepiMs,
    frame_saat_diam: hasil.diam,
    objek_saat_diam: hasil.diamObjek,
  });
  console.log(
    `${String(bab).padStart(3)}  ${String(hasil.aktif).padStart(12)}  ${String(hasil.diam).padStart(15)}  ` +
      `${diamBaik ? `loop berhenti saat diam (sepi ${hasil.sepiMs} ms)` : `MASIH MENGGAMBAR SAAT DIAM: ${hasil.diamObjek.join(',')}`}${aktifBaik ? '' : ` | lewat batas ${batas}`}`
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
      'sepi_setelah_ms = lama tunggu dari akhir jendela aktif sampai counter frame berhenti naik; angka ini adalah sisa perjalanan kartu, bukan waktu idle yang diizinkan.',
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
