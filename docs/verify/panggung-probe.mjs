// Verifier koreografi panggung: baca window.__panggung (development only) sepanjang
// sumbu gulir, lalu bandingkan terhadap baseline yang tercatat di repo.
//
//   node docs/verify/panggung-probe.mjs --tulis docs/verify/panggung-baseline.json
//   node docs/verify/panggung-probe.mjs --bandingkan docs/verify/panggung-baseline.json
//
// Angka yang dibandingkan adalah sikap kartu (posisi dunia, rotasi, skala, kotak mask)
// pada 41 titik gulir. Kursor sengaja tidak digerakkan: parallax pointer (geyang) akan
// menggeser x/y tanpa batas, jadi yang diukur adalah sikap dasar koreografi.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';

const require = createRequire(new URL('../../nextjs-frontend/package.json', import.meta.url));
const puppeteer = require('puppeteer');
const FE = process.env.FE_URL ?? 'http://localhost:3001';
const VIEWPORT = { width: 1440, height: 900 };
const LANGKAH = 40;
// Toleransi: 1/100 satuan dunia dan 1/1000 radian masih di bawah ambang terlihat.
const TOL = { x: 0.01, y: 0.01, z: 0.02, rotY: 0.002, rotX: 0.002, rotZ: 0.005, skala: 0.01 };

const argv = process.argv.slice(2);
const mode = argv[0] === '--tulis' ? 'tulis' : argv[0] === '--bandingkan' ? 'bandingkan' : null;
const berkas = argv[1];
if (!mode || !berkas) {
  console.error('pakai: panggung-probe.mjs --tulis|--bandingkan <berkas.json>');
  process.exit(2);
}

const pakaiGPU = process.env.PUPPETEER_GPU !== '0' && !process.argv.includes('--swiftshader');
const browser = await puppeteer.launch({
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome',
  headless: 'new',
  args: pakaiGPU
    ? ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=vulkan']
    : ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
await page.setViewport({ ...VIEWPORT, deviceScaleFactor: 1 });
const galat = [];
page.on('pageerror', (e) => galat.push(String(e).slice(0, 160)));
await page.goto(FE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await new Promise((r) => setTimeout(r, 6000));

const ada = await page.evaluate(() => !!window.__panggung);
if (!ada) {
  console.error('window.__panggung tidak ada — probe ini butuh `next dev` (NODE_ENV development), bukan build produksi.');
  await browser.close();
  process.exit(1);
}

const jejak = [];
for (let i = 0; i <= LANGKAH; i++) {
  const f = i / LANGKAH;
  const baca = await page.evaluate(async (fr) => {
    const t = document.body.scrollHeight - window.innerHeight;
    window.scrollTo(0, Math.round(fr * t));
    await new Promise((r) => setTimeout(r, 1400));
    return { scroll: Math.round(window.scrollY), ...window.__panggung };
  }, f);
  jejak.push(baca);
}
await browser.close();

const ringkas = (o) => JSON.stringify({
  p: o.p, babKe: o.babKe, x: o.x, y: o.y, z: o.z, rotY: o.rotY, skala: o.skala,
});

/** Sikap DIAM ditentukan dari datanya sendiri, bukan dari label: satu titik dianggap
 *  diam bila posesinya tidak bergerak lebih dari AMBANG_DIAM dibanding titik sebelum
 *  dan sesudahnya. Label babDari/babKe sengaja tidak dipakai sebagai syarat karena ia
 *  hanya menyebut bab tujuan, bukan apakah kartu sudah berhenti di sana. */
const AMBANG_DIAM = 0.0025;
const MEDAN = ["x", "y", "z", "rotX", "rotY", "rotZ", "skala"];
const diam = (jejak, i) => {
  if (i === 0 || i === jejak.length - 1) return false;
  for (const k of MEDAN) {
    if (Math.abs(jejak[i][k] - jejak[i - 1][k]) > AMBANG_DIAM) return false;
    if (Math.abs(jejak[i][k] - jejak[i + 1][k]) > AMBANG_DIAM) return false;
  }
  return true;
};
/** Representasi tiap blok diam berturut-turut: titik tengahnya. */
const sikapDiam = (jejak) => {
  const keluar = [];
  let blok = [];
  for (let i = 0; i < jejak.length; i++) {
    if (diam(jejak, i)) blok.push(i);
    else if (blok.length) {
      keluar.push(jejak[blok[Math.floor(blok.length / 2)]]);
      blok = [];
    }
  }
  if (blok.length) keluar.push(jejak[blok[Math.floor(blok.length / 2)]]);
  return keluar;
};

if (mode === 'tulis') {
  writeFileSync(new URL(berkas, new URL('../../', import.meta.url)), JSON.stringify({ viewport: VIEWPORT, langkah: LANGKAH, jejak }, null, 1));
  console.log(`${jejak.length} titik ditulis ke ${berkas}`);
  console.log('  bab 1:', ringkas(jejak[2]), '\n  bab 2:', ringkas(jejak[16]), '\n  bab 3:', ringkas(jejak[28]), '\n  bab 4:', ringkas(jejak[40]));
  process.exit(0);
}

const { jejak: dasar } = JSON.parse(readFileSync(new URL(berkas, new URL('../../', import.meta.url)), 'utf8'));
if (dasar.length !== jejak.length) {
  console.error(`jumlah titik beda: baseline ${dasar.length}, sekarang ${jejak.length}`);
  process.exit(1);
}
let buruk = 0;
const laporan = [];
const diamDasar = sikapDiam(dasar);
const diamKini = sikapDiam(jejak);
console.log(`sikap diam terukur: baseline ${diamDasar.length} blok, sekarang ${diamKini.length} blok`);
for (let d = 0; d < Math.min(diamDasar.length, diamKini.length); d++) {
  const a = diamDasar[d], b = diamKini[d];
  const selisih = Object.fromEntries(Object.keys(TOL).map((k) => [k, +(b[k] - a[k]).toFixed(4)]));
  const lewat = Object.entries(TOL).filter(([k, t]) => Math.abs(selisih[k]) > t);
  if (lewat.length) {
    buruk++;
    laporan.push(`  DIAM ${d + 1} (p ${a.p} -> ${b.p}) lewat pada ${lewat.map(([k]) => `${k}:${selisih[k]}`).join(' ')} | dulu ${ringkas(a)} | kini ${ringkas(b)}`);
  } else {
    laporan.push(`  DIAM ${d + 1} (p ${a.p} -> ${b.p}) sama: ${ringkas(b)}`);
  }
}
laporan.forEach((l) => console.log(l));

/* Puncak halaman (p = 1) sengaja tidak masuk blok diam: tabel lama menaruh bab penutup
   pada pita yang baru tuntas SETELAH p = 1, jadi posesinya di baseline masih sisa lerp
   (x 0.06, z -2.4615). Kunci DOM sekarang menghasilkan sikap yang declare
   (x 0, z -2.5) — kartu tepat di tengah portal. Selisihnya dicetak, tidak disembunyikan. */
{
  const a = dasar[dasar.length - 1], b = jejak[jejak.length - 1];
  const selisih = Object.fromEntries(Object.keys(TOL).map((k) => [k, +(b[k] - a[k]).toFixed(4)]));
  console.log(`  SIKAP AKHIR bab ${b.babKe} (p=1): ${MEDAN.map((k) => `${k} ${a[k]} -> ${b[k]}`).join('  ')}`);
  console.log(`    selisih ${Object.entries(selisih).filter(([, v]) => v !== 0).map(([k, v]) => `${k}:${v}`).join(' ') || "nol"}`);
}
const sama = jejak.filter((b, i) => MEDAN.every((k) => Math.abs(b[k] - dasar[i][k]) <= 1e-4)).length;
console.log(`bandingkan vs ${berkas}: ${buruk} sikap diam melewati toleransi, ${sama}/${jejak.length} titik identik sepanjang sumbu gulir`);
for (let i = 0; i < jejak.length; i++) {
  const a = dasar[i], b = jejak[i];
  const selisih = Object.fromEntries(Object.keys(TOL).map((k) => [k, +(b[k] - a[k]).toFixed(4)]));
  const lewat = Object.entries(TOL).filter(([k, t]) => Math.abs(selisih[k]) > t);
  if (!lewat.length || diam(jejak, i) && diam(dasar, i)) continue;
  console.log(`  perpindahan p=${b.p} beda ${lewat.map(([k]) => `${k}:${selisih[k]}`).join(' ')} | dulu ${ringkas(a)} | kini ${ringkas(b)}`);
}
if (galat.length) console.log('pageerror:', galat.slice(0, 3));
process.exit(buruk || Math.abs(diamDasar.length - diamKini.length) ? 1 : 0);
