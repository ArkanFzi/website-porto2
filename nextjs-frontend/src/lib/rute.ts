/** Satu sumber untuk daftar navigasi. Sebelumnya HUD dan section hub masing-masing
 *  menyalin daftar rute yang sama, jadi satu rename harus diedit di dua tempat dan
 *  bisa lolos verifier sambil membuat dua tampilan berbeda.
 *
 *  Pembagianya mengikuti maksud halaman, bukan nama panggungnya:
 *  RUTE_PROFIL adalah yang dicari pengunjung (siapa, apa yang dikerjakan, di mana
 *  menghubunginya); RUTE_TEKNIS adalah pameran cara situs ini dibuat, yang diakses
 *  lewat section hub di halaman utama.
 *
 *  label dipakai apa adanya sebagai teks pil, jadi panjangnya menentukan lebar kolom
 *  kiri yang menerbitkan --hud-atas; verifier membacanya lewat data-hud-atas, bukan
 *  dari angka yang diketik tangan. */

export type Rute = { href: string; label: string };

/** Empat jalan masuk profil. URL-nya langsung menyebut isinya. */
export const RUTE_PROFIL: Rute[] = [
  { href: "/tentang", label: "TENTANG" },
  { href: "/proyek", label: "PROYEK" },
  { href: "/tulisan", label: "TULISAN" },
  { href: "/kontak", label: "KONTAK" },
];

/** Lima pameran teknis pada cincin hub. /proyek dan /tulisan sudah naik ke daftar
 *  profil, jadi keduanya tidak muncul di sini lagi. */
export const RUTE_TEKNIS: Rute[] = [
  { href: "/kinerja", label: "KINERJA" },
  { href: "/interaksi", label: "INTERAKSI" },
  { href: "/potret", label: "POTRET" },
  { href: "/transisi", label: "TRANSISI" },
  { href: "/statistik", label: "STATISTIK" },
];

/** Daftar terkunci yang dibaca verifier: href yang sudah disortir, dipisah koma. */
export const kunciHref = (rute: Rute[]) => rute.map((r) => r.href.replace(/^\//, "")).sort().join(",");
