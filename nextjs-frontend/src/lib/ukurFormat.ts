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
 *  jalur "tampilkan angka terakhir" karena itulah yang sedang kita hapus. */
export function saringMetrik(m: MetrikKartu, sekarang: number = Date.now()): UkurPerKartu | null {
  const umurHari = (sekarang - Date.parse(m.dihasilkanPada)) / 86_400_000;
  return umurHari > m.batasUsiaHari ? null : m.kartu;
}

const ribu = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const desimal = (n: number, d = 1) => n.toFixed(d).replace(".", ",");
const tanggal = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

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
      return m["04"] ? `${ribu(m["04"].query)} QUERY / ${m["04"].permintaan} REQ · p99 ${desimal(m["04"].p99Ms)} MS` : null;
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
      latencyP99: `${desimal(h.p99Ms, 2)} ms per query (n=${ribu(h.query)})`,
      concurrencyRps: `${ribu(h.permintaan)} permintaan dev lokal · ${h.uriBerbeda} URI · median ${h.medianPerPermintaan} / maks ${h.maksPerPermintaan} query per permintaan`,
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
    return `${ribu(h.query)} statement berjenis query dari ${ribu(h.permintaan)} permintaan dev lokal (${tanggal(h.rentangAwal)} → ${tanggal(h.rentangAkhir)}), koneksi ${h.connection}. ${ribu(h.transaksi)} statement transaction (BEGIN/COMMIT, durasinya selalu 0 di tangkapan Debugbar) DKECUALIKAN dari persentil — memasukkannya menurunkan p99 dari ${desimal(h.p99Ms, 2)} ke angka yang tidak berarti. p95 ${desimal(h.p95Ms, 2)} ms, median ${desimal(h.medianMs, 2)} ms, maks ${desimal(h.maksMs, 2)} ms. Snapshot dev, bukan produksi, bukan load test.`;
  }
  if (index === "05" && m["05"]) {
    const f = m["05"];
    return `Counter frame PengukurRender dibaca lewat puppeteer pada ${f.lebar}×${f.tinggi}, ${f.jumlahBab} bab × ${f.frame} sampel, ${tanggal(f.dibuat ?? "")}. Perangkat: ${f.perangkat}. Angka ini berlaku pada mesin itu, bukan pada pengunjung lain — dan yang dicetak adalah fps TERENDAH antar bab.${f.perantiLunak ? ` Jendela ukur yang sama di ${f.perantiLunak.perangkat}: ${desimal(f.perantiLunak.fpsTerendah)}–${desimal(f.perantiLunak.fpsTertinggi)} FPS.` : ""}`;
  }
  return null;
}
