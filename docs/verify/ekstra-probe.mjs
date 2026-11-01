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
const EKSTRA = ['bilah', 'benang', 'debu', 'jejak', 'kompas', 'sangkar'];

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

// ── 1. Keadaan diam: hanya data yang sudah punya angka yang boleh menambah kartu ──
await parkir(0.05);
const diam = await serap(300);
await foto('01-bab1-diam');
console.log('diam     ', JSON.stringify(diam.puncak), JSON.stringify(diam.nama), 't=' + diam.terakhir?.t);
cek('laporan uji masuk ke jendela server', seedOk, true);
cek('bilah ada saat diam', ada(diam.nama, 'bilah'), true);
// Jejak butuh satu angka durasi yang terukur, dan /api/telemetry selalu mengukurnya, jadi
// objeknya boleh bangun saat diam — yang tidak boleh adalah bentuk tanpa angka di dalamnya.
cek('jejak ada saat diam', ada(diam.nama, 'jejak'), true);
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
// Yang ditunggu adalah keadaannya, bukan waktunya: padding-left masih transisi 300ms di
// atas re-render React, dan baseline yang keburu terbaca 24px membuat gerbang membandingkan
// dua keadaan hover yang identik.
const lepasHover = async () => {
  await page.mouse.move(8, 8);
  for (let i = 0; i < 12; i++) {
    await new Promise((r) => setTimeout(r, 150));
    const bersih = await page.evaluate(() =>
      [...document.querySelectorAll("#chapter-03 [data-magnetic]")].every(
        (el) => getComputedStyle(el).paddingLeft === "0px"
      )
    );
    if (bersih) return;
  }
};

/** Tunggu Lenis berhenti: enam pembacaan scrollY yang tidak bergeser. */
const diamDiTempat = async () => {
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
};

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

const parkir4 = await parkirKeBaris();
const target = await bacaBaris();
let sbl = await serap(300);
let sts = sbl;
let plLepas = null;
// Hover pointer adalah peristiwa asinkron yang bisa hilang saat halaman masih settling
// setelah gulir roda di bagian 3; tanpa percobaan ulang bagian ini jadi flaky (pernah
// gagal sekali dari tiga jalan). Tiga percobaan dengan jeda melepas hover membuat hasilnya
// bergantung pada keadaan halaman, bukan pada keberuntungan.
for (let percobaan = 1; percobaan <= 3 && target; percobaan++) {
  await lepasHover();
  sbl = await serap(300);
  // Baseline padding dibaca SETELAH hover dilepas, bukan dari `target`: pointer bagian 3
  // bisa sudah jatuh di atas baris yang sama saat `target` diambil, sehingga pl-nya sudah
  // 24px dan "sebelum vs sesudah" memperbandingkan dua keadaan hover yang identik.
  plLepas = (await bacaBaris())?.pl ?? plLepas;
  if (percobaan === 1) await foto('05-bab3-tanpa-hover');
  await page.mouse.move(target.x, target.y);
  await new Promise((r) => setTimeout(r, 250 * percobaan));
  sts = await serap(300);
  const kini = await bacaBaris();
  if (kini && plLepas && kini.pl !== plLepas) break;
}
const barisKini = await bacaBaris();
await foto('06-bab3-hover');
console.log(
  'sangkar  ',
  JSON.stringify(parkir4),
  JSON.stringify(target),
  '| pl lepas:',
  plLepas,
  '| sebelum:',
  JSON.stringify(sbl.nama),
  JSON.stringify(sbl.puncak.garis),
  '→ sesudah:',
  JSON.stringify(sts.nama),
  JSON.stringify(sts.puncak.garis)
);
cek('baris arsip terlihat setelah parkir', !!target, true);
cek('hover baris arsip sampai ke state', !!target && !!plLepas && barisKini?.pl !== plLepas, true);
cek('sangkar tidak ada tanpa hover', ada(sbl.nama, 'sangkar'), false);
cek('sangkar ada saat hover', ada(sts.nama, 'sangkar'), true);
cekMin('sangkar menyumbang 12 segmen LINES', sts.puncak.garis - sbl.puncak.garis, SISI_SANGKAR);

// ── 5. prefers-reduced-motion: semua objek ekstra hilang, kartu tetap ──
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
const api = await fetch(`${FE}/api/telemetry`)
  .then((r) => r.json())
  .catch(() => null);
const perMenit = new Map((api?.clientFrames?.buket ?? []).map((m) => [m.menit, m]));

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

const jejak = await page.evaluate(() => {
  const j = window.__jejak;
  const pecahan = (id) => {
    const el = document.querySelector(`[data-jejak-bar="${id}"]`);
    if (!el) return null;
    const wadah = el.parentElement.getBoundingClientRect().width;
    return wadah > 0 ? el.getBoundingClientRect().width / wadah : -1;
  };
  return {
    panggung: j
      ? { hop: j.hop, ms: j.ms, px: j.px, mulai: j.mulai, pxPerMs: j.pxPerMs, anggaranPx: j.anggaranPx, totalMs: j.totalMs }
      : null,
    dom: { node: pecahan('node'), backend: pecahan('backend'), database: pecahan('database') },
    kotakDatabase: !!document.querySelector('[data-jejak-hop="database"] [data-jejak-bar]'),
    objek: window.__render?.objek ?? [],
  };
});

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
  JSON.stringify(jejak.dom)
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

await foto('09-jejak-arsitektur');
await page.click('button[aria-label="Pit-Wall Telemetry HUD"]');

await browser.close();
if (galat.length) console.log('pageerror:', galat.slice(0, 5));
console.log('foto di', OUT);

for (const h of hasil) console.log(`${h.ok ? 'LULUS' : 'GAGAL'}  ${h.nama}: dapat ${h.dapat}, harus ${h.harus}`);
if (hasil.some((h) => !h.ok)) process.exit(1);
