"use client";

import React, { Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { AktorPotret, type AktorProps } from "./stage/AktorPotret";
import { BenangRosso } from "./stage/ekstra/BenangRosso";
import { BilahTelemetri } from "./stage/ekstra/BilahTelemetri";
import { Debu } from "./stage/ekstra/Debu";
import { KompasGulir } from "./stage/ekstra/KompasGulir";
import { RollCage } from "./stage/ekstra/RollCage";
import { PengukurRender } from "./stage/PengukurRender";
import { mulai, mulaiLapor, setDprKanvas } from "@/lib/perfStats";
import {
  bacaKurangiGerak,
  bacaKurangiGerakSaatSSR,
  dengarKurangiGerak,
} from "@/lib/motion";


type Frameloop = "always" | "demand" | "never";

interface CanvasProps {
  scrollProgressRef: React.RefObject<number>;
  hoveredProject: number | null;
  scrollVelocityRef: React.RefObject<number>;
}

// Ambiens shader hanya hidup selama pengunjung masih bergerak. Setelah itu loop
// dihentikan (demand = nol frame) supaya laptop iGPU tidak dibakar untuk gerakan
// yang tidak dilihat; satu event pointer/scroll/ketik mengembalikannya seketika.
// pointerup, focusin, focusout ikut terdaftar karena mesin kartu mengubah KEADAAN
// pada peristiwa itu — seret dilepas (reticle pulang ke pointer), kontrol reticle
// difokus/dilepas — dan keadaan yang tidak meminta frame akan tertinggal satu
// tindakan di belakang layarnya.
const IDLE_MS = 4000;
const AKTIVITAS = [
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

const DPR_MIN = 1;
const DPR_MAKS = 1.5;
const DPR_AWAL = 1.25;

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
  // Semua aktor panggung memakai kontrak props yang sama; objeknya sendiri yang
  // memutuskan kapan ia terpasang.
  const aktor: AktorProps = { scrollProgressRef, scrollVelocityRef, hoveredProject };

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
            <AktorPotret {...aktor} />
            {/* Benang hanya ada selama perpindahan antar bab, debu hanya selama gulir
                bergerak. Keduanya lepas dari scene graph di luar itu. */}
            <BenangRosso {...aktor} />
            <Debu {...aktor} />
            {/* Sangkar mengikuti hover baris arsip; kompas mengikuti arah gulir. */}
            <RollCage {...aktor} />
            <KompasGulir {...aktor} />
            {/* Bilah telemetri digambar dari sampel p95Ms pengunjung, bukan angka hiasan. */}
            <BilahTelemetri {...aktor} />
          </Suspense>
          {/* Alat ukur, bukan bagian isi panggung: write-only, tidak memengaruhi render. */}
          {process.env.NODE_ENV !== "production" && <PengukurRender />}
        </Canvas>
      </div>
    </>
  );
};

export default GlobalEditorialCanvas;
