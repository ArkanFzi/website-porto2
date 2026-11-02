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
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';

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
  const penulis = [...document.querySelectorAll('[data-baca-penulis] tbody tr')].map((tr) => {
    const td = [...tr.querySelectorAll('td')].map((e) => e.textContent.replace(/\s+/g, ' ').trim());
    return { nama: td[0], email: td[1], jumlah: Number(td[2]), jenis: td[3] };
  });
  return {
    baris,
    riwayat,
    kepala,
    totalTercetak,
    keranjang,
    penulis,
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
      nonMerge: Number(ambil(/export const COMMIT_NON_MERGE = (\d+)/)),
      lewatPr: Number(ambil(/export const COMMIT_LEWAT_PR = (\d+)/)),
      penulis: JSON.parse(ambil(/export const PENULIS: Penulis\[\] = ([\s\S]*?);\n/)),
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

  // Tabel penulis: identitas git boleh berbohong tentang berapa orang, tapi tidak boleh
  // berbohong tentang berapa commit. Jumlah baris tercetak wajib menutup COMMIT_NON_MERGE.
  cek('jumlah baris penulis sama dengan identitas di modul', baca.penulis.length, modulRiwayat.penulis.length);
  const bedaPenulis = modulRiwayat.penulis
    .map((p, i) => {
      const b = baca.penulis[i];
      if (!b) return `baris ${i} hilang`;
      const salah = [];
      if (b.nama !== p.nama) salah.push(`nama "${b.nama}" ≠ "${p.nama}"`);
      if (b.email !== p.email) salah.push(`alamat "${b.email}" ≠ "${p.email}"`);
      if (b.jumlah !== p.jumlah) salah.push(`commit ${b.jumlah} ≠ ${p.jumlah}`);
      if (b.jenis !== (p.bot ? 'bot' : 'human')) salah.push(`jenis "${b.jenis}" ≠ "${p.bot ? 'bot' : 'human'}"`);
      return salah.length ? `${p.nama}: ${salah.join(' | ')}` : null;
    })
    .filter(Boolean);
  hasil.push({
    nama: 'setiap baris penulis cocok dengan modul snapshot',
    ok: bedaPenulis.length === 0,
    dapat: bedaPenulis.length ? bedaPenulis.slice(0, 3).join(' ;; ') : 'semua baris cocok',
    harus: '0 selisih',
  });
  cek('commit tercetak menutup total tanpa merge', baca.penulis.reduce((a, p) => a + p.jumlah, 0), modulRiwayat.nonMerge);
  cek('bot tidak dihitung sebagai manusia', baca.penulis.filter((p) => p.jenis === 'bot').length, modulRiwayat.penulis.filter((p) => p.bot).length);
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

// ── 5b · bab penutup: angka nyata atau tanda pisah, bukan ledger yang dikarang ──
// Di tempat ini pernah ada "VERIFIED DISPATCH LEDGER" dengan dua nomor pesan (#16-89,
// #16-88) yang tidak pernah dikirim siapa pun, dan catatan laju "5 MSG/HR" yang tidak
// pernah ada di backend. Yang ditagih sekarang: tidak ada satu pun angka di bab itu yang
// tidak bersumber, dan hanya satu berkas di seluruh frontend yang memanggil /api/visits.
const bab04 = await pageUtama.evaluate(() => {
  const sampel = document.querySelector('[data-bab04-sampel]');
  const teks = (sampel?.textContent || '').replace(/\s+/g, ' ').trim();
  const seksi = (document.querySelector('#chapter-04')?.textContent || '').replace(/\s+/g, ' ');
  const seluruh = document.body.textContent.replace(/\s+/g, ' ');
  return {
    ada: !!sampel,
    teks,
    laju: seksi.includes('10 BERUNTAS'),
    karangan: [/#16-\d/, /VERIFIED DISPATCH LEDGER/, /5 MSG\/HR/, /LIVE FEED/].filter((r) =>
      r.test(seluruh)
    ).length,
  };
});
console.log('bab04    ', JSON.stringify(bab04));
cek('bab penutup punya blok sampel yang terukur', bab04.ada, true);
cek('bab penutup tidak mengarang nomor pesan atau angka laju', bab04.karangan, 0);
cek('blok sampel menyebut sumber angkanya', bab04.teks.includes('TOTAL KUNJUNGAN'), true);
cek(
  'blok sampel mencetak angka nyata atau tanda pisah, bukan nol cadangan',
  // Teks dua elemen sejajar tersambung tanpa spasi di textContent, jadi yang dicocokkan
  // karakter pertama sesudah label: angka, atau tanda pisah.
  /TOTAL KUNJUNGAN[—0-9]/.test(bab04.teks),
  true
);
cek('klaim laju bab penutup sesuai rem di go-backend', bab04.laju, true);

// Satu pemanggil saja: kalau ada komponen yang menambah polling /api/visits sendiri, dua
// tempat bisa mencetak dua angka pada waktu yang sama.
const jelajahi = (dir, out = []) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) {
      if (e.name !== 'node_modules' && e.name !== '.next') jelajahi(p, out);
    } else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
};
const pemanggilVisits = jelajahi(new URL('../../nextjs-frontend/src', import.meta.url).pathname).filter((f) =>
  readFileSync(f, 'utf8').includes('fetch("/api/visits"')
);
cek('hanya satu berkas yang memanggil GET /api/visits', pemanggilVisits.length, 1);
cek(
  'pemanggil tunggal itu adalah store kunjungan',
  pemanggilVisits[0]?.endsWith('src/lib/bacaKunjungan.ts'),
  true
);

// ── 6 · penjaga jalur: apa yang boleh dibaca crawler dan apa yang tidak ──
// /cv-layout adalah kertas render untuk /api/cv, bukan halaman. robots.txt sudah menolaknya;
// gerbang ini memastikan dokumen itu sendiri juga menolak, dan bahwa dua lorong rincian yang
// baru benar-benar terdaftar di sitemap — supaya yang dilarang dan yang diumumkan tidak
// pernah tertukar.
const ambil = async (jalur) => {
  const r = await fetch(FE + jalur);
  return { status: r.status, teks: await r.text() };
};
const cv = await ambil('/cv-layout');
cek('/cv-layout menjawab 200', cv.status, 200);
cek('/cv-layout menolak diindeks lewat meta robots', /name="robots"[^>]*noindex/i.test(cv.teks), true);
cek('/cv-layout punya judul dokumen sendiri', /<title>[^<]*CV render sheet/i.test(cv.teks), true);
const rb = await ambil('/robots.txt');
cek('robots.txt men-disallow /cv-layout', /disallow:\s*\/cv-layout/i.test(rb.teks), true);
const sm = await ambil('/sitemap.xml');
cek('sitemap memuat /baca', sm.teks.includes('/baca'), true);
cek('sitemap memuat /arsip', sm.teks.includes('/arsip'), true);
cek('sitemap tidak memuat /cv-layout', sm.teks.includes('/cv-layout'), false);

// ── 7 · esai: setiap berkas yang dikutip naskah harus benar-benar ada ──
// Naskah longest-form di situs ini mengklaim hal teknis dan menyebut jalur berkas sebagai
// buktinya. Gerbangnya bukan "tulisannya ada", tapi "buktinya bisa dibuka": setiap jalur yang
// tercetak di blok WHAT THIS TEXT POINTS AT diuji terhadap isi repositori, dan hash yang
// tercetak diuji terhadap sejarah git. Satu jalur yang salah tulis membuat halaman ini gagal.
const AKAR = new URL('../../', import.meta.url);
const SLUG_DARI_DATA = [
  ...readFileSync(new URL('../../nextjs-frontend/src/data/esai.ts', import.meta.url), 'utf8').matchAll(/^ {4}slug: "([a-z0-9-]+)",$/gm),
].map((m) => m[1]);
const tautanEsai = await pageBaca.evaluate(() =>
  [...document.querySelectorAll('[data-baca-esai] a[href^="/baca/esai/"]')].map((a) => a.getAttribute('href'))
);
cek('daftar /baca memuat satu tautan per esai di modul', tautanEsai.length, SLUG_DARI_DATA.length);
cek(
  'tautan esai di /baca sama dengan slug yang ada di modul',
  [...tautanEsai].map((h) => h.split('/').pop()).sort().join(','),
  [...SLUG_DARI_DATA].sort().join(',')
);

const naskah = [];
for (const href of tautanEsai) {
  const r = await pageBaca.goto(FE + href, { waitUntil: 'domcontentloaded', timeout: 45000 });
  const isi = await pageBaca.evaluate(() => ({
    judul: document.querySelector('h1')?.textContent?.trim() ?? '',
    paragraf: document.querySelectorAll('[data-esai-tubuh] p').length,
    kutipan: [...document.querySelectorAll('[data-esai-tubuh] ~ section li, section[aria-labelledby="bukti-judul"] li')].map((e) => e.textContent.trim()),
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '',
    ogType: document.querySelector('meta[property="og:type"]')?.getAttribute('content') ?? '',
  }));
  naskah.push({ href, status: r.status(), ...isi });
}
for (const n of naskah) {
  cek(`${n.href} menjawab 200`, n.status, 200);
  cek(`${n.href} canonical menunjuk ke jalurnya sendiri`, n.canonical.endsWith(n.href), true);
  cekMin(`${n.href} punya isi lebih dari satu layar`, n.paragraf, 5);
  cekMin(`${n.href} menyebut berkas yang bisa dibuka`, n.kutipan.length, 3);
  const hilang = n.kutipan.filter((p) => {
    if (/^[0-9a-f]{7,40}$/.test(p)) {
      try {
        return execFileSync('git', ['-C', decodeURIComponent(AKAR.pathname), 'cat-file', '-t', p], { encoding: 'utf8' }).trim() !== 'commit';
      } catch {
        return true;
      }
    }
    return !existsSync(new URL(p, AKAR));
  });
  hasil.push({
    nama: `setiap bukti yang dikutip ${n.href} ada di repositori`,
    ok: hilang.length === 0,
    dapat: hilang.length ? hilang.join(' | ') : `${n.kutipan.length} bukti terverifikasi`,
    harus: '0 jalur mati',
  });
  hasil.push({
    nama: `${n.href} tercetak sebagai artikel, bukan halaman biasa`,
    ok: n.ogType === 'article',
    dapat: n.ogType || '(kosong)',
    harus: 'article',
  });
}
const asing = await pageBaca.goto(`${FE}/baca/esai/slug-yang-tidak-ada`, { waitUntil: 'domcontentloaded', timeout: 45000 });
cek('slug esai asing menjawab 404', asing.status(), 404);
cek('sitemap memuat setiap URL esai', tautanEsai.every((h) => sm.teks.includes(h)), true);

// ── 8 · panggung kedua: /waktu harus punya angka dulu baru punya bentuk ──
// Rute ini kanvas per-route (PanggungKecil), jadi tagihannya sama dengan halaman utama dan
// diukur dengan alat yang sama (window.__render dari stage/PengukurRender):
//   · satu draw call untuk seluruh adegan,
//   · nol frame setelah pengunjung diam,
//   · sisi bukaan WebGL === lebar persegi DOM (satu hukum, dua lukisan),
//   · dan tanpa clientFrames keduanya hilang, bukan mengecil jadi hiasan.
const P95_UJI = 66;const payloadRitme = (tambahan = {}) => ({
  ...payloadKosong(tambahan),
  clientFrames: {
    laporan: 7,
    frame: 1200,
    medianMs: 16.7,
    p95Ms: P95_UJI,
    fpsTerendah: 24,
    shareLambatPct: 9.4,
    resolusiTeratas: [{ resolusi: '1440x900', laporan: 4 }],
    buket: [],
    sejak: new Date(Date.now() - 120000).toISOString(),
  },
});

const bacaWaktu = (p) =>
  p.evaluate(() => {
    const bukaan = document.querySelector('[data-waktu-bukaan]');
    const panggung = document.querySelector('[data-panggung-kecil]');
    return {
      angka: document.querySelector('[data-waktu-angka="p95"]')?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
      lebarDom: bukaan ? Number.parseFloat(bukaan.style.width) / 100 : null,
      kosong: !!document.querySelector('[data-waktu-kosong]'),
      posisi: panggung ? getComputedStyle(panggung).position : null,
      jendela: window.__jendela ? { ...window.__jendela } : null,
      render: window.__render ? { calls: window.__render.calls, frame: window.__render.frame } : null,
    };
  });

// Jalur masuknya: panggung kedua diumumkan di /baca dan setiap tautan yang tercetak di sana
// harus benar-benar menjawab — halaman indeks yang menjanjikan rute mati lebih buruk dari
// tidak menjanjikan apa pun.
await pageBaca.goto(`${FE}/baca`, { waitUntil: 'domcontentloaded', timeout: 45000 });
const tautanPanggung = await pageBaca.evaluate(() =>
  [...document.querySelectorAll('[data-baca-panggung] a[href]')].map((a) => a.getAttribute('href'))
);
cekMin('/baca mengumumkan panggung kedua', tautanPanggung.length, 1);
cek('/baca menautkan /waktu', tautanPanggung.includes('/waktu'), true);
for (const href of tautanPanggung) {
  const r = await fetch(FE + href);
  cek(`tautan panggung ${href} menjawab 200`, r.status, 200);
  cek(`tautan panggung ${href} ada di sitemap`, sm.teks.includes(href), true);
}

const pageWaktu = await browser.newPage();
const galatWaktu = [];
pageWaktu.on('pageerror', (e) => galatWaktu.push(String(e)));
await pageWaktu.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await pageWaktu.setRequestInterception(true);
pageWaktu.on('request', (req) => {
  if (!req.url().includes('/api/telemetry')) return req.continue();
  return req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(payloadRitme()) });
});
const rWaktu = await pageWaktu.goto(`${FE}/waktu`, { waitUntil: 'domcontentloaded', timeout: 45000 });
cek('/waktu menjawab 200', rWaktu.status(), 200);
await jeda(2500);
const awalWaktu = await bacaWaktu(pageWaktu);
console.log('waktu    ', JSON.stringify(awalWaktu));

cek('/waktu canonical menunjuk ke jalurnya sendiri', (await pageWaktu.evaluate(() => document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '')).endsWith('/waktu'), true);
cek('panggung kedua duduk di aliran dokumen, bukan fixed di belakang isi', awalWaktu.posisi, 'relative');
cek('satu adegan = satu draw call', awalWaktu.render?.calls, 1);
cek('angka p95 yang tercetak adalah angka respons', !!awalWaktu.angka?.startsWith(String(P95_UJI)), true);
cek('bukaan WebGL benar-benar tergambar', !!awalWaktu.jendela, true);
cek('rasio bukaan = p95 dibagi ambang 33 ms', awalWaktu.jendela?.rasio, P95_UJI / 33);
cek(
  'sisi bukaan tidak pernah menembus bingkainya',
  awalWaktu.jendela ? awalWaktu.jendela.sisi <= awalWaktu.jendela.bingkai : false,
  true
);
const bedaLukisan =
  awalWaktu.jendela && Number.isFinite(awalWaktu.lebarDom)
    ? Math.abs(awalWaktu.lebarDom - awalWaktu.jendela.sisi / awalWaktu.jendela.bingkai)
    : NaN;
hasil.push({
  nama: 'DOM dan WebGL melukis pecahan yang sama dari satu angka',
  ok: Number.isFinite(bedaLukisan) && bedaLukisan < 0.001,
  dapat: Number.isFinite(bedaLukisan) ? bedaLukisan.toFixed(6) : '(tidak terukur)',
  harus: '< 0.001',
});

// Hukum diam: kedua sampel diambil SETELAH IDLE_MS (4000 ms) lewat. Mengukur delta dari
// sampel yang masih jatuh di fase "always" akan menghitung frame yang seharusnya jalan —
// kanvas berhenti melukis ±1,5 s setelah bacaan pertama, bukan sejak mount.
await jeda(3500);
const diam1 = await bacaWaktu(pageWaktu);
await jeda(3000);
const diam2 = await bacaWaktu(pageWaktu);
console.log('waktu-diam', JSON.stringify({ a: diam1.render?.frame, b: diam2.render?.frame }));
cek(
  'nol frame saat pengunjung diam',
  (diam2.render?.frame ?? -1) - (diam1.render?.frame ?? -1),
  0
);
await foto(pageWaktu, '08-waktu-hidup');

// Sumber diam → tidak ada bentuk sama sekali.
await pageWaktu.setRequestInterception(true);
pageWaktu.removeAllListeners('request');
pageWaktu.on('request', (req) => {
  if (!req.url().includes('/api/telemetry')) return req.continue();
  return req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(payloadKosong()) });
});
await pageWaktu.reload({ waitUntil: 'domcontentloaded', timeout: 45000 });
await jeda(3500);
const waktuKosong = await bacaWaktu(pageWaktu);
console.log('waktu-null', JSON.stringify(waktuKosong));
cek('tanpa clientFrames tidak ada geometri', !!waktuKosong.jendela, false);
cek('tanpa clientFrames tidak ada draw call', waktuKosong.render?.calls, 0);
cek('tanpa clientFrames halaman menulis "—"', waktuKosong.angka?.includes('—'), true);
cek('tanpa clientFrames ada tempat kosong yang eksplisit', waktuKosong.kosong, true);
cek('/waktu tidak melempar error', galatWaktu.length, 0);
cek('sitemap memuat /waktu', sm.teks.includes('/waktu'), true);

// ── 9 · /sangkar: sudut yang sama, dibaca dari dua tempat ──
// Rute ini tidak punya angka telemetri: angkanya adalah perintah pengunjung. Yang ditagih:
//   · satu draw call dan satu store putaran (lib/putaran.ts) — DOM dan WebGL harus menyebut
//     angka yang sama, kalau tidak, halaman ini punya dua kebenaran;
//   · batas ±12 derajat ditegakkan lewat seret maupun panah, dan melepas mengembalikan ke 0;
//   · hukum diam panggung kedua tetap berlaku.
const bacaSangkar = (p) =>
  p.evaluate(() => {
    const el = document.querySelector('[data-sangkar-derajat]');
    return {
      dom: el ? el.textContent.replace(/\s+/g, ' ').trim() : null,
      sangkar: window.__sangkar ? { ...window.__sangkar } : null,
      render: window.__render ? { calls: window.__render.calls, frame: window.__render.frame } : null,
    };
  });

const pageSangkar = await browser.newPage();
const galatSangkar = [];
pageSangkar.on('pageerror', (e) => galatSangkar.push(String(e)));
await pageSangkar.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
const rSangkar = await pageSangkar.goto(`${FE}/sangkar`, { waitUntil: 'domcontentloaded', timeout: 45000 });
cek('/sangkar menjawab 200', rSangkar.status(), 200);
await jeda(1200);
const sangkarAwal = await bacaSangkar(pageSangkar);
console.log('sangkar  ', JSON.stringify(sangkarAwal));
cek('sangkar tergambar sebagai satu draw call', sangkarAwal.render?.calls, 1);
cek('verifier sudut terpasang', !!sangkarAwal.sangkar, true);
cek('batas sudut datang dari modul, bukan dari halaman', sangkarAwal.sangkar?.batasDerajat, 12);
cek('sangkar diparkir pada yaw 45 derajat', Math.round(((sangkarAwal.sangkar?.yawAwal ?? 0) * 180) / Math.PI), 45);

// Seret 100 px ke kanan: JANGKAUAN_PX 200 untuk 12 derajat, jadi ini ±6 derajat.
const kotak = await pageSangkar.evaluate(() => {
  const r = document.querySelector('[data-panggung-kecil]')?.getBoundingClientRect();
  return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
});
cek('kanvas panggung kedua punya wilayah seret', !!kotak, true);
if (kotak) {
  await pageSangkar.mouse.move(kotak.x, kotak.y);
  await pageSangkar.mouse.down();
  await pageSangkar.mouse.move(kotak.x + 100, kotak.y, { steps: 6 });
  await jeda(700);
  const diseret = await bacaSangkar(pageSangkar);
  console.log('seret    ', JSON.stringify(diseret.sangkar));
  cek('seret menghasilkan sudut yang benar-benar berubah', diseret.sangkar?.derajatX, 6);
  cek(
    'DOM menyebut derajat yang sama dengan yang dipakai kanvas',
    !!diseret.dom?.startsWith('+6°'),
    true
  );
  await pageSangkar.mouse.move(kotak.x + 900, kotak.y, { steps: 4 });
  await jeda(500);
  const dijepit = await bacaSangkar(pageSangkar);
  cek('batas 12 derajat ditegakkan lewat jepit, bukan lewat klaim', dijepit.sangkar?.derajatX, 12);
  await pageSangkar.mouse.up();
  await jeda(700);
  const dilepas = await bacaSangkar(pageSangkar);
  cek('melepas seret mengembalikan sudut ke nol', dilepas.sangkar?.derajatX, 0);
  cek('DOM ikut kembali ke nol', !!dilepas.dom?.startsWith('+0°'), true);
}

// Panah keyboard: satu langkah = empat derajat, dua langkah = delapan.
await pageSangkar.focus('[data-sangkar-kontrol]');
await pageSangkar.keyboard.press('ArrowRight');
await pageSangkar.keyboard.press('ArrowRight');
await jeda(700);
const denganPanah = await bacaSangkar(pageSangkar);
console.log('panah    ', JSON.stringify(denganPanah.sangkar));
cek('dua langkah panah = delapan derajat', denganPanah.sangkar?.derajatX, 8);
cek('kontrol keyboard dan kanvas membaca store yang sama', !!denganPanah.dom?.startsWith('+8°'), true);
await pageSangkar.keyboard.press('Escape');
await jeda(500);
const lepasKeyboard = await bacaSangkar(pageSangkar);
cek('Escape mengembalikan ke nol', lepasKeyboard.sangkar?.derajatX, 0);

// Sampel diambil setelah IDLE_MS lewat dari aktivitas terakhir (Escape membangunkan loop),
// jadi keduanya berada di fase demand.
await pageSangkar.evaluate(() => window.scrollTo(0, 0));
await jeda(5200);
const sangkarDiam1 = await bacaSangkar(pageSangkar);
await jeda(3000);
const sangkarDiam2 = await bacaSangkar(pageSangkar);
cek(
  'nol frame saat pengunjung diam di /sangkar',
  (sangkarDiam2.render?.frame ?? -1) - (sangkarDiam1.render?.frame ?? -1),
  0
);
cek('/sangkar tidak melempar error', galatSangkar.length, 0);
cek('sitemap memuat /sangkar', sm.teks.includes('/sangkar'), true);
cek('/baca menautkan /sangkar', tautanPanggung.includes('/sangkar'), true);
await foto(pageSangkar, '09-sangkar');

// ── 10 · /meja: knob menulis uniform, dan holder panggung utama tidak ikut tersentuh ──
// Dua hal yang ditagih di rute ini:
//   · angka yang DICETAK DOM = angka yang ADA DI MATERIAL — kalau tidak, halaman ini hanya
//     menjual ilustrasi;
//   · SAPU_IRIS dan SILANG_MOBIL (holder module-level yang dibagi antar objek di halaman
//     utama) harus tetap nol walaupun knob iris digas sampai satu. Ini kondisi keras: begitu
//     rute eksperimen bisa menulis holder itu, "satu kanvas satu mobil" berhenti berlaku.
const bacaMeja = (p) =>
  p.evaluate(() => {
    const angka = {};
    document.querySelectorAll('[data-meja-angka]').forEach((el) => {
      angka[el.getAttribute('data-meja-angka')] = el.textContent.trim();
    });
    const maskEl = document.querySelector('[data-meja-mask]');
    return {
      angka,
      mask: maskEl ? maskEl.textContent.replace(/\s+/g, ' ').trim() : null,
      meja: window.__meja ? JSON.parse(JSON.stringify(window.__meja)) : null,
      render: window.__render ? { calls: window.__render.calls, frame: window.__render.frame } : null,
    };
  });

// Range input berjalan dengan panah keyboard: satu tekan = satu `step`. Jadi gerbang ini
// memakai jalur pengunjung sungguhan, bukan nilai yang disuntik lewat setter.
const putarKnob = async (p, kunci, tekanannya, arah = 'ArrowRight') => {
  await p.focus(`[data-meja-knob="${kunci}"]`);
  for (let i = 0; i < tekanannya; i++) await p.keyboard.press(arah);
  await jeda(600);
};

const pageMeja = await browser.newPage();
const galatMeja = [];
pageMeja.on('pageerror', (e) => galatMeja.push(String(e)));
await pageMeja.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
const rMeja = await pageMeja.goto(`${FE}/meja`, { waitUntil: 'domcontentloaded', timeout: 45000 });
cek('/meja menjawab 200', rMeja.status(), 200);
cek('/meja mendeklarasikan canonical sendiri', (rMeja.headers()['content-type'] || '').includes('text/html'), true);
await jeda(1600);
const mejaAwal = await bacaMeja(pageMeja);
console.log('meja-awal', JSON.stringify(mejaAwal.meja));
cek('verifier meja terpasang', !!mejaAwal.meja, true);
cek('meja tergambar sebagai satu draw call', mejaAwal.render?.calls, 1);
cek('kartu meja hanya dua segitiga', mejaAwal.meja?.segitiga, 2);
cek('bidang kartunya empat vertex', mejaAwal.meja?.vertex, 4);
// DOM mencetak dengan dua desimal, uniform menyimpan float: yang ditagih bukan string yang
// sama persis, tapi bahwa keduanya menunjuk angka yang sama.
const dekat = (a, b) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < 0.006;
cek(
  'angka DOM dan angka uniform menyebut persona yang sama',
  dekat(mejaAwal.meja?.persona, Number(mejaAwal.angka?.persona)),
  true
);
cek('fokus awal duduk di jarak kamera sehingga kartu tajam', mejaAwal.meja?.fokus, 5);
cek('potong awal tidak menghapus apa pun', mejaAwal.meja?.mask?.[0], -1);
cek('sapuan awal terbuka', mejaAwal.meja?.iris === 0 && mejaAwal.meja?.mobil === 0, true);

// Gas iris sampai satu (20 langkah x 0,05). Holder lokal harus ikut; holder bersama tidak.
await putarKnob(pageMeja, 'iris', 20);
const mejaIris = await bacaMeja(pageMeja);
console.log('meja-iris', JSON.stringify(mejaIris.meja), mejaIris.angka.iris);
cek('knob iris menulis uniform material sampai satu', (mejaIris.meja?.iris ?? 0) >= 0.999, true);
cek('DOM menyebut angka yang sama dengan uniform', mejaIris.angka?.iris, '1.00');
cek('SAPU_IRIS panggung utama tetap nol', mejaIris.meja?.globalIris, 0);
cek('SILANG_MOBIL panggung utama tetap nol', mejaIris.meja?.globalMobil, 0);
cek('uMobil rute ini tetap nol (tidak ada mobil di sini)', mejaIris.meja?.mobil, 0);

// Potong 0,25 dari tiap tepi = mask [-0.50, 0.50] dalam NDC. Rumusnya tinggal satu fungsi,
// jadi yang diuji adalah apakah kanvas benar-benar memakai rumus yang dicetak DOM.
await putarKnob(pageMeja, 'potong', 25);
const mejaPotong = await bacaMeja(pageMeja);
console.log('meja-potong', JSON.stringify(mejaPotong.meja?.mask), mejaPotong.mask);
cek('knob potong menghasilkan kotak mask yang dihitung rumus', mejaPotong.meja?.mask?.[0], -0.5);
cek('tepi kanan mask simetris', mejaPotong.meja?.mask?.[1], 0.5);
cek('DOM mencetak mask yang sama dengan uniform', !!mejaPotong.mask?.includes('-0.50'), true);

// Bidang fokus: turun 0,5 satuan berarti kartu (yang diam di 5) kabur penuh. Panah kiri,
// karena menaikkan fokus justru menjauh dari kartu.
await putarKnob(pageMeja, 'fokus', 25, 'ArrowLeft');
const mejaFokus = await bacaMeja(pageMeja);
cek('knob fokus bergerak dalam satuan dunia', mejaFokus.meja?.fokus, 4.5);
cek('kekuatan kabur ikut yang diperintahkan', mejaFokus.meja?.kabur, 0.6);
cek(
  'sumber kabur adalah salinan ¼-res yang benar-benar dibangun',
  !!mejaFokus.meja?.salinanKabur && mejaFokus.meja.salinanKabur[0] <= 224,
  true
);

// Reset lewat tombol, lalu buktikan loop benar-benar diam setelah IDLE_MS.
await pageMeja.click('[data-meja-reset]');
await jeda(600);
const mejaReset = await bacaMeja(pageMeja);
cek('reset mengembalikan iris ke nol', mejaReset.meja?.iris, 0);
cek('reset mengembalikan potong ke nol', mejaReset.meja?.mask?.[0], -1);
await pageMeja.evaluate(() => window.scrollTo(0, 0));
// Sampel pertama harus jatuh SETELAH IDLE_MS dari aktivitas terakhir (klik reset di atas
// ikut membangunkan loop), jadi jendelanya dibuka 5,2 detik — kalau tidak, yang diukur
// adalah sisa fase "always", bukan keadaan diamnya.
await jeda(5200);
const mejaDiam1 = await bacaMeja(pageMeja);
await jeda(3000);
const mejaDiam2 = await bacaMeja(pageMeja);
cek(
  'nol frame saat pengunjung diam di /meja',
  (mejaDiam2.render?.frame ?? -1) - (mejaDiam1.render?.frame ?? -1),
  0
);
cek('/meja tidak melempar error', galatMeja.length, 0);
cek('sitemap memuat /meja', sm.teks.includes('/meja'), true);
cek('/baca menautkan /meja', tautanPanggung.includes('/meja'), true);
await foto(pageMeja, '10-meja');

// ── 11 · /peta: instance = baris, tinggi = angka yang dicetak ──
// Rute ini bergantung pada API GitHub di sisi server, yang bisa gagal karena plafon 60
// request/jam. Keadaan kosongnya więc ikut diuji: tanpa data tidak ada mesh, tidak ada draw
// call, dan tidak ada angka — bukan batang nol yang karangan.
const bacaPeta = (p) =>
  p.evaluate(() => {
    const baris = [...document.querySelectorAll('[data-peta-baris]')].map((el) => ({
      nama: el.textContent.replace(/\s+/g, ' ').trim().slice(0, 40),
      bintang: Number(el.querySelector('[data-peta-bintang]')?.textContent.replace(/[^\d]/g, '') || 0),
      tinggi: Number(el.querySelector('[data-peta-tinggi]')?.textContent || NaN),
      tertinggi: el.getAttribute('data-peta-tertinggi') === 'true',
    }));
    return {
      baris,
      kosong: !!document.querySelector('[data-peta-kosong]'),
      peta: window.__peta ? JSON.parse(JSON.stringify(window.__peta)) : null,
      render: window.__render ? { calls: window.__render.calls, frame: window.__render.frame } : null,
    };
  });

const pagePeta = await browser.newPage();
const galatPeta = [];
pagePeta.on('pageerror', (e) => galatPeta.push(String(e)));
await pagePeta.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
const rPeta = await pagePeta.goto(`${FE}/peta`, { waitUntil: 'domcontentloaded', timeout: 45000 });
cek('/peta menjawab 200', rPeta.status(), 200);
await jeda(1600);
const peta = await bacaPeta(pagePeta);
console.log('peta     ', peta.baris.length, 'baris', JSON.stringify(peta.peta));
cek('jumlah instance sama dengan jumlah baris daftar', peta.peta?.instance ?? 0, peta.baris.length);
if (peta.baris.length > 0) {
  cek('satu draw call untuk seluruh daftar', peta.render?.calls, 1);
  const melenceng = peta.baris.filter(
    (b, i) => !(Math.abs((peta.peta?.tinggi?.[i] ?? NaN) - b.tinggi) < 0.006)
  ).length;
  cek(
    'matriks instance membawa tinggi yang dicetak barisnya',
    melenceng,
    0
  );
  const tertinggi = peta.baris.filter((b) => b.tertinggi).length;
  cek('jumlah batang rosso sama dengan baris berpenanda puncak', peta.peta?.merah, tertinggi);
  const puncak = Math.max(...peta.baris.map((b) => b.bintang));
  cek(
    'batang puncak memenuhi bingkai dan yang lain di bawahnya',
    peta.baris.every((b) => (b.bintang === puncak ? Math.abs(b.tinggi - 2) < 0.006 : b.tinggi <= 2)),
    true
  );
  cek('nol bintang tetap nol tinggi, tidak diberi stub', peta.baris.every((b) => (b.bintang === 0 ? b.tinggi === 0 : b.tinggi > 0)), true);
} else {
  cek('tanpa data GitHub halaman menandai keadaan kosong', peta.kosong, true);
  cek('tanpa data GitHub tidak ada instance', !!peta.peta, false);
  cek('tanpa data GitHub tidak ada draw call', peta.render?.calls, 0);
}
cek('/peta tidak melempar error', galatPeta.length, 0);
cek('sitemap memuat /peta', sm.teks.includes('/peta'), true);
cek('/baca menautkan /peta', tautanPanggung.includes('/peta'), true);
await foto(pagePeta, '11-peta');

// ── 12 · /iris: navigasi diafragma, dan shader panggung tetap tertutup ──
const bacaIris = (p) =>
  p.evaluate(() => {
    const teks = [...document.querySelectorAll('[data-iris-teks]')].map((el) => ({
      sisi: el.getAttribute('data-iris-teks'),
      opacity: getComputedStyle(el).opacity,
      huruf: (el.textContent || '').trim().length,
    }));
    const angka = (sel) => Number(document.querySelector(sel)?.textContent || NaN);
    return {
      teks,
      sisi: document.querySelector('[data-iris-sisi]')?.textContent?.trim() ?? null,
      tutup: angka('[data-iris-tutup]'),
      buka: angka('[data-iris-buka]'),
      nilai: Number(document.querySelector('[data-iris-slider]')?.value ?? NaN),
      role: document.querySelector('[data-iris-slider]')?.getAttribute('type') ?? null,
      iris: window.__iris ? { ...window.__iris } : null,
      render: window.__render ? { calls: window.__render.calls, frame: window.__render.frame } : null,
    };
  });

const pageIris = await browser.newPage();
const galatIris = [];
pageIris.on('pageerror', (e) => galatIris.push(String(e)));
await pageIris.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
const rIris = await pageIris.goto(`${FE}/iris`, { waitUntil: 'domcontentloaded', timeout: 45000 });
cek('/iris menjawab 200', rIris.status(), 200);
await jeda(1600);

// Rata-rata luma sebuah klip, diukur dari screenshot sungguhan yang didekode halaman sendiri.
// Yang ditagih: kertas diafragma benar-benar menutupi huruf, bukan hanya mengirim angka ke
// uniform. Sudut kiri-atas bingkai dipilih karena pada tutup 0,5 ia pasti berada di luar
// diafragma, sementara hurufnya memang tinggal di sana.
const wadahIris = await pageIris.evaluate(() => {
  const r = document.querySelector('[data-iris-wadah]')?.getBoundingClientRect();
  return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
});
cek('bingkai diafragma punya wilayah terukur', !!wadahIris, true);
// Klip dihitung ulang tiap pengukuran dan dalam koordinat DOKUMEN: memfokus slider bisa
// menggulir halaman, dan koordinat viewport yang dipakai di dua waktu berbeda akan sampling
// dua tempat yang berbeda — lalu yang merah adalah gerbangnya, bukan diafragmanya.
const lumaSudut = async () => {
  const klip = await pageIris.evaluate(() => {
    const el = document.querySelector('[data-iris-wadah]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: r.x + window.scrollX,
      y: r.y + window.scrollY,
      width: r.width * 0.2,
      height: r.height * 0.25,
    };
  });
  if (!klip) return NaN;
  const b64 = await pageIris.screenshot({ clip: klip, encoding: 'base64' });
  return pageIris.evaluate(async (data) => {
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = `data:image/png;base64,${data}`;
    });
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let jumlah = 0;
    for (let i = 0; i < d.length; i += 4) jumlah += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    return jumlah / (d.length / 4);
  }, b64);
};
// Sudut yang sama diukur tiga kali: terbuka, setengah, dan tertutup penuh. Angka penutup
// penuh jadi kertas rujukan — bingkainya punya garis tepi dan warna halaman sendiri, jadi
// yang ditagih adalah "setengah = sekertas penutup penuh", bukan konstanta yang dikira-kira.
const lumaTerbuka = await lumaSudut();
console.log('iris-luma', lumaTerbuka.toFixed(1));
cek('di ujung terbuka huruf di sudut ikut tergambar', lumaTerbuka < 240, true);

const irisAwal = await bacaIris(pageIris);
console.log('iris-awal', JSON.stringify(irisAwal.iris), JSON.stringify(irisAwal.teks));
cek('diafragma hanya satu draw call', irisAwal.render?.calls, 1);
cek('verifier diafragma terpasang', !!irisAwal.iris, true);
cek('mulai di ujung terbuka, sisi A', [irisAwal.iris?.tutup, irisAwal.iris?.sisi].join('|'), '0|A');
cek(
  'navigasinya benar-benar slider, bukan div berpakaian',
  irisAwal.role,
  'range'
);
cek('dua teks ada di DOM saat halaman baru terbuka', irisAwal.teks.length, 2);
cek(
  'dua-duanya berisi paragraf, bukan kerangka kosong',
  irisAwal.teks.every((t) => t.huruf > 40),
  true
);
cek('teks A terlihat, teks B belum', [irisAwal.teks[0]?.opacity, irisAwal.teks[1]?.opacity].join('|'), '1|0');

// Naikkan 25 langkah (0,25): diafragma masih menutup setengah, A separuh terlihat.
await pageIris.focus('[data-iris-slider]');
for (let i = 0; i < 25; i++) await pageIris.keyboard.press('ArrowRight');
await jeda(700);
const irisSetengah = await bacaIris(pageIris);
console.log('iris-0.25', JSON.stringify(irisSetengah.iris), JSON.stringify(irisSetengah.teks));
cek('posisi 0,25 masih di sisi A', irisSetengah.iris?.sisi, 'A');
cek('tutup mengikuti rumus 1 - |2x - 1|', irisSetengah.iris?.tutup, 0.5);
cek(
  'radius seragam = bukaan yang dicetak DOM × jari maksimum',
  Math.abs(
    (irisSetengah.iris?.buka ?? -1) - (irisSetengah.iris?.jariMaks ?? 0) * (1 - irisSetengah.tutup)
  ) < 0.002,
  true
);
cek(
  'DOM menyebut tutup yang sama dengan uniform',
  irisSetengah.tutup,
  Number(irisSetengah.iris?.tutup?.toFixed(2))
);
cek('teks A ikut separuh', irisSetengah.teks[0]?.opacity, '0.5');
const lumaSetengah = await lumaSudut();
console.log('iris-luma-0.25', lumaSetengah.toFixed(1), 'tutup', irisSetengah.iris?.tutup);

// Tepat di tengah: tertutup penuh, kedua teks sedang tidak terlihat — tapi tetap ada.
for (let i = 0; i < 25; i++) await pageIris.keyboard.press('ArrowRight');
await jeda(700);
const irisTutup = await bacaIris(pageIris);
cek('di tengah sumbu diafragma menutup penuh', irisTutup.iris?.tutup, 1);
cek('radius seragam turun ke nol', irisTutup.iris?.buka, 0);
cek(
  'tepi potong terjadi dalam keadaan tertutup, bukan di atas dua eksposur',
  [irisTutup.teks[0]?.opacity, irisTutup.teks[1]?.opacity].join('|'),
  '0|0'
);
cek('kedua teks tetap ada di DOM saat tertutup', irisTutup.teks.every((t) => t.huruf > 40), true);
const lumaKertas = await lumaSudut();
console.log('iris-luma-tutup', lumaKertas.toFixed(1));
cek(
  'kertas diafragma menutupi huruf di sudut, bukan hanya angka di uniform',
  lumaSetengah > lumaTerbuka + 5 && Math.abs(lumaSetengah - lumaKertas) < 2,
  true
);
await foto(pageIris, '12b-iris-tutup');

// Lanjut ke ujung kanan: B terbuka, A hilang, dan angka DOM = angka uniform.
for (let i = 0; i < 50; i++) await pageIris.keyboard.press('ArrowRight');
await jeda(700);
const irisUjung = await bacaIris(pageIris);
console.log('iris-ujung', JSON.stringify(irisUjung.iris), JSON.stringify(irisUjung.teks));
cek('ujung kanan adalah sisi B', irisUjung.iris?.sisi, 'B');
cek('di ujung sumbu diafragma terbuka lagi', irisUjung.iris?.tutup, 0);
cek('hanya teks B yang terlihat di ujung', [irisUjung.teks[0]?.opacity, irisUjung.teks[1]?.opacity].join('|'), '0|1');
cek('DOM menyebut sisi yang sama dengan kanvas', irisUjung.sisi, 'B');

// Gerbang sumber: rute ini tidak boleh menyentuh mesin panggung. Komentar dokumentasinya
// Justru menyebut nama holder itu, jadi yang dibuang dulu baru yang dicocokkan.
const sumberIris = [
  'nextjs-frontend/src/app/iris/IrisHidup.tsx',
  'nextjs-frontend/src/app/iris/page.tsx',
  'nextjs-frontend/src/components/Three/panggung/KurvaIris.tsx',
]
  .map((f) => readFileSync(new URL(f, AKAR), 'utf8'))
  .join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/[^\n]*/g, '');
cek(
  '/iris tidak mengimpor material panggung atau holder sapuannya',
  /chiaroscuroMaterial|usePanggung|SAPU_IRIS|SILANG_MOBIL/.test(sumberIris.replace(/\/\/[^\n]*$/gm, '')),
  false
);

await pageIris.evaluate(() => window.scrollTo(0, 0));
await jeda(5200);
const irisDiam1 = await bacaIris(pageIris);
await jeda(3000);
const irisDiam2 = await bacaIris(pageIris);
cek(
  'nol frame saat pengunjung diam di /iris',
  (irisDiam2.render?.frame ?? -1) - (irisDiam1.render?.frame ?? -1),
  0
);
cek('/iris tidak melempar error', galatIris.length, 0);
cek('sitemap memuat /iris', sm.teks.includes('/iris'), true);
cek('/baca menautkan /iris', tautanPanggung.includes('/iris'), true);
await foto(pageIris, '12-iris');

await browser.close();
for (const h of hasil) console.log(`${h.ok ? 'LULUS' : 'GAGAL'}  ${h.nama}: dapat ${h.dapat}, harus ${h.harus}`);
const gagal = hasil.filter((h) => !h.ok).length;
console.log(`total ${hasil.length} gerbang, ${gagal} gagal`);
if (gagal) console.log('pageerror arsip:', galatArsip.slice(0, 3), 'baca:', galatBaca.slice(0, 3));
process.exit(gagal ? 1 : 0);
