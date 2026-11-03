"use client";

import React, { Suspense, useEffect, useState, useSyncExternalStore } from "react";
import { Canvas, invalidate } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { AktorPotret, type AktorProps } from "./stage/AktorPotret";
import { AktorSF26 } from "./stage/ekstra/AktorSF26";
import { BenangRosso } from "./stage/ekstra/BenangRosso";
import { BilahTelemetri } from "./stage/ekstra/BilahTelemetri";
import { Debu } from "./stage/ekstra/Debu";
import { JejakArsitektur } from "./stage/ekstra/JejakArsitektur";
import { KompasGulir } from "./stage/ekstra/KompasGulir";
import { RodaPaddock } from "./stage/ekstra/RodaPaddock";
import { RollCage } from "./stage/ekstra/RollCage";
import { PengukurRender } from "./stage/PengukurRender";
import { mulai, mulaiLapor, setDprKanvas } from "@/lib/perfStats";
import { mulaiBacaTelemetri } from "@/lib/bacaTelemetri";
import { useDiamKanvas } from "@/lib/diamKanvas";
import { SISA_PANGGUNG } from "./stage/usePanggung";
import {
  bacaKurangiGerak,
  bacaKurangiGerakSaatSSR,
  dengarKurangiGerak,
} from "@/lib/motion";


interface CanvasProps {
  scrollProgressRef: React.RefObject<number>;
  hoveredProject: number | null;
  scrollVelocityRef: React.RefObject<number>;
}

const DPR_MIN = 1;
const DPR_MAKS = 1.5;
const DPR_AWAL = 1.25;

export const GlobalEditorialCanvas: React.FC<CanvasProps> = ({

  scrollProgressRef,
  hoveredProject,
  scrollVelocityRef,
}) => {
  const [dpr, setDpr] = useState<number>(DPR_AWAL);
  const reduceMotion = useSyncExternalStore(
    dengarKurangiGerak,
    bacaKurangiGerak,
    bacaKurangiGerakSaatSSR
  );
  // Semua aktor panggung memakai kontrak props yang sama; objeknya sendiri yang
  // memutuskan kapan ia terpasang.
  const aktor: AktorProps = { scrollProgressRef, scrollVelocityRef, hoveredProject };

  // Hukum diam tinggal di lib/diamKanvas: panggung kedua memakainya tanpa menyalin angkanya.
  // Pengunjung yang minta gerakan dikurangi tidak pernah menggerakkan shader, jadi loop-nya
  // dibiarkan diam. SISA_PANGGUNG ikut diserahkan supaya "diam" hanya pernah berarti "tidak
  // ada gerakan yang berutang", bukan "empat detik tanpa peristiwa pointer".
  const frameloop = useDiamKanvas(!reduceMotion, SISA_PANGGUNG);

  // Pengunjung yang mengganti aba-aba gerakan di OS sementara halaman terbuka tidak pernah
  // menggerakkan apa pun, jadi loop sudah tidur saat objek-objek ekstra lepas dari scene
  // graph — dan frame terakhir keadaan lamanya tetap tertinggal di layar. Minta satu frame
  // saat aba-aba berubah: tanpa ini "reduce-motion menghapus objek" hanya benar di keadaan,
  // tidak di gambar.
  useEffect(() => {
    invalidate();
  }, [reduceMotion]);

  // Pengukur ritme frame halaman + pelapor ke /api/telemetry, sekali per mount.
  // Loop-nya berhenti sendiri saat tab tersembunyi (lihat lib/perfStats.ts).
  // Pembaca store telemetri ikut dimulai di sini, bukan di panel: bilah panggung butuh
  // gumpalan per menit meski panel tidak pernah dibuka, dan dua-duanya harus melihat
  // respons dari satu request yang sama.
  useEffect(() => {
    mulai();
    mulaiLapor();
    mulaiBacaTelemetri();
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
        arsip proyek, lalu memudar pada bagian penutup. Pada bagian arsip, satu baris
        proyek yang sedang ditunjuk mouse menggantikan potret dengan model mobil balap
        tiga dimensi berwarna grafit. Tidak ada informasi yang
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
            {/* Garis waktu arsitektur: panjang segmen = milidetik yang diukur rute /api/telemetry. */}
            <JejakArsitektur {...aktor} />
            {/* Roda paddock: satu-satunya objek yang sudutnya dijumlahkan dari velositas,
                dan hanya ada di bab penutup. */}
            <RodaPaddock {...aktor} />
            {/* Mobil baris /01: satu-satunya objek yang mengambil tempat kartu. Asetnya
                diunduh saat bab arsip mendekat, dan objeknya lepas saat silang habis. */}
            <AktorSF26 {...aktor} />
          </Suspense>
          {/* Alat ukur, bukan bagian isi panggung: write-only, tidak memengaruhi render. */}
          {process.env.NODE_ENV !== "production" && <PengukurRender />}
        </Canvas>
      </div>
    </>
  );
};

export default GlobalEditorialCanvas;
