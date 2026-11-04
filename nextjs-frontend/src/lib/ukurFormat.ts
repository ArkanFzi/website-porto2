/** Satu-satunya tempat angka terukur kartu proyek diubah menjadi kalimat.
 *
 *  Kenapa satu modul: baris kartu dan sel SPEC dulu ditulis tangan dua-duanya, dan itulah
 *  cara "4.170 QUERIES" bisa berarti satu hal di kartu dan hal lain di strip. Sekarang kedua
 *  tempat memanggil fungsi yang sama atas objek yang sama, jadi mereka tidak bisa berbeda
 *  angka tanpa mengubah generatornya.
 *
 *  Kenapa pembulatan ada di sini dan tidak di artefak: tools/ci/ukur-kartu.mjs menyimpan ms
 *  dan fps MENTAH. Kalau yang disimpan sudah "1.5", tidak ada yang bisa membedakan angka
 *  yang dibulatkan dari angka yang dikarang.
 *
 *  `saringMetrik` memuat jam dan karena itu hanya boleh dipanggil di server (app/page.tsx):
 *  nilai yang berbeda antara render dan hidrasi akan memicu peringatan React pada halaman
 *  yang gerbangnya menghitung pageerror. */
import type { MetrikKartu, UkurJendela } from "@/data/metrikKartu";

export const BELUM_TERUKUR = "BELUM TERUKUR";

export type IndexKartu = keyof MetrikKartu["kartu"];
export type UkurPerKartu = MetrikKartu["kartu"];

/** `undefined` ikut diterima karena prop di ChapterArchives opsional, sama seperti `repos`. */
export type UkurTersedia = UkurPerKartu | null | undefined;

/** null = kartu gelap. Ini satu-satunya jalan keluar selain menampilkan angka: tidak ada
 *  jalur "tampilkan angka terakhir" karena itulah yang sedang kita hapus.
 *
 *  Hukum umur ada di SATU tempat (`saringArtefak`) dan fungsi ini hanya memproyeksikan
 *  sebagian hasilnya: kalau umur diuji dua kali, angka di kartu dan objek 3D di belakang
 *  kotak bisa berpisah pada hari stempelnya lewat — dan itu justru keadaan yang paling
 *  tidak boleh terjadi di halaman yang seluruh klaimnya berbunyi "terukur". */
export function saringMetrik(m: MetrikKartu, sekarang: number = Date.now()): UkurPerKartu | null {
  return saringArtefak(m, sekarang)?.kartu ?? null;
}

/** Artefak utuh yang sudah lolos gerbang umur, atau null kalau gelap. `kartu` dan `bahasa`
 *  selalu datang berpasangan: keduanya satu berkas, satu stempel, satu hukum. */
export function saringArtefak(
  m: MetrikKartu,
  sekarang: number = Date.now()
): { kartu: UkurPerKartu; bahasa: MetrikKartu["bahasa"] } | null {
  const umurHari = (sekarang - Date.parse(m.dihasilkanPada)) / 86_400_000;
  // `Number.isFinite` bukan hiasan: stempel yang hilang atau tidak terbaca membuat umurHari
  // NaN, dan `NaN > batas` itu false — tanpa pemeriksaan ini kartu gelap justru mencetak
  // angka lama seolah-olah baru diukur. Kartu gelap lebih jujur dari angka tanpa sumber.
  if (!Number.isFinite(umurHari)) return null;
  return umurHari > m.batasUsiaHari ? null : { kartu: m.kartu, bahasa: m.bahasa };
}

/** Peta bahasa per baris arsip, indeks = indeks baris ChapterArchives (0 = "01").
 *  Urutan ini bukan kebetulan: ChapterArchives menulis `index: "01".."05"` persis pada
 *  urutan render, dan `BARIS_FERRARI = 0` adalah baris yang sama. Kalau urutan baris
 *  pernah berubah, objek 3D yang salah yang muncul — itu sebabnya angka ini diturunkan
 *  dari daftar, bukan dari penomoran manual. */
const BARIS_KARTU: IndexKartu[] = ["01", "02", "03", "04", "05"];

const ribu = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const desimal = (n: number, d = 1) => n.toFixed(d).replace(".", ",");
const tanggal = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function bahasaPerBaris(
  artefak: { bahasa: MetrikKartu["bahasa"] } | null
): (string | null)[] {
  if (!artefak) return BARIS_KARTU.map(() => null);
  return BARIS_KARTU.map((i) => artefak.bahasa[i]?.bahasa ?? null);
}

/** Satu kalimat per baris arsip: SELURUH peringkat bahasa terukur, bukan hanya yang menang.
 *  Pemecahannya disengaja: /02 unggul 1,20× atas JavaScript dan angka itu hilang kalau yang
 *  ditulis cuma kata "TypeScript" — padahal ketipisan margin adalah bagian dari klaim.
 *  Formatnya hidup di modul ini, sama seperti angka kartu yang lain, supaya strip dan alat
 *  ukur tidak bisa berbeda kalimat. */
function kalimatBahasa(u: MetrikKartu["bahasa"][IndexKartu]): string | null {
  if (!u) return null;
  const sisa = u.peringkat.slice(1);
  const runnerUp = sisa.length
    ? ` · lalu ${sisa.map((p) => `${p.bahasa} ${ribu(p.byte)} B`).join(" · ")}`
    : " · tidak ada bahasa lain yang terklasifikasi";
  const unggul = sisa.length
    ? ` · unggul ${desimal(u.byte / Math.max(sisa[0].byte, 1), 2)}× atas ${sisa[0].bahasa}`
    : "";
  return (
    `${u.bahasa} ${ribu(u.byte)} B pada ${u.berkas} berkas${runnerUp}` +
    `${unggul} · korpus ${u.korpus === "git" ? "ter-commit" : "terpilih"} ` +
    `${u.jumlahBerkas} berkas / ${ribu(u.byteTotal)} B`
  );
}

export function peringkatPerBaris(
  artefak: { bahasa: MetrikKartu["bahasa"] } | null
): (string | null)[] {
  if (!artefak) return BARIS_KARTU.map(() => null);
  return BARIS_KARTU.map((i) => kalimatBahasa(artefak.bahasa[i]));
}

/** Nama pendek dari string WEBGL_debug_renderer_info yang panjangnya tidak muat di kartu.
 *  String utuh tetap ikut di strip SPEC, jadi ini hanya label. */
function namaPerangkat(perangkat: string): string {
  const cocok = perangkat.match(/(RTX|GTX|MX|Radeon|Apple M|Arc)\s?[0-9A-Za-z]*/i);
  return cocok ? cocok[0].trim().toUpperCase() : "GPU TANPA NAMA";
}

const jendela = (w: UkurJendela) => `${desimal(w.fpsTerendah, 1)} FPS @${w.lebar}×${w.tinggi}`;

/** Baris kecil di bawah judul kartu. Panjang dijaga ≤ 45 karakter: barisnya `md:flex-nowrap`
 *  dan sudah mentok lebar di 1440 — yang mengukur tumpahnya adalah docs/verify/ekstra-probe. */
export function barisKartu(index: IndexKartu, m: UkurTersedia): string | null {
  if (!m) return null;
  switch (index) {
    case "01":
      return m["01"] ? `${m["01"].jumlah} EKSTENSI DALAM-PROSES · TANPA DAEMON` : null;
    case "02":
      return m["02"] ? `${m["02"].permintaanPerMenit} REQ/MENIT DITEGAKKAN DI KODE` : null;
    case "03":
      return m["03"] ? `${desimal(m["03"].filePerDetik)} FILE/DETIK SATU RUN · n=${m["03"].jumlahRun}` : null;
    case "04":
      return m["04"] ? `${m["04"].testFungsi} TEST · ${m["04"].rute} RUTE · ${m["04"].modul} MODUL GO` : null;
    case "05":
      return m["05"] ? `${jendela(m["05"])} · ${namaPerangkat(m["05"].perangkat)}` : null;
  }
}

/** Sel-sel strip SPEC yang nilainya datang dari alat ukur, bukan dari teks yang diketik. */
export function selUkur(index: IndexKartu, m: UkurTersedia): { latencyP99?: string; concurrencyRps?: string } | null {
  if (!m) return null;
  if (index === "01" && m["01"]) {
    return { concurrencyRps: `${m["01"].jumlah} ekstensi dalam satu proses shell · tanpa IPC` };
  }
  if (index === "02" && m["02"]) {
    return {
      concurrencyRps: `${m["02"].permintaanPerMenit} req/menit per akun, ditegakkan di ${m["02"].ditegakkanDi}`,
    };
  }
  if (index === "03" && m["03"]) {
    return {
      concurrencyRps: `${desimal(m["03"].filePerDetik)} file/detik agregat (${ribu(m["03"].totalFile)} file / ${desimal(m["03"].totalDetik, 0)} s, ${m["03"].jumlahRun} run)`,
    };
  }
  if (index === "04" && m["04"]) {
    const h = m["04"];
    return {
      // Sel ini sengaja berisi nol, bukan angka: repo tidak punya func Benchmark dan tidak punya
      // artefak profil yang dikomit, jadi tidak ada waktu respons yang bisa dilaporkan.
      latencyP99: h.benchmarkFungsi === 0
        ? "tidak diukur — 0 func Benchmark di repo ini"
        : `${h.benchmarkFungsi} benchmark ada di repo, belum dilipat ke kartu`,
      concurrencyRps: `${h.rute} rute (${h.ruteApi} /api) di ${h.berkasRute} berkas · ${h.testFungsi} func Test di ${h.testBerkas} berkas · ${h.modul} modul`,
    };
  }
  if (index === "05" && m["05"]) {
    const f = m["05"];
    return {
      latencyP99: `${desimal(1000 / f.fpsTerendah, 1)} ms per frame (turunan dari ${desimal(f.fpsTerendah)} FPS)`,
      concurrencyRps: `${jendela(f)} ${namaPerangkat(f.perangkat)}${f.perantiLunak ? ` · ${desimal(f.perantiLunak.fpsTerendah)} FPS SwiftShader` : ""}`,
    };
  }
  return null;
}

/** Baris asal-usul di bawah sel: apa yang diukur, berapa banyak, dan apa yang TIDAK termasuk. */
export function catatanUkur(index: IndexKartu, m: UkurTersedia): string | null {
  if (!m) return null;
  if (index === "01" && m["01"]) {
    return `${m["01"].jumlah} direktori dihitung ulang dari disk, tiap satu harus punya extension.js dan metadata.json (${m["01"].sumber}): ${m["01"].nama.join(", ")}. Tidak ada waktu respons: tidak ada batas proses di antara shell dan ekstensinya, jadi tidak ada IPC yang bisa diukur.`;
  }
  if (index === "02" && m["02"]) {
    return `Batas ${m["02"].permintaanPerMenit} req/menit dibaca dari konstanta yang ditegakkan hook (${m["02"].ditegakkanDi}), jadi ia masih benar kalau kode berubah. Waktu respons sintetisasi TIDAK dicetak: tidak ada satu pun artefak pengukur di repo itu — angka "589" yang dulu dipakai hanya berupa komentar di tools/test/findings.mjs, dan "774" ternyata durasi tes HTTP dari eksperimen lain. Mengukurnya lagi butuh PocketBase hidup + kunci Gemini berbayar.`;
  }
  if (index === "03" && m["03"]) {
    const e = m["03"];
    return `Diukur dari stempel post-commit hook ${e.jumlahRun} run pada ${tanggal(e.jendelaAwal)}: ${ribu(e.totalFile)} file uncached dibagi ${desimal(e.totalDetik, 0)} s seluruh jalan hook (jalan repo, tulis graph, sinkron) — bukan kecepatan parser saja. Rentang per-run ${desimal(e.min)}–${desimal(e.maks)} file/detik; ${e.runDibuang} run tanpa stempel penutup dibuang.`;
  }
  if (index === "04" && m["04"]) {
    const h = m["04"];
    return `Dihitung dari sumber yang dikomit, bukan dari sistem yang sedang berjalan: ${h.testFungsi} "func Test" di ${h.testBerkas} berkas *_test.go, ${h.rute} registrasi HandleFunc ber-"METHOD /path" di ${h.berkasRute} berkas (${h.ruteApi} di antaranya di bawah /api; satu penangkap root yang menyajikan React tertanam dihitung terpisah, bukan sebagai rute API), ${h.modul} modul di internal/modules, ${h.tipeProtokol} tipe kontrak di pkg/protocol. Tidak ada angka waktu respons di panel ini karena ${h.benchmarkFungsi} func Benchmark dan nol artefak profil yang dikomit. Korpus: ${h.signature}. Angka ini bergerak kalau kodenya bergerak — itu gunanya.`;
  }
  if (index === "05" && m["05"]) {
    const f = m["05"];
    return `Counter frame PengukurRender dibaca lewat puppeteer pada ${f.lebar}×${f.tinggi}, ${f.jumlahBab} bab × ${f.frame} sampel, ${tanggal(f.dibuat ?? "")}. Perangkat: ${f.perangkat}. Angka ini berlaku pada mesin itu, bukan pada pengunjung lain — dan yang dicetak adalah fps TERENDAH antar bab.${f.perantiLunak ? ` Jendela ukur yang sama di ${f.perantiLunak.perangkat}: ${desimal(f.perantiLunak.fpsTerendah)}–${desimal(f.perantiLunak.fpsTertinggi)} FPS.` : ""}`;
  }
  return null;
}
