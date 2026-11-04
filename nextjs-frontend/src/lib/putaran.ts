// Putaran: satu sumber kebenaran untuk kemiringan kartu yang DIPERINTAHKAN pengunjung.
// Dua jalur menulis ke target yang sama — seret pointer dan panah pada kontrol yang bisa
// difokus — jadi keduanya selalu menghasilkan sudut yang identik. Kanvas yang mengeasing
// nilainya (lihat usePanggung); modul ini tidak pernah menyentuh three.js.
//
// prefers-reduced-motion mematikan rotasi, bukan navigasinya: tombol panah di kontrol
// tetap memindahkan fokus bab seperti biasa, hanya kartu yang diam.

export interface TargetPutaran {
  x: number;
  y: number;
}

export interface KotakKartu {
  kiri: number;
  atas: number;
  lebar: number;
  tinggi: number;
}

export const BATAS_DERAJAT = 12;
/** Jarak seret untuk mencapai batas, dalam piksel CSS. */
const JANGKAUAN_PX = 200;
const RAD = (d: number) => (d * Math.PI) / 180;
export const BATAS = RAD(BATAS_DERAJAT);
export const LANGKAH_PANAH = RAD(4);
/** Kartu hanya bisa diputar dari wilayahnya sendiri, supaya memilih teks di kolom
 *  bacaan tidak kebetulan menjadi gesture memutar. */
const TEPI_KARTU = 40;

/** Elemen yang punya niatnya sendiri: tautan, kontrol, dan area yang bisa dipilih.
 *  Seret yang dimulai di atasnya tidak pernah direbut untuk rotasi. */
const INTERAKTIF = 'a,button,input,textarea,select,[contenteditable],[data-magnetic],[role="button"]';

let mqKurangiGerak: MediaQueryList | undefined;
const kurangiGerak = () => {
  if (!mqKurangiGerak) mqKurangiGerak = window.matchMedia("(prefers-reduced-motion: reduce)");
  return mqKurangiGerak.matches;
};

const target: TargetPutaran = { x: 0, y: 0 };
let fokusAktif = false;
let kotak: KotakKartu | null = null;
let seret: { pointerId: number; x: number; y: number; awal: TargetPutaran } | null = null;

/** Snapshot bermerek stabil: useSyncExternalStore berhenti melarang fungsi baca yang
 *  mengembalikan objek baru setiap panggilan, jadi objek ini hanya diganti saat target
 *  benar-benar berubah. */
let snapshot: TargetPutaran = { x: 0, y: 0 };
const pendengar = new Set<() => void>();
const ubah = () => {
  snapshot = { x: target.x, y: target.y };
  pendengar.forEach((f) => f());
};

const jepit = (v: number) => Math.max(-BATAS, Math.min(BATAS, v));

export function tulisTarget(x: number, y: number) {
  const bx = jepit(x);
  const by = jepit(y);
  if (bx === target.x && by === target.y) return;
  target.x = bx;
  target.y = by;
  ubah();
}

export const bacaTarget = () => target;
export const bacaSnapshot = () => snapshot;

export function dengarPutaran(ubahnya: () => void): () => void {
  pendengar.add(ubahnya);
  return () => void pendengar.delete(ubahnya);
}

/** Dilaporkan mesin kartu setiap frame: wilayah tempat seret diterima. */
export const laporKotakKartu = (k: KotakKartu) => {
  kotak = k;
};

const diDalamKartu = (x: number, y: number) => {
  if (!kotak) return false;
  return (
    x >= kotak.kiri - TEPI_KARTU &&
    x <= kotak.kiri + kotak.lebar + TEPI_KARTU &&
    y >= kotak.atas - TEPI_KARTU &&
    y <= kotak.atas + kotak.tinggi + TEPI_KARTU
  );
};

/** Satu putaran panah = satu langkah sudut, ke kanan/bawah searah jarum jam. */
export function langkahPanah(dx: number, dy: number) {
  if (kurangiGerak()) return;
  fokusAktif = true;
  tulisTarget(target.x + dx * LANGKAH_PANAH, target.y + dy * LANGKAH_PANAH);
}

/** Fokus dilepas: kartu kembali ke sikap koreografi, sama seperti setelah seret dilepas. */
export function lepasFokus() {
  fokusAktif = false;
  if (seret) return;
  tulisTarget(0, 0);
}

/** Reticle kartu DIPEGANG: selama seret berjalan, atau selama kontrol putar difokus.
 *  Mesin kartu memakai keadaan ini untuk menahan titik cahaya di tempatnya di bidang
 *  kartu — memutar kartu 12° sudah cukup untuk membuat cahaya meluncur keluar wajah,
 *  dan gerakan kartu itu menang dari gerakan pointer. Fokus keyboard adalah padanan
 *  dari "pointer sedang di atas kartu", jadi keduanya memegang reticle yang sama. */
export const bacaFokusKartu = () => seret !== null || fokusAktif;

/** Kontrol difokus: reticle langsung dipegang, supaya pengunjung keyboard melihat kartu
 *  menyala begitu fokus tiba — padanan dari pointer yang masuk ke wilayah kartu — dan
 *  bukan baru setelah tombol pertama ditekan. */
export const ambilFokus = () => {
  fokusAktif = true;
};

const onDown = (e: PointerEvent) => {

  if (e.isPrimary === false || e.button !== 0) return;
  // Sentuh tidak dipakai untuk memutar: gestur itu milik gulir halaman.
  if (e.pointerType === "touch") return;
  if (kurangiGerak()) return;
  const el = e.target as HTMLElement | null;
  if (el && el.closest(INTERAKTIF)) return;
  if (!diDalamKartu(e.clientX, e.clientY)) return;
  seret = { pointerId: e.pointerId, x: e.clientX, y: e.clientY, awal: { ...target } };
};

const onMove = (e: PointerEvent) => {
  if (!seret || e.pointerId !== seret.pointerId) return;
  const perRad = JANGKAUAN_PX / BATAS;
  tulisTarget(seret.awal.x + (e.clientX - seret.x) / perRad, seret.awal.y + (e.clientY - seret.y) / perRad);
};

const onUp = (e: PointerEvent) => {
  if (!seret || e.pointerId !== seret.pointerId) return;
  seret = null;
  // Spring-back: perintah pengunjung selesai, koreografi bab yang mengambil alih lagi.
  if (!fokusAktif) tulisTarget(0, 0);
};

let terpasang = false;
/** Dipasang sekali dari kontrol HUD. Listener melekat di window karena kartu tidak
 *  pernah menerima peristiwa pointer: lapisan DOM halaman berada di atas kanvas. */
export function pasangPutaran() {
  if (terpasang) return () => {};
  terpasang = true;
  window.addEventListener("pointerdown", onDown, { passive: true });
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerup", onUp, { passive: true });
  window.addEventListener("pointercancel", onUp, { passive: true });
  return () => {
    terpasang = false;
    window.removeEventListener("pointerdown", onDown);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
  };
}

export const derajat = (r: number) => Math.round((r * 180) / Math.PI);
