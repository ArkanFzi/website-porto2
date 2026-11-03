"use client";

/** Mesin panggung kedua: satu kanvas per rute, duduk di aliran dokumen (bukan melekat di
 *  belakang isi seperti kanvas editorial), dengan hukum diam yang sama persis — dipinjam dari
 *  lib/diamKanvas, bukan disalin.
 *
 *  Yang sengaja TIDAK ada di sini: koreografi bab, registry portal, PerformanceMonitor, dan
 *  laporan ritme frame. Adegannya satu-dua objek sehingga dpr dikunci 1: tidak ada ritme yang
 *  perlu dinegosiasikan, dan halaman eksperimen tidak punya jalur untuk mengubah keadaan
 *  panggung utama. */
import React, { Suspense, useSyncExternalStore } from "react";
import { Canvas } from "@react-three/fiber";
import { PengukurRender } from "../stage/PengukurRender";
import { useDiamKanvas } from "@/lib/diamKanvas";
import {
  bacaKurangiGerak,
  bacaKurangiGerakSaatSSR,
  dengarKurangiGerak,
} from "@/lib/motion";

interface Props {
  className?: string;
  kamera?: [number, number, number];
  fov?: number;
  /** Palsu = adegan sedang tidak dilihat siapa pun: hukum diam tidak mendaftar listener
   *  sama sekali, jadi kanvas ini tidak ikut terbangun oleh peristiwa di bagian halaman
   *  lain. Dipakai halaman utama, tempat panggung ini hidup berdampingan dengan kanvas
   *  editorial — tanpa gerbang ini, satu gulir di ujung halaman dibayar dua kanvas.
   *  Default true: panggung per-rute tidak punya tetangga. */
  aktif?: boolean;
  /** Isi hanya bila panggung ini duduk di halaman yang sudah punya kanvas utama. Alat ukur
   *  tetap berjalan tapi tercatat di window.__renders[id], bukan menimpa __render/__scene —
   *  kalau tidak, verifier panggung utama sensusnya dicabut dari scene tetangga.
   *  Default kosong: rute dengan satu kanvas, dan kanvas itulah yang diukur. */
  pengukurId?: string;
  children: React.ReactNode;
}

export const PanggungKecil: React.FC<Props> = ({
  className = "",
  kamera = [0, 0, 5],
  fov = 42,
  aktif = true,
  pengukurId,
  children,
}) => {
  const reduceMotion = useSyncExternalStore(
    dengarKurangiGerak,
    bacaKurangiGerak,
    bacaKurangiGerakSaatSSR
  );
  const frameloop = useDiamKanvas(!reduceMotion && aktif);

  return (
    <div aria-hidden="true" data-panggung-kecil="" className={`relative overflow-hidden ${className}`}>
      <Canvas
        camera={{ position: kamera, fov }}
        dpr={1}
        frameloop={frameloop}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <Suspense fallback={null}>{children}</Suspense>
        {/* Alat ukur yang sama dengan kanvas editorial: draw call rute ini bisa dibaca
            drawcall-probe dengan kontrak yang sama, bukan dengan angka yang dikira-kira. */}
        {process.env.NODE_ENV !== "production" && (
          <PengukurRender id={pengukurId ?? "utama"} utama={!pengukurId} />
        )}
      </Canvas>
    </div>
  );
};

export default PanggungKecil;
