"use client";

/** Pengukur render yang hanya ada di development. Angka gl.info dibaca ulang setiap
 *  frame dan ditulis ke window.__render supaya verifier luar (docs/verify) bisa
 *  membandingkan jumlah draw call saat aktif vs saat halaman diam. Tidak dipakai kode
 *  produksi: komponennya sendiri di-mount hanya saat NODE_ENV development. */
import React from "react";
import { useFrame, useThree } from "@react-three/fiber";

export const PengukurRender: React.FC = () => {
  const { gl } = useThree();
  useFrame(() => {
    const jendela = window as unknown as {
      __render?: { calls: number; segitiga: number; titik: number };
    };
    const info = gl.info.render;
    jendela.__render = { calls: info.calls, segitiga: info.triangles, titik: info.points };
  });
  return null;
};
