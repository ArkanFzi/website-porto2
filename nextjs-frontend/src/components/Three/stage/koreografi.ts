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

/** Satu aturan, dua pemakai — usePanggung (kartu mundur) dan AktorSF26 (mobil terpasang).
 *  Duluakan di sini supaya keduanya tidak bisa berbeda putusan: kartu yang memudar untuk
 *  mobil yang tidak pernah datang adalah layar kosong, dan mobil di luar bab arsip adalah
 *  objek yang menutupi teks bab lain. */
export const mobilDipanggil = (bab: number, hovered: number | null, kurangiGerak: boolean) =>
  !kurangiGerak && hovered === BARIS_FERRARI && bab === BAB_ARSIP;

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
