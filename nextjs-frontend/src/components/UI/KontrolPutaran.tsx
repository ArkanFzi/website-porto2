"use client";

/** KontrolPutaran: padanan keyboard untuk gesture seret-putar kartu.
 *
 *  Seret pointer hanya bekerja di atas kartunya sendiri dan kartu tidak bisa menerima
 *  fokus, jadi jalur keyboard wajib punya sasaran DOM yang nyata: tombol ini memegang
 *  nilai yang sama lewat modul yang sama (lib/putaran.ts), tidak lewat salinan logika.
 *  Angka yang tampil adalah sudut yang DIPERINTAHKAN; kanvas yang menggerakkan kartunya. */
import React, { useEffect, useSyncExternalStore } from "react";
import { RotateCcw } from "lucide-react";
import {
  BATAS_DERAJAT,
  ambilFokus,
  bacaSnapshot,
  derajat,
  dengarPutaran,
  lepasFokus,
  langkahPanah,
  pasangPutaran,
  tulisTarget,
} from "@/lib/putaran";

const TANPA_SUDUT = { x: 0, y: 0 };

interface KontrolProps {
  /** Warna pil HUD sudah dihitung per bab di MinimalFixedFrame; kontrol ini memakainya
   *  supaya terbaca di atas kertas, papan gelap, maupun rosso bab penutup. */
  borderColor: string;
  textColor: string;
  chipBg: string;
}

export const KontrolPutaran: React.FC<KontrolProps> = ({ borderColor, textColor, chipBg }) => {
  const sudut = useSyncExternalStore(dengarPutaran, bacaSnapshot, () => TANPA_SUDUT);

  useEffect(() => pasangPutaran(), []);

  const tekan = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const panah: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const langkah = panah[e.key];
    if (langkah) {
      // preventDefault menghentikan gulir halaman milik panah saat kontrol ini fokus;
      // stopPropagation sengaja TIDAK dipakai: kanvas bangun dari loop "demand" lewat
      // listener keydown di window, dan peristiwa yang dihentikan di sini tidak pernah
      // sampai ke sana — kartu lalu diam sambil nilainya sudah berubah.
      e.preventDefault();
      langkahPanah(langkah[0], langkah[1]);
      return;
    }
    if (e.key === "Escape" || e.key === "Home") {
      e.preventDefault();
      tulisTarget(0, 0);
    }
  };

  const x = derajat(sudut.x);
  const y = derajat(sudut.y);

  return (
    <button
      type="button"
      data-kontrol-putar
      onKeyDown={tekan}
      onFocus={() => ambilFokus()}
      onBlur={() => lepasFokus()}

      aria-label={`Putar potret dengan panah keyboard, saat ini ${x} derajat menyamping dan ${y} derajat menunduk, batas ${BATAS_DERAJAT} derajat`}
      title="Fokus lalu putar dengan panah keyboard (padanan seret kartu)"
      className={`hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-full border ${borderColor} ${chipBg} backdrop-blur-md transition-all duration-300 cursor-pointer text-[9px] font-mono tracking-wider`}
    >
      <RotateCcw className="w-3 h-3 text-[#D41E12]" />
      <span className={textColor}>
        PUTAR {x >= 0 ? "+" : ""}
        {x}°/{y >= 0 ? "+" : ""}
        {y}°
      </span>
      <span className="sr-only">
        Tekan panah kiri, kanan, atas, atau bawah untuk memiringkan potret sampai{" "}
        {BATAS_DERAJAT} derajat, lalu Escape untuk mengembalikan.
      </span>
    </button>
  );
};

export default KontrolPutaran;
