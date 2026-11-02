"use client";

/** /sangkar sisi klien: sangkar kawat yang diputar oleh pengunjung, bukan oleh gulir.
 *
 *  Sudut hanya punya satu sumber — lib/putaran.ts — dan halaman ini hanya menambahkan dua
 *  hal yang memang milik rute sendiri: wilayah tempat seret diterima (laporKotakKartu) dan
 *  padanan keyboard-nya. Bacaan sudut di DOM dan rotasi di WebGL sama-sama datang dari
 *  snapshot modul yang sama, jadi verifier bisa membandingkannya. */
import React, { useEffect, useRef, useSyncExternalStore } from "react";
import PanggungKecil from "@/components/Three/panggung/PanggungKecil";
import SangkarTerbuka from "@/components/Three/panggung/SangkarTerbuka";
import { GridPanggung } from "@/components/Editorial/PanggungFrame";
import {
  BATAS_DERAJAT,
  ambilFokus,
  bacaSnapshot,
  derajat,
  dengarPutaran,
  lepasFokus,
  langkahPanah,
  laporKotakKartu,
  pasangPutaran,
  tulisTarget,
} from "@/lib/putaran";

const TANPA_SUDUT = { x: 0, y: 0 };

const PANAH: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

export default function SangkarHidup() {
  const wadah = useRef<HTMLDivElement>(null);
  const sudut = useSyncExternalStore(dengarPutaran, bacaSnapshot, () => TANPA_SUDUT);

  useEffect(() => {
    const lepas = pasangPutaran();
    const el = wadah.current;
    if (!el) return lepas;

    const lapor = () => {
      const r = el.getBoundingClientRect();
      laporKotakKartu({ kiri: r.left, atas: r.top, lebar: r.width, tinggi: r.height });
    };
    lapor();
    const pengamat = new ResizeObserver(lapor);
    pengamat.observe(el);
    window.addEventListener("scroll", lapor, { passive: true });
    return () => {
      pengamat.disconnect();
      window.removeEventListener("scroll", lapor);
      lepas();
    };
  }, []);

  const x = derajat(sudut.x);
  const y = derajat(sudut.y);

  return (
    <div className="flex flex-col gap-10">
      <GridPanggung>
        <div className="flex flex-col gap-4">
          <span className="font-mono text-micro tracking-[0.2em] uppercase text-titanium">
            COMMANDED ATTITUDE · LIMITED TO ±{BATAS_DERAJAT}°
          </span>
          <p className="font-serif text-title leading-[0.9] tracking-tight tabular-nums text-obsidian">
            <span data-sangkar-derajat="">
              {x >= 0 ? "+" : ""}
              {x}° / {y >= 0 ? "+" : ""}
              {y}°
            </span>
          </p>
          <p className="font-mono text-tag leading-relaxed text-titanium max-w-[70ch]">
            Drag inside the frame, or focus the control below and use the arrow keys. The angle is
            held only while you hold it: releasing the pointer or leaving the control returns the
            cage to its parked yaw, because a value nobody is commanding should not keep the canvas
            awake.
          </p>

          <button
            type="button"
            data-sangkar-kontrol
            onKeyDown={(e) => {
              const langkah = PANAH[e.key];
              if (langkah) {
                // preventDefault menahan gulir halaman; stopPropagation sengaja tidak:
                // listener keydown di window-lah yang membangunkan kanvas dari "demand".
                e.preventDefault();
                langkahPanah(langkah[0], langkah[1]);
                return;
              }
              if (e.key === "Escape" || e.key === "Home") {
                e.preventDefault();
                tulisTarget(0, 0);
              }
            }}
            onFocus={() => ambilFokus()}
            onBlur={() => lepasFokus()}
            aria-label={`Putar sangkar dengan panah keyboard, saat ini ${x} derajat menyamping dan ${y} derajat menunduk, batas ${BATAS_DERAJAT} derajat`}
            className="self-start font-mono text-tag tracking-[0.2em] uppercase px-4 py-2 rounded-full swiss-border hover:border-rosso hover:text-rosso transition-colors"
          >
            {x >= 0 ? "+" : ""}
            {x}° / {y >= 0 ? "+" : ""}
            {y}° · ARROWS
          </button>
        </div>

        <div ref={wadah} className="w-full h-[52vh] min-h-[380px] swiss-border bg-obsidian/5">
          <PanggungKecil className="w-full h-full" kamera={[0, 0, 3.2]} fov={42}>
            <SangkarTerbuka />
          </PanggungKecil>
        </div>
      </GridPanggung>

      <p className="font-mono text-tag leading-relaxed text-titanium max-w-[70ch]">
        The cage is parked at 45° yaw and 16° pitch so it reads as a solid rather than as a flat
        square; your command is added on top of that and clipped to ±{BATAS_DERAJAT}°, the same
        limit and the same module the front-page portrait uses. There is no easing here on purpose:
        easing is a frame paid for while nobody is moving. prefers-reduced-motion switches the
        command path off, and the cage stays exactly where it was parked.
      </p>
    </div>
  );
}
