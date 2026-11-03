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
//   /04 struktur sumber Hermes Control Tower: fungsi tes, registrasi rute, modul heksagonal
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

// ── /04 Hermes Control Tower ────────────────────────────────────────────────────
const DIR_HERMES =
  process.env.DIR_HERMES ?? '/home/arkan/Documents/Coding/hermes-control-tower';
const relatif = (f) => f.slice(DIR_HERMES.length + 1);

/** Jalan rekursif di atas repo orang lain, hanya-baca: hanya berkas .go, direktori hasil build
 *  dan hasil graph tidak pernah dibuka. Urutan deterministik karena signature korpus ikut dicetak. */
function berkasGo(akhiran) {
  const KECUALI = new Set(['.git', 'node_modules', 'bin', 'graphify-out', 'vendor', 'dist']);
  const keluar = [];
  const jalan = (dir) => {
    for (const entri of readdirSync(dir, { withFileTypes: true })) {
      if (entri.isDirectory()) {
        if (!KECUALI.has(entri.name)) jalan(join(dir, entri.name));
      } else if (entri.name.endsWith(akhiran)) {
        keluar.push(join(dir, entri.name));
      }
    }
  };
  jalan(DIR_HERMES);
  return keluar.sort();
}

/** Pola ServeMux yang dihitung sebagai rute: method, satu spasi, path absolut. Root tanpa method
 *  adalah penangkap SPA, bukan rute — dan dipisah supaya tidak menyamar jadi angka ke-83. */
const METODE_ROUTE = /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS) \//;

function ukurHermes() {
  if (!existsSync(DIR_HERMES)) return null;
  const sumber = berkasGo('.go');
  const berkasTest = sumber.filter((f) => f.endsWith('_test.go'));
  // Repo tanpa satu pun berkas tes Go = bukan hermes, atau hermes tanpa tes. Dua-duanya berarti
  // tidak ada angka: kartu gelap, bukan nol yang dicetak sebagai fakta.
  if (berkasTest.length === 0) return null;

  let testFungsi = 0;
  let benchmark = 0;
  const testKosong = [];
  for (const f of berkasTest) {
    const isi = readFileSync(f, 'utf8');
    const n = isi.match(/^func Test/gm)?.length ?? 0;
    if (n === 0) testKosong.push(relatif(f));
    testFungsi += n;
    benchmark += isi.match(/^func Benchmark/gm)?.length ?? 0;
  }
  // Berkas *_test.go tanpa satu pun `func Test` berarti regex-nya yang salah atau repo-nya yang
  // berubah bentuk; dua-duanya membuat "186 TEST" jadi bohong, jadi generator mati.
  if (testKosong.length) gagal(`/04: ${testKosong.length} berkas *_test.go tanpa "func Test" (contoh ${testKosong[0]})`);

  let rute = 0;
  let ruteApi = 0;
  let tangkapSPA = 0;
  const berkasRute = new Set();
  const takTerkenali = [];
  for (const f of sumber) {
    const isi = readFileSync(f, 'utf8');
    const literal = [...isi.matchAll(/HandleFunc\(\s*"([^"]*)"/g)];
    if (literal.length === 0) continue;
    const total = isi.match(/HandleFunc\(/g)?.length ?? 0;
    // Registrasi lewat variabel tidak bisa dibaca dari teks. Kalau panggilan lebih banyak dari
    // literal, ada rute yang hilang dari angka tanpa suara — itu yang ditagih di sini.
    if (total !== literal.length) {
      gagal(`/04: ${relatif(f)} punya ${total} panggilan HandleFunc tapi hanya ${literal.length} ber-argumen string literal`);
    }
    for (const m of literal) {
      const pola = m[1];
      if (METODE_ROUTE.test(pola)) {
        rute++;
        berkasRute.add(relatif(f));
        if (pola.slice(pola.indexOf(' ') + 1).startsWith('/api/')) ruteApi++;
      } else if (pola === '/') {
        // routes_web.go: satu-satunya penangkap root yang menyajikan SPA tertanam — bukan rute API.
        tangkapSPA++;
      } else {
        takTerkenali.push(`${relatif(f)}: "${pola}"`);
      }
    }
  }
  if (takTerkenali.length) {
    gagal(`/04: ${takTerkenali.length} registrasi tidak jatuh ke "METHOD /…" atau root SPA (contoh ${takTerkenali[0]})`);
  }

  const dirModul = join(DIR_HERMES, 'internal', 'modules');
  const namaModul = existsSync(dirModul)
    ? readdirSync(dirModul, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()
    : [];
  const tipeProtokol = sumber
    .filter((f) => f.includes('/pkg/protocol/'))
    .reduce((t, f) => t + (readFileSync(f, 'utf8').match(/^type [A-Z]/gm)?.length ?? 0), 0);

  if (rute === 0 || testFungsi === 0 || namaModul.length === 0) {
    gagal(`/04: tidak menutup — ${testFungsi} func Test, ${rute} rute, ${namaModul.length} modul di ${DIR_HERMES}; repo ini bukan bentuk yang diduganya`);
  }
  return {
    testFungsi,
    testBerkas: berkasTest.length,
    /** Nol dan dicetak: kartu ini tidak punya angka waktu respons karena tidak ada benchmark-nya. */
    benchmarkFungsi: benchmark,
    rute,
    ruteApi,
    berkasRute: berkasRute.size,
    tangkapSPA,
    modul: namaModul.length,
    namaModul,
    tipeProtokol,
    // Sidik jari korpus: generator yang dijalankan ke repo lain tidak boleh lolos --cek
    // hanya karena angkanya kebetulan mirip.
    signature: `${berkasTest.length}|${relatif(berkasTest[0])}|${relatif(berkasTest[berkasTest.length - 1])}|${namaModul.length}`,
    sumber: `${DIR_HERMES} (sumber yang dikomit: func Test di *_test.go, HandleFunc literal, internal/modules/*)`,
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
      '04': ukurHermes(),
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
  'export interface UkurHermes {',
  '  /** Jumlah `func Test` di seluruh *_test.go — bukan jumlah assertion. */',
  '  testFungsi: number;',
  '  testBerkas: number;',
  '  /** Nol berarti kartu ini tidak punya angka waktu respons; nilainya ikut dicetak. */',
  '  benchmarkFungsi: number;',
  '  /** Registrasi HandleFunc ber-"METHOD /path". Penangkap root SPA dihitung terpisah. */',
  '  rute: number;',
  '  ruteApi: number;',
  '  berkasRute: number;',
  '  tangkapSPA: number;',
  '  modul: number;',
  '  namaModul: string[];',
  '  /** Tipe data kontrak WebSocket di pkg/protocol. */',
  '  tipeProtokol: number;',
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
  "    '04': UkurHermes | null;",
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
  const hm = baca.kartu?.['04'];
  if (hm) {
    // Penutup yang bisa diperiksa TANPA membaca repo sumber — ini yang membuat langkah CI
    // --validasi tetap berarti di runner yang tidak punya hermes-control-tower: angka yang
    // dicetak harus cocok dengan daftar yang dicetak di sebelahnya.
    if (hm.modul !== hm.namaModul?.length) {
      gagal(`--validasi: /04 modul=${hm.modul} tapi namaModul berisi ${hm.namaModul?.length} nama — artefak disunting tangan?`);
    }
    if (hm.testFungsi < hm.testBerkas) {
      gagal(`--validasi: /04 ${hm.testFungsi} func Test tidak mungkin untuk ${hm.testBerkas} berkas *_test.go`);
    }
    if (hm.ruteApi > hm.rute) {
      gagal(`--validasi: /04 ruteApi=${hm.ruteApi} > rute=${hm.rute}`);
    }
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
    `/04 ${h['04'] ? `${h['04'].testFungsi} func Test di ${h['04'].testBerkas} berkas, ${h['04'].rute} rute (${h['04'].ruteApi} /api) di ${h['04'].berkasRute} berkas + ${h['04'].tangkapSPA} root SPA, ${h['04'].modul} modul, ${h['04'].tipeProtokol} tipe protokol, ${h['04'].benchmarkFungsi} benchmark` : '-'} · ` +
    `/05 ${h['05'] ? `${h['05'].fpsTerendah} fps terendah @${h['05'].lebar}×${h['05'].tinggi} di ${h['05'].perangkat}` : '-'}`
);
