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
//
// Peta `bahasa` (satu per kartu, tingkat atas) diukur dari berkas yang TERKOMIT di repo tiap
// kartu — lihat bahasaDominan() di bawah untuk aturan klasifikasinya dan alasannya.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
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
/** Naik ke 2 saat peta `bahasa` ikut ditulis: artefak versi 1 tidak punya bidang itu, jadi
 *  --validasi harus menolak diam-diam membaca modul lama daripada mengembalikan undefined
 *  untuk tiap baris dan membuat panggung kehilangan objek tanpa satu pun pesan kesalahan. */
const VERSI = 2;

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

// ── bahasa dominan per kartu ────────────────────────────────────────────────────
// Dipakai panggung 3D untuk memutuskan logo bahasa mana yang mengisi kotak WORKS, dan
// dicetak di strip SPEC supaya klaimnya bisa dibantah. Ia sengaja BUKAN field di dalam
// hasil kartu: /03 gelap untuk filePerDetik karena /tmp/graphify.log hilang, sementara
// komposisi sumbernya tetap terukur — menaruh bahasa di dalam ukurEkstraksi() akan membuat
// satu baris tidak pernah punya objek karena alasan yang tidak ada hubungannya dengan bahasa.
const DIR_GRAPHIFY = process.env.DIR_GRAPHIFY ?? '/home/arkan/Documents/Coding/graphify-devkit';
const REPO_KARTU = {
  '01': DIR_FERRARI,
  '02': DIR_PICKERTIME,
  '03': DIR_GRAPHIFY,
  '04': DIR_HERMES,
  '05': AKAR,
};

/** Hanya bahasa pemrograman. CSS dan HTML dibuang dari kontes, bukan dari korpus: yang
 *  diminta pengunjung adalah "bahasa apa yang menulis proyek ini", dan 180 KB template HTML
 *  di Pickertime atau 187 KB shell CSS di ferrari-ubuntu bukan jawaban itu. */
const PETA_EKSTENSI = {
  js: 'JavaScript', mjs: 'JavaScript', cjs: 'JavaScript', jsx: 'JavaScript',
  ts: 'TypeScript', tsx: 'TypeScript',
  py: 'Python',
  go: 'Go',
  sh: 'Bash',
};
const PETA_SHEBANG = {
  python3: 'Python', python: 'Python', node: 'JavaScript', bash: 'Bash', sh: 'Bash', zsh: 'Bash',
};
const SHEBANG = /^#!\s*(?:\/usr\/bin\/env\s+)?(?:\/[^\s]*)?(python3?|bash|sh|zsh|node)(?:\s|$)/;

/** Sabuk untuk korpus tanpa git. `bin` TIDAK ada di daftar ini dan tidak boleh masuk:
 *  keenam berkas sumber graphify-devkit hidup di bin/ dan tanpa ekstensi. */
const BUANG_JALUR = /(^|\/)(dist|build|node_modules|\.next|graphify-out|vendor|tmp|pb_data|__pycache__|\.venv)(\/|$)|\.min\./;

function berkasDirektori(akar) {
  const keluar = [];
  const jalan = (rel) => {
    for (const entri of readdirSync(join(akar, rel), { withFileTypes: true })) {
      const nama = rel ? `${rel}/${entri.name}` : entri.name;
      if (entri.isDirectory()) jalan(nama);
      else if (entri.isFile()) keluar.push(nama);
    }
  };
  jalan('');
  return keluar;
}

/** Korpus = berkas yang ter-commit. Itu bukan kenyamanan, itu yang membuat angkanya benar:
 *  16,7 MB dari 16,9 MB byte `.js` Pickertime adalah tools/test/tmp/dev-bundle*.js (artefak
 *  run tes), dan `server` 22 MB + `agent` 11 MB di root hermes adalah biner hasil build yang
 *  tidak pernah di-commit. Keduanya hilang sendiri begitu korpusnya git ls-files. */
function korpus(akar) {
  try {
    const teks = execFileSync('git', ['-C', akar, 'ls-files', '-z'], {
      encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'],
    });
    const nama = teks.split('\0').filter(Boolean).sort();
    if (nama.length) return { nama, korpus: 'git' };
  } catch {
    /* bukan repo, atau git tidak ada — jatuh ke jalan direktori di bawah */
  }
  return { nama: berkasDirektori(akar).sort(), korpus: 'direktori' };
}

function bahasaDominan(akar, id) {
  if (!existsSync(akar)) return null;
  const { nama, korpus: jenis } = korpus(akar);
  const byte = new Map();
  const berkas = new Map();
  let byteTotal = 0;
  let binerDilewati = 0;
  let jalurDibuang = 0;
  for (const rel of nama) {
    if (BUANG_JALUR.test(rel)) { jalurDibuang++; continue; }
    // Modul hasil-olahan ini sendiri BUKAN bahan bakar: /05 diukur dari repo ini, jadi tanpa
    // baris itu setiap penulisan artefak mengubah byteTotal TypeScript dan --cek berikutnya
    // selalu BEDA. Angka "bahasa apa yang menulis proyek ini" tidak boleh bergantung pada
    // berapa banyak angka yang baru saja dicetak proyek itu tentang dirinya sendiri.
    if (resolve(akar, rel) === KELUAR) continue;
    let isi;
    try {
      if (!statSync(join(akar, rel)).isFile()) continue;
      isi = readFileSync(join(akar, rel));
    } catch {
      continue; // gitlink submodule, symlink mati
    }
    // Uji konten, bukan daftar ekstensi: web/dist/index.html hermes (574.422 B satu berkas)
    // TERKOMIT dan nyaris menyalip Go kalau korpusnya tidak dibersihkan oleh aturan jalur.
    if (isi.subarray(0, 8192).includes(0)) { binerDilewati++; continue; }
    const akhir = rel.slice(rel.lastIndexOf('.') + 1);
    const bahasa = PETA_EKSTENSI[(akhir === rel ? '' : akhir).toLowerCase()]
      ?? PETA_SHEBANG[SHEBANG.exec(isi.subarray(0, 512).toString('utf8'))?.[1] ?? ''];
    if (!bahasa) continue;
    byte.set(bahasa, (byte.get(bahasa) ?? 0) + isi.length);
    berkas.set(bahasa, (berkas.get(bahasa) ?? 0) + 1);
    byteTotal += isi.length;
  }
  // Yang menang adalah BYTE, bukan jumlah berkas. /03 adalah kasus yang membuatnya penting:
  // 3 berkas Python 20.996 B melawan 4 berkas Bash 8.128 B — jumlah berkas bilang Bash,
  // dan itu bukan bahasa yang menulis proyek itu.
  const peringkat = [...byte.entries()]
    .map(([bahasa, b]) => ({ bahasa, byte: b, berkas: berkas.get(bahasa) }))
    .sort((a, b) => b.byte - a.byte || a.bahasa.localeCompare(b.bahasa));
  if (peringkat.length === 0) return null;
  if (peringkat[0].byte < peringkat[0].berkas) {
    gagal(`/${id} bahasa: ${peringkat[0].byte} byte tidak mungkin untuk ${peringkat[0].berkas} berkas sumber`);
  }
  const teratas = peringkat[0];
  return {
    bahasa: teratas.bahasa,
    byte: teratas.byte,
    berkas: teratas.berkas,
    peringkat,
    byteTotal,
    jumlahBerkas: nama.length,
    binerDilewati,
    jalurDibuang,
    korpus: jenis,
    // Tiga angka yang bergerak begitu kodenya bergerak: repo lain yang dipasang lewat DIR_*
    // tidak bisa kebetulan menyamakan ketiganya, jadi --cek gagal, bukan diam-diam mirip.
    signature: `${jenis}|${nama.length}|${byteTotal}`,
    sumber: `${jenis} di ${akar}`,
  };
}

function ukurBahasaSemua() {
  const keluar = {};
  for (const [id, akar] of Object.entries(REPO_KARTU)) keluar[id] = bahasaDominan(akar, id);
  return keluar;
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
    bahasa: ukurBahasaSemua(),
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
  'export interface UkurBahasa {',
  '  /** Bahasa dengan byte sumber TERBANYAK di korpus ter-commit — bukan jumlah berkas. */',
  '  bahasa: string;',
  '  byte: number;',
  '  berkas: number;',
  '  /** Semua bahasa terklasifikasi, terurut turun menurut byte. Runner-up ikut dicetak di',
  '   *  strip supaya keunggulan tipis (Pickertime 1,20x atas JavaScript) terlihat, bukan',
  '   *  tersembunyi di balik satu kata. */',
  '  peringkat: { bahasa: string; byte: number; berkas: number }[];',
  '  byteTotal: number;',
  '  jumlahBerkas: number;',
  '  binerDilewati: number;',
  '  jalurDibuang: number;',
  "  korpus: 'git' | 'direktori';",
  '  signature: string;',
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
  '  /** Peta paralel `kartu`: bahasa dominan yang mengisi kotak WORKS. Null berarti baris itu',
  '   *  tidak punya objek 3D — kartu tidak boleh memudar untuk objek yang tidak datang. */',
  '  bahasa: {',
  "    '01': UkurBahasa | null;",
  "    '02': UkurBahasa | null;",
  "    '03': UkurBahasa | null;",
  "    '04': UkurBahasa | null;",
  "    '05': UkurBahasa | null;",
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
  // Peta bahasa diperiksa tanpa membaca repo sumber mana pun, jadi langkah CI --validasi di
  // runner yang bersih tetap menangkap artefak yang disunting tangan.
  for (const [id, hb] of Object.entries(baca.bahasa ?? {})) {
    if (!hb) continue;
    const p = hb.peringkat ?? [];
    if (!p.length) gagal(`--validasi: /${id} bahasa=${hb.bahasa} tapi peringkat kosong`);
    if (p[0].bahasa !== hb.bahasa) {
      gagal(`--validasi: /${id} bahasa="${hb.bahasa}" bukan pemuncak peringkat ("${p[0].bahasa}") — artefak disunting tangan?`);
    }
    for (let i = 1; i < p.length; i++) {
      if (p[i].byte > p[i - 1].byte) gagal(`--validasi: /${id} peringkat tidak terurut turun di indeks ${i}`);
    }
    const jumlah = p.reduce((a, x) => a + x.byte, 0);
    if (jumlah !== hb.byteTotal) {
      gagal(`--validasi: /${id} jumlah peringkat ${jumlah} != byteTotal ${hb.byteTotal}`);
    }
    if (hb.byte < hb.berkas) {
      gagal(`--validasi: /${id} ${hb.byte} byte tidak mungkin untuk ${hb.berkas} berkas sumber`);
    }
    if (hb.byte > hb.byteTotal) gagal(`--validasi: /${id} byte ${hb.byte} > byteTotal ${hb.byteTotal}`);
  }
  const umurHari = (Date.now() - Date.parse(baca.dihasilkanPada)) / 86_400_000;
  if (!Number.isFinite(umurHari)) gagal('--validasi: dihasilkanPada tidak terbaca sebagai tanggal');
  if (umurHari > BATAS_USIA_HARI) {
    gagal(`KUNING: artefak berumur ${Math.floor(umurHari)} hari (batas ${BATAS_USIA_HARI}) — kartu sudah tampil BELUM TERUKUR, jalankan node tools/ci/ukur-kartu.mjs`);
  }
  const terisi = Object.entries(baca.kartu ?? {}).filter(([, v]) => v !== null).map(([k]) => k);
  const bahasaTerukur = Object.entries(baca.bahasa ?? {}).filter(([, v]) => v !== null).length;
  console.log(
    `OK: artefak versi ${baca.versi}, terukur ${terisi.join(' ') || '—'}, ` +
      `bahasa terukur ${bahasaTerukur}/5, berumur ${Math.floor(umurHari)} hari dari ${BATAS_USIA_HARI}`
  );
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
const hb = hasil.bahasa;
console.log(
  `ditulis ${KELUAR}\n  terukur: ${terisi.join(' ')} · belum terukur: ${kosong.join(' ') || '—'}\n` +
    `  /01 ${h['01'] ? `${h['01'].jumlah} ekstensi` : '-'} · ` +
    `/02 ${h['02'] ? `${h['02'].permintaanPerMenit} req/menit (${h['02'].ditegakkanDi})` : '-'} · ` +
    `/03 ${h['03'] ? `${h['03'].filePerDetik.toFixed(1)} file/detik agregat (${h['03'].totalFile} file / ${h['03'].totalDetik.toFixed(0)} s) dari ${h['03'].jumlahRun} run, per-run ${h['03'].min.toFixed(1)}–${h['03'].maks.toFixed(1)} · ${h['03'].runDibuang} run dibuang` : '-'} · ` +
    `/04 ${h['04'] ? `${h['04'].testFungsi} func Test di ${h['04'].testBerkas} berkas, ${h['04'].rute} rute (${h['04'].ruteApi} /api) di ${h['04'].berkasRute} berkas + ${h['04'].tangkapSPA} root SPA, ${h['04'].modul} modul, ${h['04'].tipeProtokol} tipe protokol, ${h['04'].benchmarkFungsi} benchmark` : '-'} · ` +
    `/05 ${h['05'] ? `${h['05'].fpsTerendah} fps terendah @${h['05'].lebar}×${h['05'].tinggi} di ${h['05'].perangkat}` : '-'}` +
    `\n  bahasa: ` +
    Object.entries(hb)
      .map(([id, v]) =>
        v
          ? `/${id} ${v.bahasa} ${v.byte.toLocaleString('id-ID')} B/${v.berkas}` +
            (v.peringkat[1] ? ` (menyusul ${v.peringkat[1].bahasa}, ${(v.byte / v.peringkat[1].byte).toFixed(2)}x)` : ' (sendiri)')
          : `/${id} -`
      )
      .join(' · ')
);
