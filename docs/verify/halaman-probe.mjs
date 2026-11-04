// Verifikasi dua lorong rincian di belakang halaman editorial: /tulisan (index repo) dan
// /statistik (telemetri proses). Yang ditagih di sini bukan "halamannya ada", tapi empat hukum
// yang sudah berlaku di halaman utama dan tidak boleh dilanggar oleh halaman baru:
//
//   1. ANTI-KARANGAN — setiap angka di /tulisan harus ada di respons /api/github-repos, pada
//      baris yang sama. Halaman itu boleh kurang, tidak boleh lebih.
//   2. TIDAK ADA BENTUK TANPA ANGKA — /statistik harus tetap berdiri saat sumbernya diam:
//      nol bilah, dan setiap sel ukuran tercetak "—".
//   3. ANGKA DARI RESPONS YANG DIBACA — sel di /statistik harus cocok dengan payload yang benar-
//      benar dikonsumsi halaman itu, bukan dengan fetch tambahan.
//   4. IDENTITAS MESIN BUKAN UNTUK PUBLIK — heap, runtime, komit, dan ping postgres null di wire
//      bagi yang tidak membawa sesi admin sah (bagian 2b), dan "—" di halaman bagi pengunjung.
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

// Daftar rute tidak disalin ke probe — probe membaca tabel yang dipakai HUD dan hub
// (src/lib/rute.ts). Yang ditagih jadi "kedua baris menunjuk tabel yang sama", bukan
// "keduanya cocok dengan string yang diketik tangan di file ini".
const RUTE_SRC = readFileSync(
  new URL('../../nextjs-frontend/src/lib/rute.ts', import.meta.url),
  'utf8'
);
const ruteTerurut = (nama) =>
  [
    ...RUTE_SRC.matchAll(new RegExp(`^export const ${nama}: [^=]+= \\[([\\s\\S]*?)\\n\\];`, 'gm')),
  ]
    .flatMap((m) => [...m[1].matchAll(/href: "([^"]+)"/g)].map((h) => h[1].replace(/^\//, '')))
    .sort();
const RUTE_TEKNIS = ruteTerurut('RUTE_TEKNIS');
const RUTE_PROFIL = ruteTerurut('RUTE_PROFIL');

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

// ── 1 · /tulisan: angkanya harus datang dari sumber yang sama dengan halaman utama ──
const pageBaca = await browser.newPage();
await pageBaca.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
const galatBaca = [];
pageBaca.on('pageerror', (e) => galatBaca.push(String(e).slice(0, 200)));
const respBaca = await pageBaca.goto(`${FE}/tulisan`, { waitUntil: 'domcontentloaded', timeout: 45000 });
await jeda(3000);
cek('/tulisan menjawab 200', respBaca.status(), 200);

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
    linkArsip: !!document.querySelector('a[href="/statistik"]'),
  };
});
console.log('baca     ', JSON.stringify({ judul: baca.judul, baris: baca.baris.length, contoh: baca.baris[0] }));

cek('canonical /tulisan menyebut /tulisan', (baca.canonical ?? '').endsWith('/tulisan'), true);
cek('og:url /tulisan menyebut /tulisan', (baca.og ?? '').endsWith('/tulisan'), true);
cek('/tulisan tidak mencetak tanggal yang tidak ada di sumbernya', baca.tanggal, 0);

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
    nama: 'setiap baris /tulisan cocok dengan respons API-nya',
    ok: selisih.length === 0,
    dapat: selisih.length ? selisih.slice(0, 3).join(' ;; ') : 'semua baris cocok',
    harus: '0 selisih',
  });
  cek('kolom bintang terbaca sebagai angka, bukan teks hiasan', baca.baris.every((b) => Number.isFinite(b.bintang)), true);
} else {
  hasil.push({ nama: 'setiap baris /tulisan cocok dengan respons API-nya', ok: false, dapat: 'API tidak menjawab', harus: '0 selisih' });
}
cek('/tulisan menawarkan jalan ke /statistik', baca.linkArsip, true);

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

// ── 2 · /statistik hidup: angka yang dilukis datang dari respons yang benar-benar dibaca ──
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
const respArsip = await pageArsip.goto(`${FE}/statistik`, { waitUntil: 'domcontentloaded', timeout: 45000 });
await jeda(6000);
cek('/statistik menjawab 200', respArsip.status(), 200);

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

cek('HUD /statistik membaca sumbernya', hidup.status, 'hidup');
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
cek('/tulisan tidak melempar error saat dimuat', galatBaca.length, 0);
await foto(pageArsip, '02-arsip-hidup');

// ── 2b · diagnostik mesin tidak ikut mengalir ke yang tidak bersesi admin ──
//
// /api/telemetry adalah satu-satunya rute publik yang tahu versi runtime, besarnya heap, komit
// yang melayani, dan hasil ping postgres — semuanya identitas mesin, bukan angka untuk pengunjung.
// Yang ditagih di sini adalah isi WIRE-nya, bukan cuma yang tercetak: field itu wajib null di
// respons, sehingga tidak ada penampil yang bisa diam-diam mulai memakainya lagi.
//
// Arah sebaliknya (sesi sah ⇒ field terisi) tidak bisa ditagih dari probe ini: ia butuh kredensial
// admin dan backend nyata, sementara probe berjalan tanpa keduanya. Gerbang di bawah karena itu
// mengunci SIFAT yang bisa dirusak tanpa kredensial — token sesi karangan sendiri tidak membuka
// apa pun — dan penilaian sisanya tetap dikerjakan backend (guard NoRoute di go-backend: 401
// untuk token mati, 404 {"error":"Not found"} untuk token sah).
const SUMBER_ROTE = readFileSync(
  new URL('../../nextjs-frontend/src/app/api/telemetry/route.ts', import.meta.url),
  'utf8'
);
// Nama cookie tidak diketik tangan di sini: probe membacanya dari rute yang sama yang memakainya.
const namaKukiSesi = SUMBER_ROTE.match(/const NAMA_COOKIE_SESI = "([^"]+)"/)?.[1] ?? '';
cek('rute membaca cookie sesi backend, bukan nama karangan probe', namaKukiSesi, 'porto_sesi');

const FIELD_MESIN = ['heapMb', 'gitCommit', 'runtime.node', 'runtime.next', 'backend.db'];
const isi = (obj, jalur) => jalur.split('.').reduce((v, k) => v?.[k], obj);

const bacaWire = async (kuki) => {
  const res = await fetch(`${FE}/api/telemetry`, {
    headers: { 'cache-control': 'no-store', ...(kuki ? { cookie: kuki } : {}) },
  });
  return { status: res.status, body: await res.json().catch(() => null) };
};

const anonim = await bacaWire(null);
cek('GET /api/telemetry tanpa sesi tetap menjawab', anonim.status, 200);
for (const jalur of FIELD_MESIN) {
  cek(`${jalur} tidak dikirim ke yang tidak bersesi`, isi(anonim.body, jalur), null);
}
// Yang publik harus tetap terukur — kalau semuanya jadi null, gerbang di atas lolos karena
// endpointnya mati, bukan karena datanya dibatasi.
cek('latency tetap terukur tanpa sesi', Number.isFinite(anonim.body?.latencyMs), true);
cek('status tetap terisi tanpa sesi', typeof anonim.body?.status === 'string' && !!anonim.body.status, true);
cek('reachability backend tetap dijawab tanpa sesi', typeof anonim.body?.backend?.reachable === 'boolean', true);
cekMin('sampel latency tetap dikirim ke publik', anonim.body?.latencySamples?.length ?? 0, 1);
// rttMs sengaja tetap publik (itu bahan garis arsitektur di halaman): satu-satunya sebab ia null
// adalah backend yang memang tidak terjawab — bukan karena ikut dibatasi.
cek(
  'rtt backend null hanya kalau backend tidak terjawab',
  anonim.body ? anonim.body.backend.reachable === (anonim.body.backend.rttMs !== null) : false,
  true
);

// Token JWT palsu yang bentuknya meyakinkan: pembukanya bukan siapa pun yang bisa menempel kuki.
const tokenPalsu =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzk2MDAwMDAwLCJleHAiOjE5OTYwMDAwMDB9.' +
  'sAnd1eZx0kQ9mQ8pY7uT2vB3nR5cD4fE6gH8jK0lM2o';
const palsu = await bacaWire(`${namaKukiSesi}=${tokenPalsu}`);
for (const jalur of FIELD_MESIN) {
  cek(`${jalur} tetap tertutup untuk token karangan`, isi(palsu.body, jalur), null);
}
cek(
  'token palsu tidak mengubah verdict publik',
  anonim.body?.status === palsu.body?.status,
  true
);

// Efeknya di halaman: sel mesin di /statistik harus tercetak "—" untuk pengunjung, sementara
// hop dan latency tetap angka. Sebelum pemisahan ini sel 'node' terisi versi Node proses server.
const SEL_MESIN = {
  heapMb: 'heap',
  gitCommit: 'commit',
  'runtime.node': 'node',
  'runtime.next': 'next',
  'backend.db': 'backend-db',
};
const bocor = Object.entries(SEL_MESIN)
  .filter(([, sel]) => hidup.sel[sel] !== '—')
  .map(([jalur, sel]) => `${sel}=${hidup.sel[sel]} padahal wire ${jalur} null`);
hasil.push({
  nama: 'HUD publik tidak mengarang angka untuk field yang tidak dikirim',
  ok: bocor.length === 0,
  dapat: bocor.length ? bocor.join(' | ') : 'semua "—"',
  harus: '0 sel berisi angka',
});

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
await pageNull.goto(`${FE}/statistik`, { waitUntil: 'domcontentloaded', timeout: 45000 });
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
await pageSenyap.goto(`${FE}/statistik`, { waitUntil: 'domcontentloaded', timeout: 45000 });
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
  // Semua jalan masuk rute dari header, kecuali /api/cv (kertas render, bukan halaman).
  const tautan = [...document.querySelectorAll('header a[href^="/"]:not([href="/"],[href^="/api/"])')];
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
    daftar: [...new Set(tautan.map((t) => t.getAttribute('href').replace(/^\//, '')))].sort().join(','),
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
cek(
  'jumlah tautan masuk HUD = pil profil + satu jalan ke hub',
  ukurMasuk.jumlahTautan,
  RUTE_PROFIL.length + 1
);
cek(
  'daftar tautan masuk HUD = isi RUTE_PROFIL plus anchor hub',
  ukurMasuk.daftar,
  [...RUTE_PROFIL, '#chapter-hub'].sort().join(',')
);
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

// ── 5c · bab tidak boleh terganjel di bawah kolom kiri HUD ──
// HUD fixed dan kolom kiri-atasnya bertambah tinggi tiap kali jalan masuk baru dipasang.
// Bab penutup dulu menanggung ini dengan padding keras (pt-32 sm:pt-36) yang suatu hari
// ketinggalan. Sekarang kolom menerbitkan --hud-atas dan bab membacanya — jadi yang ditagih
// di sini geometri, bukan janji: untuk tiap bab, saat puncaknya mendarat di tepi atas
// viewport, anak-flow-pertamanya harus tetap >= batas bawah kolom + 8px, dan tiap tautan
// header harus tetap mengembalikan dirinya sendiri lewat elementFromPoint.

// Latar rosso bab penutup pernah tinggal opacity-0 di tab lama sementara HUD-nya sudah
// pindah ke gaya rosso: teks putih di atas kertas. Di posisi parkir bab 3 sekarang lapisan
// itu wajib mati, dan menyala penuh begitu bab 4 diparkir — diukur dari computed style,
// bukan dari janji kode.
const bacaRosso = () =>
  pageUtama.evaluate(() => {
    const l = document.querySelector('[data-latar-paddock]');
    return l ? getComputedStyle(l).opacity : 'tanpa-lapisan';
  });
cek('di bab 3 lapisan rosso tetap mati', await bacaRosso(), '0');
const ganjel = await pageUtama.evaluate(() => {
  const hud = document.querySelector('[data-hud-kolom]');
  const akar = document.querySelector('header');
  const tautan = [...document.querySelectorAll('header a')];
  const bab = [...document.querySelectorAll('[id^="chapter-"]')].map((s) => {
    const asal = window.scrollY;
    window.scrollTo(0, Math.max(0, Math.round(s.getBoundingClientRect().top + window.scrollY)));
    const hudBawah = hud ? hud.getBoundingClientRect().bottom : 0;
    // Anak pertama yang benar-benar mengalir: kartu portal dan latar dilukis absolute,
    // mereka memang dirancang untuk berada di bawah teks.
    const anak = [...s.children].find((e) => {
      const p = getComputedStyle(e).position;
      return p !== 'absolute' && p !== 'fixed';
    });
    const top = anak ? anak.getBoundingClientRect().top : Infinity;
    const kena = tautan.map((t) => {
      const r = t.getBoundingClientRect();
      const h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return t === h || t.contains(h) || (!!h && h.contains(t));
    });
    window.scrollTo(0, asal);
    return {
      id: s.id,
      hudBawah: Math.round(hudBawah),
      top: Math.round(top),
      aman: top >= hudBawah + 8,
      tautanTertembus: kena.every(Boolean),
    };
  });
  return {
    ada: !!hud && !!akar,
    variabel: getComputedStyle(document.documentElement).getPropertyValue('--hud-atas').trim(),
    dicetak: akar?.getAttribute('data-hud-atas'),
    bab,
  };
});
console.log('ganjel   ', JSON.stringify(ganjel));
cek('kolom HUD menerbitkan --hud-atas yang terbaca', /^[0-9]+px$/.test(ganjel.variabel), true);
cek('data-hud-atas mencetak angka yang sama dengan variabelnya', ganjel.dicetak, ganjel.variabel.replace('px', ''));
cek('lima section ikut diuji gerbang ganjelan', ganjel.bab.length, 5);
cek(
  'tidak ada bab yang anak pertamanya terganjel di bawah kolom HUD',
  ganjel.bab.filter((b) => !b.aman).map((b) => `${b.id} top=${b.top} hud=${b.hudBawah}`).join(' | '),
  ''
);
cek(
  'setiap tautan header tertembak hit-test-nya sendiri di tiap bab',
  ganjel.bab.every((b) => b.tautanTertembus),
  true
);
// Parkir sedikit ke dalam bab penutup, tunggu transisi 700ms lewat, lalu tagih nyala.
await pageUtama.evaluate(() => {
  const s = document.getElementById('chapter-04');
  window.scrollTo(0, Math.round(s.getBoundingClientRect().top + window.scrollY) + 40);
});
await jeda(1600);
cek('di bab penutup lapisan rosso menyala penuh', await bacaRosso(), '1');
await foto(pageUtama, '05b-bab-tanpa-ganjelan');

// ── 5d · pita legibilitas HUD ──
// Header HUD adalah lapisan fixed di atas konten yang berjalan, jadi huruf bab suatu saat
// akan lewat di bawahnya. Yang ditagih di sini bukan "tidak ada tumpang tindih kotak" —
// itu tidak bisa terjadi pada lapisan overlay — melainkan bahwa SETIAP huruf HUD duduk di
// dalam pita yang menutup konten di belakangnya. Selama itu benar, tidak ada dua tinta yang
// pernah berbagi piksel yang sama di layar mana pun. Pita diukur pada tiga tinggi viewport
// karena pita bawah dihitung dari innerHeight, bukan dari isi bar-nya.
// Dipakai ulang untuk tiap ukuran viewport: fungsi ini dieksekusi di dalam halaman, jadi
// ia harus berdiri sendiri tanpa closure dari file verifier.
function pitaDiUjung() {
  const akar = document.querySelector('header');
  const gaya = getComputedStyle(document.documentElement);
  const batasAtas = parseFloat(gaya.getPropertyValue('--hud-atas'));
  const batasBawah = innerHeight - parseFloat(gaya.getPropertyValue('--hud-bawah'));
  const daun = [];
  const jalan = (n) => {
    for (const e of n.children) {
      const t = (e.textContent || '').trim() || (e.placeholder || '').trim();
      if (e.children.length === 0 && t) {
        const r = e.getBoundingClientRect();
        if (r.width > 6 && r.height > 6) daun.push({ t, r });
      } else jalan(e);
    }
  };
  jalan(akar);
  return daun
    .filter((d) => !(d.r.bottom <= batasAtas + 1 || d.r.top >= batasBawah - 1))
    .map((d) => `${d.t.slice(0, 16)}@${Math.round(d.r.top)}-${Math.round(d.r.bottom)}`);
}

const pita = await pageUtama.evaluate(() => {
  const akar = document.querySelector('header');
  const gaya = getComputedStyle(document.documentElement);
  const atas = parseFloat(gaya.getPropertyValue('--hud-atas'));
  const bawah = parseFloat(gaya.getPropertyValue('--hud-bawah'));
  const daun = [];
  const jalan = (n) => {
    for (const e of n.children) {
      const t = (e.textContent || '').trim() || (e.placeholder || '').trim();
      if (e.children.length === 0 && t) {
        const r = e.getBoundingClientRect();
        if (r.width > 6 && r.height > 6) daun.push({ t, r });
      } else jalan(e);
    }
  };
  jalan(akar);
  const batasAtas = atas;
  const batasBawah = innerHeight - bawah;
  return {
    variabelAtas: gaya.getPropertyValue('--hud-atas').trim(),
    variabelBawah: gaya.getPropertyValue('--hud-bawah').trim(),
    dicetakAtas: akar?.getAttribute('data-hud-atas'),
    dicetakBawah: akar?.getAttribute('data-hud-bawah'),
    jumlahPita: document.querySelectorAll('[data-hud-pita], [data-hud-pita-bawah]').length,
    zPita: (() => {
      const p = document.querySelector('[data-hud-pita]');
      return p ? getComputedStyle(p).zIndex : 'tanpa-pita';
    })(),
    pitaMenutup: (() => {
      const p = document.querySelector('[data-hud-pita]');
      if (!p) return false;
      const r = p.getBoundingClientRect();
      return r.top === 0 && r.height >= atas;
    })(),
    hurufLepas: daun
      .filter((d) => !(d.r.bottom <= batasAtas + 1 || d.r.top >= batasBawah - 1))
      .map((d) => `${d.t.slice(0, 16)}@${Math.round(d.r.top)}-${Math.round(d.r.bottom)}`),
    hurufDiuji: daun.length,
  };
});
cek('--hud-atas dan --hud-bawah dua-duanya terbit sebagai angka px', /^\d+px$/.test(pita.variabelAtas) && /^\d+px$/.test(pita.variabelBawah), true);
cek('data-hud-bawah mencetak angka yang sama dengan variabelnya', pita.dicetakBawah, pita.variabelBawah.replace('px', ''));
cek('dua pita legibilitas terpasang di header', pita.jumlahPita, 2);
cek(
  'pita melukis DI BAWAH tinta HUD, bukan di atasnya',
  pita.zPita,
  '-1'
);
cek('pita atas menutupi seluruh tinggi kolom HUD', pita.pitaMenutup, true);
cek('di 1440x900 tidak ada huruf HUD yang keluar dari pita', pita.hurufLepas.join(' | '), '');

for (const [lebar, tinggi] of [
  [1100, 620],
  [1920, 950],
]) {
  await pageUtama.setViewport({ width: lebar, height: tinggi, deviceScaleFactor: 1 });
  await jeda(900);
  const ulang = await pageUtama.evaluate(pitaDiUjung);
  cek(`di ${lebar}x${tinggi} tidak ada huruf HUD yang keluar dari pita`, ulang.join(' | '), '');
}
await pageUtama.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await jeda(700);
await foto(pageUtama, '05c-pita-legibilitas');

// ── 5e · judul yang bergerak sendiri menyisakan celah untuk tetangganya ──
// Elemen [data-paralaks] menggeser dirinya mengikuti pointer; tetangganya mengalir diam.
// Ini kelas bug yang membuat baris kedua "SYSTEMS ARCHITECTURE" mendarat di atas paragrafnya
// sendiri di bab 03: margin yang cukup untuk huruf yang EMAS tidak cukup untuk huruf yang
// meluncur 22px. Yang ditagih bukan "tidak ada tumpang tindih kotak" — tumpang tindish pada
// sandwich bab 01 justru desainnya — melainkan: geser sejauh apa pun tidak boleh menyentuh
// tetangga yang di keadaan DIAM tidak tersentuh. Kotak diam direkonstruksi dari kotak
// sekarang dikurangi geseran yang sedang tertulis, jadi tidak perlu posisi pointer dasar.
// Tinta juga dikembangkan ke tinggi hurufnya: leading < 1 membuat kotak baris lebih pendek
// dari tintanya, dan selisih itulah yang pertama kali bersentuhan di layar.
function celahJudul() {
  const daun = [];
  const jalan = (n) => {
    for (const e of n.children) {
      const t = (e.textContent || '').trim();
      if (e.children.length === 0 && t) {
        const r = e.getBoundingClientRect();
        if (r.width > 6 && r.height > 6) daun.push({ el: e, t, r });
      } else jalan(e);
    }
  };
  const sentuh = (a, b) => !(a.right <= b.left + 1 || a.left >= b.right - 1 || a.bottom <= b.top + 1 || a.top >= b.bottom - 1);
  const keluar = [];
  for (const judul of document.querySelectorAll('[data-paralaks]')) {
    const bab = judul.closest('section');
    if (!bab) continue;
    const gaya = getComputedStyle(judul);
    const geserX = parseFloat(gaya.getPropertyValue('--tipografi-x')) || 0;
    const geserY = parseFloat(gaya.getPropertyValue('--tipografi-y')) || 0;
    const kini = judul.getBoundingClientRect();
    const diam = {
      top: kini.top - geserY,
      bottom: kini.bottom - geserY,
      left: kini.left - geserX,
      right: kini.right - geserX,
    };
    const lebih = Math.max(0, (parseFloat(gaya.fontSize) - kini.height) / 2);
    const tintaDiam = { top: diam.top - lebih, bottom: diam.bottom + lebih, left: diam.left, right: diam.right };
    const tintaJalan = { top: tintaDiam.top + geserY, bottom: tintaDiam.bottom + geserY, left: tintaDiam.left + geserX, right: tintaDiam.right + geserX };
    daun.length = 0;
    jalan(bab);
    for (const d of daun) {
      if (d.el === judul || judul.contains(d.el)) continue;
      if (sentuh(d.r, tintaDiam)) continue;
      if (sentuh(d.r, tintaJalan)) {
        keluar.push(`${bab.id} ${judul.tagName} «${judul.textContent.trim().slice(0, 12)}» × «${d.t.slice(0, 16)}» geser=${geserY.toFixed(1)}px`);
      }
    }
  }
  return keluar;
}

const sudutAyunan = [
  [30, 40],
  [1410, 40],
  [30, 860],
  [1410, 860],
];
// Tiga tinggi viewport karena celahnya yang bergerak, bukan geserannya: kotak baris
// ditentukan oleh wrap teks, dan nama raksasa bab 01 baru menyentuh baris MODE di layar
// pendek. Pointer diparkir di tengah setelah selesai supaya frame berikutnya tenang.
const temuanAyunan = new Set();
for (const [lebar, tinggi] of [
  [1440, 900],
  [1100, 620],
  [1920, 950],
]) {
  await pageUtama.setViewport({ width: lebar, height: tinggi, deviceScaleFactor: 1 });
  await jeda(900);
  for (const [x, y] of sudutAyunan) {
    await pageUtama.mouse.move(Math.min(x, lebar - 10), Math.min(y, tinggi - 10), { steps: 4 });
    await jeda(700);
    for (const t of await pageUtama.evaluate(celahJudul)) temuanAyunan.add(`${lebar}x${tinggi} ${t}`);
  }
}
await pageUtama.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await pageUtama.mouse.move(720, 450, { steps: 2 });
await jeda(500);
cek(
  'judul yang bergerak sendiri tidak menabrak tetangga yang diam di tiap sudut pointer dan tiap tinggi layar',
  [...temuanAyunan].join(' | '),
  ''
);

// ── 5f · hub akses: lima node, satu hukum diam ──
// Hub adalah section aliran dokumen antara bab 02 dan 03 dengan PanggungKecil sendiri.
// Yang ditagih: kelengkapan menunya (lima node teknis, href sama dengan RUTE_TEKNIS di
// src/lib/rute.ts), mobilnya benar-benar menoleh ke node yang ditunjuk, dan kanvas baru ini
// tidak merusak invariant "nol frame saat diam". Counter frame PengukurRender dipakai bersama
// kedua kanvas, jadi satu selisih menagih keduanya sekaligus.
// Parkir harus lewat batas portal hub, bukan sebelum puncak section: di dalam pita perpindahan
// kanvas global memang wajib hidup — ia menggeser kartu — dan angka frame jendela diam akan
// menagih gerak yang benar itu sebagai pelanggaran.
// Margin 262 px (bukan 60 seperti waktu panggung masih kotak hitam) dipilih karena geometri,
// terukur di 1440x900: puncak stage duduk 462 px di dalam section, stage 558 px, dan pita
// legibilitas bawah HUD menutup 785..900. Di +60 dua node bawah (POTRET, TRANSISI) mendarat
// di dalam pita itu; di +262 stage utuh berada di pita bersih 160..785. Kotak hitam yang dulu
// membuat parkir dalam itu terlihat seperti kanvas bocor sudah tidak ada, jadi tidak ada lagi
// yang perlu ditakuti dari section yang dinaikkan.
await pageUtama.evaluate(() => {
  const el = document.getElementById('chapter-hub');
  window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + 262);
});
await jeda(4500); // aset glb baru diminta saat section mendekat (rootMargin 60%)

const hub = await pageUtama.evaluate(() => {
  const seksi = document.getElementById('chapter-hub');
  const urut = [...document.querySelectorAll('main section')].map((s) => s.id);
  const node = [...document.querySelectorAll('[data-hub-node]')].filter((e) => e.offsetParent !== null);
  const pr = seksi?.querySelector('[data-portal="5"]')?.getBoundingClientRect();
  const panggung = seksi?.querySelector('[data-hub-panggung]')?.getBoundingClientRect();
  // Pita legibilitas bawah: satu-satunya lapisan fixed header yang menempel ke tepi bawah
  // viewport. Dicari lewat geometri + class-nya, bukan lewat angka yang dikira-kira.
  const pita = [...document.querySelectorAll('header div')]
    .filter((e) => {
      const r = e.getBoundingClientRect();
      return /pointer-ev/.test(String(e.className)) && r.height > 40 && Math.abs(r.bottom - innerHeight) <= 2;
    })
    .map((e) => Math.round(e.getBoundingClientRect().top));
  const hudAtas = Math.round(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hud-atas')) || 0);
  return {
    antara:
      urut.indexOf('chapter-02') + 1 === urut.indexOf('chapter-hub') &&
      urut.indexOf('chapter-hub') + 1 === urut.indexOf('chapter-03'),
    jumlah: node.length,
    daftar: [...new Set(node.map((e) => e.getAttribute('href').replace(/^\//, '')))].sort().join(','),
    kanvas: !!seksi?.querySelector('[data-panggung-kecil]'),
    // Portal adalah jangkar viewport sedangkan panggung mengalir di dokumen: satu lompatan
    // gulir menggeser stage 996 px sementara tingginya 520 px, jadi tidak ada kotak fixed yang
    // bisa tertutup panggung di sepanjang rentang parkir (terukur). Yang bisa ditagih adalah
    // kartu tidak pernah menabrak isi hub: kotaknya duduk di kiri luar viewport.
    portalLuar: !!pr && pr.right <= 0,
    panggung: panggung ? { atas: Math.round(panggung.top), bawah: Math.round(panggung.bawah) } : null,
    pitaAtas: pita.length ? Math.min(...pita) : null,
    hudAtas,
    baca: window.__hub ?? null,
  };
});
console.log('hub      ', JSON.stringify(hub));
cek('hub akses duduk antara bab 02 dan 03', hub.antara, true);
cek('node menu hub seukuran daftar RUTE_TEKNIS', hub.jumlah, RUTE_TEKNIS.length);
cek(
  'node hub menunjuk persis rute teknis yang terdaftar di src/lib/rute.ts',
  hub.daftar,
  RUTE_TEKNIS.join(',')
);
cek('panggung hub adalah island kanvas sendiri', hub.kanvas, true);
cek('kartu potret diparkir di luar isi hub, bukan di atasnya', hub.portalLuar, true);
// Setelah kotak hitam dihapus, yang membuat panggung terbaca sebagai objek di atas kertas —
// bukan sebagai video yang menempel — adalah bahwa ia duduk UTUH di pita bersih: di bawah
// kolom HUD dan di atas pita legibilitas. Di +60 dulu dua node bawah mendarat di dalam pita
// itu (terukur: pita mulai 785, node 809), karena itu parkir dipindah ke +262 dan ditagih.
cek(
  'panggung hub duduk di bawah kolom HUD saat parkir',
  !!hub.panggung && hub.panggung.atas >= hub.hudAtas,
  true
);
cek(
  'panggung hub tidak tertimpa pita legibilitas bawah',
  !!hub.panggung && !!hub.pitaAtas && hub.panggung.bawah <= hub.pitaAtas,
  true
);
cek(
  'mobil hub ada dan parkir saat tidak ada yang menunjuk',
  hub.baca !== null && Math.abs(hub.baca.yaw - hub.baca.target) < 0.01,
  true
);

// Tunjuk setiap node: yang ditagih dua hal — haluan ikut node yang ditunjuk, dan
// setidaknya satu node benar-benar mengubah arah dibanding parkir. Tidak ada indeks yang
// boleh dihardcode: dengan lima node, target node 2 kebetulan sama persis dengan haluan
// parkir (π/5), jadi gerbang "berubah" harus dicari di antara seluruh node, bukan pada satu
// node pilihan. Selisihnya dibaca dari angka debug mobil, bukan dari tebakan pixel.
const parkir = hub.baca?.target ?? 0;
const haluanNode = [];
for (let i = 0; i < hub.jumlah; i++) {
  await pageUtama.hover(`[data-hub-node="${i}"]`);
  // Dibaca dengan ditanya, bukan dengan ditidurkan: kanvas hub hidup di demand dan satu
  // frame SwiftShader bisa makan lebih dari jeda tetap, jadi yang ditunggu adalah bacaannya
  // benar-benar pindah ke node ini (dengan tenggat), bukan 1000 ms yang kebetulan cukup.
  let b = null;
  const mulai = Date.now();
  while (Date.now() - mulai < 8000) {
    b = await pageUtama.evaluate(() => window.__hub ?? null);
    if (b?.node === i) break;
    await jeda(200);
  }
  haluanNode.push({ i, node: b?.node ?? null, target: b?.target ?? null });
  await pageUtama.mouse.move(10, 10);
  await jeda(400);
}
console.log('hub-tunjuk', JSON.stringify({ parkir, haluanNode }));
cek(
  'haluan mengikuti node yang ditunjuk',
  haluanNode.map((h) => `${h.i}:${h.node}`).join(','),
  haluanNode.map((h) => `${h.i}:${h.i}`).join(',')
);
cek(
  'node terjauh mengubah haluan yang dituju lebih dari 0,3 rad',
  Math.max(...haluanNode.map((h) => Math.abs((h.target ?? 0) - parkir))) > 0.3,
  true
);

// Hukum diam: hover adalah pointermove, jadi fase "always" dihitung dari sana dan baru
// berakhir IDLE_MS (4000 ms) kemudian. Tapi itu belum semuanya: kartu editorial mendarat
// dengan lurp 8% per frame, jadi SATU lompatan gulir menuntut ±90 frame sebelum sisanya
// turun di bawah 1e-3 (terukur: counter naik sampai ±11 s di swiftshader, lalu berhenti
// sendiri — dan sama besarnya di bab 02/03, jadi ini bukan biaya hub). Jendela diam karena
// itu dibuka setelah counter benar-benar berhenti naik, bukan dari jam yang dikira-kira:
// yang ditagih hukum diamnya, bukan kecepatan mesin ukur.
const tungguSepi = async (p, { contohMs = 250, tenangMs = 1500, batasMs = 30000 } = {}) => {
  const mulai = Date.now();
  let lalu = await p.evaluate(() => window.__render?.frame ?? -1);
  let naik = lalu;
  let terakhir = Date.now();
  while (Date.now() - mulai < batasMs) {
    await jeda(contohMs);
    const kini = await p.evaluate(() => window.__render?.frame ?? -1);
    if (kini !== lalu) { lalu = kini; terakhir = Date.now(); }
    else if (Date.now() - terakhir >= tenangMs) return { frame: kini, sejakMs: Date.now() - mulai };
    naik = kini;
  }
  return { frame: naik, sejakMs: -batasMs };
};
const sepi = await tungguSepi(pageUtama);
console.log('hub-sepi', JSON.stringify(sepi));
const f1 = await pageUtama.evaluate(() => window.__render?.frame ?? -1);
await jeda(1200);
const f2 = await pageUtama.evaluate(() => window.__render?.frame ?? -1);
cek('nol frame saat pengunjung diam di hub', f2 - f1, 0);
await foto(pageUtama, '06-hub-akses');

// Layar sempit: panggung di-display:none di bawah md, jadi di sinilah dua bug yang tidak
// bisa dilihat probe desktop ditangkap. (1) sebelum ada gerbang breakpoint, ponsel 390x844
// tetap membuka context WebGL dan memasang Mobil ke kotak 300x150 yang tidak akan pernah
// terlihat; (2) tinta daftar fallback dulu white/70 — warna untuk panggung gelap — sehingga
// label nyaris hilang di atas kertas terang.
await pageUtama.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
await jeda(1400);
const sempit = await pageUtama.evaluate(() => {
  const tautan = [...document.querySelectorAll('#chapter-hub [data-hub-node]')].filter(
    (e) => e.offsetParent !== null
  );
  const gelap = tautan.filter((e) => {
    const [r, g, b] = getComputedStyle(e).color.match(/\d+/g).map(Number);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128;
  }).length;
  return {
    kanvas: !!document.querySelector('#chapter-hub canvas'),
    tautan: tautan.length,
    gelap,
    contoh: tautan[0] ? getComputedStyle(tautan[0]).color : '',
  };
});
console.log('hub-sempit', JSON.stringify(sempit));
cek('ponsel 390px tidak memasang kanvas hub', sempit.kanvas, false);
cek('daftar fallback hub memuat seluruh rute teknis yang terlihat', sempit.tautan, RUTE_TEKNIS.length);
cek('setiap label fallback hub terbaca di latar terang', sempit.gelap, RUTE_TEKNIS.length);
await foto(pageUtama, '06b-hub-ponsel');

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
cek('sitemap memuat /tulisan', sm.teks.includes('/tulisan'), true);
cek('sitemap memuat /statistik', sm.teks.includes('/statistik'), true);
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
  [...document.querySelectorAll('[data-baca-esai] a[href^="/tulisan/esai/"]')].map((a) => a.getAttribute('href'))
);
cek('daftar /tulisan memuat satu tautan per esai di modul', tautanEsai.length, SLUG_DARI_DATA.length);
cek(
  'tautan esai di /tulisan sama dengan slug yang ada di modul',
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
const asing = await pageBaca.goto(`${FE}/tulisan/esai/slug-yang-tidak-ada`, { waitUntil: 'domcontentloaded', timeout: 45000 });
cek('slug esai asing menjawab 404', asing.status(), 404);
cek('sitemap memuat setiap URL esai', tautanEsai.every((h) => sm.teks.includes(h)), true);

// ── 8 · panggung kedua: /kinerja harus punya angka dulu baru punya bentuk ──
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
    // Tiga menit terakhir berisi, tiga menit sebelumnya kosong: rail harus mengisi
    // persis yang punya laporan dan membiarkan sisanya nol sisi.
    buket: [0, 1, 2].map((i) => ({
      menit: new Date(Date.now() - i * 60_000 - (Date.now() % 60_000)).toISOString().slice(0, 16) + 'Z',
      laporan: 4 - i,
      frame: 900 - i * 100,
      medianRerataMs: 16.7,
      p95RerataMs: [40, 28, 61][i],
      fpsTerendah: 24 - i,
      shareLambatPct: 9.4,
    })),
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

// Jalur masuknya: panggung kedua diumumkan di /tulisan dan setiap tautan yang tercetak di sana
// harus benar-benar menjawab — halaman indeks yang menjanjikan rute mati lebih buruk dari
// tidak menjanjikan apa pun.
await pageBaca.goto(`${FE}/tulisan`, { waitUntil: 'domcontentloaded', timeout: 45000 });
const tautanPanggung = await pageBaca.evaluate(() =>
  [...document.querySelectorAll('[data-baca-panggung] a[href]')].map((a) => a.getAttribute('href'))
);
cekMin('/tulisan mengumumkan panggung kedua', tautanPanggung.length, 1);
cek('/tulisan menautkan /kinerja', tautanPanggung.includes('/kinerja'), true);
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
const rWaktu = await pageWaktu.goto(`${FE}/kinerja`, { waitUntil: 'domcontentloaded', timeout: 45000 });
cek('/kinerja menjawab 200', rWaktu.status(), 200);
await jeda(2500);
const awalWaktu = await bacaWaktu(pageWaktu);
console.log('waktu    ', JSON.stringify(awalWaktu));

cek('/kinerja canonical menunjuk ke jalurnya sendiri', (await pageWaktu.evaluate(() => document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '')).endsWith('/kinerja'), true);
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

// Rail menit + crosshair pointer (E3 /kinerja). Rail memakai slot, fungsi, dan angka yang
// sama dengan bilah /statistik; payload uji berisi tiga menit terisi, jadi enam slot harus
// tergambar dengan tepat tiga terisi. Crosshair mewakili pointer, bukan data: ia tidak
// boleh ada sebelum ada pointer, dan setelah ada ia dijepit di dalam bingkai.
cek('rail menit punya enam slot saat angka ada', awalWaktu.jendela?.buketSlot, 6);
cek('rail mengisi persis menit yang punya laporan', awalWaktu.jendela?.buketTerisi, 3);
cek('crosshair tidak tergambar sebelum pointer bergerak', awalWaktu.jendela?.jarum ?? null, null);
const kotakWaktu = await pageWaktu.evaluate(() => {
  const el = document.querySelector('[data-panggung-kecil]');
  el.scrollIntoView({ block: 'center', behavior: 'instant' });
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
});
await pageWaktu.mouse.move(kotakWaktu.x + kotakWaktu.w * 0.3, kotakWaktu.y + kotakWaktu.h * 0.4);
await jeda(250);
await pageWaktu.mouse.move(kotakWaktu.x + kotakWaktu.w * 0.7, kotakWaktu.y + kotakWaktu.h * 0.6);
await jeda(400);
const jarumWaktu = await pageWaktu.evaluate(() =>
  window.__jendela?.jarum ? { ...window.__jendela.jarum } : null
);
console.log('waktu-jarum', JSON.stringify(jarumWaktu));
cek('pointer menggambar crosshair', !!jarumWaktu, true);
cek(
  'crosshair dijepit di dalam bingkai',
  jarumWaktu ? Math.abs(jarumWaktu.x) <= 1 && Math.abs(jarumWaktu.y) <= 1 : false,
  true
);
// Pointer yang barusan bergerak me-reset fase "always" hukum diam (IDLE_MS 4000 dari
// interaksi terakhir, bukan dari muat halaman). Beri waktu lewat sebelum blok diam
// mengukur delta frame.
await jeda(1500);

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
cek('/kinerja tidak melempar error', galatWaktu.length, 0);
cek('sitemap memuat /kinerja', sm.teks.includes('/kinerja'), true);

// ── 9 · /interaksi: sudut yang sama, dibaca dari dua tempat ──
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
const rSangkar = await pageSangkar.goto(`${FE}/interaksi`, { waitUntil: 'domcontentloaded', timeout: 45000 });
cek('/interaksi menjawab 200', rSangkar.status(), 200);
// Dibaca dengan ditanya, bukan dengan ditidurkan. `window.__sangkar` dan `window.__render`
// ditulis dari frame, jadi keduanya baru ada setelah kanvas benar-benar menghasilkan frame
// pertamanya — di SwiftShader bawah beban itu bisa lewat dari jeda tetap 1200 ms dan gerbang
// membacanya sebagai "verifier tidak terpasang" padahal halamannya sehat (terukur: rute yang
// sama dibuka sendirian memberi __sangkar terisi, calls 1, nol pageerror). Yang ditunggu
// keadaannya, tenggatnya tetap ada supaya kegagalan tetap dilaporkan apa adanya.
const tungguSangkar = async (p, siap, { batasMs = 12000, jedaMs = 200 } = {}) => {
  const mulai = Date.now();
  let baca = await bacaSangkar(p);
  while (!siap(baca) && Date.now() - mulai < batasMs) {
    await jeda(jedaMs);
    baca = await bacaSangkar(p);
  }
  return baca;
};
const sangkarAwal = await tungguSangkar(pageSangkar, (b) => !!b.sangkar && !!b.render);
console.log('sangkar  ', JSON.stringify(sangkarAwal));
cek('sangkar tergambar sebagai satu draw call', sangkarAwal.render?.calls, 1);
cek('verifier sudut terpasang', !!sangkarAwal.sangkar, true);
cek('batas sudut datang dari modul, bukan dari halaman', sangkarAwal.sangkar?.batasDerajat, 12);
cek('sangkar diparkir pada yaw 45 derajat', Math.round(((sangkarAwal.sangkar?.yawAwal ?? 0) * 180) / Math.PI), 45);
cek('tujuh tanda skala tergambar dalam objek yang sama', sangkarAwal.sangkar?.tanda, 7);
cek('penanda rosso duduk di nol saat belum ada perintah', sangkarAwal.sangkar?.penandaY, 0);

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
  const diseret = await tungguSangkar(pageSangkar, (b) => b.sangkar?.derajatX === 6);
  console.log('seret    ', JSON.stringify(diseret.sangkar));
  cek('seret menghasilkan sudut yang benar-benar berubah', diseret.sangkar?.derajatX, 6);
  cek(
    'penanda rosso mengikuti derajatX di meteran yang sama dengan tanda skala',
    diseret.sangkar ? Math.abs(diseret.sangkar.penandaY - (diseret.sangkar.derajatX / 12) * 0.9) < 0.001 : false,
    true
  );
  cek(
    'DOM menyebut derajat yang sama dengan yang dipakai kanvas',
    !!diseret.dom?.startsWith('+6°'),
    true
  );
  await pageSangkar.mouse.move(kotak.x + 900, kotak.y, { steps: 4 });
  const dijepit = await tungguSangkar(pageSangkar, (b) => b.sangkar?.derajatX === 12);
  cek('batas 12 derajat ditegakkan lewat jepit, bukan lewat klaim', dijepit.sangkar?.derajatX, 12);
  await pageSangkar.mouse.up();
  const dilepas = await tungguSangkar(pageSangkar, (b) => b.sangkar?.derajatX === 0);
  cek('melepas seret mengembalikan sudut ke nol', dilepas.sangkar?.derajatX, 0);
  cek('DOM ikut kembali ke nol', !!dilepas.dom?.startsWith('+0°'), true);
}

// Panah keyboard: satu langkah = empat derajat, dua langkah = delapan.
await pageSangkar.focus('[data-sangkar-kontrol]');
await pageSangkar.keyboard.press('ArrowRight');
await pageSangkar.keyboard.press('ArrowRight');
const denganPanah = await tungguSangkar(pageSangkar, (b) => b.sangkar?.derajatX === 8);
console.log('panah    ', JSON.stringify(denganPanah.sangkar));
cek('dua langkah panah = delapan derajat', denganPanah.sangkar?.derajatX, 8);
cek('kontrol keyboard dan kanvas membaca store yang sama', !!denganPanah.dom?.startsWith('+8°'), true);
await pageSangkar.keyboard.press('Escape');
const lepasKeyboard = await tungguSangkar(pageSangkar, (b) => b.sangkar?.derajatX === 0);
cek('Escape mengembalikan ke nol', lepasKeyboard.sangkar?.derajatX, 0);

// Sampel diambil setelah IDLE_MS lewat dari aktivitas terakhir (Escape membangunkan loop),
// jadi keduanya berada di fase demand.
await pageSangkar.evaluate(() => window.scrollTo(0, 0));
await jeda(5200);
const sangkarDiam1 = await bacaSangkar(pageSangkar);
await jeda(3000);
const sangkarDiam2 = await bacaSangkar(pageSangkar);
cek(
  'nol frame saat pengunjung diam di /interaksi',
  (sangkarDiam2.render?.frame ?? -1) - (sangkarDiam1.render?.frame ?? -1),
  0
);
cek('/interaksi tidak melempar error', galatSangkar.length, 0);
cek('sitemap memuat /interaksi', sm.teks.includes('/interaksi'), true);
cek('/tulisan menautkan /interaksi', tautanPanggung.includes('/interaksi'), true);
await foto(pageSangkar, '09-sangkar');

// ── 10 · /potret: knob menulis uniform, dan holder panggung utama tidak ikut tersentuh ──
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
const rMeja = await pageMeja.goto(`${FE}/potret`, { waitUntil: 'domcontentloaded', timeout: 45000 });
cek('/potret menjawab 200', rMeja.status(), 200);
cek('/potret mendeklarasikan canonical sendiri', (rMeja.headers()['content-type'] || '').includes('text/html'), true);
// Di dev, window.__meja baru tertulis ±1,7 s setelah goto (compile rute + hidrasi + frame
// pertama). Jam tetap yang lebih pendek dari itu meruntuhkan delapan gerbang di bawahnya
// sekaligus, jadi tunggu verifiernya benar-benar ada — gerbangnya tetap menilai "ada".
await pageMeja.waitForFunction(() => !!window.__meja, { timeout: 15000, polling: 200 }).catch(() => null);
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
  'nol frame saat pengunjung diam di /potret',
  (mejaDiam2.render?.frame ?? -1) - (mejaDiam1.render?.frame ?? -1),
  0
);
cek('/potret tidak melempar error', galatMeja.length, 0);
cek('sitemap memuat /potret', sm.teks.includes('/potret'), true);
cek('/tulisan menautkan /potret', tautanPanggung.includes('/potret'), true);
await foto(pageMeja, '10-meja');

// ── 11 · /proyek: instance = baris, tinggi = angka yang dicetak ──
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
const rPeta = await pagePeta.goto(`${FE}/proyek`, { waitUntil: 'domcontentloaded', timeout: 45000 });
cek('/proyek menjawab 200', rPeta.status(), 200);
// Yang ditagih gerbang ini adalah keadaan DUDUK, jadi yang benar adalah menunggu sampai
// diam dengan batas atas, bukan tidur buta: gerak masuk 700 ms baru dimulai saat kanvas
// mendapat frame pertama, dan itu terjadi setelah hidrasi — pada 1,6 detik buta ia pernah
// terbaca di tengah jalan (delapan baris masih nol) tanpa ada yang salah di halaman.
const bandingTinggi = (x) =>
  x.baris.length > 0 &&
  x.baris.every((b, i) => Math.abs((x.peta?.tinggi?.[i] ?? NaN) - b.tinggi) < 0.006);
let settleMs = 0;
let peta = await bacaPeta(pagePeta);
while (!bandingTinggi(peta) && settleMs < 4000) {
  await jeda(200);
  settleMs += 200;
  peta = await bacaPeta(pagePeta);
}
console.log('peta     ', peta.baris.length, 'baris, duduk setelah', 1600 + settleMs, 'ms', JSON.stringify(peta.peta));
cek('jumlah instance sama dengan jumlah baris daftar', peta.peta?.instance ?? 0, peta.baris.length);
if (peta.baris.length > 0) {
  cek('satu draw call untuk seluruh daftar', peta.render?.calls, 1);
  cek('gerak masuk duduk dalam empat detik setelah navigasi', settleMs < 4000, true);
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

  // Gerak masuk selesai sebelum angka dibaca (tinggi = yang dicetak, bukan yang direncanakan),
  // dan hover hanya mengubah warna satu instance: matriks serta penanda rosso tidak boleh ikut.
  cek('tidak ada baris terpilih sebelum pengunjung menunjuk', peta.peta?.pilih, -1);
  // Akun ini punya banyak repo dengan jumlah bintang yang sama, jadi semua yang bersitars
  // bertanda puncak. Baris tanpa bintang justru pengujian terbaik: dipilih = warnanya ikut,
  // tingginya tetap nol.
  const target = peta.baris.findIndex((b) => !b.tertinggi);
  const puncakIdx = peta.baris.findIndex((b) => b.tertinggi);
  if (target >= 0 && puncakIdx >= 0) {
    await pagePeta.hover(`[data-peta-baris]:nth-of-type(${target + 1})`);
    await jeda(300);
    const terpiih = await bacaPeta(pagePeta);
    console.log('peta-pilih', target, JSON.stringify(terpiih.peta?.pilih), 'merah', terpiih.peta?.merah);
    cek('baris yang disentuh menjadi indeks yang digambar', terpiih.peta?.pilih, target);
    cek('hover tidak mengubah jumlah batang rosso', terpiih.peta?.merah, peta.peta?.merah);
    const bergeser = terpiih.baris.filter(
      (b, i) => !(Math.abs((terpiih.peta?.tinggi?.[i] ?? NaN) - b.tinggi) < 0.006)
    ).length;
    cek('hover tidak menyentuh matriks tinggi', bergeser, 0);
    await pagePeta.hover(`[data-peta-baris]:nth-of-type(${puncakIdx + 1})`);
    await jeda(300);
    const diPuncak = await bacaPeta(pagePeta);
    cek(
      'puncak yang dipilih tetap dihitung rosso, tidak berganti jadi warna pilihan',
      diPuncak.peta?.merah,
      peta.peta?.merah
    );
    cek('indeks terpilih pindah ke baris puncak', diPuncak.peta?.pilih, puncakIdx);
    await pagePeta.mouse.move(4, 4);
    await jeda(300);
    const lepas = await bacaPeta(pagePeta);
    cek('melepas pointer mengembalikan pilihan ke nol', lepas.peta?.pilih, -1);
  } else {
    cek('daftar punya baris non-puncak untuk disentuh', target >= 0, true);
  }
} else {
  cek('tanpa data GitHub halaman menandai keadaan kosong', peta.kosong, true);
  cek('tanpa data GitHub tidak ada instance', !!peta.peta, false);
  cek('tanpa data GitHub tidak ada draw call', peta.render?.calls, 0);
}
cek('/proyek tidak melempar error', galatPeta.length, 0);
cek('sitemap memuat /proyek', sm.teks.includes('/proyek'), true);
cek('/tulisan menautkan /proyek', tautanPanggung.includes('/proyek'), true);
await foto(pagePeta, '11-peta');

// ── 12 · /transisi: navigasi diafragma, dan shader panggung tetap tertutup ──
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
const rIris = await pageIris.goto(`${FE}/transisi`, { waitUntil: 'domcontentloaded', timeout: 45000 });
cek('/transisi menjawab 200', rIris.status(), 200);
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

// Tinta satu pixel di dalam fragmen yang sama. Diukur saat tertutup penuh, saat seluruh
// bingkai adalah kertas: tiap pixel yang jauh dari kertas harus berasal dari garis, bukan dari
// huruf di belakangnya. Dua tagihan sekaligus — garis itu ADA, dan ia hanya boleh ada di paruh
// bawah, karena gerbang luma di atas mengukur sudut kiri-atas.
const hitungTinta = async () => {
  const klip = await pageIris.evaluate(() => {
    const el = document.querySelector('[data-iris-wadah]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: r.x + window.scrollX + 6,
      y: r.y + window.scrollY + 6,
      width: r.width - 12,
      height: r.height - 12,
    };
  });
  if (!klip) return { atas: -1, bawah: -1 };
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
    let atas = 0;
    let bawah = 0;
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        const i = (y * c.width + x) * 4;
        const luma = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        if (luma > 200) continue;
        if (y < c.height / 2) atas++;
        else bawah++;
      }
    }
    return { atas, bawah };
  }, b64);
};
const tinta = await hitungTinta();
console.log('iris-tinta', JSON.stringify(tinta));
cek('garis diafragma tergambar di kertas', tinta.bawah > 20, true);
cek('garis tidak pernah masuk ke paruh atas tempat luma diukur', tinta.atas, 0);
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
  'nextjs-frontend/src/app/transisi/IrisHidup.tsx',
  'nextjs-frontend/src/app/transisi/page.tsx',
  'nextjs-frontend/src/components/Three/panggung/KurvaIris.tsx',
]
  .map((f) => readFileSync(new URL(f, AKAR), 'utf8'))
  .join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/[^\n]*/g, '');
cek(
  '/transisi tidak mengimpor material panggung atau holder sapuannya',
  /chiaroscuroMaterial|usePanggung|SAPU_IRIS|SILANG_MOBIL/.test(sumberIris.replace(/\/\/[^\n]*$/gm, '')),
  false
);

await pageIris.evaluate(() => window.scrollTo(0, 0));
await jeda(5200);
const irisDiam1 = await bacaIris(pageIris);
await jeda(3000);
const irisDiam2 = await bacaIris(pageIris);
cek(
  'nol frame saat pengunjung diam di /transisi',
  (irisDiam2.render?.frame ?? -1) - (irisDiam1.render?.frame ?? -1),
  0
);
cek('/transisi tidak melempar error', galatIris.length, 0);
cek('sitemap memuat /transisi', sm.teks.includes('/transisi'), true);
cek('/tulisan menautkan /transisi', tautanPanggung.includes('/transisi'), true);
await foto(pageIris, '12-iris');

await browser.close();
for (const h of hasil) console.log(`${h.ok ? 'LULUS' : 'GAGAL'}  ${h.nama}: dapat ${h.dapat}, harus ${h.harus}`);
const gagal = hasil.filter((h) => !h.ok).length;
console.log(`total ${hasil.length} gerbang, ${gagal} gagal`);
if (gagal) console.log('pageerror arsip:', galatArsip.slice(0, 3), 'baca:', galatBaca.slice(0, 3));
process.exit(gagal ? 1 : 0);
