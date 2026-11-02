// Verifikasi dua lorong rincian di belakang halaman editorial: /baca (index repo) dan
// /arsip (telemetri proses). Yang ditagih di sini bukan "halamannya ada", tapi tiga hukum
// yang sudah berlaku di halaman utama dan tidak boleh dilanggar oleh halaman baru:
//
//   1. ANTI-KARANGAN — setiap angka di /baca harus ada di respons /api/github-repos, pada
//      baris yang sama. Halaman itu boleh kurang, tidak boleh lebih.
//   2. TIDAK ADA BENTUK TANPA ANGKA — /arsip harus tetap berdiri saat sumbernya diam:
//      nol bilah, dan setiap sel ukuran tercetak "—".
//   3. ANGKA DARI RESPONS YANG DIBACA — sel di /arsip harus cocok dengan payload yang benar-
//      benar dikonsumsi halaman itu, bukan dengan fetch tambahan.
//
// Bagian 5 adalah penjaga langkah berikutnya (tautan masuk di bar bawah HUD yang posisinya
// fixed): tinggi dokumen tidak boleh berubah dan setiap sasaran interaktif yang lewat di
// bawah bar harus tetap tertembak oleh hit-test-nya sendiri.
//
//   node docs/verify/halaman-probe.mjs [outdir]      butuh `next dev` di FE_URL
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync } from 'node:fs';

const require = createRequire(new URL('../../nextjs-frontend/package.json', import.meta.url));
const puppeteer = require('puppeteer');
const FE = process.env.FE_URL ?? 'http://localhost:3001';
const OUT = process.argv[2] ?? '/tmp/halaman';
mkdirSync(OUT, { recursive: true });

const diLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(FE);

const browser = await puppeteer.launch({
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

const hasil = [];
const cek = (nama, dapat, harus) => hasil.push({ nama, ok: dapat === harus, dapat: String(dapat), harus: String(harus) });
const cekMin = (nama, dapat, harus) => hasil.push({ nama, ok: dapat >= harus, dapat: String(dapat), harus: `>=${harus}` });
const foto = async (p, nama) => { await p.screenshot({ path: `${OUT}/${nama}.png` }).catch(() => {}); };
const jeda = (ms) => new Promise((r) => setTimeout(r, ms));

// Sel yang isinya PENGUKURAN. Kalau sumbernya tidak mengembalikan angka untuk sel ini,
// penampil wajib menulis "—" — itulah yang ditagih bagian 3 dan 4.
const SEL_UKUR = [
  'backend-db', 'backend-rtt', 'heap', 'node', 'next',
  'hop-backend', 'hop-database',
  'laporan', 'frame', 'median', 'p95', 'fpsTerendah', 'shareLambat', 'resolusi', 'sejak',
  'commit',
];

// ── 1 · /baca: angkanya harus datang dari sumber yang sama dengan halaman utama ──
const pageBaca = await browser.newPage();
await pageBaca.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
const galatBaca = [];
pageBaca.on('pageerror', (e) => galatBaca.push(String(e).slice(0, 200)));
const respBaca = await pageBaca.goto(`${FE}/baca`, { waitUntil: 'domcontentloaded', timeout: 45000 });
await jeda(3000);
cek('/baca menjawab 200', respBaca.status(), 200);

const baca = await pageBaca.evaluate(() => {
  const baris = [...document.querySelectorAll('[data-baca-repos] tbody tr')].map((tr) => {
    const td = [...tr.querySelectorAll('td')];
    const a = td[0]?.querySelector('a');
    return {
      nama: (a?.textContent ?? '').trim(),
      url: a?.getAttribute('href') ?? '',
      bahasa: (td[0]?.querySelector('span')?.textContent ?? '').trim(),
      deskripsi: (td[1]?.textContent ?? '').replace(/\s+/g, ' ').trim(),
      bintang: Number((td[2]?.textContent ?? '').trim()),
      forks: Number((td[3]?.textContent ?? '').trim()),
    };
  });
  // Hukum "tidak ada tanggal karangan" hanya berlaku untuk tabel repo: sumber GitHub tidak
  // mengirim field tanggal sama sekali. Trail commit punya tanggal sendiri karena git memang
  // mengirimnya, jadi wilayahnya diukur terpisah lewat data-baca-riwayat.
  const teksRepo = document.querySelector('[data-baca-repos]')?.textContent ?? '';
  // innerText mengenakan text-transform (uppercase pada label), jadi angka trail dibaca dari
  // textContent supaya hash dan jumlah yang dibandingkan memang yang dikirim komponen.
  const meta = document.querySelector('[data-baca-riwayat] p')?.textContent ?? '';
  const riwayat = [...document.querySelectorAll('[data-baca-riwayat] tbody tr')].map((tr) => {
    const td = [...tr.querySelectorAll('td')].map((e) => e.textContent.replace(/\s+/g, ' ').trim());
    return { commit: td[0], tanggal: td[1], tipe: td[2], ringkasan: td[3] };
  });
  const kepala = meta.match(/head ([0-9a-f]{7,40})/)?.[1] ?? null;
  const totalTercetak = Number(meta.match(/^(\d+) commits/)?.[1] ?? NaN);
  const keranjang = [...document.querySelectorAll('[data-baca-riwayat] li')].map((e) => e.textContent.replace(/\s+/g, ' ').trim());
  return {
    baris,
    riwayat,
    kepala,
    totalTercetak,
    keranjang,
    judul: document.querySelector('h1')?.textContent?.trim() ?? '',
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null,
    og: document.querySelector('meta[property="og:url"]')?.getAttribute('content') ?? null,
    tanggal: (teksRepo.match(/\b\d{4}-\d{2}-\d{2}\b/g) ?? []).length,
    tanggalRiwayat: riwayat.filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.tanggal)).length,
    linkArsip: !!document.querySelector('a[href="/arsip"]'),
  };
});
console.log('baca     ', JSON.stringify({ judul: baca.judul, baris: baca.baris.length, contoh: baca.baris[0] }));

cek('canonical /baca menyebut /baca', (baca.canonical ?? '').endsWith('/baca'), true);
cek('og:url /baca menyebut /baca', (baca.og ?? '').endsWith('/baca'), true);
cek('/baca tidak mencetak tanggal yang tidak ada di sumbernya', baca.tanggal, 0);

const api = await fetch(`${FE}/api/github-repos`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
cek('/api/github-repos menjawab sebagai daftar', Array.isArray(api), true);
if (Array.isArray(api)) {
  cek('jumlah baris sama dengan jumlah repo sumber', baca.baris.length, api.length);
  const selisih = api
    .map((r, i) => {
      const b = baca.baris[i];
      if (!b) return `baris ${i} hilang`;
      const salah = [];
      if (b.nama !== r.name) salah.push(`nama ${b.nama} ≠ ${r.name}`);
      if (b.url !== r.html_url) salah.push(`tautan ${b.url} ≠ ${r.html_url}`);
      if (b.bahasa !== (r.language ?? '—')) salah.push(`bahasa "${b.bahasa}" ≠ "${r.language ?? '—'}"`);
      if (b.bintang !== r.stargazers_count) salah.push(`bintang ${b.bintang} ≠ ${r.stargazers_count}`);
      if (b.forks !== r.forks_count) salah.push(`forks ${b.forks} ≠ ${r.forks_count}`);
      // HTML membuang spasi di tepi kutip, jadi kedua sisi dinormalisasi dulu: yang boleh
      // berbeda hanyalah karangan, bukan whitespace.
      const teksSumber = (r.description ?? '').replace(/\s+/g, ' ').trim();
      if (b.deskripsi !== teksSumber) salah.push(`deskripsi "${b.deskripsi}" ≠ "${teksSumber}"`);
      return salah.length ? `${r.name}: ${salah.join(' | ')}` : null;
    })
    .filter(Boolean);
  hasil.push({
    nama: 'setiap baris /baca cocok dengan respons API-nya',
    ok: selisih.length === 0,
    dapat: selisih.length ? selisih.slice(0, 3).join(' ;; ') : 'semua baris cocok',
    harus: '0 selisih',
  });
  cek('kolom bintang terbaca sebagai angka, bukan teks hiasan', baca.baris.every((b) => Number.isFinite(b.bintang)), true);
} else {
  hasil.push({ nama: 'setiap baris /baca cocok dengan respons API-nya', ok: false, dapat: 'API tidak menjawab', harus: '0 selisih' });
}
cek('/baca menawarkan jalan ke /arsip', baca.linkArsip, true);

// ── 1b · trail commit: yang tercetak harus sama dengan modul yang dikompilasi ──
// Sumber angkanya bukan API, jadi yang ditagih di sini adalah salinannya: halaman tidak boleh
// menambah, membuang, atau memutar baris dibanding riwayatCommit.ts yang ikut dibundel.
const modulRiwayat = (() => {
  try {
    const sumber = readFileSync(new URL('../../nextjs-frontend/src/data/riwayatCommit.ts', import.meta.url), 'utf8');
    const ambil = (p) => sumber.match(p)?.[1] ?? null;
    return {
      kepala: ambil(/export const KEPALA_COMMIT = "([^"]+)"/),
      total: Number(ambil(/export const TOTAL_COMMIT = (\d+)/)),
      perTipe: JSON.parse(ambil(/export const PER_TIPE = ([\s\S]*?) as const;/)),
      entri: JSON.parse(ambil(/export const RIWAYAT_COMMIT: EntriRiwayat\[\] = ([\s\S]*?);\n/)),
    };
  } catch (e) {
    return { galat: String(e).slice(0, 140) };
  }
})();
if (modulRiwayat.galat) {
  hasil.push({ nama: 'modul snapshot riwayat commit terbaca', ok: false, dapat: modulRiwayat.galat, harus: 'terbaca' });
} else {
  cek('jumlah baris trail sama dengan entri modul', baca.riwayat.length, modulRiwayat.entri.length);
  const beda = modulRiwayat.entri
    .map((e, i) => {
      const b = baca.riwayat[i];
      if (!b) return `baris ${i} hilang`;
      const salah = [];
      if (b.commit !== e.commit) salah.push(`commit ${b.commit} ≠ ${e.commit}`);
      if (b.tanggal !== e.tanggal) salah.push(`tanggal ${b.tanggal} ≠ ${e.tanggal}`);
      const tipe = e.scope ? `${e.tipe}(${e.scope})` : e.tipe;
      if (b.tipe !== tipe) salah.push(`tipe "${b.tipe}" ≠ "${tipe}"`);
      const ringkas = e.ringkasan.replace(/\s+/g, ' ').trim();
      if (b.ringkasan !== ringkas) salah.push(`subjek "${b.ringkasan}" ≠ "${ringkas}"`);
      return salah.length ? `${e.commit}: ${salah.join(' | ')}` : null;
    })
    .filter(Boolean);
  hasil.push({
    nama: 'setiap baris trail cocok dengan modul snapshot',
    ok: beda.length === 0,
    dapat: beda.length ? beda.slice(0, 3).join(' ;; ') : 'semua baris cocok',
    harus: '0 selisih',
  });
  cek('hash kepala yang tercetak sama dengan kepala modul', baca.kepala, modulRiwayat.kepala);
  cek('total commit yang tercetak sama dengan total modul', baca.totalTercetak, modulRiwayat.total);
  cek('keranjang tipe di modul menutup total commit', modulRiwayat.perTipe.reduce((a, t) => a + t.jumlah, 0), modulRiwayat.total);
  const chips = baca.keranjang.map((k) => Number(k.match(/(\d+)$/)?.[1] ?? NaN));
  cek('keranjang yang tercetak di halaman juga menutup total', chips.reduce((a, b) => a + b, 0), modulRiwayat.total);
  cek('setiap tanggal trail tercetak sebagai ISO', baca.tanggalRiwayat, baca.riwayat.length);
}
await foto(pageBaca, '01-baca');

// ── 2 · /arsip hidup: angka yang dilukis datang dari respons yang benar-benar dibaca ──
// Satu laporan dibuang lebih dulu supaya deret menit punya sesuatu untuk dilukis; tanpa itu
// gerbang "nol bilah" akan lolos karena alasan yang salah. HANYA ke localhost.
const SEED = { fps: 58.2, medianMs: 16.7, p95Ms: 21.4, over33ms: 3, frames: 300, dpr: 1, lebar: 1440, tinggi: 900 };
if (diLocalhost) {
  const r = await fetch(`${FE}/api/telemetry`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(SEED),
  }).catch(() => null);
  console.log('seed     ', `POST /api/telemetry → ${r?.status ?? 'no-response'}`);
}

const pageArsip = await browser.newPage();
await pageArsip.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
const galatArsip = [];
pageArsip.on('pageerror', (e) => galatArsip.push(String(e).slice(0, 200)));
const dibaca = [];
pageArsip.on('response', async (res) => {
  const u = res.url();
  if (res.request().method() !== 'GET' || !/\/api\/telemetry(\?|$)/.test(u)) return;
  if (res.status() !== 200) return;
  const b = await res.json().catch(() => null);
  if (b && typeof b.latencyMs === 'number') dibaca.push(b);
});
const respArsip = await pageArsip.goto(`${FE}/arsip`, { waitUntil: 'domcontentloaded', timeout: 45000 });
await jeda(6000);
cek('/arsip menjawab 200', respArsip.status(), 200);

const bacaSel = (p) =>
  p.evaluate(() => {
    const sel = {};
    document.querySelectorAll('[data-arsip-sel]').forEach((e) => { sel[e.dataset.arsipSel] = e.textContent.trim(); });
    return {
      sel,
      status: document.querySelector('[data-arsip-status]')?.dataset.arsipStatus ?? null,
      bilah: [...document.querySelectorAll('[data-bilah-menit]')].map((e) => e.style.height),
      jejak: [...document.querySelectorAll('[data-jejak]')].map((e) => e.dataset.jejak),
      teks: (document.body?.innerText ?? '').replace(/\s+/g, ' ').slice(0, 400),
      aturanUkur: /how each figure is measured/i.test(document.body?.innerText ?? ''),
      privasi: /what is not kept/i.test(document.body?.innerText ?? ''),
    };
  });

const hidup = await bacaSel(pageArsip);
console.log('arsip    ', JSON.stringify({ status: hidup.status, sel: hidup.sel, bilah: hidup.bilah, jejak: hidup.jejak }));

cek('HUD /arsip membaca sumbernya', hidup.status, 'hidup');
cekMin('satu respons benar-benar dikonsumsi', dibaca.length, 1);
const terakhir = dibaca[dibaca.length - 1];
cek(
  'latency yang tampil ada di respons yang dibaca',
  dibaca.some((b) => String(b.latencyMs) === hidup.sel.latency),
  true
);
cek(
  'jumlah laporan dan p95 yang tampil sepasang dengan satu respons yang sama',
  dibaca.some(
    (b) =>
      String(b.clientFrames?.laporan ?? '—') === hidup.sel.laporan &&
      String(b.clientFrames?.p95Ms ?? '—') === hidup.sel.p95
  ),
  true
);
cek('hop tanpa angka (postgres) tidak punya panjang', hidup.jejak.includes('database'), false);
cek('hop postgres tercetak "—" bukan nol', hidup.sel['hop-database'], '—');
cekMin('satu laporan menghasilkan minimal satu bilah', hidup.bilah.length, 1);
cek(
  'tiap bilah punya tinggi nyata di bawah plafon',
  hidup.bilah.every((t) => { const n = parseFloat(t); return Number.isFinite(n) && n > 0 && n <= 100; }),
  true
);
cek('aturan ukur dicetak di halaman', hidup.aturanUkur, true);
cek('blok apa yang tidak disimpan dicetak di halaman', hidup.privasi, true);
cek('halaman tidak melempar error saat data datang', galatArsip.length, 0);
cek('/baca tidak melempar error saat dimuat', galatBaca.length, 0);
await foto(pageArsip, '02-arsip-hidup');

// ── 3 · mock: sumber menjawab TANPA angka — halaman tidak boleh mengarang bentuk ──
const payloadKosong = (tambahan = {}) => ({
  status: 'BACKEND UNREACHABLE',
  latencyMs: 9,
  latencySamples: [],
  heapMb: null,
  backend: { reachable: false, db: null, rttMs: null },
  runtime: { node: null, next: null },
  watch: null,
  clientFrames: null,
  gitCommit: null,
  timestamp: new Date().toISOString(),
  ...tambahan,
});

const pageNull = await browser.newPage();
await pageNull.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await pageNull.setRequestInterception(true);
pageNull.on('request', (req) => {
  if (!req.url().includes('/api/telemetry')) return req.continue();
  return req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(payloadKosong()) });
});
await pageNull.goto(`${FE}/arsip`, { waitUntil: 'domcontentloaded', timeout: 45000 });
await jeda(6000);
const kosong = await bacaSel(pageNull);
console.log('null     ', JSON.stringify({ status: kosong.status, sel: kosong.sel, bilah: kosong.bilah, jejak: kosong.jejak }));

cek('payload tanpa angka tetap terbaca sebagai jawaban', kosong.status, 'hidup');
cek('nol laporan berarti nol bilah', kosong.bilah.length, 0);
cek('hanya hop yang terukur yang punya garis', kosong.jejak.join(','), 'node');
const selBukanDash = SEL_UKUR.filter((n) => kosong.sel[n] !== '—');
hasil.push({
  nama: 'semua sel ukuran tercetak "—" saat sumbernya null',
  ok: selBukanDash.length === 0,
  dapat: selBukanDash.length ? selBukanDash.map((n) => `${n}=${kosong.sel[n]}`).join(' | ') : 'semua "—"',
  harus: '0 sel berisi angka',
});
cek('tidak ada sel ukuran yang hilang dari halaman', SEL_UKUR.every((n) => n in kosong.sel), true);
await foto(pageNull, '03-arsip-null');

// ── 4 · mock: sumber DIAM (500) — bacaan lama harus hilang, bukan tinggal mengaku baru ──
const pageSenyap = await browser.newPage();
await pageSenyap.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await pageSenyap.setRequestInterception(true);
pageSenyap.on('request', (req) => {
  if (!req.url().includes('/api/telemetry')) return req.continue();
  return req.respond({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'mock' }) });
});
await pageSenyap.goto(`${FE}/arsip`, { waitUntil: 'domcontentloaded', timeout: 45000 });
await jeda(6000);
const senyap = await bacaSel(pageSenyap);
console.log('senyap   ', JSON.stringify({ status: senyap.status, sel: senyap.sel, bilah: senyap.bilah }));
cek('endpoint mati ditandai senyap', senyap.status, 'senyap');
cek('tidak ada bilah saat endpoint mati', senyap.bilah.length, 0);
cek('tidak ada hop yang dilukis saat endpoint mati', senyap.jejak.length, 0);
const isiSel = Object.values(senyap.sel);
cek('ada sel untuk diukur (gerbang berikut tidak hampa)', isiSel.length > 0, true);
cek('semua sel kosong saat endpoint mati', isiSel.every((v) => v === '—'), true);
await foto(pageSenyap, '04-arsip-senyap');

// ── 5 · penjaga jalur masuk: bar bawah HUD tetap tidak menelan isi halaman ──
const pageUtama = await browser.newPage();
await pageUtama.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await pageUtama.goto(`${FE}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
await jeda(7000);

const masukAwal = await pageUtama.evaluate(() => ({
  tinggi: document.documentElement.scrollHeight,
  header: !!document.querySelector('header'),
}));
// Parkir di bab 3 dengan rasio yang sama dipakai interaksi-probe: hanya di sana tombol SPEC
// berada di viewport, dan hanya di sana bar bawah bisa menelannya.
const fr = await pageUtama.evaluate(() => {
  const top = (s) => document.querySelector(s).getBoundingClientRect().top + window.scrollY;
  const maks = document.documentElement.scrollHeight - window.innerHeight;
  return (top('#chapter-03') + 0.3 * (top('#chapter-04') - top('#chapter-03'))) / maks;
});
await pageUtama.evaluate((f) => {
  const maks = document.documentElement.scrollHeight - window.innerHeight;
  window.scrollTo(0, Math.round(f * maks));
}, fr);
await jeda(1500);

const cs = await pageUtama.evaluate(() => getComputedStyle(document.querySelector('header')).position);
cek('bingkai HUD tetap fixed (tautan baru tidak mengalir di dokumen)', cs, 'fixed');
cek('halaman utama punya bingkai HUD untuk diuji', masukAwal.header, true);

const ukurMasuk = await pageUtama.evaluate(() => {
  const tautan = [...document.querySelectorAll('header a[href="/baca"], header a[href="/arsip"]')];
  const rect = (e) => e.getBoundingClientRect();
  const potong = (a, b) => {
    const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return x > 0 && y > 0 ? Math.round(x * y) : 0;
  };
  const hit = (r) => document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  const alas = (h) =>
    h ? `${h.tagName.toLowerCase()}${h.getAttribute("aria-label") ? `[${h.getAttribute("aria-label")}]` : ""}.${String(h.className ?? "").slice(0, 46)}` : "null";
  const dalam = (e, h) => !!h && (h === e || e.contains(h) || e.contains(h?.parentElement ?? null));
  const daftar = [
    ...document.querySelectorAll('button[aria-label^="Open architecture specification"]'),
    ...document.querySelectorAll('header nav[aria-label="Chapter index"] button'),
  ]
    .map((e) => ({ e, r: rect(e) }))
    // Yang di luar viewport tidak bisa di-hit-test (elementFromPoint mengembalikan null),
    // jadi hanya yang benar-benar terlihat yang ditagih — dan jumlahnya dilaporkan supaya
    // gerbangnya terbaca sebagai gerbang, bukan kebetulan lolos.
    .filter(({ r }) => r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= window.innerHeight && r.left >= 0 && r.right <= window.innerWidth)
    .map(({ e, r }) => {
      const h = hit(r);
      return { nama: (e.getAttribute("aria-label") ?? e.textContent.trim()).slice(0, 26), own: dalam(e, h), penahan: alas(h) };
    });
  // Tiga kelas penahan yang sudah ada sebelum langkah ini dan tidak bisa diubah oleh dua
  // tautan di sudut kiri atas: penanda portal (fixed, untuk mata panggung) dan pita bawah
  // HUD sendiri. Yang ditagih di sini adalah "tidak ada penahan BARU"; keduanya dicatat
  // sebagai angka supaya perubahannya kelihatan kalau nanti muncul.
  const portal = daftar.filter((d) => !d.own && /nextjs-portal/.test(d.penahan));
  const bar = daftar.filter((d) => !d.own && /pointer-ev/.test(d.penahan));
  const lain = daftar.filter((d) => !d.own && !portal.includes(d) && !bar.includes(d));
  const sebelum = document.documentElement.scrollHeight;
  tautan.forEach((t) => (t.style.display = 'none'));
  const sesudah = document.documentElement.scrollHeight;
  tautan.forEach((t) => (t.style.display = ''));
  const tumpukAsli = tautan.flatMap((t) =>
    [...document.querySelectorAll('button[aria-label^="Open architecture specification"], header nav[aria-label="Chapter index"] button')].map((s) => potong(rect(t), rect(s)))
  ).filter((n) => n > 0);
  return {
    jumlahTautan: tautan.length,
    sasaran: daftar.length,
    spesifikasi: daftar.filter((d) => d.nama.startsWith('Open architecture')).length,
    tertutupPortal: portal.map((d) => d.nama),
    tertutupBar: bar.map((d) => d.nama),
    penahanBaru: lain.map((d) => `${d.nama} ← ${d.penahan}`),
    overlap: tumpukAsli.reduce((a, b) => a + b, 0),
    sama: sebelum === sesudah,
    sebelum,
  };
});
console.log('masuk    ', JSON.stringify(ukurMasuk));
cek('dua tautan masuk ada di bingkai HUD', ukurMasuk.jumlahTautan, 2);
cek('tautan tidak menambah tinggi dokumen', ukurMasuk.sama, true);
cek('tinggi dokumen terbaca (gerbang di atas tidak hampa)', ukurMasuk.sebelum > 900, true);
cekMin('sasaran interaktif ikut diuji', ukurMasuk.sasaran, 4);
cekMin('tombol SPEC yang terlihat ikut diuji', ukurMasuk.spesifikasi, 1);
hasil.push({
  nama: 'tidak ada penahan baru di atas sasaran interaktif',
  ok: ukurMasuk.penahanBaru.length === 0,
  dapat: ukurMasuk.penahanBaru.length ? ukurMasuk.penahanBaru.join(' | ') : 'hanya penahan lama',
  harus: '0 penahan baru',
});
cek('tidak ada tumpang tindih tautan baru dengan sasaran interaktif', ukurMasuk.overlap, 0);
await foto(pageUtama, '05-masuk-hud');

await browser.close();
for (const h of hasil) console.log(`${h.ok ? 'LULUS' : 'GAGAL'}  ${h.nama}: dapat ${h.dapat}, harus ${h.harus}`);
const gagal = hasil.filter((h) => !h.ok).length;
console.log(`total ${hasil.length} gerbang, ${gagal} gagal`);
if (gagal) console.log('pageerror arsip:', galatArsip.slice(0, 3), 'baca:', galatBaca.slice(0, 3));
process.exit(gagal ? 1 : 0);
