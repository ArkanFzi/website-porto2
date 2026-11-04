/** Koreografi panggung: sikap kartu pada suatu posisi gulir.
 *
 * Bukan tabel cabang lagi. Setiap bab mendeklarasikan sikapnya di marker DOM-nya
 * sendiri (lihat MeshPortal), dan ambang perpindahan dihitung dari posisi section di
 * dokumen — jadi menambah bab tidak menyentuh berkas ini, apalagai shader.
 *
 * Yang sengaja dipertahankan: sikap DIAM keempat bab, hasil ukur hari ini
 * (docs/verify/panggung-baseline.json). Tabel lama menyimpan `rotDari`/`zDari` pada
 * segmen diam yang nilainya tidak pernah terpakai, karena segmen itu berdiri sendiri
 * memakai `t = 1` sehingga `campur(rotDari, rotKe)` selalu jatuh ke `rotKe` = 0.
 * Akibatnya kartu selalu lurus saat diam dan kemiringannya hanya hidup di tengah
 * perjalanan — itu direplikasi di sini lewat `miring`, bukan lewat sikap diam. */
// Relative + ekstensi eksplisit, bukan alias "@/data/...": modul ini diimpor sebagai NILAI
// (bukan hanya tipe) dan jalannya ke logoBahasa harus bisa dibaca Node. Next 16 memuat graph
// server lewat resolver ESM bawaan Node — yang tidak mengenal alias dari tsconfig — dan
// `node --test` mengadili aturan ini langsung; keduanya gagal dengan ERR_MODULE_NOT_FOUND
// pada "@/data" (terukur: halaman 500 di dev). Komponen yang hanya dimuat browser boleh
// tetap menulis "@/data/logoBahasa".
import { logoUntuk } from "../../../data/logoBahasa.ts";
import type { PortalKotak } from "./usePortalRegistry";

/** Bentuk kurva perpindahan. Nama dipinjam dari token gerak, tapi ini fungsi murahan
 *  tanpa bezier supaya tidak ada solver per frame di jalur render. */
export type Ease = "linear" | "halus" | "keluar";

/** Indeks baris arsip yang memanggil mobil ke panggung (baris "01 — Ferrari Ubuntu
 *  Architecture" di ChapterArchives). Dua pemakai: usePanggung (kartu mundur) dan
 *  AktorSF26 (mobil terpasang). Angka ini hidup di satu tempat supaya kartu tidak bisa
 *  mundur untuk baris yang salah. */
export const BARIS_FERRARI = 0;

/** Bab yang punya mobil: arsip proyek (chapter-03). */
export const BAB_ARSIP = 3;

/** Siapa yang boleh menempati kotak tempat kartu potret biasanya duduk. */
export type AktorPanggung = "mobil" | "bahasa";

/** Bahasa dominan tiap baris arsip, indeks = indeks baris ChapterArchives, nilai = label
 *  seperti yang dikeluarkan generator (`PETA_EKSTENSI`) atau null kalau belum terukur.
 *  Ini angka hasil ukur, bukan karangan: tanpa baris yang terukur tidak ada bentuk. */
export type BahasaBaris = readonly (string | null)[];

/** Baris yang mengisi kotak saat TIDAK ada baris yang di-hover: baris Ferrari, jadi keadaan
 *  diam bab arsip selalu punya objek tiga dimensi dan potret tidak pernah kembali ke sana
 *  (kecuali saat pengunjung minta gerak dikurangi — `kurangiGerak` di atas menahan
 *  seluruhnya, dan itu pilihan sadar: aturan "tanpa animasi" menang atas aturan "selalu
 *  ada objek"). Mengubah angka ini kembali ke `null` memindahkan keadaan diam ke potret dan
 *  itu wajib disertai tulis-ulang gerbang keadaan diam di docs/verify/ekstra-probe.mjs,
 *  karena gerbang itu menguji angka ini. */
export const BARIS_DIAM: number | null = BARIS_FERRARI;

/** Putusan tunggal: baris mana memanggil aktor mana. `mobilDipanggil` yang lama adalah
 *  fungsi ini dengan satu cabang dihapus. Urutannya penting: baris 00 selalu mobil,
 *  berapa pun bahasa yang terukur di sana, supaya satu objek tidak pernah rebutan.
 *
 *  "Terukur" bukan syarat yang cukup — yang bersyarat adalah bahasa yang PUNYA BENTUK.
 *  Generator mengeluarkan label yang whitelist logo tidak kenal (hari ini: `Bash`, yang
 *  dominan di beberapa korpus sebagai runner-up), dan `AktorBahasa` mengembalikan null
 *  untuk itu. Kalau aturan tetap menjawab "bahasa", kartu menyerahkan tempatnya untuk
 *  objek yang tidak akan pernah datang: kotak kosong dengan sangkar di sekelilingnya. */
export const aktorUntukBaris = (baris: number | null, bahasa: BahasaBaris): AktorPanggung | null => {
  if (baris === null) return null;
  if (baris === BARIS_FERRARI) return "mobil";
  return bahasa[baris] && logoUntuk(bahasa[baris]) ? "bahasa" : null;
};

/** Satu aturan, tiga pemakai — usePanggung (kartu mundur), AktorSF26 (mobil terpasang),
 *  AktorBahasa (logo terpasang). Diletakkan di sini supaya ketiganya tidak bisa berbeda
 *  putusan: kartu yang memudar untuk objek yang tidak pernah datang adalah layar kosong,
 *  dan objek di luar bab arsip adalah benda yang menutupi teks bab lain. */
export const aktorDipanggil = (
  bab: number,
  hovered: number | null,
  kurangiGerak: boolean,
  bahasa: BahasaBaris
): AktorPanggung | null =>
  !kurangiGerak && bab === BAB_ARSIP ? aktorUntukBaris(hovered ?? BARIS_DIAM, bahasa) : null;

/** Apakah kartu harus menyerahkan tempatnya? Nama `mobilDipanggil` sengaja dipertahankan
 *  di pemanggil lamanya: yang dibaca verifier adalah SILANG_MOBIL dan kunci debug
 *  __panggung.mobil, dan keduanya sekarang berarti "silang pengganti", bukan "mobil". */
export const penggantiDipanggil = (
  bab: number,
  hovered: number | null,
  kurangiGerak: boolean,
  bahasa: BahasaBaris
): boolean => aktorDipanggil(bab, hovered, kurangiGerak, bahasa) !== null;

export interface Kunci {
  bab: number;
  /** Kotak portal dalam pixel CSS, hasil ukur DOM. */
  kotak: PortalKotak;
  /** Radian, sumbu Y. Sikap saat bab ini diam. */
  rot: number;
  /** Satuan dunia. Kedalaman kartu saat bab ini diam. */
  z: number;
  /** Kedalaman tempat kartu dianggap "mengisi" portal; bedanya dengan `z` yang membuat
   *  kartu menyusut saat mundur (bab penutup). */
  pas: number;
  /** Puncak kemiringan di tengah perjalanan MENJU bab ini, radian. */
  miring: number;
  /** Parallax pointer terhadap posisi kartu dan terhadap kemiringannya. */
  geyang: number;
  rotGeyang: number;
  ease: Ease;
  /** 0..1 posisi gulir di mana bab ini mulai menguasai viewport. */
  batas: number;
  /** Lebar pita perpindahan menuju bab ini, dalam posisi gulir. */
  pita: number;
}

export interface Sikap {
  babDari: number;
  babKe: number;
  /** 0 = masih penuh di babDari, 1 = sudah penuh di babKe. */
  t: number;
  rot: number;
  z: number;
  pas: number;
  geyang: number;
  rotGeyang: number;
  kotak: PortalKotak;
}

const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

const kotakLerp = (a: PortalKotak, b: PortalKotak, u: number): PortalKotak => ({
  kiri: lerp(a.kiri, b.kiri, u),
  atas: lerp(a.atas, b.atas, u),
  lebar: lerp(a.lebar, b.lebar, u),
  tinggi: lerp(a.tinggi, b.tinggi, u),
});

const kurva = (u: number, ease: Ease) => {
  if (ease === "halus") return u * u * (3 - 2 * u);
  if (ease === "keluar") return 1 - (1 - u) ** 3;
  return u;
};

/** Kunci harus sudah terurut naik menurut `batas`; itu yang dilakukan registry. */
export const sikap = (p: number, kunci: Kunci[]): Sikap | undefined => {
  if (!kunci.length) return undefined;
  const indeks = kunci.findIndex((k) => p < k.batas);
  const tujuan = indeks === -1 ? kunci[kunci.length - 1] : kunci[indeks];
  const dari = kunci[Math.max(0, indeks - 1)] ?? tujuan;

  if (p >= tujuan.batas || tujuan === dari) {
    return {
      babDari: tujuan.bab,
      babKe: tujuan.bab,
      t: tujuan === dari ? 0 : 1,
      rot: tujuan.rot,
      z: tujuan.z,
      pas: tujuan.pas,
      geyang: tujuan.geyang,
      rotGeyang: tujuan.rotGeyang,
      kotak: tujuan.kotak,
    };
  }

  const mulai = tujuan.batas - tujuan.pita;
  const u = kurva(Math.max(0, Math.min(1, (p - mulai) / Math.max(tujuan.pita, 1e-4))), tujuan.ease);
  return {
    babDari: dari.bab,
    babKe: tujuan.bab,
    t: u,
    rot: lerp(dari.rot, tujuan.rot, u) + tujuan.miring * Math.sin(Math.PI * u),
    z: lerp(dari.z, tujuan.z, u),
    pas: lerp(dari.pas, tujuan.pas, u),
    geyang: tujuan.geyang,
    rotGeyang: tujuan.rotGeyang,
    kotak: kotakLerp(dari.kotak, tujuan.kotak, u),
  };
};
