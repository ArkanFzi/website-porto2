"use client";

/** Hukum diam kanvas: shader hanya hidup selama pengunjung masih bergerak.
 *
 *  Dulu aturan ini hidup di dalam GlobalEditorialCanvas saja. Panggung kedua (/waktu dan
 *  halaman eksperimen lain) memakai hukum yang persis sama, dan dua salinan IDLE_MS akan
 *  bisa berbeda putusan — padahal "nol frame saat diam" adalah invariant yang diukur
 *  probe, bukan hiasan. Jadi aturannya tinggal di satu berkas. */
import { useEffect, useRef, useState } from "react";

export type Putaran = "always" | "demand" | "never";

export const IDLE_MS = 4000;

// Setelah itu loop dihentikan (demand = nol frame) supaya laptop iGPU tidak dibakar untuk
// gerakan yang tidak dilihat; satu event pointer/scroll/ketik mengembalikannya seketika.
// pointerup, focusin, focusout ikut terdaftar karena mesin kartu mengubah KEADAAN pada
// peristiwa itu — seret dilepas (reticle pulang ke pointer), kontrol reticle difokus/
// dilepas — dan keadaan yang tidak meminta frame akan tertinggal satu tindakan di belakang
// layarnya.
export const AKTIVITAS = [
  "scroll",
  "pointermove",
  "pointerdown",
  "pointerup",
  "focusin",
  "focusout",
  "keydown",
  "wheel",
  "touchstart",
];

/** `hidup` = false (misalnya prefers-reduced-motion) tidak pernah mendaftar listener dan
 *  selalu menjawab "demand": frame terakhir hasil mount sudah cukup. Tab yang tersembunyi
 *  menjawab "never" — tidak ada alasan membayar render untuk yang tidak dilihat. */
export function useDiamKanvas(hidup: boolean): Putaran {
  const [putaran, setPutaran] = useState<Putaran>("always");
  const idleTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!hidup) return;

    const wake = () => {
      if (document.hidden) return;
      setPutaran((f) => (f === "always" ? f : "always"));
      window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(() => setPutaran("demand"), IDLE_MS);
    };

    const lihatLagi = () => setPutaran(document.hidden ? "never" : "always");

    AKTIVITAS.forEach((evt) => window.addEventListener(evt, wake, { passive: true }));
    document.addEventListener("visibilitychange", lihatLagi);
    wake();
    return () => {
      window.clearTimeout(idleTimer.current);
      AKTIVITAS.forEach((evt) => window.removeEventListener(evt, wake));
      document.removeEventListener("visibilitychange", lihatLagi);
    };
  }, [hidup]);

  return hidup ? putaran : "demand";
}
