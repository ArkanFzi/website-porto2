/** Token gerak panggung editorial.
 *
 * Semua angka di sini bukan selera baru: tiap nilai diambil dari literal yang sudah
 * dipakai di komponen sebelum file ini ada, jadi memindahkan angka ke sini tidak
 * mengubah satu frame pun. Aturan pemakaiannya:
 * - `EASE.keluar` untuk hal yang muncul/hilang dari layar (fade, pergantian isi).
 * - `EASE.geser` untuk panel yang menyapu layar (tirai preloader).
 * - `DURASI.*` di bawah 0,4 detik untuk respons langsung terhadap pointer, di atas
 *   1 detik hanya untuk transisi yang menutup layar penuh.
 * - `PEGA.*` untuk permukaan yang bisa diinterupsi (modal, laci, kursor).
 * Nilai CSS (kelas `duration-*` Tailwind) sengaja tidak ikut dipindah: kelas itu
 * dikompilasi ke stylesheet, bukan dibaca dari JS. */

export type EaseKubik = [number, number, number, number];

export const EASE = {
  /** ease-outexpo — meluncur cepat lalu mengendap. */
  keluar: [0.16, 1, 0.3, 1] as EaseKubik,
  /** ease-in-out-quad — awal dan akhir pelan, tengah cepat; untuk sapuan penuh. */
  geser: [0.77, 0, 0.175, 1] as EaseKubik,
};

/** Detik, mengikuti konvensi framer-motion. `gulir` dipakai Lenis yang juga sekon. */
export const DURASI = {
  ketik: 0.15,
  sentuh: 0.25,
  cepat: 0.3,
  ganti: 0.35,
  lapang: 0.8,
  tirai: 1.1,
  gulir: 1.4,
  /** Pembukan roda mouse oleh Lenis — terasa lain dari scrollTo yang scripted. */
  roda: 1.2,
};

export const PEGA = {
  modal: { type: "spring", damping: 26, stiffness: 320 } as const,
  laci: { type: "spring", damping: 26, stiffness: 300 } as const,
  kartu: { type: "spring", damping: 25, stiffness: 320 } as const,
  kursor: { damping: 28, stiffness: 350, mass: 0.5 } as const,
};

/** prefers-reduced-motion, satu MediaQueryList untuk semua pembaca. Dipakai lewat
 *  useSyncExternalStore: nilai server `false` supaya hydration tidak berbeda, dan
 *  langganan hanya mengubah komponen saat penonton mengganti pengaturan perangkat. */
let mqKurangiGerak: MediaQueryList | undefined;
const mediaKurangiGerak = () =>
  (mqKurangiGerak ??= window.matchMedia("(prefers-reduced-motion: reduce)"));

export const dengarKurangiGerak = (ubah: () => void) => {
  const mq = mediaKurangiGerak();
  mq.addEventListener("change", ubah);
  return () => mq.removeEventListener("change", ubah);
};
export const bacaKurangiGerak = () => mediaKurangiGerak().matches;
export const bacaKurangiGerakSaatSSR = () => false;
