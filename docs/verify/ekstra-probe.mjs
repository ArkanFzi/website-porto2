// Bukti objek panggung tambahan (Tahap 2 dan seterusnya). Dua jalur bukti, keduanya dari frame
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
const EKSTRA = ['bahasa-logo', 'bilah', 'benang', 'debu', 'jejak', 'kompas', 'roda', 'sangkar', 'sf26-ban', 'sf26-pelek', 'sf26-sasis'];

const browser = await puppeteer.launch({
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

// Bilah butuh angka: "tidak ada bentuk tanpa angka" berarti tanpa laporan deretan memang tidak
// ada, dan gate kehadiran akan gagal karena alasan yang benar. Jadi satu laporan dibuang ke
// server lebih dulu — body persis yang dikirim perfStats dari browser pengunjung — supaya
// deretan punya satu menit untuk dilukis. HANYA boleh ke localhost: angka uji tidak boleh
// masuk ke jendela agregat yang dilihat pengunjung sungguhan.
const SEED = { fps: 58.2, medianMs: 16.7, p95Ms: 21.4, over33ms: 3, frames: 300, dpr: 1, lebar: 1440, tinggi: 900 };
const bolehSeed = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(FE);
let seedOk = false;
if (bolehSeed) {
  const res = await fetch(`${FE}/api/telemetry`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(SEED),
  }).catch(() => null);
  seedOk = !!res && res.ok;
  console.log('seed     ', bolehSeed ? `POST /api/telemetry → ${res?.status ?? 'no-response'}` : 'FE bukan localhost: tidak di-seed');
}
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
const galat = [];
page.on('pageerror', (e) => galat.push(String(e).slice(0, 200)));
// Semua bacaan yang benar-benar dikonsumsi browser dicatat di sini. Yang ditagih bagian 7
// adalah "angka yang dilukis datang dari respons yang dibaca", dan itu tidak bisa dibuktikan
// dengan fetch baru: latencyMs diukur per request, jadi angka dari request lain memang
// berbeda dan gerbangnya akan gagal karena alasan yang salah.
const bacaan = [];
page.on('response', async (res) => {
  const u = res.url();
  if (res.request().method() !== 'GET' || !/\/api\/telemetry(\?|$)/.test(u)) return;
  const b = await res.json().catch(() => null);
  if (b && Number.isFinite(b.latencyMs)) bacaan.push(b);
});
await page.goto(FE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await new Promise((r) => setTimeout(r, 6000));

const parkirY = async (y) => {
  await page.evaluate(async (v) => {
    window.scrollTo(0, Math.round(v));
    await new Promise((r) => setTimeout(r, 1500));
  }, y);
};

const parkir = async (f) => {
  const y = await page.evaluate(
    (fr) => Math.round(fr * (document.documentElement.scrollHeight - window.innerHeight)),
    f
  );
  await parkirY(y);
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
      /** Silang pengganti-kartu: 0 kartu penuh, 1 objek punya tempatnya. Nama kuncinya
       *  masih `mobil` karena itulah yang pertama memanggilnya. */
      silang: p?.mobil ?? null,
      /** Keputusan aturan pengganti frame ini — 'mobil', 'bahasa', atau null. Ini yang
       *  membuktikan objek datang dari pengukuran, bukan dari hover sembarangan. */
      aktor: p?.aktor ?? null,
      hovered: p?.hovered ?? null,
      /** Berapa frame yang benar-benar digambar saat sensus ditulis. Readout ditulis
       *  SESUDAH scene digambar dan React memasang/melepas setelah frame itu, jadi angka
       *  ini yang membedakan "keadaan" dari "perjalanan". */
      frame: r.frame ?? null,
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

/** Sensus SATU frame setelah keadaan berhenti berubah: daftar objek yang sama bertahan
 *  selama `stabilMs`. `serap` sengaja mengambil union semua frame di dalam jendelanya —
 *  itu yang membuktikan objek muncul — tapi di atas perubahan media query union itu
 *  mencampur keadaan lama dengan yang baru, dan unmount objek ekstra butuh re-render React
 *  plus beberapa frame pegas (terukur: pada 300–400 ms daftar masih membekas sf26-*, pada
 *  bacaan berikutnya sudah bersih). Gerbang "objeknya hilang" harus membaca keadaan, bukan
 *  perjalanannya. */
const sensusTetap = async (stabilMs = 150, plafonMs = 8000) => {
  const akhir = Date.now() + plafonMs;
  let dahulu = null;
  let frame = null;
  let sejak = Date.now();
  while (Date.now() < akhir) {
    const s = await medan();
    // Kunci settle = objek DAN silang, dibaca dari SATU frame yang sama (medan() mengambil
    // keduanya dari __render/__panggung yang ditulis berpasangan). Daftar objek bisa tetap
    // sementara silang masih berjalan, dan gerbang pelepasan menuntut keduanya berhenti.
    const kini = s ? `${(s.objek ?? []).join('+')}|${(s.silang ?? -1).toFixed(4)}` : null;
    if (kini !== null && kini === dahulu) {
      // Dua frame yang BERBEDA harus sepakat. Tanpa syarat ini dua bacaan beruntun pada
      // kanvas yang sama (poll 60 ms vs ±2 frame/detik di swiftshader) tampak seperti
      // keadaan tetap padahal pegas masih bergerak — dan pembulatan 4 desimal membuat
      // silang 0,0054 → 0,0048 terlihat tidak berubah. Kalau loop memang sudah tidur
      // tidak ada frame kedua dan pemanggil jatuh ke `?? serap(...)` seperti sebelumnya.
      if (s.frame !== frame && Date.now() - sejak >= stabilMs) return { puncak: s, nama: s.objek, terakhir: s };
    } else {
      dahulu = kini;
      frame = s?.frame ?? null;
      sejak = Date.now();
    }
    await new Promise((r) => setTimeout(r, 60));
  }
  return null;
};

const hasil = [];
const cek = (nama, dapat, harus) => {
  hasil.push({ nama, ok: dapat === harus, dapat: String(dapat), harus: String(harus) });
};
const cekMin = (nama, dapat, harus) => {
  hasil.push({ nama, ok: dapat >= harus, dapat: String(dapat), harus: `>=${harus}` });
};
const ada = (daftar, nama) => daftar.includes(nama);

// Binding peta gulir harus lahir sebelum pemanggil pertamanya (yRumah dipakai di bagian 1,
// jauh di bawah definisinya). Fungsi hoist, `let` tidak — tanpa blok ini jalannya mati dengan
// "Cannot access '_peta' before initialization".
let _peta = null;
let _maks = 0;

// ── 1. Keadaan diam: hanya data yang sudah punya angka yang boleh menambah kartu ──
const yDiam1 = await yRumah(1, [0.02, 0.005, 0.04, 0.06]);
cek('bab 01 punya tempat parkir yang diam', yDiam1 !== null, true);
await parkirY(yDiam1 ?? 0);
const diam = await serap(300);
await foto('01-bab1-diam');
console.log('diam     ', JSON.stringify(diam.puncak), JSON.stringify(diam.nama), 't=' + diam.terakhir?.t);
cek('laporan uji masuk ke jendela server', seedOk, true);
cek('bilah ada saat diam', ada(diam.nama, 'bilah'), true);
// Jejak butuh satu angka durasi yang terukur, dan /api/telemetry selalu mengukurnya, jadi
// objeknya boleh bangun saat diam — yang tidak boleh adalah bentuk tanpa angka di dalamnya.
cek('jejak ada saat diam', ada(diam.nama, 'jejak'), true);
for (const n of ['benang', 'debu', 'kompas', 'roda', 'sangkar'])
  cek(`${n} tidak ada saat diam`, ada(diam.nama, n), false);

// ── 2. Benang rosso: di tengah perpindahan bab 1 ke bab 2 ──
// Posisi diambil dari peta keadaan, bukan pecahan halaman: 0,14 * maks dulu mendarat di
// y=947 yang rumah bab 2 (t=0) dan benang cuma menyisakan 2 segmen.
const yJahit = await yAntar(1);
cek('perpindahan bab 1 ke 2 punya tempat parkir', yJahit !== null, true);
await parkirY(yJahit ?? 0);
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
// Roda punya velositas yang sama tapi hanya boleh ada di bab penutup: kalau dia ikut muncul
// di bab 2, gerbang bab-nya dibaca sebagai hiasan, bukan sebagai keadaan panggung.
cek('roda tidak ikut muncul saat bergulir di bab 2', ada(terlebar, 'roda'), false);

// ── 4. RollCage: keadaan diam bab arsip vs satu baris yang ditunjuk ──
// Baris arsip = div[data-magnetic] di #chapter-03 (ChapterArchives.tsx:344). Yang dibaca
// sebagai bukti hover adalah KELAS yang di-commit React (`pl-4` hanya ada saat
// hoveredProject === idx), BUKAN padding-left-nya: kelas berubah pada render yang sama
// dengan keputusannya, sedangkan padding masih transisi 300 ms di atas halaman yang
// frameloop-nya `demand` — terukur className sudah `pl-4 sm:pl-6` pada +120 ms dan
// +400 ms sementara computed masih "0px", baru 24px pada +900 ms. Menagih angka yang
// dianimasikan membuat gerbang ini hijau atau merah menurut jadwal frame, bukan menurut
// perilaku. `i` adalah posisi di antara baris yang tertutup; ia hanya berarti kalau
// `jumlah` = 5 (tidak ada strip yang membuka dirinya dan menggeser indeksnya).
const bacaBaris = () =>
  page.evaluate(() => {
    const rows = [...document.querySelectorAll('#chapter-03 [data-magnetic]')];
    const ATAS = 90;
    const BAWAH = window.innerHeight - 90;
    let pilih = null;
    rows.forEach((el, i) => {
      const b = el.getBoundingClientRect();
      const terlihat = Math.min(b.bottom, BAWAH) - Math.max(b.top, ATAS);
      // Baris arsip setinggi ~300px, jadi "seutuhnya terlihat" terlalu ketat; yang
      // dibutuhkan hanya satu titik tengah yang aman untuk ditiru pointer.
      if (terlihat > 24 && (!pilih || terlihat > pilih.terlihat)) pilih = { el, i, b };
    });
    if (!pilih) return null;
    const { el, i, b } = pilih;
    return {
      judul: el.querySelector('a')?.textContent?.trim().slice(0, 22) ?? '?',
      x: b.left + b.width / 2,
      y: Math.max(ATAS, Math.min(BAWAH, (b.top + b.bottom) / 2)),
      pl: getComputedStyle(el).paddingLeft,
      i,
      jumlah: rows.length,
      diHover: el.classList.contains('pl-4'),
    };
  });

// Posisi pointer dari bagian 3 sudah jatuh di atas baris arsip setelah parkir, jadi
// hover harus dilepas lebih dulu — kalau tidak, "sebelum" dan "sesudah" membacanya sama.
// Yang ditunggu adalah kelas yang di-commit, bukan padding yang dianimasikan: pada +120 ms
// kelasnya sudah lepas sementara computed padding-nya masih 24px, dan menunggu angka itu
// berarti menambah jam tunggu di atas keadaan yang sebenarnya sudah selesai.
const lepasHover = async () => {
  await page.mouse.move(8, 8);
  for (let i = 0; i < 12; i++) {
    await new Promise((r) => setTimeout(r, 150));
    const bersih = await page.evaluate(() =>
      [...document.querySelectorAll("#chapter-03 [data-magnetic]")].every(
        (el) => !el.classList.contains("pl-4")
      )
    );
    if (bersih) return;
  }
};

/** Tunggu Lenis berhenti: enam pembacaan scrollY yang tidak bergeser. */
async function diamDiTempat() {
  let terakhir = -1;
  let diam = 0;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 100));
    const kini = await page.evaluate(() => Math.round(window.scrollY));
    diam = Math.abs(kini - terakhir) < 2 ? diam + 1 : 0;
    terakhir = kini;
    if (diam >= 3) return kini;
  }
  return terakhir;
}

/** Peta gulir→keadaan bab, sekali saja, lalu di-cache. Ini yang membuat jangkar bagian
 *  berikutnya tidak lagi berupa pecahan halaman: isi bab 02 berubah tinggi (phase CV +
 *  detail karya, lalu detail karya pindah ke dalam panel) dan setiap pecahan yang sudah
 *  "terkalibrasi" ikut bergeser — 0,14 jatuh lagi di rumah bab 2 (t=0, benang cuma 2 segmen)
 *  dan 0,7 jatuh lagi di hub. Yang tidak bergeser adalah keadaan yang terbaca.
 *  Sampel dibaca SETELAH Lenis berhenti, jadi t=0 berarti benar-benar diam, bukan belum tiba. */
async function petaGulir(langkah = 150) {
  if (_peta) return _peta;
  _maks = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight
  );
  const sampel = [];
  for (let y = 0; y <= _maks; y += langkah) {
    await page.evaluate((v) => window.scrollTo(0, Math.round(v)), y);
    await diamDiTempat();
    const b = await page.evaluate(() => ({
      babDari: window.__panggung?.babDari ?? null,
      t: window.__panggung?.t ?? null,
    }));
    sampel.push({ y, ...b });
  }
  _peta = sampel;
  console.log(
    'peta gulir',
    `${sampel.length} sampel pada maks ${_maks}:`,
    sampel.map((s) => `${s.y}:${s.babDari}/${s.t}`).join(' ')
  );
  return sampel;
};

/** y tempat bab `babDari` DIAM (t=0). Kandidat diambil dari peta yang baru diukur — tengah
 *  tiap rentangan diam, bukan pinggirnya — dan tiap kandidat diverifikasi ulang dengan parkir
 *  sungguhan sebelum dipakai. Pecahan `kandidat` tetap dicoba belakangan sebagai jalur gelap
 *  kalau peta tidak menemukan rumah (misalnya keadaan tidak pernah t=0 di bab itu).
 *  Mengembalikan null bila tidak ada kandidat yang mendarat; pemanggil menagih null itu
 *  sebagai kegagalan, bukan diam-diam kembali ke pecahan buta. */
async function yRumah(babDari, kandidat = []) {
  const peta = await petaGulir();
  const rentang = [];
  for (const s of peta) {
    const akhir = rentang[rentang.length - 1];
    if (akhir && akhir.babDari === s.babDari && akhir.t === 0 && s.t === 0 && s.y - akhir.y <= 160) {
      akhir.y = s.y;
    } else {
      rentang.push({ babDari: s.babDari, t: s.t, dari: s.y, y: s.y });
    }
  }
  const tengah = rentang
    .filter((r) => r.babDari === babDari && r.t === 0)
    .map((r) => Math.round((r.dari + r.y) / 2));
  const urutan = [...tengah, ...kandidat.map((f) => Math.round(f * _maks))];
  for (const y of urutan) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await diamDiTempat();
    await new Promise((r) => setTimeout(r, 700));
    const b = await page.evaluate(() => ({
      babDari: window.__panggung?.babDari ?? null,
      t: window.__panggung?.t ?? null,
    }));
    if (b.babDari === babDari && b.t === 0) return y;
    console.log(`  yRumah(${babDari}) tolak y=${y} →`, JSON.stringify(b));
  }
  return null;
}

/** y tengah perpindahan `dari` → bab berikutnya, diukur dari peta yang sama. Dipilih sampel
 *  dengan t paling besar yang masih di dalam perpindahan (bukan 0, bukan 1): benang rosso
 *  sepanjang 24 segmen hanya terpasang kalau jahitannya hampir selesai, dan di t=0 ia cuma 2. */
async function yAntar(dari) {
  const peta = await petaGulir();
  const antara = peta.filter((s) => s.babDari === dari && s.t > 0 && s.t < 1);
  antara.sort((a, b) => b.t - a.t);
  for (const s of antara) {
    await page.evaluate((v) => window.scrollTo(0, Math.round(v)), s.y);
    await diamDiTempat();
    const b = await page.evaluate(() => ({
      babDari: window.__panggung?.babDari ?? null,
      t: window.__panggung?.t ?? null,
    }));
    if (b.babDari === dari && b.t > 0 && b.t < 1) return s.y;
    console.log(`  yAntar(${dari}) tolak y=${s.y} →`, JSON.stringify(b));
  }
  return null;
}


// Lenis adalah pemilik posisi gulir, jadi window.scrollTo native bisa ditimpa kembali ke
// nilai animasinya (terukur: target 3019, halaman bertahan di 2443 dan baris arsip tidak
// pernah terlihat). Yang dipakai pengunjung adalah roda mouse, jadi bagian ini menggulir
// dengan roda sampai sebuah baris benar-benar terlihat. Kalau tidak ketemu, `target` tetap
// null dan gerbang "baris arsip terlihat setelah parkir" gagal dengan angka di log, bukan
// diam-diam melewatkan percobaan hover.
const parkirKeBaris = async () => {
  let langkah = 0;
  let t = await bacaBaris();
  while (!t && langkah < 24) {
    await page.mouse.wheel({ deltaY: 160 });
    await new Promise((r) => setTimeout(r, 120));
    await diamDiTempat();
    langkah++;
    t = await bacaBaris();
  }
  // Debu dan kompas hidup dari velositas; tanpa jeda idle, "sebelum" bisa masih memuat
  // segmen kompas dan selisih garis sangkar terbaca kurang.
  await new Promise((r) => setTimeout(r, 1200));
  return {
    jumlah: await page.evaluate(() => document.querySelectorAll('#chapter-03 [data-magnetic]').length),
    scrollY: await page.evaluate(() => Math.round(window.scrollY)),
    langkah,
  };
};

// Bagian ini menuntut SATU baris yang diam di bawah pointer. Sejak hub menempati 0,62–0,68,
// lanjut gulir dari 0,375 bisa berhenti di tengah perpindahan (terukur babDari=5, t=0,879):
// kartu bergerak, baris bergerak di bawah titik hover, dan "sebelum vs sesudah" membandingkan
// dua baris yang berbeda — sangkar tertinggal di census, selisih garis terbaca 0. Jadi dicari
// dulu rumah bab 03 yang benar-benar diam, baru roda dipakai untuk merapikan barisnya.
const yBab3 = await yRumah(3, [0.7, 0.66, 0.74, 0.62, 0.78]);
cek('bab 03 punya tempat parkir yang diam', yBab3 !== null, true);
await parkirY(yBab3 ?? (await page.evaluate(() => Math.round((document.documentElement.scrollHeight - window.innerHeight) * 0.375))));
const parkir4 = await parkirKeBaris();
const target = await bacaBaris();
let sbl = await serap(300);
let sts = sbl;
let keadaanLepas = null;
// Keputusan aturan dibaca dari `__panggung.hovered` — channel yang sama yang dipakai
// `aktorDipanggil` untuk menentukan pengganti kartu. Padding/kelas adalah akibatnya di DOM;
// kalau keduanya berbeda, yang paling dekat dengan perilaku objek adalah keputusan ini.
const bacaKeputusan = () =>
  page.evaluate(() => ({
    hovered: window.__panggung?.hovered ?? null,
    aktor: window.__panggung?.aktor ?? null,
  }));
let keputusan = { hovered: null, aktor: null };
// Hover pointer adalah peristiwa asinkron yang bisa hilang saat halaman masih settling
// setelah gulir roda di bagian 3; tanpa percobaan ulang bagian ini jadi flaky (pernah
// gagal sekali dari tiga jalan). Tiga percobaan dengan jeda melepas hover membuat hasilnya
// bergantung pada keadaan halaman, bukan pada keberuntungan.
for (let percobaan = 1; percobaan <= 3 && target; percobaan++) {
  await lepasHover();
  sbl = await serap(300);
  // Baseline dibaca SETELAH hover dilepas, bukan dari `target`: pointer bagian 3 bisa sudah
  // jatuh di atas baris yang sama saat `target` diambil, sehingga keadaannya sudah hover dan
  // "sebelum vs sesudah" memperbandingkan dua keadaan yang identik.
  keadaanLepas = await bacaBaris();
  if (percobaan === 1) await foto('05-bab3-tanpa-hover');
  await page.mouse.move(target.x, target.y);
  await new Promise((r) => setTimeout(r, 250 * percobaan));
  sts = await serap(300);
  const kini = await bacaBaris();
  if (!kini || !keadaanLepas || kini.diHover === keadaanLepas.diHover) continue;
  keputusan = await bacaKeputusan();
  if (keputusan.hovered !== null) break;
}
const barisKini = await bacaBaris();
keputusan = await bacaKeputusan();
await foto('06-bab3-hover');
console.log(
  'sangkar  ',
  JSON.stringify(parkir4),
  JSON.stringify(target),
  '| keadaanLepas:',
  JSON.stringify(keadaanLepas && { i: keadaanLepas.i, pl: keadaanLepas.pl, diHover: keadaanLepas.diHover }),
  '| keputusan:',
  JSON.stringify(keputusan),
  '| sebelum:',
  JSON.stringify(sbl.nama),
  JSON.stringify(sbl.puncak.garis),
  '→ sesudah:',
  JSON.stringify(sts.nama),
  JSON.stringify(sts.puncak.garis)
);
cek('baris arsip terlihat setelah parkir', !!target, true);
// Indeks baris hanya berarti kalau tidak ada strip yang membuka dirinya dan menggeser
// posisinya di antara [data-magnetic]; itu yang membuat `hovered === i` bisa ditagih.
cek('daftar arsip masih tertutup penuh', target?.jumlah ?? null, 5);
cek('hover baris arsip sampai ke state', !!target && !!keadaanLepas && keadaanLepas.diHover === false && barisKini?.diHover === true, true);
cek('hover baris arsip sampai ke aturan pengganti', `${keputusan.hovered}/${barisKini?.i}`, `${barisKini?.i}/${barisKini?.i}`);
// Sangkar tidak lagi menunggui hover: ia mengikuti silang pengganti, dan di bab arsip silang
// itu bernilai penuh bahkan saat pointer diam (kotak tidak pernah kosong lagi). Jadi gerbang
// "tidak ada tanpa hover" sudah bukan keadaan halaman ini — yang ditagih sekarang adalah
// (a) ada di diam, (b) tidak bertambah oleh hover baris /01, (c) 12 segmen dibaca ABSOLUT,
// bukan sebagai delta terhadap tanpa-hover, karena tanpa-hover kini juga berdarah. Lepasnya
// sangkar ditagih di bagian 10 tempat halaman benar-benar meninggalkan bab arsip.
cek('sangkar hidup di keadaan diam bab arsip', ada(sbl.nama, 'sangkar'), true);
cek('sangkar masih ada saat baris /01 di-hover', ada(sts.nama, 'sangkar'), true);
cekMin('sangkar menyumbang 12 segmen LINES', sbl.puncak.garis, SISI_SANGKAR);
cek('hover /01 tidak menambah segmen garis', sts.puncak.garis - sbl.puncak.garis, 0);

// ── 5. prefers-reduced-motion: semua objek ekstra hilang, kartu tetap ──
// DIBACA DI KEADAAN DIAM, bukan di jendela waktu: `parkir(0,375)` lama bisa mendarat di tengah
// perpindahan (bab 5/hub), dan sensus union atas keadaan itu melaporkan objek yang sedang
// berangkat, bukan yang tersisa. Yang ditagih gerbang ini adalah keadaan setelah aba-aba
// bekerja, jadi keduanya — parkir dan bacaan — diambil dari keadaan yang terbaca.
const yDiam5 = await yRumah(2, [0.16, 0.2, 0.24, 0.12]);
cek('bab 02 punya tempat parkir yang diam untuk uji reduce', yDiam5 !== null, true);
await parkirY(yDiam5 ?? (await page.evaluate(() => Math.round((document.documentElement.scrollHeight - window.innerHeight) * 0.375))));
const sebelum5 = (await serap(300)).nama;
// 700 ms, bukan 150: frame yang membuktikan perubahan media query itu TERGAMBAR sekitar
// 250–300 ms setelah aba-aba diterima (terukur: frame 26 → 28 pada t=300 ms, dan pada t=100 ms
// sensusnya masih keadaan lama). Jendela stabil yang lebih pendek mengembalikan bacaan basi
// sebagai "keadaan tetap" — persis kegagalan yang sedang dikejar di bagian ini.
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
const kurangi = (await sensusTetap(700)) ?? (await serap(400));
await foto('07-bab2-reduce-motion');
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
const pulihState = (await sensusTetap(700)) ?? (await serap(300));
const pulih = pulihState.nama;
console.log('reduce   sebelum:', JSON.stringify(sebelum5), '| reduce:', JSON.stringify(kurangi.nama), JSON.stringify(kurangi.terakhir), '| pulih:', JSON.stringify(pulih));
cek('reduce-motion menghapus semua objek ekstra', EKSTRA.some((n) => ada(kurangi.nama, n)), false);
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

// ── 7. Satu angka, dua lukisan (ide 17): bilah DOM di laci dan bilah instans di panggung ──
// Hukum tinggi ditulis ULANG di sini, independen dari lib/buketMenit, supaya gerbang ini
// membuktikan "yang dilukis = yang diukur" dan bukan mengulang kode yang sama. Konstantanya
// adalah kontrak yang didokumentasikan di modul itu: ambang 33 ms, overshoot dipadatkan 0,35,
// langit-langit 2,2 — dan satu-satunya hal yang boleh membuat bilah tinggi adalah angka.
const BATAS = 33;
const MAMPAT = 0.35;
const LANGIT = 2.2;
const hukumTinggi = (r) =>
  Number.isFinite(r) && r > 0 ? Math.min(r <= 1 ? r : 1 + (r - 1) * MAMPAT, LANGIT) : 0;

let getTelemetri = 0;
page.on('request', (req) => {
  if (req.method() === 'GET' && /\/api\/telemetry(\?|$)/.test(req.url())) getTelemetri += 1;
});

await parkir(0.375);
await page.click('button[aria-label="Pit-Wall Telemetry HUD"]');
const getSebelum = getTelemetri;
await new Promise((r) => setTimeout(r, 4000));
const getLaci = getTelemetri - getSebelum;

const lukisan = await page.evaluate(() => {
  const wadah = document.querySelector('[data-bilah-dom]');
  const b = window.__bilah;
  return {
    wadah: wadah ? wadah.getBoundingClientRect().height : 0,
    dom: [...document.querySelectorAll('[data-bilah-menit]')].map((el) => ({
      slot: Number(el.dataset.bilahMenit),
      tinggi: el.getBoundingClientRect().height,
    })),
    panggung: b ? { menit: b.menit, rasio: b.rasio, tinggiPx: b.tinggiPx, markaPx: b.markaPx } : null,
  };
});
// Angka dibandingkan dengan bacaan yang benar-benar dikonsumsi browser, bukan fetch baru —
// alasan yang sama seperti catatan di atas `bacaan`, dan di sini terbukti mengukur: buket
// menit terakhir masih berisi sampel yang belum selesai, jadi p95-nya berubah antara dua
// permintaan dan satu bilah terbaca "asing" padahal yang dilukis persis angka yang dibaca
// browser (terukur pada gerbang ini: angkaAsing = 1, tinggi DOM dan panggung keduanya cocok).
const bacaBilah =
  bacaan[bacaan.length - 1] ??
  (await fetch(`${FE}/api/telemetry`)
    .then((r) => r.json())
    .catch(() => null));
const perMenit = new Map((bacaBilah?.clientFrames?.buket ?? []).map((m) => [m.menit, m]));

const domPerSlot = new Map(lukisan.dom.map((d) => [d.slot, d.tinggi]));
const terisi = lukisan.panggung
  ? lukisan.panggung.menit.map((m, j) => ({ m, j })).filter((s) => s.m !== '')
  : [];
console.log(
  'lukisan  ',
  `get/4s=${getLaci}`,
  'dom:',
  JSON.stringify(lukisan.dom),
  'panggung:',
  JSON.stringify(lukisan.panggung),
  'menit uji:',
  JSON.stringify([...perMenit.keys()])
);

cek('laci terpasang tidak mempoll telemetri', getLaci <= 2, true);
cek('satu bacaan menghasilkan bilah DOM', lukisan.dom.length > 0 && lukisan.wadah > 0, true);
cek('panggung sudah melukis deretan yang sama', !!lukisan.panggung && terisi.length > 0, true);

let hampa = 0;
let bengkok = 0;
let bedaSisi = 0;
let angkaAsing = 0;
for (let j = 0; j < (lukisan.panggung?.menit.length ?? 0); j++) {
  const m = lukisan.panggung.menit[j];
  if (m === '') {
    // Slot tanpa laporan: tidak boleh ada elemen DOM dan tidak boleh ada tinggi di panggung.
    if (domPerSlot.has(j) || lukisan.panggung.tinggiPx[j] !== 0) hampa += 1;
    continue;
  }
  const harus = hukumTinggi(lukisan.panggung.rasio[j]);
  const dapatPanggung = lukisan.panggung.markaPx
    ? lukisan.panggung.tinggiPx[j] / lukisan.panggung.markaPx
    : -1;
  const dapatDom = domPerSlot.has(j) ? (domPerSlot.get(j) / lukisan.wadah) * LANGIT : -1;
  if (Math.abs(dapatPanggung - harus) > 0.02) bengkok += 1;
  if (Math.abs(dapatDom - harus) > 0.02) bengkok += 1;
  if (Math.abs(dapatDom - dapatPanggung) > 0.02) bedaSisi += 1;
  // Dan angkanya memang datang dari API, bukan dari konstanta yang disisipkan komponen.
  const lap = perMenit.get(m);
  const rasioApi = lap ? lap.p95RerataMs / BATAS : -1;
  if (!lap || Math.abs(rasioApi - lukisan.panggung.rasio[j]) > 0.05) angkaAsing += 1;
}
cek('menit tanpa laporan tidak berbentuk di kedua sisi', hampa, 0);
cek('tinggi kedua lukisan sama dengan hukum angkanya', bengkok, 0);
cek('DOM dan panggung melukis tinggi yang sama', bedaSisi, 0);
cek('rasio bilah berasal dari angka API', angkaAsing, 0);

await foto('08-laci-bilah-dom');
await page.click('button[aria-label="Pit-Wall Telemetry HUD"]');

// ── 8. Jejak arsitektur: panjang segmen = durasi yang diukur, hop tanpa angka tanpa bentuk ──
// Hukumnya ditulis ULANG di sini dari kontrak yang didokumentasikan lib/jejakArsitektur: hop
// Node adalah selisih total handler dengan fetch backend, hop backend adalah rttMs, PostgreSQL
// tidak pernah punya durasi, dan lantai sumbu 8 ms menahan satu milidetik agar tidak memanjang
// jadi garis sepanjang kanvas. Kalau komponen menyisipkan konstantanya sendiri, bagian ini
// menolak.
const LANTAI_MS = 8;
const hopDariApi = (b) => {
  const rtt =
    typeof b?.backend?.rttMs === 'number' && b.backend.rttMs <= b.latencyMs ? b.backend.rttMs : null;
  return [rtt === null ? b.latencyMs : b.latencyMs - rtt, rtt, null];
};

await parkir(0.375);
await page.click('button[aria-label="Pit-Wall Telemetry HUD"]');
await new Promise((r) => setTimeout(r, 800));
// Instans ditulis pada frame yang sedang jalan, jadi satu gulir kecil dibutuhkan supaya yang
// terbaca adalah hasil bacaan terbaru, bukan sisa gambar terakhir.
await page.mouse.wheel({ deltaY: 40 });
await new Promise((r) => setTimeout(r, 500));

const bacaJejak = () =>
  page.evaluate(() => {
    const j = window.__jejak;
    const el = (id) => document.querySelector(`[data-jejak-hop="${id}"]`);
    const msDom = (id) => {
      const e = el(id);
      if (!e) return undefined;
      const m = (e.textContent || '').replace(/\s+/g, ' ').match(/—\s*(-?\d+(?:\.\d+)?)ms/);
      return m ? Number(m[1]) : null;
    };
    const pecahan = (id) => {
      const bar = document.querySelector(`[data-jejak-bar="${id}"]`);
      if (!bar) return null;
      const wadah = bar.parentElement.getBoundingClientRect().width;
      return wadah > 0 ? bar.getBoundingClientRect().width / wadah : -1;
    };
    return {
      panggung: j
        ? { hop: j.hop, ms: j.ms, px: j.px, mulai: j.mulai, pxPerMs: j.pxPerMs, anggaranPx: j.anggaranPx, totalMs: j.totalMs, papan: j.papan, tebalPx: j.tebalPx, tinggiMarkaPx: j.tinggiMarkaPx, jarakPapanPx: j.jarakPapanPx, asalY: j.asalY, asalGulir: j.asalGulir }
        : null,
      dom: { node: pecahan('node'), backend: pecahan('backend'), database: pecahan('database') },
      msDom: { node: msDom('node'), backend: msDom('backend'), database: msDom('database') },
      kotakDatabase: !!document.querySelector('[data-jejak-hop="database"] [data-jejak-bar]'),
      objek: window.__render?.objek ?? [],
    };
  });

/** DOM dan panggung menulis dari bacaan yang berbeda waktu: panel telemetri ikut re-render
 *  React tiap poll, instans WebGL ditulis pada frame. Terukur: DOM sudah melukis 4/8 ms
 *  (pecahan 1/3 dan 2/3) sementara `__jejak` masih memegang 2/4 ms — gate "pecahan yang sama"
 *  lalu membandingkan dua momen, bukan dua penampil. Yang ditunggu: angka ms yang sama di
 *  kedua sisi, baru pecahannya dibaca. Kalau tidak pernah ketemu, bacaan terakhir yang
 *  dipakai dan gerbangnya gagal dengan angka di log. */
let jejak = await bacaJejak();
for (let i = 0; i < 12; i++) {
  const j = jejak.panggung;
  const sama =
    j &&
    ['node', 'backend', 'database'].every(
      (id, k) => jejak.msDom[id] === (j.ms[k] === null ? null : j.ms[k])
    );
  if (sama) break;
  await page.mouse.wheel({ deltaY: 20 });
  await new Promise((r) => setTimeout(r, 400));
  jejak = await bacaJejak();
}

const j = jejak.panggung;
const pecahanHarus = (ms) => (ms && ms > 0 ? Math.min(ms / Math.max(j?.totalMs ?? 0, LANTAI_MS), 1) : 0);
const bedaPecahan = j
  ? ['node', 'backend', 'database'].filter((id, i) => {
      const harus = pecahanHarus(j.ms[i]);
      const panggung = j.px[i] / j.anggaranPx;
      const dom = jejak.dom[id];
      if (harus === 0) return dom !== null || panggung !== 0;
      return Math.abs(dom - harus) > 0.02 || Math.abs(panggung - harus) > 0.02;
    })
  : ['tidak ada lukisan'];
console.log(
  'jejak    ',
  `bacaan=${bacaan.length}`,
  'hop api:',
  JSON.stringify(bacaan.length ? hopDariApi(bacaan[bacaan.length - 1]) : null),
  '| panggung:',
  JSON.stringify(j),
  '| dom:',
  JSON.stringify(jejak.dom),
  '| ms dom:',
  JSON.stringify(jejak.msDom)
);
cek(
  'kedua penampil dibandingkan pada bacaan yang sama',
  j
    ? ['node', 'backend', 'database'].every((id, k) => jejak.msDom[id] === j.ms[k])
    : false,
  true
);
cek('jejak melukis hop yang sama dengan arsitektur terukur', j ? j.hop.join(',') : null, 'node,backend,database');
cek('durasi yang dilukis adalah angka yang dibaca browser dari API', j ? bacaan.some((b) => hopDariApi(b).every((m, i) => m === j.ms[i])) : false, true);
cek('penggaris yang sama dipakai semua segmen', j ? j.px.every((p, i) => Math.abs(p - (j.ms[i] ?? 0) * j.pxPerMs) < 0.01) : false, true);
cek('segmen tersusun tanpa celah', j ? j.mulai.every((m, i) => (i === 0 ? m === 0 : Math.abs(m - (j.mulai[i - 1] + j.px[i - 1])) < 0.01)) : false, true);
cek('hop tanpa angka tidak punya panjang di panggung', j ? j.px[2] : null, 0);
cek('hop tanpa angka tidak punya bilah di DOM', jejak.kotakDatabase, false);
cek('lantai sumbu menahan garis agar tidak melebar', j ? j.px.reduce((a, p) => a + p, 0) <= j.anggaranPx + 0.01 : false, true);
cek('DOM dan panggung melukis pecahan yang sama', bedaPecahan.length, 0);
cek('jejak hanya satu objek', jejak.objek.filter((n) => n === 'jejak').length, 1);
cek('jumlah hop sama dengan total yang dijumlah penggaris', j ? Math.abs(j.px[0] + j.px[1] - j.totalMs * j.pxPerMs) < 0.01 : false, true);

// ── 8b. Jangkar garis: baris header bab, bukan kotak portal ──
// Kotak portal itu `position: fixed` (MeshPortal), jadi garis yang menggantung di tepi atasnya
// diam di layar sementara seluruh teks bab lewat melewatinya — terukur di bab 04: pada gulir
// 130 px garis mendarat di tengah "LET'S BUILD THE". Yang ditagih di bawah bukan lagi panjang
// (sudah bagian 8) tapi DI MANA garis itu duduk, dan hukurnya ditulis ULANG dari kontrak
// JejakArsitektur.tsx: jangkar = elemen [data-jejak-papan], garis = JARAK_PAPAN_PX di bawah
// batas baris itu dalam ruang dokumen, setebal TEBAL_BILAH_PX. Karena rect dibaca langsung dari
// DOM — bukan dari angka yang diklaim komponen — gerbang ini tetap menolak kalau komponennya
// diam-diam kembali ke portal. Yang lama diuji sebagai taring: hukum lama (tepi atas portal +
// 40) HARUS tetap ketahuan menyayat teks, supaya "nol tabrakan" bukan kebetulan satu offset.
const JARAK_PAPAN_PX = 14; // harus sama dengan JARAK_PAPAN_PX di JejakArsitektur.tsx
const TEBAL_BILAH_PX = 3; // harus sama dengan TEBAL_BILAH_PX
const TINGGI_MARKA_PX = 9; // harus sama dengan TINGGI_MARKA_PX — unsur tertinggi
const JARAK_LAMA_PX = 40; // hukum lama: turun dari tepi atas portal yang fixed
const UMUR_TIP = 24; // tipografi sebesar ini yang tidak boleh tersayat

const jangkar = await page.evaluate(() => {
  const nomorPortal = (el) => Number(el.closest('section')?.querySelector('[data-portal]')?.dataset.portal);
  const portal = [...document.querySelectorAll('[data-portal]')]
    .map((el) => Number(el.dataset.portal))
    .filter(Number.isFinite);
  const papan = [...document.querySelectorAll('[data-jejak-papan]')].map((el) => {
    const r = el.getBoundingClientRect();
    return {
      bab: nomorPortal(el),
      kiri: r.left + window.scrollX,
      bawah: r.top + window.scrollY + r.height,
      lebar: r.width,
    };
  });
  return { jumlahPortal: new Set(portal).size, jumlahPapan: papan.length, papan };
});
cek('setiap bab berportal punya baris jangkar', jangkar.jumlahPapan, jangkar.jumlahPortal);
const papanDOM = jangkar.papan.find((p) => p.bab === j?.papan?.bab);
cek(
  'jangkar yang dilaporkan komponen sama dengan baris yang ada di DOM',
  !!(j?.papan && papanDOM) &&
    Math.abs(j.papan.bawah - papanDOM.bawah) < 1 &&
    Math.abs(j.papan.kiri - papanDOM.kiri) < 1 &&
    Math.abs(j.papan.lebar - papanDOM.lebar) < 1,
  true
);
cek('kontrak jarak dan tebal tidak berubah di komponen', j ? [j.jarakPapanPx, j.tebalPx].join('x') : null, `${JARAK_PAPAN_PX}x${TEBAL_BILAH_PX}`);
cek('marka yang tertinggi ikut jadi pita tumbukan', j ? j.tinggiMarkaPx : null, TINGGI_MARKA_PX);
// JARAK_PAPAN_PX hanya boleh dibayar satu kali. Kalau dia masuk ke titik asal mesh DAN ke
// koordinat lokal instans, garis mendarat 28 px di bawah header sementara panjang segmennya
// tetap benar — jadi yang ditagih di sini posisi asal yang terpasang, bukan angkanya.
cek(
  'titik asal terpasang tepat di tepi bawah jangkar',
  !!(j?.papan && Number.isFinite(j.asalY)) && Math.abs(j.asalY - (j.papan.bawah - j.asalGulir)) < 1,
  true
);
await foto('09-jejak-arsitektur');

// Sapu beberapa titik gulir di setiap bab dan bandingkan rentang garis (hukum baru vs hukum lama)
// dengan kotak tipografi besar. Karena garis ikut dokumen, hukum baru hanya boleh menyentuh teks
// di wilayah header-nya sendiri; hukum lama menyentuhnya di tengah halaman.
const sapuJangkar = [];
for (const bab of [1, 2, 3, 4, 5]) {
  const dasar = await page.evaluate(
    (b) => {
      const el = document.querySelector(`#chapter-0${b}`);
      if (!el) return -1;
      return Math.round(el.getBoundingClientRect().top + window.scrollY);
    },
    bab
  );
  if (dasar < 0) continue;
  for (const geser of [0, 130, 260, 390]) {
    await parkirY(dasar + geser);
    const b = await page.evaluate(
      (ctx) => {
        const j = window.__jejak;
        if (!j?.papan) return null;
        const papan = [...document.querySelectorAll('[data-jejak-papan]')]
          .map((el) => {
            const r = el.getBoundingClientRect();
            const nomor = Number(el.closest('section')?.querySelector('[data-portal]')?.dataset.portal);
            return { bab: nomor, kiri: r.left + window.scrollX, bawah: r.top + window.scrollY + r.height };
          })
          .find((p) => p.bab === j.papan.bab);
        if (!papan) return null;
        const kotakPortal = document.querySelector(`[data-portal="${j.papan.bab}"]`)?.getBoundingClientRect();
        const panjang = j.px.reduce((a, p) => a + p, 0);
        const kiri = papan.kiri - window.scrollX;
        const sayat = (atas) => {
          if (atas < 0 || atas > window.innerHeight) return [];
          const bawah = atas + ctx.pita;
          const kena = [];
          for (const el of document.querySelectorAll('h1,h2,h3,p,span,div')) {
            const r = el.getBoundingClientRect();
            if (r.width < 20 || r.height < 8) continue;
            const fs = parseFloat(getComputedStyle(el).fontSize) || 0;
            if (fs < ctx.umur) continue;
            if (r.top > bawah || r.bottom < atas) continue;
            if (r.right < kiri || r.left > kiri + panjang) continue;
            kena.push(`${el.tagName} ${Math.round(fs)}px`);
          }
          return kena;
        };
        return {
          bab: j.papan.bab,
          // Posisi asal yang terpasang di layar vs tepi bawah jangkar yang baru saja dibaca:
          // pasangan ini juga menangkap titik asal yang tertinggal (belum digambar ulang
          // sesudah gulir), bukan hanya jarak yang dibayar dua kali.
          asal: Number.isFinite(j.asalY) ? +Math.abs(j.asalY - (papan.bawah - window.scrollY)).toFixed(2) : null,
          baru: sayat(papan.bawah - window.scrollY + ctx.jarak - ctx.paruh),
          lama: kotakPortal ? sayat(kotakPortal.top + ctx.lama - ctx.paruh) : [],
        };
      },
      {
        jarak: JARAK_PAPAN_PX,
        pita: Math.max(TEBAL_BILAH_PX, TINGGI_MARKA_PX),
        paruh: Math.max(TEBAL_BILAH_PX, TINGGI_MARKA_PX) / 2,
        lama: JARAK_LAMA_PX,
        umur: UMUR_TIP,
      }
    );
    if (b) sapuJangkar.push({ bab, geser, ...b });
  }
}
const tabrakBaru = sapuJangkar.filter((s) => s.baru.length > 0);
const tabrakLama = sapuJangkar.filter((s) => s.lama.length > 0);
const asalBebas = sapuJangkar.filter((s) => s.asal === null || s.asal > 1);
console.log(
  'jangkar  ',
  `titik=${sapuJangkar.length}`,
  'asal meleset maks:',
  Math.max(0, ...sapuJangkar.map((s) => s.asal ?? 99)).toFixed(2),
  'baru:',
  JSON.stringify(tabrakBaru.slice(0, 3)),
  '| lama:',
  JSON.stringify(tabrakLama.slice(0, 3))
);
cek('garis tidak menyayat tipografi besar di semua titik gulir', tabrakBaru.length, 0);
cek('titik asal menempel di tepi jangkar di semua titik gulir', asalBebas.length, 0);
cekMin('sapuan menyentuh lebih dari satu bab', new Set(sapuJangkar.map((s) => s.bab)).size, 3);
cek('hukum lama akan ketahuan (gerbangnya bertaring)', tabrakLama.length > 0, true);

await page.click('button[aria-label="Pit-Wall Telemetry HUD"]');

// ── 9. Roda paddock (ide 3): sudut dijumlahkan dari velositas, hanya di bab penutup ──
// Yang membuat benda ini roda dan bukan jarum adalah hukum sudutnya: jarum mengambil nilainya
// dari velositas saat itu juga, roda menjumlahkan jarak yang sudah ditempuh. Kalau komponen
// diganti menjadi `sudut = f(velositas)`, gerbang di bawah menolak — dua lompatan ke arah sama
// tidak lagi menjumlah (nilai absolutnya mengulang, bukan melanjutkan), dan sudutnya bergerak
// naik-turun mengikuti besar velositas alih-alih satu arah.
const JARI_KASAR = 26; // harus sama dengan JARI_PX di RodaPaddock.tsx
const JARI_RASIO = 0.24; // harus sama dengan JARI_MAKS_RASIO
const LINGKAR = Math.PI * 2;

// Jarak diukur lewat satu lompatan scrollTo, bukan antrean event roda mouse. Dua percobaan
// pertama membuktikan antrean notch tidak bisa dipakai mengukur: Lenis menyimpan targetnya
// sendiri lalu melanjutkan animasi di belakang pembacaan (terukur: velositas -676 px/frame dan
// halaman bergerak 4485 px selama satu "letakkan" yang hanya meminta 360 px), sehingga jarak
// yang sampai ke roda bukan jarak yang saya kira. Satu lompatan memberi satu animasi dengan
// jarak awal→akhir yang diketahui, dan velositasnya nyata.
const yKini = () => page.evaluate(() => Math.round(window.scrollY));

// Window bab penutup tempat roda boleh ada: `batas`section 04 dikurangi pita perpindahan
// (data-pita 0,16 di ChapterPaddock.tsx) sampai dasar dokumen. Semua lompatan di bawah
// tetap di dalam jendela ini supaya yang diuji hanya velositasnya.
const rentang = await page.evaluate(() => {
  const s = document.querySelector('#chapter-04');
  const maks = document.documentElement.scrollHeight - window.innerHeight;
  if (!s || maks <= 0) return null;
  const PITA = 0.16;
  const batas = Math.round(((s.getBoundingClientRect().top + window.scrollY) / maks - PITA) * maks);
  return { bawah: batas + 40, tengah: Math.round((batas + maks * 0.995) / 2), atas: Math.round(maks * 0.995) };
});

/** Sensus keadaan diam: satu lompatan scrollTo 1 px memaksa frame baru tergambar (sensus
 *  objek hanya ditulis pada frame yang digambar), lalu animasi sisa ditunggu sampai habis. */
const sensusDiam = async () => {
  await diamDiTempat();
  const fr = await page.evaluate(
    () => (window.scrollY + 1) / (document.documentElement.scrollHeight - window.innerHeight)
  );
  await parkir(fr);
  await new Promise((r) => setTimeout(r, 1500));
  return serap(400);
};

const bacaRoda = () =>
  page.evaluate(() => {
    const r = window.__roda;
    const objek = window.__render?.objek ?? [];
    return {
      ada: objek.filter((n) => n === 'roda').length,
      nama: objek,
      calls: window.__render?.calls ?? null,
      jumlahObjek: objek.length,
      sudut: r?.sudut ?? null,
      vel: r?.velositas ?? null,
      jari: r?.jariPx ?? null,
      putaran: r?.putaran ?? null,
      portalLebar: window.__panggung?.portal?.[2] ?? null,
    };
  });

/** Diam di satu posisi: lompatan instan lalu tunggu sampai animasinya benar-benar selesai. */
const diamDi = async (y) => {
  await page.evaluate((v) => window.scrollTo(0, v), y);
  await new Promise((r) => setTimeout(r, 1800));
};

/** Satu lompatan scrollTo → satu animasi Lenis, dicatat roda tiap 100 ms. Baseline putaran
 *  dibaca sebelum lompatan: ref sudut hidup di komponen yang tidak pernah ikut di-unmount,
 *  jadi selisihnya adalah putaran selama lompatan ini saja dan nilai absolutnya menunjukkan
 *  apakah roda melanjutkan perjalanannya atau mulai dari nol. */
const lompatDanCatat = async (y) => {
  const awal = await bacaRoda();
  const yMulai = await yKini();
  await page.evaluate((v) => window.scrollTo(0, v), y);
  const catatan = [];
  for (let i = 0; i < 12; i++) {
    await new Promise((r) => setTimeout(r, 100));
    catatan.push(await bacaRoda());
  }
  const akhir = await bacaRoda();
  const yAkhir = await yKini();
  const nilai = catatan.map((b) => b.putaran).filter((v) => v !== null);
  const lang = nilai.slice(1).map((v, i) => v - nilai[i]);
  // Yang dilarang adalah langkah yang MELAWAN arah lompatan: itu sudut yang berbalik sendiri,
  // tanda jarum. Lenis di konfigurasi ini tidak punya bounce, jadi tidak ada overshoot yang
  // sah di ekor animasi — dan gerbang ini harus membaca tanda langkah terhadap arah, karena
  // lompatan ke atas memang menurunkan putaran.
  const maju = y > yMulai;
  return {
    awal,
    akhir,
    catatan,
    ada: Math.max(...catatan.map((b) => b.ada)),
    putaran: akhir.putaran === null || awal.putaran === null ? null : akhir.putaran - awal.putaran,
    jarak: yAkhir - yMulai,
    balik: (maju ? lang.filter((d) => d < -0.002) : lang.filter((d) => d > 0.002)).length,
    sudutLiar: catatan.filter((b) => b.sudut !== null && Math.abs(b.sudut) > LINGKAR + 1e-9).length,
    contoh: akhir.ada > 0 ? akhir : catatan.find((b) => b.ada > 0) ?? null,
  };
};

const ringkas = (l) =>
  `putaran=${l.putaran?.toFixed(4)} jarak=${l.jarak}px balik=${l.balik} sudutAkhir=${l.akhir.sudut?.toFixed(3)} vel=${JSON.stringify(
    l.catatan.map((b) => Math.round((b.vel ?? 0) * 100) / 100)
  )}`;

await diamDi(rentang?.bawah ?? 0);
const babRoda = await page.evaluate(() => window.__panggung?.babKe ?? null);
const diamRoda1 = await sensusDiam();
console.log(
  'roda diam',
  JSON.stringify(diamRoda1.nama),
  'babKe=' + babRoda,
  'y=' + (await yKini()),
  'rentang=' + JSON.stringify(rentang)
);
cek('panggung berada di bab penutup saat roda diuji', babRoda, 4);
cek('roda tidak ada saat gulir diam di bab 4', ada(diamRoda1.nama, 'roda'), false);
cek('keadaan diam yang dibaca memang diam (tanpa debu dan kompas)', ada(diamRoda1.nama, 'debu') || ada(diamRoda1.nama, 'kompas'), false);

const keBawah = await lompatDanCatat(rentang.tengah);
await new Promise((r) => setTimeout(r, 1200));
const diamSela = await sensusDiam();
const keBawahLagi = await lompatDanCatat(rentang.atas);
console.log('roda bawah', ringkas(keBawah), '| diam di sela', JSON.stringify(diamSela.nama), '| lagi', ringkas(keBawahLagi));

const keAtas = await lompatDanCatat(rentang.bawah);
const diamRoda2 = await sensusDiam();
console.log('roda atas', ringkas(keAtas), '| diam lagi', JSON.stringify(diamRoda2.nama));
await foto('10-bab4-roda');

cek('roda ada saat bergulir di bab 4', keBawah.ada, 1);
cek('roda tidak pernah lebih dari satu objek', Math.max(keBawah.ada, keAtas.ada), 1);
cek('roda menambah tepat satu draw call', keBawah.contoh ? keBawah.contoh.calls === keBawah.contoh.jumlahObjek : null, true);
cekMin('gulir ke bawah memutar roda', Math.abs(keBawah.putaran ?? 0), 0.05);
cek('gulir ke atas memutar roda arah berlawanan', Math.sign(keBawah.putaran ?? 0) === -Math.sign(keAtas.putaran ?? 0), true);
cek('sudut roda dijumlahkan, bukan dipasang dari velositas', keBawahLagi.akhir.putaran > keBawah.akhir.putaran + 0.05, true);
cek('sudut roda tidak pernah berbalik melawan arah gulir', keBawah.balik + keBawahLagi.balik + keAtas.balik, 0);
cek('sudut roda tetap dalam satu lingkar', keBawah.sudutLiar + keBawahLagi.sudutLiar + keAtas.sudutLiar, 0);
cek('roda hilang lagi saat gulir berhenti', ada(diamSela.nama, 'roda') || ada(diamRoda2.nama, 'roda'), false);
const jariHarus = Math.min(JARI_KASAR, (keBawah.akhir.portalLebar ?? 0) * JARI_RASIO);
cek('jari roda dibatasi lebar portal', keBawah.akhir.jari !== null && Math.abs(keBawah.akhir.jari - jariHarus) < 0.01, true);
// Tidak ada gerbang "pulang-pergi sejauh X memutar sejauh Y": roda menjumlah
// `velositas × clamp(delta, 0,05)` per frame, dan di bawah SwiftShader satu animasi bisa
// terpotong 1 frame atau 4 (terukur dalam satu percobaan: lompatan 425 px melukis 1,88
// putaran, lompatan 465 px melukis 4,51). Pada 60fps delta tidak pernah tersentuh clamp
// sehingga integralnya sebanding jarak, tapi membuktikan itu lewat verifier kepala-tulang
// berarti menulis gerbang yang gagal tanpa alasan isi — jadi yang diuji di sini hanya tanda
// dan arah, bukan besaran.

await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
await new Promise((r) => setTimeout(r, 700));
await diamDi(rentang.bawah);
const tanpaGerak = await lompatDanCatat(rentang.atas);
console.log(
  'roda reduce',
  `ada=${tanpaGerak.ada} jarak=${tanpaGerak.jarak}px`,
  JSON.stringify(tanpaGerak.catatan.map((b) => b.nama))
);
// Tanpa gerbang ini, "roda tidak ada" juga akan dihasilkan oleh lompatan yang tidak
// memindahkan apa pun — jadi jaraknya dibaca dari posisi gulir, bukan dari asumsinya.
cekMin('gulir saat reduce-motion tetap berpindah', Math.abs(tanpaGerak.jarak), 60);
cek('reduce-motion menghapus roda', tanpaGerak.ada, 0);
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
await new Promise((r) => setTimeout(r, 700));

// ── 10. Pengganti kartu di bab WORKS: diam = /01 = mobil, hover memindahkan tempat ke baris lain ──
// Satu angka, dua objek: usePanggung menulis SILANG_MOBIL ke alpha kartu dan aktor membaca
// angka yang sama untuk alpha-nya sendiri. Gerbang yang membandingkan bacaan kartu dengan
// bacaan objek membuktikan satu sumber — dua penghalusan terpisah akan tertinggal satu frame
// dan perpindahan terbaca sebagai dua kejadian.
//
// Keadaan diam sudah berubah: di bab arsip silang bernilai PENUH tanpa pointer apa pun,
// karena kotak tidak pernah kosong lagi (pengganti = aktorDipanggil, diam = BARIS_DIAM).
// Konsekuensinya, dan ini yang bikin bagian ini tidak bisa cuma ditambah gerbang:
//   · "mobil tidak ada tanpa hover" bukan lagi kebenaran halaman ini — yang diuji sekarang
//     mobil ADA di diam, dan hover /01 harus delta nol terhadapnya;
//   · kontribusi mobil tidak bisa diukur sebagai selisih terhadap tanpa-hover (tanpa-hover
//     sudah memuat mobil), jadi baseline kartu diambil dari bab tengah tempat silang 0;
//   · silang tidak pernah menuju 0 di dalam bab arsip — menukar baris = menukar objek pada
//     alpha penuh. Yang menagih "lepas setelah silang habis" adalah keberangkatan dari bab.
const TRI_BULAT = [40000, 60000]; // anggaran ±50.000 triangle per frame hasil pipeline
const TETAS_LEPAS = 0.001; // harus sama dengan TETAS di AktorSF26/AktorBahasa/RollCage

const bacaMobil = () =>
  page.evaluate(() => {
    const m = window.__sf26;
    const p = window.__panggung;
    const b = window.__bahasa;
    const objek = window.__render?.objek ?? [];
    return {
      silang: p?.mobil ?? null,
      sf26: m?.silang ?? null,
      sudut: m?.sudut ?? null,
      putaran: m?.putaran ?? null,
      bab: p?.babDari ?? null,
      t: p?.t ?? null,
      objek,
      ada: objek.filter((n) => n.startsWith('sf26-')).length,
      logo: objek.filter((n) => n === 'bahasa-logo').length,
      bahasaId: b?.id ?? null,
      bahasaTri: b?.tris ?? null,
      bahasaSilang: b?.silang ?? null,
      /** Putusan aturan pengganti frame ini — satu-satunya sumber yang boleh dipakai
       *  untuk menuduh objek "datang dari pengukuran". */
      aktor: p ? p.aktor ?? null : 'TIDAK ADA READOUT',
      hovered: p?.hovered ?? null,
      calls: window.__render?.calls ?? null,
      segitiga: window.__render?.segitiga ?? null,
      garis: window.__render?.garis ?? null,
      frame: window.__render?.frame ?? null,
      jumlahObjek: objek.length,
    };
  });

// Baris ke-N = [data-magnetic] ke-N di #chapter-03. /01 = indeks 0 = BARIS_FERRARI, dan
// hover-nya yang membuat aktor = mobil. `data-bahasa` adalah angka pengukuran yang sama
// yang dipakai generator (ukur-kartu.mjs), jadi objek bisa ditagih terhadap ukuran yang
// memanggilnya.
const barisKe = (ke) =>
  page.evaluate((v) => {
    const el = document.querySelectorAll('#chapter-03 [data-magnetic]')[v];
    if (!el) return null;
    const b = el.getBoundingClientRect();
    const ATAS = 90;
    const BAWAH = window.innerHeight - 90;
    const terlihat = Math.min(b.bottom, BAWAH) - Math.max(b.top, ATAS);
    if (terlihat <= 24) return null;
    return {
      judul: el.querySelector('a')?.textContent?.trim().slice(0, 22) ?? '?',
      // Baris 0 harus baris FERRARI: identitasnya dibaca dari teks penuh, bukan dari
      // cuplikan 22 karakter yang dipakai log.
      ferrari: v === 0 ? /ferrari/i.test(el.querySelector('a')?.textContent ?? '') : true,
      bahasa: el.dataset.bahasa ?? null,
      x: b.left + b.width / 2,
      y: Math.max(ATAS, Math.min(BAWAH, (b.top + b.bottom) / 2)),
    };
  }, ke);

/** Parkir di bab arsip: kartu duduk tepat pada kunci bab 3, dan itu yang mengizinkan
 *  pengganti kartu dipanggil (usePanggung memakai k.babDari). "Duduk tepat pada kunci" bukan
 *  berarti babDari === babKe: sikap() hanya mengembalikan pasangan bab yang sama di ujung
 *  pertama dan ujung terakhir dokumen, sementara di tengah bab ia mengembalikan
 *  babDari=3, babKe=4, t=0. Jadi gerbangnya babDari === 3 && t === 0. Pecahan dibaca sebagai
 *  percobaan, bukan asumsi — batas tiap bab datang dari posisi section di dokumen dan bisa
 *  berubah kalau isi bab berubah. Baris yang dicari ikut parameter karena tinggi bab 02
 *  membuat tidak semua baris muat pada satu titik parkir. */
const cariBabArsip = async (ke = 0, bolehJalan = false) => {
  for (let pass = 0; pass < (bolehJalan ? 2 : 1); pass++) {
    for (const fr of [0.66, 0.62, 0.7, 0.64, 0.72, 0.68, 0.76, 0.58, 0.8, 0.54]) {
      await parkir(fr);
      const b = await page.evaluate(() => window.__panggung ?? null);
      const baris = await barisKe(ke);
      if (b?.babDari !== 3 || !baris) continue;
      // Pass 1 menuntut kartu duduk tepat pada kunci bab (t=0); pass 2 menerima pecahan apa
      // pun asalkan pemanggilnya tidak membandingkan dua keadaan. Baris bawah daftar tidak
      // pernah terlihat pada t=0 di jendela 1440x900 — tinggi bab 02 yang berubah membuat
      // daftar bergerak, dan menolak itu berarti menolak barisnya, bukan panggungnya.
      if (b?.t === 0 || pass === 1) return { fr, baris, b, jalan: pass === 1 };
    }
  }
  return null;
};

/** Tunggu penghalusan sampai ke ujung. Pointer digeser 2px tiap baca: di frameloop demand
 *  tidak ada frame berarti tidak ada lerp, dan menunggu tanpa membangunkan loop akan
 *  membaca angka yang sama selamanya. */
const tungguSilang = async (arah, titik) => {
  const akhir = Date.now() + 12000;
  let kini = await bacaMobil();
  let i = 0;
  while (Date.now() < akhir) {
    if (titik) await page.mouse.move(titik.x + (i % 2 ? 2 : -2), titik.y);
    kini = await bacaMobil();
    if (arah === 'penuh' && (kini.silang ?? 0) >= 0.98) return kini;
    if (arah === 'habis' && (kini.silang ?? 1) <= 0.001) return kini;
    await new Promise((r) => setTimeout(r, 120));
    i++;
  }
  return kini;
};

/** Tunggu PUTUSAN aturan, bukan penghalusan. Menukar baris di dalam bab arsip tidak
 *  menyentuh silang (ia tetap penuh — kartu memang tidak pernah kembali), jadi menunggui
 *  silang di sini akan selalu pulang dalam keadaan lama. Yang menandai selesai adalah
 *  aktor yang diputuskan `aktorDipanggil` sudah terpasang di scene. */
const tungguAktor = async (arah, titik, plafonMs = 12000) => {
  const akhir = Date.now() + plafonMs;
  let kini = await bacaMobil();
  let i = 0;
  while (Date.now() < akhir) {
    if (titik) await page.mouse.move(titik.x + (i % 2 ? 2 : -2), titik.y);
    kini = await bacaMobil();
    const punya = arah === 'bahasa' ? kini.logo : kini.ada;
    if (kini.aktor === arah && punya > 0) return kini;
    if (arah === null && kini.aktor === null && kini.logo === 0 && kini.ada === 0) return kini;
    await new Promise((r) => setTimeout(r, 120));
    i++;
  }
  return kini;
};

/** Bangunkan loop beberapa frame lalu baca sensus terakhir — pola yang sama dengan blok
 *  pelepasan di bawah: frame yang membuktikan pelepasan adalah frame TERAKHIR, dan ia baru
 *  ada kalau ada satu peristiwa yang membangunkan kanvas. */
const sensusSetelah = async (titik, jedaMs = 90) => {
  for (let i = 0; i < 3; i++) {
    await page.mouse.move((titik?.x ?? 8) + i * 3, titik?.y ?? 8);
    await new Promise((r) => setTimeout(r, jedaMs));
  }
  return bacaMobil();
};

// Baseline KARTU MURNI: bab tengah tempat tidak ada satu pun baris yang dipanggil. Angka
// inilah pembanding kontribusi mobil dan logo — di dalam bab arsip pembanding lama
// ("keadaan tanpa hover") sudah tidak ada lagi, karena diam di sana berarti berobjek.
// Rumahnya dipakai ulang dari bagian 5: yRumah menyapu seluruh peta gulir dan itu bukan
// harga yang boleh dibayar dua kali untuk titik yang sama.
await parkirY(yDiam5 ?? (await page.evaluate(() => Math.round((document.documentElement.scrollHeight - window.innerHeight) * 0.2))));
const habisBas = await tungguSilang('habis', { x: 8, y: 8 });
const kartu = await sensusSetelah({ x: 8, y: 8 });
console.log(
  'baseline ',
  'bab=' + kartu.bab,
  'silang=' + kartu.silang,
  'calls=' + kartu.calls,
  'tri=' + kartu.segitiga,
  'garis=' + kartu.garis,
  JSON.stringify(kartu.objek)
);
cek('baseline kartu: silang habis', (habisBas.silang ?? 1) <= TETAS_LEPAS, true);
cek('baseline: tidak ada satu pun objek pengganti', kartu.ada + kartu.logo, 0);
cek('baseline: sangkar mati bersama silang', ada(kartu.objek, 'sangkar'), false);
cek('baseline: calls = jumlah objek pada frame yang sama', kartu.calls === kartu.jumlahObjek, true);
const TRI_KARTU = kartu.segitiga;

const parkir3 = await cariBabArsip();
const titik = parkir3?.baris ?? null;
await lepasHover();
const penuhDiam = await tungguSilang('penuh', { x: 8, y: 8 });
const diamArsip = await sensusSetelah({ x: 8, y: 8 });
console.log(
  'sf26     ',
  'fr=' + (parkir3?.fr ?? null),
  JSON.stringify(parkir3?.baris?.judul ?? null),
  'bab=' + diamArsip.bab,
  'diam:',
  JSON.stringify(diamArsip.objek),
  'calls=' + diamArsip.calls,
  'tri=' + diamArsip.segitiga,
  'silang=' + diamArsip.silang,
  'aktor=' + JSON.stringify(diamArsip.aktor)
);
cek('panggung parkir di bab arsip saat pengganti diuji', parkir3?.b?.babDari ?? null, 3);
cek('baris /01 adalah baris Ferrari', parkir3?.baris?.ferrari ?? false, true);
// Ini gerbang yang dulu berbunyi "mobil tidak ada tanpa hover". Keadaan diam bab arsip kini
// justru SELALU punya objek — dan itu keputusan, bukan kebetolan — jadi yang ditagih adalah
// isi keadaan diam baru: mobil, aktor yang memutuskan, silang penuh, tanpa logo.
cek('keadaan diam bab arsip memuat mobil', diamArsip.ada, 3);
cek('keadaan diam bab arsip: aktor = mobil, hovered = null', `${diamArsip.aktor}/${diamArsip.hovered}`, 'mobil/null');
cek('keadaan diam bab arsip: silang pengganti penuh', (penuhDiam.silang ?? 0) >= 0.98, true);
cek('keadaan diam /01 tidak memanggil logo', `${diamArsip.logo}/${JSON.stringify(diamArsip.bahasaId)}`, '0/null');
cek('sangkar hidup bersama isinya di keadaan diam', ada(diamArsip.objek, 'sangkar'), true);
cek('calls = jumlah objek pada frame yang sama (diam arsip)', diamArsip.calls === diamArsip.jumlahObjek, true);
cekMin('sangkar = 12 segmen di keadaan diam', diamArsip.garis, SISI_SANGKAR);
// Kontribusi mobil diukur terhadap kartu murni, bukan terhadap "tanpa hover" — mobil sudah
// duduk di sana sebelum pointer mana pun datang. Satu call dikurangi untuk sangkar (garis,
// nol triangle) yang ikut keadaan diam tapi bukan bagian dari mobil.
cek('mobil = tiga draw call di atas baseline kartu', diamArsip.calls - kartu.calls - 1, 3);
const TRI_MOBIL = diamArsip.segitiga - TRI_KARTU;
cek(
  'mobil membawa ±50.000 triangle',
  TRI_MOBIL >= TRI_BULAT[0] && TRI_MOBIL <= TRI_BULAT[1],
  true
);
cek('segitiga baseline tidak ikut berubah oleh kehadiran mobil', TRI_KARTU > 0, true);

await page.mouse.move(titik?.x ?? 8, titik?.y ?? 8);
const penuh = await tungguAktor('mobil', titik);
const dengan = await sensusSetelah(titik);
console.log(
  'sf26 hover',
  'silang kartu=' + penuh.silang,
  'silang mobil=' + penuh.sf26,
  'ada=' + penuh.ada,
  'calls=' + penuh.calls,
  'tri=' + penuh.segitiga,
  'objek=' + JSON.stringify(penuh.objek)
);
await foto('11-bab3-mobil');
// Hover baris /01 sekarang memanggil aktor yang SUDAH terpasang di keadaan diam. Kalau
// aturan diam berubah lagi dan /01 tidak lagi jadi diam, gerbang delta-nol ini yang merah —
// itu memang maksudnya: ia mengunci pilihan BARIS_DIAM = BARIS_FERRARI.
cek('/01 memanggil mobil, bukan logo', `${penuh.aktor}/${penuh.logo}`, 'mobil/0');
cek(
  'hover /01 identik dengan keadaan diam (delta nol)',
  `${dengan.calls}/${dengan.segitiga}/${dengan.jumlahObjek}`,
  `${diamArsip.calls}/${diamArsip.segitiga}/${diamArsip.jumlahObjek}`
);
cek('mobil terpasang saat baris /01 di-hover', penuh.ada, 3);
cek('silang kartu mencapai penuh', (dengan.silang ?? 0) >= 0.98, true);
cek('kartu dan mobil membaca angka yang sama', Math.abs((dengan.silang ?? -1) - (dengan.sf26 ?? -2)) < 0.002, true);

// Hukum roda: sama seperti RodaPaddock — sudut DIJUMLAH dari velositas, dan membeku saat
// loop demand tidur. Notches kecil (3 × 60 px) supaya pointer tetap jatuh di atas baris
// yang sama; kalau baris lepas dari pointer, hover hilang dan mobil justru harus mundur.
const ghiRoda = async (deltaY) => {
  const awal = await bacaMobil();
  for (let i = 0; i < 3; i++) {
    await page.mouse.wheel({ deltaY });
    await new Promise((r) => setTimeout(r, 120));
  }
  const catatan = [];
  for (let i = 0; i < 8; i++) {
    await page.mouse.move((titik?.x ?? 0) + (i % 2 ? 2 : -2), titik?.y ?? 0);
    await new Promise((r) => setTimeout(r, 90));
    catatan.push(await bacaMobil());
  }
  const akhir = await bacaMobil();
  const nilai = catatan.map((b) => b.putaran).filter((v) => v !== null);
  const arah = Math.sign(deltaY);
  return {
    awal,
    akhir,
    catatan,
    delta: (akhir.putaran ?? 0) - (awal.putaran ?? 0),
    balik: nilai.slice(1).filter((d, i) => Math.sign(d - nilai[i]) === -arah && Math.abs(d - nilai[i]) > 0.002)
      .length,
    bab: akhir.bab,
  };
};

await new Promise((r) => setTimeout(r, 900));
const maju = await ghiRoda(60);
const mundur = await ghiRoda(-60);
console.log(
  'sf26 roda',
  `maju=${maju.delta.toFixed(4)} balik=${maju.balik} bab=${maju.bab}`,
  JSON.stringify({ maju: maju.delta, mundur: mundur.delta })
);
cek('gulir memutar roda mobil', Math.abs(maju.delta) >= 0.02, true);
cek(
  'gulir arah berlawanan memutar roda arah berlawanan',
  Math.sign(maju.delta) === -Math.sign(mundur.delta),
  true
);
cek('sudut roda tidak pernah berbalik melawan arah gulir', maju.balik + mundur.balik, 0);

// Membeku: dua bacaan terpisah 900 ms tanpa peristiwa apa pun di antaranya. Velositas Lenis
// sudah habis, jadi tidak ada langkah baru yang boleh dijumlah.
await new Promise((r) => setTimeout(r, 2200));
const beku1 = await bacaMobil();
await new Promise((r) => setTimeout(r, 900));
const beku2 = await bacaMobil();
console.log('sf26 beku', JSON.stringify({ sebelum: beku1.sudut, sesudah: beku2.sudut, silang: beku2.silang }));
cek('roda membeku saat gulir diam', Math.abs((beku2.sudut ?? NaN) - (beku1.sudut ?? NaN)) < 1e-6, true);

/** Sampel per FRAME, bukan union lintas frame. Pertanyaan "pernahkah mobil dan logo tampil
 *  bersamaan" hanya bisa dijawab oleh daftar objek satu frame — dan justru frame penukaran
 *  yang ditagih, karena itu tempat bug pemilik-sisa muncul dulu. */
const awasiBersama = async (titik, durasiMs = 1600) => {
  const akhir = Date.now() + durasiMs;
  let tabrakan = 0;
  const frame = new Set();
  let i = 0;
  while (Date.now() < akhir) {
    await page.mouse.move((titik?.x ?? 8) + (i % 2 ? 2 : -2), titik?.y ?? 8);
    const m = await bacaMobil();
    if (m.ada > 0 && m.logo > 0) tabrakan++;
    if (m.frame !== null) frame.add(m.frame);
    i++;
    await new Promise((r) => setTimeout(r, 45));
  }
  return { tabrakan, frame: frame.size };
};

// Melepas pointer dari baris /01 TIDAK mengirim silang ke nol: penggantinya adalah baris diam,
// dan itu isi keputusan "kotak selalu berisi objek 3D". Yang tetap ditagih: pelepasan tidak
// boleh meninggalkan dua objek sekaligus, dan anggaran harus pulang ke keadaan diam.
await page.mouse.move(8, 8);
const lepas = await sensusSetelah(null);
console.log(
  'sf26 pulang',
  'silang=' + lepas.silang,
  'aktor=' + JSON.stringify(lepas.aktor),
  'calls=' + lepas.calls,
  JSON.stringify(lepas.objek)
);
cek('melepas hover kembali ke aktor diam', `${lepas.aktor}/${lepas.ada}/${lepas.logo}`, 'mobil/3/0');
cek('panggil-lepas kembali ke anggaran keadaan diam', lepas.calls, diamArsip.calls);

// Reduce-motion: mobil dipasang LEBIH DULU (keadaan diam sudah memuatnya), lalu aba-aba
// menyala. Urutan ini penting: kalau aba-aba menyala saat mobil belum pernah ada, "tidak ada
// mobil" juga akan dihasilkan oleh hover yang tidak pernah sampai. Dibaca dari sensus yang
// SETTLE, bukan dari timeout buta — pada swiftshader jalur ini digambar ±2 frame per detik,
// jadi 1200 ms bisa jatuh di tengah penghalusan dan menuduh kode yang benar.
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
const habisReduce = await tungguSilang('habis', { x: 8, y: 8 });
const tanpaGerakMobil = await sensusSetelah({ x: 8, y: 8 }, 260);
console.log('sf26 reduce', 'ada=' + tanpaGerakMobil.ada, 'silang=' + tanpaGerakMobil.silang, JSON.stringify(tanpaGerakMobil.objek));
cek('reduce-motion menghapus mobil', tanpaGerakMobil.ada, 0);
cek('reduce-motion menghapus logo', tanpaGerakMobil.logo, 0);
cek('reduce-motion mematikan sangkar', ada(tanpaGerakMobil.objek, 'sangkar'), false);
cek('reduce-motion menghapus SEMUA objek ekstra', EKSTRA.filter((n) => ada(tanpaGerakMobil.objek, n)).join('+'), '');
// Kartu tidak boleh dibiarkan redup permanen: begitu aba-aba menyala silang harus pulang ke
// nol dan berhenti di sana.
cek('reduce-motion mengembalikan kartu penuh', (habisReduce.silang ?? 1) <= TETAS_LEPAS, true);
cek('reduce-motion: calls = objek pada frame yang sama', tanpaGerakMobil.calls === tanpaGerakMobil.jumlahObjek, true);
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
const pulihReduce = await tungguSilang('penuh', { x: 8, y: 8 });
console.log('sf26 pulih', 'silang=' + pulihReduce.silang, 'ada=' + pulihReduce.ada, JSON.stringify(pulihReduce.objek));
cek('aba-aba dicabut: mobil kembali ke tempatnya', `${pulihReduce.aktor}/${pulihReduce.ada}`, 'mobil/3');

// ── 10b. Logo bahasa: baris /02-/05 memanggil objek dari ANGKA, bukan dari hover ──
// Tiap baris membawa data-bahasa — angka pengukuran yang sama yang menulis metrikKartu.
// Jadi yang ditagih di sini bukan "ada bentuk", tapi "bentuk yang datang adalah bentuk dari
// ukuran baris itu": satu objek, satu call, segitiga persis baseline kartu + tris logo, dan
// id logo sama dengan dataset DOM. Baris tanpa bahasa terukur tidak boleh memudar sama sekali
// — kasus itu tidak bisa diproduksi browser (kelima baris live terukur semua) dan karenanya
// diuji di node-side test koreografi, bukan di sini.
const BARIS_LOGO = [1, 2, 3, 4];
for (const ke of BARIS_LOGO) {
  const parkirRow = await cariBabArsip(ke, true);
  const tRow = parkirRow?.baris ?? null;
  if (!tRow) {
    cek(`baris /0${ke + 1} terlihat dari suatu tempat parkir`, false, true);
    continue;
  }
  await page.mouse.move(8, 8);
  await tungguAktor('mobil', null);
  // Baseline dibaca di TEMPAT PARKIR YANG SAMA dengan hover-nya, bukan dari kartu murni bab
  // tengah: pecahan t tempat baris bawah terlihat bisa membangunkan benang rosso (23 segmen
  // garis, satu call), dan selisih terhadap keadaan lain akan menuduh logo menambah dua call.
  const sebelumRow = await sensusSetelah(null);
  await page.mouse.move(tRow.x, tRow.y);
  const penukar = await awasiBersama(tRow, 1400);
  const logo = await tungguAktor('bahasa', tRow);
  const settle = await sensusSetelah(tRow);
  console.log(
    `logo /0${ke + 1}`,
    'data-bahasa=' + JSON.stringify(tRow.bahasa),
    'parkir=' + (parkirRow.jalan ? 'dalam-perpindahan' : 'kunci-bab'),
    'aktor=' + JSON.stringify(settle.aktor),
    'id=' + JSON.stringify(settle.bahasaId),
    'tris=' + settle.bahasaTri,
    'calls=' + settle.calls,
    'tri=' + settle.segitiga,
    'silang=' + settle.silang,
    'objek=' + JSON.stringify(settle.objek),
    'frame=' + penukar.frame
  );
  await foto(`12-bab3-logo-${ke + 1}`);
  cek(`baris /0${ke + 1} punya bahasa terukur di DOM`, !!tRow.bahasa, true);
  cek(`baris /0${ke + 1} memanggil aktor bahasa`, settle.aktor, 'bahasa');
  cek(`baris /0${ke + 1}: hovered sampai ke aturan`, settle.hovered, ke);
  cek(`baris /0${ke + 1} memuat tepat satu objek bahasa-logo`, settle.logo, 1);
  cek(`baris /0${ke + 1} melepas mobil sebelum logo terpasang`, settle.ada, 0);
  cek(`baris /0${ke + 1}: satu frame pun tidak memuat keduanya`, penukar.tabrakan, 0);
  cek(`baris /0${ke + 1}: calls = jumlah objek pada frame yang sama`, settle.calls === settle.jumlahObjek, true);
  // Tiga call keluar (mobil), satu call masuk (logo). Sangkar tidak ikut berubah karena ia
  // LineSegments: satu call yang sama di kedua keadaan, nol triangle di keduanya.
  cek(`baris /0${ke + 1} menukar tiga call mobil dengan satu call logo`, settle.calls - sebelumRow.calls, -2);
  // Hukum segitiga EKSKLUSIF: selisih terhadap keadaan mobil sebelumnya harus persis bentuk
  // yang dilaporkan komponennya sendiri, dikurangi mobil. Tidak ada ruang ±, jadi bentuk yang
  // diam-diam digabung dua material atau diam-diam tidak dibuang akan merah di sini.
  cek(
    `baris /0${ke + 1} segitiga = keadaan mobil - mobil + tris logo`,
    settle.bahasaTri !== null &&
      settle.segitiga === sebelumRow.segitiga - TRI_MOBIL + settle.bahasaTri,
    true
  );
  cek(`baris /0${ke + 1} segitiga absolut = baseline kartu + tris logo`, settle.segitiga === TRI_KARTU + settle.bahasaTri, true);
  cek(`baris /0${ke + 1} membawa segitiga dalam anggaran bentuk`, settle.bahasaTri >= 500 && settle.bahasaTri <= 6000, true);
  // Ini gerbang yang membuktikan "objek datang dari pengukuran": id yang dipakai membangun
  // bentuk harus sama dengan data-bahasa yang ditulis generator di baris DOM.
  cek(
    `baris /0${ke + 1}: bentuk logo sama dengan bahasa terukur`,
    `${String(settle.bahasaId).toLowerCase()}/${String(tRow.bahasa).toLowerCase()}`,
    `${String(tRow.bahasa).toLowerCase()}/${String(tRow.bahasa).toLowerCase()}`
  );
  cek(`baris /0${ke + 1}: silang dibaca dari angka yang sama`, Math.abs((settle.silang ?? -1) - (settle.bahasaSilang ?? -2)) < 0.002, true);
  cek(`baris /0${ke + 1} silang pengganti penuh`, (logo.silang ?? settle.silang ?? 0) >= 0.98, true);
  cek(`baris /0${ke + 1} sangkar tetap hidup bersamanya`, ada(settle.objek, 'sangkar'), true);
}

// Pulang ke baris /01: logo boleh lepas SETELAH tempatnya diserahkan, dan anggaran harus
// persis keadaan diam — tidak ada call yang tertinggal dari bentuk yang sudah pergi.
// Perbandingannya HANYA sah di tempat parkir yang sama dengan pengukuran keadaan diam:
// baris /05 terlihat dari pecahan di dalam perpindahan, dan di sana benang rosso ikut
// terpasang (satu call, nol triangle). Menagih `calls` lintas tempat akan menuduh logo
// meninggalkan call yang sebenarnya milik benang.
await page.mouse.move(8, 8);
const pulangLogo = await tungguAktor('mobil', null);
const parkirPulang = await cariBabArsip();
const pulangSettle = await sensusSetelah(null);
cek('pulang: mendarat kembali di kunci bab arsip', `${parkirPulang?.b?.babDari}/${parkirPulang?.b?.t}`, '3/0');
console.log(
  'logo pulang',
  'parkir=' + JSON.stringify(parkirPulang?.fr ?? null),
  'aktor=' + JSON.stringify(pulangSettle.aktor),
  'diputuskan=' + JSON.stringify(pulangLogo.aktor),
  'calls=' + pulangSettle.calls,
  'tri=' + pulangSettle.segitiga,
  JSON.stringify(pulangSettle.objek)
);
cek('logo lepas saat tempatnya kembali ke /01', `${pulangSettle.logo}/${pulangSettle.ada}`, '0/3');
cek('pulang dari logo kembali ke anggaran keadaan diam', `${pulangSettle.calls}/${pulangSettle.segitiga}`, `${diamArsip.calls}/${diamArsip.segitiga}`);

// Hukum lepas yang sebenarnya: meninggalkan bab arsip. Di dalam bab silang tidak pernah nol
// lagi, jadi keberangkatan adalah satu-satunya tempat "objek hanya boleh pergi setelah
// silang habis" masih bisa diuji. Ujung dokumen dipakai langsung, bukan yRumah(4): di ujung
// sikap() melaporkan t=1 (bukan t=0) sehingga penanggung kandidat itu akan menyapu seluruh
// peta gulir untuk kemudian menolak semuanya.
const yUjung = await page.evaluate(() => Math.round(document.documentElement.scrollHeight - window.innerHeight));
await parkirY(yUjung);
const habisPergi = await tungguSilang('habis', { x: 8, y: 8 });
const pergi = await sensusSetelah({ x: 8, y: 8 });
console.log('bab pergi', 'bab=' + pergi.bab, 'silang=' + pergi.silang, 'calls=' + pergi.calls, 'tri=' + pergi.segitiga, JSON.stringify(pergi.objek));
cek('berangkat dari bab arsip: aktor tidak dipanggil', pergi.aktor, null);
cek('berangkat dari bab arsip menghapus mobil dan logo', pergi.ada + pergi.logo, 0);
cek('berangkat dari bab arsip mematikan sangkar', ada(pergi.objek, 'sangkar'), false);
cek('silang habis setelah berangkat', (habisPergi.silang ?? 1) <= TETAS_LEPAS, true);
cek('anggaran berangkat sama dengan baseline kartu', `${pergi.calls}/${pergi.segitiga}`, `${kartu.calls}/${TRI_KARTU}`);
await page.mouse.move(8, 8);

// ── 11. Kabur karena jarak (ide 10): potret tajam + salinan ¼-res, tanpa pass pasca-proses ──
// Klaimnya empat angka yang bisa dibantah, bukan "kelihatan blur": salinan yang dipakai
// memang seperempat sumber, kartu yang diam di rumah tidak mengambil satu tap pun, tepi yang
// tersohong di tengah perpindahan mengambil SEBAGIAN, dan kartu penutup yang mundur 2,1 satuan
// mengambil plafonnya. Semuanya dibaca dari __panggung — yang hanya ditulis pada frame yang
// benar-benar digambar, jadi setiap bacaan didahului lompatan 1 px.
const PLAFON_KABUR = 0.6; // harus sama dengan KABUR_PLAFON di usePanggung.ts
const FOKUS_RENTANG = 0.5; // harus sama dengan FOKUS_RENTANG di chiaroscuroMaterial.ts
const AMBANG_KABUR = 0.06; // harus sama dengan KABUR_AMBANG di usePanggung.ts

const bacaFokus = () =>
  page.evaluate(() => {
    const p = window.__panggung;
    return p && { kabur: p.kabur, salinan: p.kaburSalinan, z: p.z, rotY: p.rotY, bab: p.babKe };
  });

/** Bacaan diam yang benar-benar diam. Dua hal diperlukan dan keduanya pernah membuat gerbang
 *  ini salah menuduh: (1) pointer di TENGAH layar — geyang pointer menohong tepi kartu sampai
 *  ±12°, dan kartu yang tersohong memang keluar fokus, jadi membaca di sudut layar akan
 *  menuntut nol pada keadaan yang bukan "kartu di rumahnya"; (2) waktu pulang yang panjang —
 *  lurp posisi 0,08 per frame butuh ±6 s untuk menempuh 2,5 satuan, dan frame terakhir sebelum
 *  loop tidur adalah frame yang dilaporkan. Karena itu z ikut dibaca dan ditagih dekat nol. */
const bacaDiam = async (y) => {
  await page.mouse.move(720, 450);
  await diamDi(y);
  await new Promise((r) => setTimeout(r, 5000));
  const s = await sensusDiam();
  return { f: await bacaFokus(), s };
};

const maksY = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
const diPenutup = await bacaDiam(Math.round(maksY * 0.995));
console.log('dof penutup', JSON.stringify(diPenutup.f), JSON.stringify(diPenutup.s.nama));
cek(
  'sumber kabur adalah salinan seperempat potret',
  diPenutup.f?.salinan[0] === Math.floor(diPenutup.f.salinan[2] / 4) &&
    diPenutup.f?.salinan[1] === Math.floor(diPenutup.f.salinan[3] / 4) &&
    (diPenutup.f?.salinan[0] ?? 0) > 0,
  true
);
cek('salinan bukan sumbernya sendiri', (diPenutup.f?.salinan[0] ?? 0) < (diPenutup.f?.salinan[2] ?? 0), true);
cek('kartu yang mundur penuh kabur sampai plafon', diPenutup.f?.kabur, PLAFON_KABUR);
cek(
  'kabur tidak menambah draw call',
  diPenutup.s.terakhir ? diPenutup.s.terakhir.calls === diPenutup.s.terakhir.objek.length : null,
  true
);

// Bab tengah yang ditagih adalah bab 02 di rumahnya sendiri, bukan "30 % dari halaman":
// sejak panggung hub masuk, 0,3 mendarat di bab 5 dan z rumahnya -0,045 — gerbang di bawah
// (z ≈ 0, kabur = 0) justru menuduh kartu kabur padahal yang dibaca adalah panggung lain.
const yTengah = await yRumah(2, [0.16, 0.2, 0.24, 0.12]);
cek('bab 02 punya tempat parkir yang diam', yTengah !== null, true);
const diTengah = await bacaDiam(yTengah ?? Math.round(maksY * 0.3));
console.log('dof tengah', JSON.stringify(diTengah.f));
cek('bacaan tengah diambil setelah kartu mendarat', Math.abs(diTengah.f?.z ?? 1) <= 0.01, true);
cek('kartu yang diam di bab tengah tidak kabur', diTengah.f?.kabur, 0);

// Bab 2 dan 3 duduk pada kedalaman yang sama, jadi di antara keduanya pusat kartu tidak
// pernah berpindah dari bidang fokusnya: satu-satunya yang bisa menggerakkan angka ini adalah
// tepi yang tersohong oleh kemiringan koreografi. Kalau efek ini konstanta yang dikarang per
// bab, pembacaan di bawah akan tetap nol — dan plafon akan berarti ia tidak membaca geometri.
let sebagian = null;
let liar = 0;
await page.mouse.move(720, 450);
for (let i = 0; i <= 8; i++) {
  const f = 0.46 + i * 0.02;
  await diamDi(Math.round(maksY * f));
  await sensusDiam();
  const b = await bacaFokus();
  if (b && b.kabur > 0 && b.kabur < PLAFON_KABUR && Math.abs(b.rotY) > 0.01) sebagian = sebagian ?? b;
  if (b && b.kabur > PLAFON_KABUR + 1e-9) liar++;
}
console.log('dof perpindahan', JSON.stringify(sebagian), 'lewatPlafon=' + liar);
cek('kemiringan di tengah perpindahan mengaburkan sebagian tepi', !!sebagian, true);
cek('kabur tidak pernah melewati plafonnya', liar, 0);

// Reduce-motion: tidak ada perpindahan yang boleh dilihat, jadi kabur — yang seluruhnya
// datang dari jarak — ikut mati meski kartunya berdiri di bab penutup.
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
const diReduce = await bacaDiam(Math.round(maksY * 0.995));
// Gerbang di bawah bisa menang karena alasan yang salah: kalau kartu reduce-motion diam tepat
// di bidang fokusnya, "kabur = 0" akan dihasilkan geometri, bukan oleh aba-aba. Jarak bacaan
// ini ke fokus kunci bab penutup (data-pas, angka yang dibaca panggung sendiri) jadi ditagih
// lebih dulu — di atas ambang, jadi nol yang dilaporkan memang keputusan, bukan kebetulan.
const pasPenutup = await page.evaluate(() => Number(document.querySelector('[data-portal="4"]')?.dataset.pas));
console.log('dof reduce-motion', JSON.stringify(diReduce.f), 'pas=' + pasPenutup);
cek(
  'reduce-motion masih jauh dari bidang fokusnya (gerbang berikutnya tidak kosong)',
  Math.abs((diReduce.f?.z ?? 0) - pasPenutup) / FOKUS_RENTANG > AMBANG_KABUR,
  true
);
cek('reduce-motion mematikan kabur', diReduce.f?.kabur, 0);
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);

// ── 12. Phase bab 02: rekaman yang punya sumber, bukan stub yang menutupi ──
// Yang ditagih di sini bukan "ada daftar phase" — daftar dua baris tanpa isi juga lolos itu.
// Yang ditagih adalah hubungan sumber↔teks: kalau tabel experiences tidak mengirim baris, maka yang
// tercetak HANYA boleh rekaman kertas CV, dan tidak boleh ada satu pun label yang mengklaim
// Postgres ("VERIFIED EMPLOYMENT", "● DB LIVE") atau stub lama yang sudah dihapus dari kode
// masih membekas di halaman. Repo GitHub ditagih di tempatnya sekarang — detail di dalam panel
// record yang kalimatnya mengklaim menerbitkan karya, bukan baris phase tambahan.
{
  const pengalaman = await page.evaluate(async () => {
    try {
      const r = await fetch('/api/experience', { headers: { Accept: 'application/json' } });
      const b = await r.json().catch(() => null);
      return { status: r.status, baris: Array.isArray(b) ? b.length : -1 };
    } catch {
      return { status: 0, baris: -1 };
    }
  });
  const baris = await page.evaluate(async () => {
    const tombol = [...document.querySelectorAll('#chapter-02 button[aria-controls^="phase-panel-"]')];
    const keluar = [];
    for (const t of tombol) {
      const id = t.getAttribute('aria-controls').replace('phase-panel-', '');
      // Baris pertama terbuka sejak awal (activePhase = "01"), jadi klik butuhnya justru
      // MENUTUP panel dan pembacaan berikutnya isi=0 — yang salah adalah alat ukurnya,
      // bukan halamannya. Yang sudah terbuka dibaca apa adanya.
      if (t.getAttribute('aria-expanded') !== 'true') {
        t.click();
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      }
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      const link = panel ? [...panel.querySelectorAll('a[href]')].map((a) => a.href) : [];
      keluar.push({
        id,
        baris: (t.textContent || '').replace(/\s+/g, ' ').trim(),
        isi: panel ? (panel.textContent || '').replace(/\s+/g, ' ').trim() : '',
        link,
      });
    }
    return keluar;
  });
  const teksBab = await page.evaluate(
    () => (document.querySelector('#chapter-02')?.textContent || '').replace(/\s+/g, ' ')
  );
  // Jalur CV hanya boleh ditagih kalau tabel experiences memang tidak mengirim baris —
  // 200 dengan payload [] adalah jawaban sah (backend hidup, isinya kosong), jadi status
  // alone bukan pembeda. Kalau ada barisnya, yang tampil jalur DB dan gerbang kosong-summary
  // di bawah bukan lawan yang adil (tabel experiences tidak punya kolom summary).
  const jalurCv = pengalaman.baris <= 0;
  console.log(
    'phase bab 02',
    JSON.stringify(baris.map((b) => [b.id, b.isi.length, b.link.length])),
    'experience=' + JSON.stringify(pengalaman)
  );

  cekMin('bab 02 punya lebih dari dua phase', baris.length, 3);
  cek(
    'tidak ada phase yang barisnya kosong',
    baris.every((b) => b.baris.length > 20),
    true
  );
  if (jalurCv) {
    cek(
      'setiap phase CV membuka panel berisi paragraf, bukan hanya judul',
      baris.every((b) => b.isi.length > 60),
      true
    );
    cek(
      'label "VERIFIED EMPLOYMENT" tidak tercetak saat tabel experiences tidak mengirim baris',
      teksBab.includes('VERIFIED EMPLOYMENT'),
      false
    );
    cek('indikator "DB LIVE" mati saat tabel experiences tidak mengirim baris', teksBab.includes('DB LIVE'), false);
    cek(
      'stub lama "Freelance & Independent Client Solutions" tidak meninggalkan baris hantu',
      teksBab.includes('Freelance & Independent Client Solutions'),
      false
    );
    const repo = ['graphify-devkit', 'ferrari-ubuntu', 'website-porto2', 'Pickertime'];
    const phaseRepo = baris.filter((b) => repo.some((n) => b.baris.includes(n)));
    cek(
      'repo GitHub tidak lagi menyamar menjadi phase',
      phaseRepo.length,
      0
    );
    const panelKarya = baris.filter((b) => b.link.some((h) => h.startsWith('https://github.com/')));
    cek('satu panel phase memuat detail karya GitHub', panelKarya.length, 1);
    cek(
      'panel yang memuat karya adalah record yang kalimatnya mengklaim GitHub',
      panelKarya.every((b) => /published publicly on github/i.test(b.isi)),
      true
    );
    cekMin('tiap detail karya membawa angka bintang yang terukur', (panelKarya[0]?.isi.match(/★/g) ?? []).length, 1);
    cekMin(
      'detail karya menunjuk repo yang nyata',
      panelKarya[0]?.link.filter((h) => repo.some((n) => h.includes('/' + n))).length ?? 0,
      1
    );
  } else {
    console.log('catatan  ', `tabel experiences mengirim ${pengalaman.baris} baris: jalur DB yang tampil, gerbang jalur CV dilewati`);
  }
}

await browser.close();
if (galat.length) console.log('pageerror:', galat.slice(0, 5));
console.log('foto di', OUT);

for (const h of hasil) console.log(`${h.ok ? 'LULUS' : 'GAGAL'}  ${h.nama}: dapat ${h.dapat}, harus ${h.harus}`);
if (hasil.some((h) => !h.ok)) process.exit(1);
