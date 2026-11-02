// Pembuat snapshot riwayat commit → nextjs-frontend/src/data/riwayatCommit.ts
//
//   node tools/ci/riwayat-commit.mjs            # tulis ulang modul
//   node tools/ci/riwayat-commit.mjs --cek     # bandingkan dengan yang ada, tanpa menulis
//
// Kenapa perlu sama sekali: `.git` dibuang oleh kedua .dockerignore dan image produksi tidak
// menerima APP_COMMIT, jadi `git log` tidak bisa dijalankan di server maupun saat build.
// Satu-satunya jalan yang jujur adalah membaca riwayat di mesin penulis pada saat snapshot,
// lalu menampilkannya sebagai salinan yang bertanggal — halaman tercetak "snapshot", bukan
// "langsung".
//
// Aturan angka: setiap commit yang reachable dari HEAD masuk salah satu keranjang tipe, dan
// tool ini berhenti kalau jumlah keranjang tidak sama dengan total. Tidak ada commit yang
// hilang diam-diam.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const AKAR = resolve(dirname(new URL(import.meta.url).pathname), '..', '..');
const KELUAR = resolve(AKAR, 'nextjs-frontend', 'src', 'data', 'riwayatCommit.ts');
const MAKS_ENTRI = 20;
const MODE_CEK = process.argv.slice(2).includes('--cek');

const git = (...arg) => execFileSync('git', ['-C', AKAR, ...arg], { encoding: 'utf8' });

// %x1f (unit pemisah) dipakai supaya subject yang mengandung spasi atau tab tetap terbelah
// pada batas yang tidak mungkin muncul di dalam pesan commit.
const PISAH = '\x1f';
const POLA = /^([a-z]+)(?:\(([^)]*)\))?!?:\s+/;

function tebang(subject) {
  const cocok = subject.match(POLA);
  if (!cocok) return { tipe: 'tanpa-pola', scope: null, ringkasan: subject };
  return { tipe: cocok[1], scope: cocok[2] ?? null, ringkasan: subject.slice(cocok[0].length) };
}

const mentah = git('log', '--date=short', `--pretty=format:%h${PISAH}%ad${PISAH}%s`)
  .split('\n')
  .filter(Boolean)
  .map((b) => {
    const [commit, tanggal, ...pesan] = b.split(PISAH);
    return { commit, tanggal, subject: pesan.join(PISAH) };
  });

const total = mentah.length;
const keranjang = {};
for (const m of mentah) {
  const { tipe } = tebang(m.subject);
  keranjang[tipe] = (keranjang[tipe] ?? 0) + 1;
}
const jumlahKeranjang = Object.values(keranjang).reduce((a, b) => a + b, 0);
if (jumlahKeranjang !== total) {
  console.error(`keranjang tidak menutup: ${jumlahKeranjang} dari ${total} commit terhitung`);
  process.exit(1);
}

const perTipe = Object.entries(keranjang)
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  .map(([tipe, jumlah]) => ({ tipe, jumlah }));

const entri = mentah.slice(0, MAKS_ENTRI).map((m) => {
  const { tipe, scope, ringkasan } = tebang(m.subject);
  return { commit: m.commit, tanggal: m.tanggal, tipe, scope, ringkasan };
});

// Siapa yang menulis riwayat ini, dan berapa yang lewat pull request. Dipakai blok "author"
// di /baca, jadi angkanya tidak boleh diketik tangan: identitas git berubah tiap kali seseorang
// mengubah nama di konfigurasinya.
const nonMerge = Number(git('rev-list', '--count', '--no-merges', 'HEAD'));
const lewatPr = mentah.filter((m) => !/^Merge /.test(m.subject) && /\(#[0-9]+\)$/.test(m.subject)).length;
const penulis = git('shortlog', '-sn', '-e', '--no-merges', 'HEAD')
  .split('\n')
  .filter(Boolean)
  .map((baris) => {
    const cocok = baris.match(/^\s*(\d+)\t(.*)\s<(.*)>\s*$/);
    if (!cocok) return null;
    const [, jumlah, nama, email] = cocok;
    return { nama: nama.trim(), email, jumlah: Number(jumlah), bot: nama.trim().endsWith('[bot]') };
  })
  .filter((p) => p !== null)
  .sort((a, b) => b.jumlah - a.jumlah || a.nama.localeCompare(b.nama));
const jumlahPenulis = penulis.reduce((a, p) => a + p.jumlah, 0);
if (jumlahPenulis !== nonMerge) {
  console.error(`penulis tidak menutup: ${jumlahPenulis} dari ${nonMerge} commit tanpa merge terhitung`);
  process.exit(1);
}

const snapshot = {
  dicatat: new Date().toISOString(),
  kepala: mentah[0].commit,
  totalCommit: total,
  nonMerge,
  lewatPr,
  penulis,
  rentang: { awal: mentah[mentah.length - 1].tanggal, akhir: mentah[0].tanggal },
  perTipe,
  entri,
};

const isian = [
  '// ─────────────────────────────────────────────────────────────────────────────',
  '// Dihasilkan oleh tools/ci/riwayat-commit.mjs dari `git log` di mesin penulis.',
  '// JANGAN diedit tangan dan jangan dipakai seolah langsung: image produksi tidak',
  '// membawa .git, jadi modul ini adalah salinan bertanggal. Refresh dengan',
  '//   node tools/ci/riwayat-commit.mjs',
  '// sebelum menampilkan angka yang dianggap masih benar.',
  '// ─────────────────────────────────────────────────────────────────────────────',
  '',
  'export interface EntriRiwayat {',
  '  /** Hash pendek seperti yang dicetak `git log --pretty=%h`. */',
  '  commit: string;',
  '  /** Tanggal penulis (author date) dalam ISO `YYYY-MM-DD`. */',
  '  tanggal: string;',
  '  /** Kata sebelum titik dua pada baris subjek; commit tanpa pola konvensi masuk',
  '   *  keranjang "tanpa-pola" dan tidak dibuang. */',
  '  tipe: string;',
  '  scope: string | null;',
  '  /** Sisa baris subjek, apa adanya. */',
  '  ringkasan: string;',
  '}',
  '',
  `/** Kapan snapshot ini diambil dari repositori lokal, ISO UTC. */`,
  `export const DICATAT = ${JSON.stringify(snapshot.dicatat)};`,
  '',
  `/** HEAD repositori lokal saat snapshot diambil. */`,
  `export const KEPALA_COMMIT = ${JSON.stringify(snapshot.kepala)};`,
  '',
  `/** Seluruh commit yang reachable dari HEAD, termasuk merge. */`,
  `export const TOTAL_COMMIT = ${snapshot.totalCommit};`,
  '',
  `export const RENTANG_COMMIT = ${JSON.stringify(snapshot.rentang, null, 2)};`,
  '',
  '/** Distribusi tipe atas SELURUH riwayat. Jumlahnya wajib sama dengan TOTAL_COMMIT. */',
  `export const PER_TIPE = ${JSON.stringify(snapshot.perTipe, null, 2)} as const;`,
  '',
  '/** Commit tanpa merge di HEAD. Jumlah PENULIS wajib sama dengan angka ini. */',
  `export const COMMIT_NON_MERGE = ${snapshot.nonMerge};`,
  '',
  '/** Commit tanpa merge yang subjeknya berakhir dengan tautan pull request, mis. "(#50)". */',
  `export const COMMIT_LEWAT_PR = ${snapshot.lewatPr};`,
  '',
  'export interface Penulis {',
  '  nama: string;',
  '  email: string;',
  '  jumlah: number;',
  '  /** Nama yang berakhir "[bot]" — dependabot ikut menulis riwayat ini dan tidak disamarkan. */',
  '  bot: boolean;',
  '}',
  '',
  '/** Penulis per identitas git, banyak dulu. Termasuk identitas ganda orang yang sama. */',
  `export const PENULIS: Penulis[] = ${JSON.stringify(snapshot.penulis, null, 2)};`,
  '',
  `/** ${MAKS_ENTRI} commit terakhir, baru ke lama. */`,
  `export const RIWAYAT_COMMIT: EntriRiwayat[] = ${JSON.stringify(snapshot.entri, null, 2)};`,
  '',
].join('\n');

const tanpaWaktu = (t) => t.replace(/^export const DICATAT = .*$/m, 'export const DICATAT = -;');

if (MODE_CEK) {
  if (!existsSync(KELUAR)) {
    console.error(`--cek: ${KELUAR} belum ada — jalankan tanpa --cek dulu.`);
    process.exit(1);
  }
  const sama = tanpaWaktu(readFileSync(KELUAR, 'utf8')) === tanpaWaktu(isian);
  console.log(
    sama
      ? 'SAMA: snapshot modul masih menutup HEAD'
      : `BEDA: modul tidak sama dengan HEAD sekarang — jalankan node tools/ci/riwayat-commit.mjs`
  );
  process.exit(sama ? 0 : 1);
}

writeFileSync(KELUAR, isian);
console.log(
  `ditulis ${KELUAR}\n  HEAD ${snapshot.kepala} · ${snapshot.totalCommit} commit · ` +
    `${snapshot.rentang.awal} → ${snapshot.rentang.akhir} · ${snapshot.entri.length} entri tersimpan · ` +
    `${snapshot.nonMerge} tanpa merge dalam ${snapshot.penulis.length} identitas (${snapshot.lewatPr} lewat PR) · ` +
    `keranjang ${perTipe.map((t) => `${t.tipe}=${t.jumlah}`).join(' ')}`
);
