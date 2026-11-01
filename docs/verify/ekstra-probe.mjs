// Bukti lima objek panggung tambahan (Tahap 2). Dua jalur bukti, keduanya dari frame
// nyata: sensus objek (window.__render.objek = nama objek yang masuk daftar gambar frame
// itu, ditulis PengukurRender) dan penghitung THREE info.render (calls/segitiga/titik/
// garis). Sensus menjawab "objeknya benar-benar ada", penghitung menjawab "ukurannya
// memang yang dijanjikan" — 23 segmen garis untuk benang, 12 sisi untuk sangkar, 140
// titik untuk debu. Agregat saja tidak bisa membedakan objek mana yang menambah call.
//
//   node docs/verify/ekstra-probe.mjs [outdir]      butuh `next dev` + window.__render
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const require = createRequire(new URL('../../nextjs-frontend/package.json', import.meta.url));
const puppeteer = require('puppeteer');
const FE = process.env.FE_URL ?? 'http://localhost:3001';
const OUT = process.argv[2] ?? '/tmp/ekstra';
mkdirSync(OUT, { recursive: true });

const TITIK_BENANG = 24; // harus sama dengan TITIK di BenangRosso.tsx
const SISI_SANGKAR = 12; // EdgesGeometry balok = 12 segmen
const SEG_KOMPAS = 2; // jarum + ekor
const PARTIKEL_DEBU = 140;
const LIMA = ['bilah', 'benang', 'debu', 'kompas', 'sangkar'];

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

const parkir = async (f) => {
  await page.evaluate(async (fr) => {
    const maks = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, Math.round(fr * maks));
    await new Promise((r) => setTimeout(r, 1500));
  }, f);
};

const foto = (nama) => page.screenshot({ path: `${OUT}/${nama}.png` });

/** Snapshot satu frame: penghitung render + nama objek + sikap kartu. */
const medan = () =>
  page.evaluate(() => {
    const r = window.__render;
    if (!r) return null;
    const p = window.__panggung;
    return {
      calls: r.calls,
      segitiga: r.segitiga,
      titik: r.titik,
      garis: r.garis,
      objek: r.objek ?? [],
      t: p?.t ?? null,
    };
  });

/** Serap semua frame selama `durasiMs`: puncak tiap penghitung + sensus objek. Sensus
 *  berupa jumlah maksimum instans per nama dalam SATU frame, bukan gabungan lintas frame:
 *  dua mesh berbeda tanpa nama ikut tergelong-golong kalau cuma pakai Set, dan angka
 *  agregat calls harus bisa dijumlahkan dari sensus ini. */
const serap = async (durasiMs, jedaMs = 40) => {
  const puncak = { calls: 0, segitiga: 0, titik: 0, garis: 0 };
  const paling = {};
  let terakhir = null;
  const akhir = Date.now() + durasiMs;
  while (Date.now() < akhir) {
    const s = await medan();
    if (s) {
      terakhir = s;
      for (const k of Object.keys(puncak)) if (s[k] > puncak[k]) puncak[k] = s[k];
      const hitung = {};
      for (const n of s.objek) hitung[n] = (hitung[n] ?? 0) + 1;
      for (const n of Object.keys(hitung)) if ((paling[n] ?? 0) < hitung[n]) paling[n] = hitung[n];
    }
    await new Promise((r) => setTimeout(r, jedaMs));
  }
  const nama = Object.keys(paling)
    .sort()
    .flatMap((n) => Array.from({ length: paling[n] }, () => n));
  return { puncak, nama, terakhir };
};

const hasil = [];
const cek = (nama, dapat, harus) => {
  hasil.push({ nama, ok: dapat === harus, dapat: String(dapat), harus: String(harus) });
};
const cekMin = (nama, dapat, harus) => {
  hasil.push({ nama, ok: dapat >= harus, dapat: String(dapat), harus: `>=${harus}` });
};
const ada = (daftar, nama) => daftar.includes(nama);

// ── 1. Keadaan diam: hanya bilah telemetri yang boleh menambah kartu ──
await parkir(0.05);
const diam = await serap(300);
await foto('01-bab1-diam');
console.log('diam     ', JSON.stringify(diam.puncak), JSON.stringify(diam.nama), 't=' + diam.terakhir?.t);
cek('bilah ada saat diam', ada(diam.nama, 'bilah'), true);
for (const n of ['benang', 'debu', 'kompas', 'sangkar'])
  cek(`${n} tidak ada saat diam`, ada(diam.nama, n), false);

// ── 2. Benang rosso: di tengah perpindahan bab 1 ke bab 2 ──
await page.evaluate(async () => {
  const maks = document.documentElement.scrollHeight - window.innerHeight;
  window.scrollTo(0, Math.round(0.14 * maks));
  await new Promise((r) => setTimeout(r, 120));
});
const jahit = await serap(500);
await foto('02-benang-jahit');
console.log('benang   ', JSON.stringify(jahit.puncak), JSON.stringify(jahit.nama), 't=' + jahit.terakhir?.t);
cek('benang ada saat perpindahan', ada(jahit.nama, 'benang'), true);
cekMin('benang = 23 segmen LINE_STRIP', jahit.puncak.garis, TITIK_BENANG - 1);

// ── 3. Debu + kompas: bab 2, diam vs menggulir dengan roda mouse ──
// scrollTo() instan tidak menghasilkan velositas Lenis, dan debu/kompas hidup dari
// |velositas| — jadi bagian ini menggulir sungguhan.
await parkir(0.375);
const diam2 = await serap(300);
await foto('03-bab2-diam');
await page.mouse.move(720, 450);
const geser = { calls: 0, segitiga: 0, titik: 0, garis: 0 };
let terlebar = [];
for (let i = 0; i < 12; i++) {
  await page.mouse.wheel({ deltaY: 60 });
  await new Promise((r) => setTimeout(r, 65));
  const s = await serap(70, 35);
  for (const k of Object.keys(geser)) if (s.puncak[k] > geser[k]) geser[k] = s.puncak[k];
  if (s.nama.length > terlebar.length) terlebar = s.nama;
}
await foto('04-bab2-bergulir');
console.log(
  'bergulir ',
  JSON.stringify(geser),
  JSON.stringify(terlebar),
  '| diam sebelumnya:',
  JSON.stringify(diam2.nama)
);
cek('debu ada saat bergulir', ada(terlebar, 'debu'), true);
cek('kompas ada saat bergulir', ada(terlebar, 'kompas'), true);
cek('debu = 140 titik', geser.titik, PARTIKEL_DEBU);
cekMin('kompas = 2 segmen', geser.garis, SEG_KOMPAS);
cek('debu tidak ada saat diam', ada(diam2.nama, 'debu'), false);
cek('sangkar tidak ikut muncul saat bergulir', ada(terlebar, 'sangkar'), false);

// ── 4. RollCage: baris arsip tanpa hover vs dengan hover ──
// Baris arsip = div[data-magnetic] di #chapter-03 (ChapterArchives.tsx:263). Kelas pl-6
// hanya menempel saat hoveredProject === idx, jadi padding-left adalah bukti bahwa hover
// benar-benar sampai ke state React, bukan hanya event yang dikirim ke elemen yang salah.
const bacaBaris = () =>
  page.evaluate(() => {
    const rows = [...document.querySelectorAll('#chapter-03 [data-magnetic]')];
    const ATAS = 90;
    const BAWAH = window.innerHeight - 90;
    let pilih = null;
    for (const el of rows) {
      const b = el.getBoundingClientRect();
      const terlihat = Math.min(b.bottom, BAWAH) - Math.max(b.top, ATAS);
      // Baris arsip setinggi ~300px, jadi "seutuhnya terlihat" terlalu ketat; yang
      // dibutuhkan hanya satu titik tengah yang aman untuk ditiru pointer.
      if (terlihat > 24 && (!pilih || terlihat > pilih.terlihat)) pilih = { el, terlihat, b };
    }
    if (!pilih) return null;
    const { el, b } = pilih;
    return {
      judul: el.querySelector('a')?.textContent?.trim().slice(0, 22) ?? '?',
      x: b.left + b.width / 2,
      y: Math.max(ATAS, Math.min(BAWAH, (b.top + b.bottom) / 2)),
      pl: getComputedStyle(el).paddingLeft,
    };
  });

// Posisi pointer dari bagian 3 sudah jatuh di atas baris arsip setelah parkir, jadi
// hover harus dilepas lebih dulu — kalau tidak, "sebelum" dan "sesudah" membacanya sama.
const lepasHover = async () => {
  await page.mouse.move(8, 8);
  await new Promise((r) => setTimeout(r, 400));
};

const parkirKeBaris = async () => {
  return page.evaluate(async () => {
    const el = document.querySelector('#chapter-03 [data-magnetic]');
    if (!el) return { galat: 'tidak ada #chapter-03 [data-magnetic]' };
    const b = el.getBoundingClientRect();
    const maks = document.documentElement.scrollHeight - window.innerHeight;
    // Target absolut, bukan delta dari scrollY saat ini: posisi awal bagian ini datang
    // dari gulir roda di bagian 3, dan delta membuat parkir bergeser per run.
    const y = Math.min(maks, Math.max(0, b.top + window.scrollY - window.innerHeight * 0.4));
    window.scrollTo(0, Math.round(y));
    await new Promise((r) => setTimeout(r, 1500));
    return { jumlah: document.querySelectorAll('#chapter-03 [data-magnetic]').length, scrollY: Math.round(window.scrollY) };
  });
};

const parkir4 = await parkirKeBaris();
const target = await bacaBaris();
let sbl = await serap(300);
let sts = sbl;
// Hover pointer adalah peristiwa asinkron yang bisa hilang saat halaman masih settling
// setelah gulir roda di bagian 3; tanpa percobaan ulang bagian ini jadi flaky (pernah
// gagal sekali dari tiga jalan). Tiga percobaan dengan jeda melepas hover membuat hasilnya
// bergantung pada keadaan halaman, bukan pada keberuntungan.
for (let percobaan = 1; percobaan <= 3 && target; percobaan++) {
  await lepasHover();
  sbl = await serap(300);
  if (percobaan === 1) await foto('05-bab3-tanpa-hover');
  await page.mouse.move(target.x, target.y);
  await new Promise((r) => setTimeout(r, 250 * percobaan));
  sts = await serap(300);
  const kini = await bacaBaris();
  if (kini && kini.pl !== target.pl) break;
}
const barisKini = await bacaBaris();
await foto('06-bab3-hover');
console.log(
  'sangkar  ',
  JSON.stringify(parkir4),
  JSON.stringify(target),
  '| sebelum:',
  JSON.stringify(sbl.nama),
  JSON.stringify(sbl.puncak.garis),
  '→ sesudah:',
  JSON.stringify(sts.nama),
  JSON.stringify(sts.puncak.garis)
);
cek('hover baris arsip sampai ke state', target?.pl !== barisKini?.pl, true);
cek('sangkar tidak ada tanpa hover', ada(sbl.nama, 'sangkar'), false);
cek('sangkar ada saat hover', ada(sts.nama, 'sangkar'), true);
cekMin('sangkar menyumbang 12 segmen LINES', sts.puncak.garis - sbl.puncak.garis, SISI_SANGKAR);

// ── 5. prefers-reduced-motion: lima objek hilang, kartu tetap ──
await parkir(0.375);
const sebelum5 = (await serap(300)).nama;
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
await new Promise((r) => setTimeout(r, 700));
const kurangi = await serap(400);
await foto('07-bab2-reduce-motion');
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
await new Promise((r) => setTimeout(r, 700));
const pulih = (await serap(300)).nama;
console.log('reduce   sebelum:', JSON.stringify(sebelum5), '| reduce:', JSON.stringify(kurangi.nama), JSON.stringify(kurangi.terakhir), '| pulih:', JSON.stringify(pulih));
cek('reduce-motion menghapus semua objek ekstra', LIMA.some((n) => ada(kurangi.nama, n)), false);
cek('reduce-motion tidak menghapus kartu', (kurangi.terakhir?.segitiga ?? 0) > 0, true);
cek('pulih setelah aba-aba dicabut', ada(pulih, 'bilah'), true);

// ── 6. Anggaran draw call: satu objek = satu call, di setiap keadaan yang diukur ──
// Klaim Tahap 2 adalah "+1 draw call per objek, nol saat diam". Angka agregat
// info.render.calls cuma bisa dipertanggungjawabkan kalau ia sama dengan banyaknya objek
// yang masuk daftar gambar pada frame yang sama, jadi invariant ini dicek per snapshot.
for (const [nama, s] of [
  ['diam bab1', diam],
  ['perpindahan', jahit],
  ['tanpa hover', sbl],
  ['hover', sts],
  ['reduce-motion', kurangi],
]) {
  const t = s.terakhir;
  cek(`calls = jumlah objek pada frame yang sama (${nama})`, t ? t.calls === t.objek.length : null, true);
}

await browser.close();
if (galat.length) console.log('pageerror:', galat.slice(0, 5));
console.log('foto di', OUT);

for (const h of hasil) console.log(`${h.ok ? 'LULUS' : 'GAGAL'}  ${h.nama}: dapat ${h.dapat}, harus ${h.harus}`);
if (hasil.some((h) => !h.ok)) process.exit(1);
