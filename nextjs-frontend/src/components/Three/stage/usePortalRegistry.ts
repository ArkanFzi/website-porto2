"use client";

/** Peta portal DOM -> panggung WebGL.
 *
 * Portal = kotak DOM yang dideklarasikan tiap bab (MeshPortal). Posisi, ukuran, dan
 * batas potong kartu semuanya diturunkan dari rect portal, jadi menata ulang layout
 * bab otomatis menggeser kartu tanpa menyentuh angka koreografi di sini. */
import { useLayoutEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";

export interface PortalRect {
  kiri: number;
  atas: number;
  lebar: number;
  tinggi: number;
}

/** Rect portal dalam pixel CSS; elemen penandanya ber-jangkar layar (fixed), jadi
 *  nilainya tidak berubah saat halaman digulir dan cukup dibaca ulang saat resize. */
export const usePortalRegistry = () => {
  const { invalidate } = useThree();
  const portal = useRef(new Map<number, PortalRect>());

  useLayoutEffect(() => {
    const simpul = Array.from(document.querySelectorAll<HTMLElement>("[data-portal]"));
    if (!simpul.length) return;
    const baca = () => {
      for (const el of simpul) {
        const r = el.getBoundingClientRect();
        const bab = Number(el.dataset.portal);
        if (r.width < 2 || r.height < 2) portal.current.delete(bab);
        else portal.current.set(bab, { kiri: r.left, atas: r.top, lebar: r.width, tinggi: r.height });
      }
      // Loop demand (TIER 1) tidak menggambar sendiri saat DOM berubah.
      invalidate();
    };
    baca();
    const pengamat = new ResizeObserver(baca);
    simpul.forEach((el) => pengamat.observe(el));
    window.addEventListener("resize", baca);
    return () => {
      pengamat.disconnect();
      window.removeEventListener("resize", baca);
    };
  }, [invalidate]);

  return portal;
};
