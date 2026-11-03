// Pembuat angka terukur untuk kartu proyek di halaman utama → nextjs-frontend/src/data/metrikKartu.ts
//
//   node tools/ci/ukur-kartu.mjs               # ukur + tulis modul
//   node tools/ci/ukur-kartu.mjs --cek         # hitung ulang, bandingkan, jangan menulis
//   node tools/ci/ukur-kartu.mjs --validasi    # periksa modul yang terkomit saja (tanpa repo sumber)
//
// Kenapa ada: `ChapterArchives.tsx` mencetak baris metrik per proyek ("4.170 QUERIES TERUKUR",
// "60 FPS @1440×900", "657–706 NODES/SEC"). Angka-angka itu dulu diketik tangan, jadi mereka
// membeku pada hari terakhir seseorang mengukur — dan tetap tampil sebagai fakta setelah yang
// diukur berubah. Kebijakan yang sama sudah tertulis di tools/ci/api-contract-check.mjs:128
// untuk route handler; modul ini memakainya pada angka yang dibaca pengunjung.
//
// Setiap kartu punya satu fungsi ukur yang HANYA MEMBACA artefak pengukuran di mesin ini —
// tidak menulis ke repo lain, tidak memanggil API berbayar, tidak membuka browser. Kalau
// sumbernya tidak ada, fungsi itu mengembalikan null dan kartu tercetak "BELUM TERUKUR"; kalau
// sumbernya ada tapi tidak menutup secara internal, generator MATI dengan pesan, bukan
// menghasilkan angka yang mendekati.
//
// Sumber per kartu:
//   /01 direktori extensions/*/ yang punya extension.js + metadata.json
//   /02 konstanta RATE_LIMIT_REQUESTS yang benar-benar ditegakkan di hook PocketBase
//   /03 stempel berpasangan di log post-commit graphify, dibagi file yang diekstrak
//   /04 tangkapan Laravel Debugbar dari aplikasi HRIS dev lokal
//   /05 jendela frame yang diukur drawcall-probe di GPU keras
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const AKAR = resolve(dirname(new URL(import.meta.url).pathname), '..', '..');
const KELUAR = resolve(AKAR, 'nextjs-frontend', 'src', 'data', 'metrikKartu.ts');
const argv = process.argv.slice(2);
const MODE_CEK = argv.includes('--cek');
const MODE_VALIDASI = argv.includes('--validasi');

/** Umur maksimum artefak; lewat ini kartu gelap, bukan memakai angka lama. Yang diukur adalah
 *  umur HASIL-OLAH (kapan terakhir angka ini diturunkan ulang dari mesin yang memegang
 *  korpusnya), bukan umur korpusnya — korpus debugbar memang beku sejak 21 Agu 2026, jadi
 *  mengukur umur data akan menggelapkan kartu hari ini juga tanpa mengajarkan apa pun. */
const BATAS_USIA_HARI = 90;
const VERSI = 1;

const gagal = (pesan) => {
  console.error(pesan);
  process.exit(1);
};

/** Persentil nearest-rank pada salinan terurut naik: nilai terkecil yang peringkatnya
 *  ceil(p·n) — BUKAN interpolasi. Bedanya nyata pada n=3.440 dan angkanya dicetak publik,
 *  jadi metodenya ditulis sekali di sini supaya semua kartu memakai metode yang sama. */
const persentil = (nilai, p) => {
  const terurut = nilai.slice().sort((a, b) => a - b);
  if (terurut.length === 0) return null;
  return terurut[Math.ceil(p * terurut.length) - 1];
};

// ── /01 Ferrari Ubuntu ──────────────────────────────────────────────────────────
const DIR_FERRARI = process.env.DIR_FERRARI ?? '/home/arkan/ferrari-ubuntu';

function ukurEkstensi() {
  const akar = join(DIR_FERRARI, 'extensions');
  if (!existsSync(akar)) return null;
  const direktori = readdirSync(akar, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  const berJs = direktori.filter((n) => existsSync(join(akar, n, 'extension.js')));
  const lengkap = berJs.filter((n) => existsSync(join(akar, n, 'metadata.json')));
  // Ekstensi tanpa metadata.json tidak bisa dipasang GNOME, jadi ia tidak ikut dihitung.
  // Kalau jumlahnya beda, ada direktori setengah jadi di repo — dan kartu akan melaporkan
  // angka yang tidak bisa dipasang siapa pun. Lebih baik generator mati.
  if (berJs.length !== lengkap.length) {
    gagal(`/01: ${berJs.length} direktori punya extension.js tapi hanya ${lengkap.length} yang punya metadata.json`);
  }
  return { jumlah: lengkap.length, nama: lengkap.sort(), sumber: `${akar}/*/extension.js + metadata.json` };
}

// ── /02 Pickertime ──────────────────────────────────────────────────────────────
const DIR_PICKERTIME = process.env.DIR_PICKERTIME ?? '/home/arkan/Documents/Coding/Pickertime';

function ukurBatasLaju() {
  const jalur = join(DIR_PICKERTIME, 'pb_hooks', 'ai_proxy.pb.js');
  if (!existsSync(jalur)) return null;
  const isi = readFileSync(jalur, 'utf8');
  const cocok = isi.match(/RATE_LIMIT_REQUESTS\s*=\s*(\d+)/);
  if (!cocok) gagal(`/02: ${jalur} ada tapi RATE_LIMIT_REQUESTS tidak ditemukan — bentuk hook berubah?`);
  const baris = isi.slice(0, isi.indexOf(cocok[0])).split('\n').length;
  // Angka di kartu hanya boleh menyebut batas yang DITEGAKKAN. Konstanta saja tidak cukup:
  // tanpa cabang 429, batas itu cuma niat di dalam kode.
  if (!/429|rate_limit/.test(isi)) {
    gagal(`/02: RATE_LIMIT_REQUESTS=${cocok[1]} tapi tidak ada jalur 429/rate_limit di hook — jangan cetak batasnya`);
  }
  return {
    permintaanPerMenit: Number(cocok[1]),
    ditegakkanDi: `pb_hooks/ai_proxy.pb.js:${baris}`,
    sumber: 'konstanta yang dibaca dari hook, bukan angka yang diketik ulang',
  };
}

// ── /03 Graphify DevKit ─────────────────────────────────────────────────────────
const LOG_GRAPHIFY = process.env.LOG_GRAPHIFY ?? '/tmp/graphify.log';

function ukurEkstraksi() {
  if (!existsSync(LOG_GRAPHIFY)) return null;
  const baris = readFileSync(LOG_GRAPHIFY, 'utf8').split('\n');
  const stempel = (s) => Date.parse(s.replace(' ', 'T'));
  const jalannya = [];
  let berjalan = null;
  let tanpaPenutup = 0;
  for (const b of baris) {
    const mulai = b.match(/^\[([\d-]+ [\d:]+)\] \[GIT-HOOK\] Triggered auto-update for (.+)$/);
    if (mulai) {
      if (berjalan) tanpaPenutup++;
      berjalan = { mulaiMs: stempel(mulai[1]), path: mulai[2].trim(), file: null };
      continue;
    }
    const ekstrak = b.match(/AST extraction: (\d+)\/(\d+) uncached files/);
    // Baris progres ini dicetak lebih dari sekali saat ekstraksi berjalan; yang terakhir
    // menyebut total file, jadi diambil yang paling besar, bukan yang paling akhir.
    if (ekstrak && berjalan) berjalan.file = Math.max(berjalan.file ?? 0, Number(ekstrak[2]));
    const selesai = b.match(/^\[([\d-]+ [\d:]+)\] \[GIT-HOOK\] Auto-update finished successfully for (.+)$/);
    if (selesai && berjalan && selesai[2].trim() === berjalan.path) {
      jalannya.push({ detik: (stempel(selesai[1]) - berjalan.mulaiMs) / 1000, file: berjalan.file, mulaiMs: berjalan.mulaiMs, path: berjalan.path });
      berjalan = null;
    }
  }
  if (berjalan) tanpaPenutup++;
  const utuh = jalannya.filter((r) => r.detik > 0 && (r.file ?? 0) > 0);
  if (utuh.length === 0) return null;
  const laju = utuh.map((r) => r.file / r.detik);
  const totalFile = utuh.reduce((t, r) => t + r.file, 0);
  const totalDetik = utuh.reduce((t, r) => t + r.detik, 0);
  return {
    /** Agregat seluruh run: total file dibagi total detik. Rentang per-run (min/maks di
     *  bawah) sengaja tidak dicetak di kartu — penyebutnya SELURUH jalan hook (jalan repo,
     *  tulis graph, sinkron), bukan ekstraksinya saja, jadi ia bergeser 0,4 → 34,6 hanya
     *  karena ukuran repo. Angka agregat tetap jujur selama labelnya bilang "file per detik
     *  satu run auto-update". */
    filePerDetik: totalFile / totalDetik,
    totalFile,
    totalDetik,
    min: Math.min(...laju),
    maks: Math.max(...laju),
    jumlahRun: utuh.length,
    /** Run tanpa penutup atau tanpa hitungan file: dibuang, tapi jumlahnya dicatat supaya
     *  "dibuang diam-diam" tetap kelihatan di artefak. */
    runDibuang: jalannya.length - utuh.length + tanpaPenutup,
    jendelaAwal: new Date(Math.min(...utuh.map((r) => r.mulaiMs))).toISOString(),
    jendelaAkhir: new Date(Math.max(...utuh.map((r) => r.mulaiMs))).toISOString(),
    sumber: `${LOG_GRAPHIFY} (stempel Triggered → finished dibagi file uncached)`,
  };
}

// ── /04 HRIS ────────────────────────────────────────────────────────────────────
const DIR_DEBUGBAR =
  process.env.DIR_DEBUGBAR ?? '/home/arkan/Documents/Coding/Sekawan_Media_Tasks/hris/hris-admin/storage/debugbar';

function ukurHris() {
  if (!existsSync(DIR_DEBUGBAR)) return null;
  const berkas = readdirSync(DIR_DEBUGBAR).filter((f) => f.endsWith('.json')).sort();
  if (berkas.length === 0) return null;
  const durasiQuery = [];
  const durasiTransaksi = [];
  const perPermintaan = [];
  const uri = new Set();
  const waktu = [];
  const koneksi = new Set();
  let totalStatement = 0;
  const penutupRusak = [];
  for (const f of berkas) {
    const j = JSON.parse(readFileSync(join(DIR_DEBUGBAR, f), 'utf8'));
    const q = j.queries ?? {};
    const statement = q.statements ?? [];
    // `count` adalah jumlah statement TERMASUK BEGIN/COMMIT. Kalau suatu hari Debugbar
    // mengubah arti field ini, total yang dicetak ikut salah tanpa suara — jadi persamaannya
    // ditagih per file, bukan diasumsikan sekali.
    if (q.count !== statement.length) penutupRusak.push(`${f}: count=${q.count} statements=${statement.length}`);
    if ((q.nb_excluded_statements ?? 0) !== 0) penutupRusak.push(`${f}: ${q.nb_excluded_statements} statement dikecualikan dari tangkapan`);
    for (const s of statement) {
      if (typeof s.duration !== 'number') continue;
      if (s.type === 'transaction') durasiTransaksi.push(s.duration);
      else durasiQuery.push(s.duration);
      if (s.connection) koneksi.add(s.connection);
    }
    totalStatement += statement.length;
    perPermintaan.push(statement.length);
    if (j.__meta?.uri) uri.add(j.__meta.uri);
    if (typeof j.__meta?.utime === 'number') waktu.push(j.__meta.utime * 1000);
  }
  if (penutupRusak.length) {
    gagal(`/04: ${penutupRusak.length} tangkapan tidak menutup (contoh: ${penutupRusak.slice(0, 3).join('; ')})`);
  }
  if (durasiQuery.length + durasiTransaksi.length !== totalStatement) {
    gagal(`/04: pemisahan tipe tidak menutup — query ${durasiQuery.length} + transaction ${durasiTransaksi.length} ≠ ${totalStatement} statement`);
  }
  const urut = perPermintaan.slice().sort((a, b) => a - b);
  return {
    permintaan: berkas.length,
    uriBerbeda: uri.size,
    query: durasiQuery.length,
    transaksi: durasiTransaksi.length,
    totalStatement,
    p99Ms: persentil(durasiQuery, 0.99),
    p95Ms: persentil(durasiQuery, 0.95),
    medianMs: persentil(durasiQuery, 0.5),
    maksMs: Math.max(...durasiQuery),
    medianPerPermintaan: urut[Math.floor(urut.length / 2)],
    maksPerPermintaan: urut[urut.length - 1],
    rentangAwal: new Date(Math.min(...waktu)).toISOString(),
    rentangAkhir: new Date(Math.max(...waktu)).toISOString(),
    connection: [...koneksi].sort().join(','),
    // Sidik jari korpus: generator yang dijalankan ke folder lain tidak boleh lolos --cek
    // hanya karena angkanya kebetulan mirip.
    signature: `${berkas.length}|${berkas[0]}|${berkas[berkas.length - 1]}|${[...koneksi].sort().join(',')}`,
    sumber: `${DIR_DEBUGBAR}/*.json (tangkapan Debugbar dev lokal, bukan produksi)`,
  };
}

// ── /05 Chiaroscuro ─────────────────────────────────────────────────────────────
const ARTIFAK_GPU = resolve(AKAR, 'docs', 'verify', 'anggaran-gpu.json');
const ARTIFAK_LUNAK = resolve(AKAR, 'docs', 'verify', 'anggaran.json');

/** Baca satu artefak drawcall-probe dan ambil fps-nya; null kalau tidak ada frame terukur. */
function fpsDari(jalur) {
  if (!existsSync(jalur)) return null;
  const a = JSON.parse(readFileSync(jalur, 'utf8'));
  const bab = a.bab ?? [];
  const fps = bab.map((b) => b.fps).filter((x) => typeof x === 'number');
  if (fps.length === 0) return null;
  return {
    fpsTerendah: Math.min(...fps),
    fpsTertinggi: Math.max(...fps),
    jumlahBab: fps.length,
    frame: bab.reduce((t, b) => t + (b.frame_terukur ?? 0), 0),
    lebar: a.jendela_ukur?.lebar ?? null,
    tinggi: a.jendela_ukur?.tinggi ?? null,
    perangkat: a.jendela_ukur?.perangkat_gambar ?? 'renderer tidak dilaporkan',
    dibuat: a.dibuat ?? null,
  };
}

function ukurFrame() {
  const gpu = fpsDari(ARTIFAK_GPU);
  if (!gpu) return null;
  // SwiftShader tidak boleh mendarat di kartu yang menyebut GPU: itu peranti lunak, dan
  // anggaran.json yang lama memang ada untuk membandingkan antar-run di alat yang sama.
  if (/swiftshader/i.test(gpu.perangkat)) {
    gagal(`/05: ${ARTIFAK_GPU} tercatat di "${gpu.perangkat}" — itu peranti lunak, bukan GPU keras. Jalankan ulang dengan --gpu.`);
  }
  // Angka "software" yang dulu ikut tercetak di strip SPEC (23,5 FPS) tidak punya sumber
  // sama sekali; yang bersumber adalah anggaran.json — jendela ukur yang sama, perangkat
  // berbeda. Keduanya ikut ditulis supaya strip tidak mencampur yang terukur dan yang tidak.
  const lunak = fpsDari(ARTIFAK_LUNAK);
  return { ...gpu, perantiLunak: lunak, sumber: 'docs/verify/drawcall-probe.mjs --gpu --tulis docs/verify/anggaran-gpu.json' };
}

// ── rakit ───────────────────────────────────────────────────────────────────────
const isian = MODE_VALIDASI ? null : buatIsian();

function buatIsian() {
  const hasil = {
    versi: VERSI,
    dihasilkanPada: new Date().toISOString(),
    batasUsiaHari: BATAS_USIA_HARI,
    kartu: {
      '01': ukurEkstensi(),
      '02': ukurBatasLaju(),
      '03': ukurEkstraksi(),
      '04': ukurHris(),
      '05': ukurFrame(),
    },
  };
  const terisi = Object.entries(hasil.kartu).filter(([, v]) => v !== null).map(([k]) => k);
  const kosong = Object.entries(hasil.kartu).filter(([, v]) => v === null).map(([k]) => k);
  // Sumber yang hilang itu sah (mesin CI, korpus belum ada). Yang tidak sah adalah generator
  // yang berjalan tanpa satu pun angka — itu berarti path di atas file ini salah semua.
  if (terisi.length === 0) {
    gagal('tidak ada satu pun sumber ukur yang terbaca — semua kartu akan gelap; periksa DIR_* di bagian atas file ini');
  }
  return { hasil, terisi, kosong };
}

const modul = [
  '// ─────────────────────────────────────────────────────────────────────────────',
  '// Dihasilkan oleh tools/ci/ukur-kartu.mjs dari artefak pengukuran di mesin penulis.',
  '// JANGAN diedit tangan: angka di sini adalah satu-satunya sumber "TERUKUR" yang tercetak',
  '// di kartu proyek halaman utama, dan menyuntingnya langsung sama dengan kembali ke angka',
  '// karangan. Refresh dengan',
  '//   node tools/ci/ukur-kartu.mjs',
  '// Sumber yang tidak ada saat generator jalan ditulis `null`, dan kartu yang null tercetak',
  '// "BELUM TERUKUR" — bukan angka terakhir yang masih tersisa.',
  '// ─────────────────────────────────────────────────────────────────────────────',
  '',
  '/** Umur maksimum artefak dalam hari; lewat ini formatter mengembalikan "BELUM TERUKUR". */',
  `export const BATAS_USIA_HARI = ${BATAS_USIA_HARI};`,
  '',
  'export interface UkurEkstensi {',
  '  /** Jumlah direktori extensions yang benar-benar ber-ekstensi (extension.js + metadata.json). */',
  '  jumlah: number;',
  '  nama: string[];',
  '  sumber: string;',
  '}',
  '',
  'export interface UkurBatasLaju {',
  '  /** Konstanta RATE_LIMIT_REQUESTS yang dibaca dari hook, bukan angka yang diketik ulang. */',
  '  permintaanPerMenit: number;',
  '  ditegakkanDi: string;',
  '  sumber: string;',
  '}',
  '',
  'export interface UkurEkstraksi {',
  '  /** File per detik secara agregat atas seluruh run hook yang terukur. */',
  '  filePerDetik: number;',
  '  totalFile: number;',
  '  totalDetik: number;',
  '  /** Rentang per-run, disimpan untuk audit; tidak dicetak karena penyebutnya seluruh hook. */',
  '  min: number;',
  '  maks: number;',
  '  jumlahRun: number;',
  '  /** Run tanpa stempel penutup atau tanpa hitungan file — dibuang, tapi dihitung. */',
  '  runDibuang: number;',
  '  jendelaAwal: string;',
  '  jendelaAkhir: string;',
  '  sumber: string;',
  '}',
  '',
  'export interface UkurHris {',
  '  permintaan: number;',
  '  uriBerbeda: number;',
  '  /** Statement berjenis query. BEGIN/COMMIT dihitung terpisah di `transaksi`. */',
  '  query: number;',
  '  /** Statement berjenis transaction; durasinya selalu 0 di tangkapan Debugbar. */',
  '  transaksi: number;',
  '  totalStatement: number;',
  '  p99Ms: number;',
  '  p95Ms: number;',
  '  medianMs: number;',
  '  maksMs: number;',
  '  medianPerPermintaan: number;',
  '  maksPerPermintaan: number;',
  '  rentangAwal: string;',
  '  rentangAkhir: string;',
  '  connection: string;',
  '  signature: string;',
  '  sumber: string;',
  '}',
  '',
  'export interface UkurJendela {',
  '  /** fps TERENDAH dari bab yang diukur — kartu tidak boleh mengklaim bab terbaiknya. */',
  '  fpsTerendah: number;',
  '  fpsTertinggi: number;',
  '  jumlahBab: number;',
  '  frame: number;',
  '  lebar: number | null;',
  '  tinggi: number | null;',
  '  /** String WEBGL_debug_renderer_info apa adanya; klaim ini cuma berlaku padanya. */',
  '  perangkat: string;',
  '  dibuat: string | null;',
  '}',
  '',
  'export interface UkurFrame extends UkurJendela {',
  '  /** Jendela ukur yang sama di SwiftShader, dari docs/verify/anggaran.json — null kalau belum ada. */',
  '  perantiLunak: UkurJendela | null;',
  '  sumber: string;',
  '}',
  '',
  'export interface MetrikKartu {',
  '  versi: number;',
  '  dihasilkanPada: string;',
  '  batasUsiaHari: number;',
  '  kartu: {',
  "    '01': UkurEkstensi | null;",
  "    '02': UkurBatasLaju | null;",
  "    '03': UkurEkstraksi | null;",
  "    '04': UkurHris | null;",
  "    '05': UkurFrame | null;",
  '  };',
  '}',
  '',
  'export const METRIK_KARTU: MetrikKartu = __ISIAN__;',
  '',
].join('\n');

/** Stempel waktu bikin tidak boleh membuat --cek berteriak BEDA setiap detik. */
const tanpaWaktu = (t) => t.replace(/^ {2}"dihasilkanPada": .*$/m, '  "dihasilkanPada": -');

if (MODE_VALIDASI) {
  if (!existsSync(KELUAR)) gagal(`--validasi: ${KELUAR} belum ada.`);
  const cocok = readFileSync(KELUAR, 'utf8').match(/export const METRIK_KARTU: MetrikKartu = ([\s\S]*?);\n/);
  if (!cocok) gagal('--validasi: bentuk modul tidak dikenali — jangan disunting tangan, regenerasi.');
  const baca = JSON.parse(cocok[1]);
  if (baca.versi !== VERSI) gagal(`--validasi: artefak versi ${baca.versi}, generator ini mengerti versi ${VERSI}`);
  const h = baca.kartu?.['04'];
  if (h && h.query + h.transaksi !== h.totalStatement) {
    gagal(`--validasi: /04 tidak menutup — ${h.query} query + ${h.transaksi} transaksi ≠ ${h.totalStatement} statement`);
  }
  const umurHari = (Date.now() - Date.parse(baca.dihasilkanPada)) / 86_400_000;
  if (!Number.isFinite(umurHari)) gagal('--validasi: dihasilkanPada tidak terbaca sebagai tanggal');
  if (umurHari > BATAS_USIA_HARI) {
    gagal(`KUNING: artefak berumur ${Math.floor(umurHari)} hari (batas ${BATAS_USIA_HARI}) — kartu sudah tampil BELUM TERUKUR, jalankan node tools/ci/ukur-kartu.mjs`);
  }
  const terisi = Object.entries(baca.kartu ?? {}).filter(([, v]) => v !== null).map(([k]) => k);
  console.log(`OK: artefak versi ${baca.versi}, terukur ${terisi.join(' ') || '—'}, berumur ${Math.floor(umurHari)} hari dari ${BATAS_USIA_HARI}`);
  process.exit(0);
}

const { hasil, terisi, kosong } = isian;
const teks = modul.replace('__ISIAN__', JSON.stringify(hasil, null, 2));

if (MODE_CEK) {
  if (!existsSync(KELUAR)) gagal(`--cek: ${KELUAR} belum ada — jalankan tanpa --cek dulu.`);
  const sama = tanpaWaktu(readFileSync(KELUAR, 'utf8')) === tanpaWaktu(teks);
  console.log(sama ? `SAMA: angka kartu masih menutup sumbernya (${terisi.join(', ')})` : 'BEDA: sumber ukur berubah — jalankan node tools/ci/ukur-kartu.mjs');
  process.exit(sama ? 0 : 1);
}

writeFileSync(KELUAR, teks);
const h = hasil.kartu;
console.log(
  `ditulis ${KELUAR}\n  terukur: ${terisi.join(' ')} · belum terukur: ${kosong.join(' ') || '—'}\n` +
    `  /01 ${h['01'] ? `${h['01'].jumlah} ekstensi` : '-'} · ` +
    `/02 ${h['02'] ? `${h['02'].permintaanPerMenit} req/menit (${h['02'].ditegakkanDi})` : '-'} · ` +
    `/03 ${h['03'] ? `${h['03'].filePerDetik.toFixed(1)} file/detik agregat (${h['03'].totalFile} file / ${h['03'].totalDetik.toFixed(0)} s) dari ${h['03'].jumlahRun} run, per-run ${h['03'].min.toFixed(1)}–${h['03'].maks.toFixed(1)} · ${h['03'].runDibuang} run dibuang` : '-'} · ` +
    `/04 ${h['04'] ? `${h['04'].query} query / ${h['04'].permintaan} permintaan, p99 ${h['04'].p99Ms?.toFixed(4)} ms, maks ${h['04'].maksMs?.toFixed(4)} ms, ${h['04'].transaksi} transaction dikecualikan dari latensi` : '-'} · ` +
    `/05 ${h['05'] ? `${h['05'].fpsTerendah} fps terendah @${h['05'].lebar}×${h['05'].tinggi} di ${h['05'].perangkat}` : '-'}`
);
