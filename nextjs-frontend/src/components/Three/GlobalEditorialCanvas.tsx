"use client";

import React, { Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { ChiaroscuroMonolith } from "./ChiaroscuroMonolith";
import { mulai, mulaiLapor, setDprKanvas } from "@/lib/perfStats";

type Frameloop = "always" | "demand" | "never";

interface CanvasProps {
  scrollProgressRef: React.RefObject<number>;
  hoveredProject: number | null;
  scrollVelocityRef: React.RefObject<number>;
}

// Ambiens shader hanya hidup selama pengunjung masih bergerak. Setelah itu loop
// dihentikan (demand = nol frame) supaya laptop iGPU tidak dibakar untuk gerakan
// yang tidak dilihat; satu event pointer/scroll/ketik mengembalikannya seketika.
const IDLE_MS = 4000;
const AKTIVITAS = ["scroll", "pointermove", "pointerdown", "keydown", "wheel", "touchstart"];

const DPR_MIN = 1;
const DPR_MAKS = 1.5;
const DPR_AWAL = 1.25;

// MediaQueryList dibuat sekali; hook store membacanya tanpa effect-setState.
let mqKurangiGerak: MediaQueryList | undefined;
const mediaKurangiGerak = () =>
  (mqKurangiGerak ??= window.matchMedia("(prefers-reduced-motion: reduce)"));
const dengarKurangiGerak = (ubah: () => void) => {
  const mq = mediaKurangiGerak();
  mq.addEventListener("change", ubah);
  return () => mq.removeEventListener("change", ubah);
};
const bacaKurangiGerak = () => mediaKurangiGerak().matches;
const bacaKurangiGerakSaatSSR = () => false;

export const GlobalEditorialCanvas: React.FC<CanvasProps> = ({
  scrollProgressRef,
  hoveredProject,
  scrollVelocityRef,
}) => {
  const [putaran, setPutaran] = useState<Frameloop>("always");
  const [dpr, setDpr] = useState<number>(DPR_AWAL);
  const reduceMotion = useSyncExternalStore(
    dengarKurangiGerak,
    bacaKurangiGerak,
    bacaKurangiGerakSaatSSR
  );
  const idleTimer = useRef<number | undefined>(undefined);

  // Pengunjung yang minta gerakan dikurangi tidak pernah menggerakkan shader,
  // jadi frame terakhir hasil mount sudah cukup dan loop-nya dibiarkan diam.
  const frameloop: Frameloop = reduceMotion ? "demand" : putaran;

  useEffect(() => {
    if (reduceMotion) return;

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
  }, [reduceMotion]);

  // Pengukur ritme frame halaman + pelapor ke /api/telemetry, sekali per mount.
  // Loop-nya berhenti sendiri saat tab tersembunyi (lihat lib/perfStats.ts).
  useEffect(() => {
    mulai();
    mulaiLapor();
  }, []);

  useEffect(() => {
    setDprKanvas(dpr);
  }, [dpr]);

  return (
    <>
      {/* Jelaskan isinya, bukan implementasinya — angka FPS dan nama shader tidak
          berarti bagi pembaca layar dan tidak bisa diverifikasi dari teks ini. */}
      <p className="sr-only">
        Visual pada halaman ini adalah potret hitam-putih penulis dalam bingkai
        persegi panjang. Bingkai berpindah sisi mengikuti gulir: berada di tengah
        pada bagian pembuka, di kiri pada bagian dua identitas, di kanan pada bagian
        arsip proyek, lalu memudar pada bagian penutup. Tidak ada informasi yang
        hanya tersedia di visual ini; seluruh isi bacaan ada di teks halaman.
      </p>
      <div
        aria-hidden="true"
        className="fixed inset-0 w-screen h-screen pointer-events-none z-10 overflow-hidden"
      >
        <Canvas
          camera={{ position: [0, 0, 5], fov: 42 }}
          dpr={dpr}
          frameloop={frameloop}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
          }}
        >
          <PerformanceMonitor
            ms={1000}
            iterations={12}
            flipflops={3}
            onDecline={() => setDpr((d) => Math.max(DPR_MIN, d - 0.25))}
            onIncline={() => setDpr((d) => Math.min(DPR_MAKS, d + 0.25))}
            onFallback={() => setDpr(DPR_MIN)}
          />
          <Suspense fallback={null}>
            <ChiaroscuroMonolith
              scrollProgressRef={scrollProgressRef}
              hoveredProject={hoveredProject}
              scrollVelocityRef={scrollVelocityRef}
            />
          </Suspense>
        </Canvas>
      </div>
    </>
  );
};

export default GlobalEditorialCanvas;
