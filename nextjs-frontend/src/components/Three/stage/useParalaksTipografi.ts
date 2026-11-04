"use client";

/** Paralaks tipografi DOM, dihitung dari proyeksi yang sama dengan kartu potret.
 *
 * Yang dulu hilang: teks besar punya konstanta gesernya sendiri (atau tidak bergerak
 * sama sekali), sehingga ia berbohong soal kedalaman — kartu dan huruf tidak pernah
 * berada di ruang yang sama. Di sini setiap elemen mendeklarasikan KEDALAMANNYA sendiri
 * relatif ke bidang kartu lewat atribut data-paralaks (satuan dunia; negatif = lebih jauh
 * dari kamera, nol = duduk tepat bersama kartu), dan gesernya dalam pixel adalah hasil
 * proyeksi offset dunia kartu pada kedalaman elemen itu:
 *
 *   px = offsetDunia × (1 / dpp) × (jarakKamera / (jarakKamera − (zKartu + kedalaman)))
 *
 * Rumus skalanya adalah pxPerWorld() milik panggung, dan offsetnya adalah suku geyang
 * pointer yang sama dengan yang ditambahkan ke posisi kartu — jadi tidak ada salinan
 * kedua. Verifier bisa mengukur geser huruf di layar dan membandingkannya dengan geser
 * kartu dari angka yang sama; kalau keduanya bukan satu sumber lagi, gerbangnya gagal.
 *
 * Bukan selisih posisi kartu terhadap kotaknya: selisih itu sisa lerp pegas dan selama
 * penerbangan bernilai ratusan pixel, sehingga huruf ikut terbang dan mendorong halaman
 * keluar dari lebarnya (terukur 205px geser dan 141px overflow pada percobaan pertama). */
import { useLayoutEffect, useRef, type RefObject } from "react";

export interface SimpulParalaks {
  el: HTMLElement;
  /** Kedalaman elemen relatif terhadap bidang fokus babnya, dalam satuan dunia. */
  kedalaman: number;
  /** Pixel terakhir yang pernah ditulis, supaya frame yang sama tidak menulis ulang. */
  x: number;
  y: number;
}

const NOL = "0px";

/** Daftar simpul dibaca sekali saat mount. Judul yang dipasang di sini adalah elemen
 *  statis (bukan hasil AnimatePresence), jadi tidak perlu observer. */
export const useParalaksTipografi = (): RefObject<SimpulParalaks[]> => {
  const simpul = useRef<SimpulParalaks[]>([]);

  useLayoutEffect(() => {
    const daftar: SimpulParalaks[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("[data-paralaks]"))) {
      const kedalaman = Number(el.dataset.paralaks);
      if (!Number.isFinite(kedalaman)) continue;
      daftar.push({ el, kedalaman, x: Number.NaN, y: Number.NaN });
    }
    simpul.current = daftar;
    return () => {
      for (const s of daftar) {
        s.el.style.removeProperty("--tipografi-x");
        s.el.style.removeProperty("--tipografi-y");
      }
      simpul.current = [];
    };
  }, []);

  return simpul;
};

/** Tulis geseran untuk satu frame. `duniaX`/`duniaY` adalah offset dunia yang juga
 *  menambahkan posisi kartu (suku geyang pointer dari koreografi bab), `kePixel` mengubah
 *  offset pada suatu kedalaman menjadi pixel layar. Elemen yang hasilnya sama dengan
 *  tulisan terakhir tidak disentuh sama sekali: loop "always" berjalan 60 kali detik dan
 *  invalidasi gaya yang tidak perlu itulah yang membuat teks bergetar di mesin lambat. */
export const tulisParalaksTipografi = (
  simpul: RefObject<SimpulParalaks[]>,
  duniaX: number,
  duniaY: number,
  kePixel: (kedalaman: number) => number,
  mati: boolean
) => {
  for (const s of simpul.current) {
    const skala = kePixel(s.kedalaman);
    // Sumbu y layar menghadap ke bawah, sumbu y dunia menghadap ke atas.
    let x = mati ? 0 : duniaX * skala;
    let y = mati ? 0 : -duniaY * skala;
    // Di bawah deadband nilainya dilandaskan ke nol, bukan ditahan: tanpa pelandaian ini
    // pointer yang kembali ke tengah meninggalkan translate 0,03px selamanya, karena
    // tulisan berikutnya dianggap terlalu kecil untuk layak ditulis dan nol sungguhan
    // tidak pernah sampai ke elemen.
    if (Math.abs(x) < 0.05) x = 0;
    if (Math.abs(y) < 0.05) y = 0;
    if (x === s.x && y === s.y) continue;
    // Invalidasi gaya per frame yang hasilnya nyaris tidak berubah tetap dilewati — loop
    // "always" berjalan 60 kali detik — kecuali saat mendarat di nol, yang harus tertulis.
    const goyang = Math.abs(x - s.x) < 0.05 && Math.abs(y - s.y) < 0.05;
    if (goyang && (x !== 0 || y !== 0)) continue;
    s.x = x;
    s.y = y;
    s.el.style.setProperty("--tipografi-x", x === 0 ? NOL : `${x.toFixed(2)}px`);
    s.el.style.setProperty("--tipografi-y", y === 0 ? NOL : `${y.toFixed(2)}px`);
  }
};
