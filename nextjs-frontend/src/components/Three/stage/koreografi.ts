/** Tabel koreografi panggung: gulir (0..1) -> portal tujuan + sikap kartu.
 *
 * Hanya angka ambang dan sikap; tidak menyentuh DOM maupun three.js, supaya objek
 * panggung baru bisa meminjam tabel yang sama atau menulis tabelnya sendiri. */
export interface Koreografi {
  babDari: number;
  babKe: number;
  /** 0 = masih penuh di babDari, 1 = sudah penuh di babKe */
  t: number;
  rotDari: number;
  rotKe: number;
  zDari: number;
  zKe: number;
  geyang: number;
  rotGeyang: number;
}

export const koreografi = (p: number): Koreografi => {
  const k: Koreografi = {
    babDari: 1,
    babKe: 1,
    t: 0,
    rotDari: 0,
    rotKe: 0,
    zDari: 0,
    zKe: 0,
    geyang: 0.15,
    rotGeyang: 0.1,
  };

  if (p < 0.12) {
    // ── CHAPTER 01 (HERO): portal tengah ──
    k.babDari = 1; k.babKe = 1; k.t = 0;
  } else if (p < 0.22) {
    // ── TRANSITION: HERO -> CHAPTER 02 (glides ke kiri sebelum teks muncul) ──
    k.babDari = 1; k.babKe = 2; k.t = (p - 0.12) / 0.1; k.rotKe = 0.22;
    k.geyang = 0.12; k.rotGeyang = 0.06;
  } else if (p < 0.52) {
    // ── CHAPTER 02 (DUALITY): portal kolom kiri ──
    k.babDari = 2; k.babKe = 2; k.t = 1; k.rotDari = 0.22;
    k.geyang = 0.12; k.rotGeyang = 0.06;
  } else if (p < 0.62) {
    // ── TRANSITION: CHAPTER 02 -> CHAPTER 03 (glides ke gutter kanan) ──
    k.babDari = 2; k.babKe = 3; k.t = (p - 0.52) / 0.1; k.rotDari = 0.22; k.rotKe = -0.18; k.zKe = -0.4;
    k.geyang = 0.14; k.rotGeyang = 0.06;
  } else if (p < 0.84) {
    // ── CHAPTER 03 (WORKS): portal gutter kanan ──
    k.babDari = 3; k.babKe = 3; k.t = 1; k.rotDari = -0.18; k.zDari = -0.4;
    k.geyang = 0.14; k.rotGeyang = 0.06;
  } else {
    // ── CHAPTER 04 (FINALE): portal tengah, kartu mundur ke jauh ──
    k.babDari = 3; k.babKe = 4; k.t = (p - 0.84) / 0.16; k.rotDari = -0.18; k.zDari = -0.4; k.zKe = -2.5;
    k.geyang = 0.1; k.rotGeyang = 0.06;
  }

  return k;
};
