"use client";

/** Peta portal DOM -> kunci koreografi panggung WebGL.
 *
 * Satu marker per bab (lihat MeshPortal). Registry ini yang mengubah marker menjadi
 * `Kunci`: kotak hasil ukur, sikap yang dideklarasikan lewat atribut data, dan ambang
 * perpindahan hasil ukur posisi section di dokumen. Tidak ada angka koreografi yang
 * tinggal di berkas ini — yang ada hanya nilai cadangan untuk atribut yang tidak ditulis. */
import { useLayoutEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import type { Ease, Kunci } from "./koreografi";

export interface PortalKotak {
  kiri: number;
  atas: number;
  lebar: number;
  tinggi: number;
}

/** Nilai cadangan bila sebuah bab tidak mendeklarasikan atributnya. Dipilih supaya bab
 *  baru berperilaku seperti bab yang sudah ada, bukan seperti kartu yang hilang. */
const CADANGAN = {
  rot: 0,
  z: 0,
  miring: 0,
  geyang: 0.12,
  rotGeyang: 0.06,
  pita: 0.1,
} as const;

const angka = (el: HTMLElement, nama: keyof typeof CADANGAN): number => {
  const mentah = el.dataset[nama];
  if (mentah === undefined) return CADANGAN[nama];
  const n = Number(mentah);
  return Number.isFinite(n) ? n : CADANGAN[nama];
};

/** Sama seperti `angka`, tapi tanpa nilai cadangan: pemakainya yang memutuskan arti
 *  "tidak ditulis" — misalnya data-pas, yang berarti "sama dengan data-z". */
const angkaOpsional = (el: HTMLElement, nama: string): number | undefined => {
  if (el.dataset[nama] === undefined) return undefined;
  const n = Number(el.dataset[nama]);
  return Number.isFinite(n) ? n : undefined;
};

const ease = (el: HTMLElement): Ease => {
  const n = el.dataset.ease;
  return n === "halus" || n === "keluar" ? n : "linear";
};

/** Posisi gulir (0..1) di mana puncak section bab ini mencapai puncak viewport.
 *  Penyebutnya sama dengan yang dipakai SmoothScrollProvider, jadi kedua angka itu
 *  boleh dibandingkan. */
const batasDari = (section: Element | null): number => {
  const maks = document.documentElement.scrollHeight - window.innerHeight;
  if (!section || maks <= 0) return 0;
  const puncak = section.getBoundingClientRect().top + window.scrollY;
  return Math.max(0, Math.min(1, puncak / maks));
};

export const usePortalRegistry = (): { current: Kunci[] } => {
  const { invalidate } = useThree();
  const kunci = useRef<Kunci[]>([]);

  useLayoutEffect(() => {
    const simpul = Array.from(document.querySelectorAll<HTMLElement>("[data-portal]"));
    if (!simpul.length) return;
    const baca = () => {
      const daftar: Kunci[] = [];
      for (const el of simpul) {
        const r = el.getBoundingClientRect();
        const bab = Number(el.dataset.portal);
        if (r.width < 2 || r.height < 2 || !Number.isFinite(bab)) continue;
        const z = angka(el, "z");
        daftar.push({
          bab,
          kotak: { kiri: r.left, atas: r.top, lebar: r.width, tinggi: r.height },
          rot: angka(el, "rot"),
          z,
          // Tanpa data-pas, kartu mengisi portal pada kedalaman diamnya sendiri.
          pas: angkaOpsional(el, "pas") ?? z,
          miring: angka(el, "miring"),
          geyang: angka(el, "geyang"),
          rotGeyang: angka(el, "rotGeyang"),
          ease: ease(el),
          batas: batasDari(el.closest("section")),
          pita: angka(el, "pita"),
        });
      }
      daftar.sort((a, b) => a.batas - b.batas || a.bab - b.bab);
      kunci.current = daftar;
      // Loop demand (TIER 1) tidak menggambar sendiri saat DOM berubah.
      invalidate();
    };
    baca();
    const pengamat = new ResizeObserver(baca);
    simpul.forEach((el) => pengamat.observe(el));
    // Tinggi dokumen ikut menentukan batas: konten yang datang belakangan (font, gambar)
    // menggesernya tanpa mengubah ukuran portal mana pun.
    pengamat.observe(document.documentElement);
    window.addEventListener("resize", baca);
    return () => {
      pengamat.disconnect();
      window.removeEventListener("resize", baca);
    };
  }, [invalidate]);

  return kunci;
};
