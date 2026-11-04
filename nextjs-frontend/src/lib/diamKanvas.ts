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

// Jeda ketika pemilik kanvas masih berutang gerakan. Selang frame di perenderan perangkat
// lunak terukur 50–220 ms, jadi temponya harus lebih rapat dari itu supaya yang ditutup
// adalah celah antar-frame, bukan sisa pegas yang belum sempat menyusut (lihat jatuhTempo).
const ULANG_TEMPO_MS = 250;

/** `hidup` = false (misalnya prefers-reduced-motion) tidak pernah mendaftar listener dan
 *  selalu menjawab "demand": frame terakhir hasil mount sudah cukup. Tab yang tersembunyi
 *  menjawab "never" — tidak ada alasan membayar render untuk yang tidak dilihat.
 *  `pekerjaan` adalah pegangan yang ditulis pemilik kanvas setiap frame; selama ia benar,
 *  menjatuhkan loop ke "demand" ditunda (lihat jatuhTempo). */
export function useDiamKanvas(hidup: boolean, pekerjaan?: { hidup: boolean }): Putaran {
  const [putaran, setPutaran] = useState<Putaran>("always");
  const idleTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!hidup) return;

    // Menjatuhkan putaran ke "demand" di tengah gerakan mematahkan janji loop sendiri:
    // satu frame yang memanggil invalidate() bisa jadi frame TERAKHIR yang pernah
    // dijalankan (terukur: flip mematikan loop pada frame dengan sisa pegas 0,0043 unit
    // terbuka, nomor frame membeku tiga jeda penuh, dan baru lanjut setelah ada peristiwa
    // pointer). Jadi yang ditanyakan dulu ke pemilik kanvas adalah: masih ada gerakan yang
    // berutang? Kalau ya, temponya diulang — "nol frame saat diam" tetap utuh karena yang
    // belum diam belum boleh dihitung diam.
    const jatuhTempo = () => {
      if (pekerjaan?.hidup) {
        idleTimer.current = window.setTimeout(jatuhTempo, ULANG_TEMPO_MS);
        return;
      }
      setPutaran("demand");
    };

    const wake = () => {
      if (document.hidden) return;
      setPutaran((f) => (f === "always" ? f : "always"));
      window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(jatuhTempo, IDLE_MS);
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
  }, [hidup, pekerjaan]);

  return hidup ? putaran : "demand";
}
