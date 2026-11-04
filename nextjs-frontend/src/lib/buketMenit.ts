/** Satu sumber untuk gumpalan per menit dan untuk bentuk yang menggambarkan gumpalan itu.
 *
 *  Aturan yang ditegakkan di sini: TIDAK ADA BENTUK TANPA ANGKA. Sebuah slot bilah hanya
 *  boleh punya tinggi kalau ada laporan yang mengisinya; slot kosong tingginya nol, bukan
 *  bilah pendek "biar terlihat hidup". Karena DOM dan WebGL sama-sama memanggil
 *  `tinggiBilah()`, klaim "satu angka dilukis dua kali" bisa diukur — kalau salah satu
 *  sisi menyisipkan konstantanya sendiri, tingginya berhenti cocok dengan angkanya.
 *
 *  Isinya hanya aritmetika: tidak ada `window`, tidak ada three, tidak ada React — jadi
 *  rute server dan browser memakai file yang sama, bukan salinannya. */

/** Enam menit terakhir, kronologis. */
export const JUMLAH_BUKET = 6;

/** Ambang 33 ms dipakai karena perfStats menghitung `over33ms` pada angka yang sama
 *  (satu frame > 33 ms = di bawah ~30 fps), jadi tinggi bilah terbaca sebagai "sejauh mana
 *  p95 melewati batas 30 fps", bukan sebagai milidetik yang ditafsirkan ulang. */
export const BATAS_MS = 33;

/** Kelebihan di atas ambang tetap digambar, hanya dipadatkan, supaya overshoot terbaca
 *  sebagai kelebihan dan tidak diam-diam diratakan ke puncak. */
const MAMPAT_KELEBIHAN = 0.35;
const TINGGI_MAKS_RASIO = 2.2;

/** Tinggi bilah, dalam kelipatan tinggi dasar, dari rasio nilai terhadap ambang.
 *  r <= 0 (tidak ada angka) menghasilkan 0: slot kosong tidak boleh berbentuk apa pun. */
export const tinggiBilah = (r: number): number => {
  if (!Number.isFinite(r) || r <= 0) return 0;
  const t = r <= 1 ? r : 1 + (r - 1) * MAMPAT_KELEBIHAN;
  return Math.min(t, TINGGI_MAKS_RASIO);
};

/** Bentuk yang sama, dinyatakan sebagai pecahan dari tinggi maksimum — dipakai sisi DOM
 *  yang mengukur dalam persen. Pembaginya konstanta yang sama dengan baris WebGL. */
export const pecahanTinggi = (r: number): number => tinggiBilah(r) / TINGGI_MAKS_RASIO;

/** rasio p95 terhadap ambang, satu-satunya tempat angka mentah diubah jadi besaran bilah. */
export const rasioAmbang = (p95Ms: number): number => p95Ms / BATAS_MS;

/** Penjumlah berjalan per menit. Sengaja jumlah, bukan daftar nilai: satu menit bisa
 *  berisi laporan dari banyak pengunjung dan menyimpan semuanya berarti memori yang
 *  tidak dibatasi, sementara yang dibutuhkan pembaca hanya rerata menit itu. */
export interface Tambun {
  /** Kunci menit, UTC dipangkas ke menit dan diberi "Z" ("2026-11-02T07:03Z"). */
  menit: string;
  laporan: number;
  frame: number;
  lambat: number;
  medianJumlah: number;
  p95Jumlah: number;
  fpsTerendah: number;
}

export interface LaporanRitme {
  fps: number;
  medianMs: number;
  p95Ms: number;
  over33ms: number;
  frames: number;
}

/** Kunci menit dari satu titik waktu, UTC dan EKSPLISIT UTC: string tanpa "Z" akan
 *  diparsing sebagai waktu lokal, dan jam server (UTC) yang bertemu browser WIB menggeser
 *  seluruh deret keluar jendela. Sama persis di server dan browser selama angkanya sama. */
export const kunciMenit = (waktuMs: number): string =>
  new Date(waktuMs - (waktuMs % 60_000)).toISOString().slice(0, 16) + "Z";

export const tambunBaru = (menit: string): Tambun => ({
  menit,
  laporan: 0,
  frame: 0,
  lambat: 0,
  medianJumlah: 0,
  p95Jumlah: 0,
  fpsTerendah: Number.POSITIVE_INFINITY,
});

/** Tambah satu laporan ke gumpalan menitnya. Dimutasi karena dipanggil pada jalur tulis
 *  server yang sudah memegang objeknya; tidak ada angka yang dibulatkan di sini supaya
 *  pembulatan hanya terjadi satu kali, saat gumpalan dibaca. */
export const tambahLaporan = (t: Tambun, l: LaporanRitme): Tambun => {
  t.laporan += 1;
  t.frame += l.frames;
  t.lambat += l.over33ms;
  t.medianJumlah += l.medianMs;
  t.p95Jumlah += l.p95Ms;
  if (l.fps < t.fpsTerendah) t.fpsTerendah = l.fps;
  return t;
};

/** Gumpalan jadi angka yang boleh ditampilkan. Namanya menyebut cara hitungnya: yang di
 *  bawah ini rerata lintas laporan, bukan persentil lintas frame — dan itu bukan
 *  kekurangan yang ditutupi, karena label di panel mengatakan "rerata". */
export interface BuketMenit {
  menit: string;
  laporan: number;
  frame: number;
  medianRerataMs: number;
  p95RerataMs: number;
  fpsTerendah: number;
  shareLambatPct: number;
}

const bundar1 = (n: number) => Math.round(n * 10) / 10;

export const jadiBuket = (t: Tambun): BuketMenit => {
  if (t.laporan === 0)
    return {
      menit: t.menit,
      laporan: 0,
      frame: 0,
      medianRerataMs: 0,
      p95RerataMs: 0,
      fpsTerendah: 0,
      shareLambatPct: 0,
    };
  return {
    menit: t.menit,
    laporan: t.laporan,
    frame: t.frame,
    medianRerataMs: bundar1(t.medianJumlah / t.laporan),
    p95RerataMs: bundar1(t.p95Jumlah / t.laporan),
    fpsTerendah: bundar1(t.fpsTerendah),
    shareLambatPct: t.frame > 0 ? bundar1((t.lambat / t.frame) * 100) : 0,
  };
};

/** Berapa menit `menit` berada di belakang `kini`. Keduanya dibaca sebagai UTC — kunci dari
 *  `kunciMenit` selalu berakhiran "Z" dan cap waktu server adalah ISO penuh — jadi selisihnya
 *  tepat sampai ke menit tanpa perlu tahu zona waktu pengunjung. */
export const selisihMenit = (menit: string, kini: string): number =>
  Math.round((Date.parse(kini) - Date.parse(menit)) / 60_000);

/** Enam slot menit terakhir, kronologis: indeks 0 = lima menit lalu, indeks terakhir = menit
 *  ini. Menit yang tidak punya laporan tetap menempati slotnya dengan nilai null, dan
 *  penampil wajib melukisnya sebagai TIDAK ADA BENTUK — bukan bilah pendek yang membuat
 *  deretannya terlihat penuh.
 *
 *  `kini` diambil dari cap waktu respons server, bukan jam browser: kunci menit dibuat oleh
 *  server, jadi menaruhnya di slot dengan jam sendiri bisa menggeser seluruh deret saat jam
 *  pengunjung melenceng satu menit. */
export const isiSlot = (buket: BuketMenit[], kini: string): (BuketMenit | null)[] => {
  const slot: (BuketMenit | null)[] = new Array(JUMLAH_BUKET).fill(null);
  for (const b of buket) {
    const i = JUMLAH_BUKET - 1 - selisihMenit(b.menit, kini);
    if (i >= 0 && i < JUMLAH_BUKET) slot[i] = b;
  }
  return slot;
};
