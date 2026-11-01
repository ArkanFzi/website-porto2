"use client";

/** Pengukur render yang hanya ada di development.
 *
 *  Di-priority-1-kan lewat useFrame: satu subscriber berpriority membuat R3F menyerahkah
 *  render otomatis (state.internal.priority), jadi frame digambar di sini dan gl.info +
 *  sensus objek dibaca SETELAH render yang sama. Membaca dari useFrame biasa (priority 0)
 *  memberi pasangan yang salah — penghitung masih milik frame sebelumnya sementara scene
 *  graph sudah berubah — dan "+1 draw call per objek" tidak bisa dibuktikan. Loop rAF
 *  sendiri juga bukan jawaban: ia membangunkan halaman setiap frame dan menghancurkan
 *  gerbang "nol frame saat diam".
 *
 *  Hasil ditulis ke window.__render untuk verifier di docs/verify. */
import React from "react";
import { useFrame } from "@react-three/fiber";

export const PengukurRender: React.FC = () => {
  useFrame((state) => {
    const { gl, scene, camera } = state;
    gl.render(scene, camera);

    const info = gl.info.render;
    const objek: string[] = [];
    scene.traverse((o) => {
      if (!o.visible) return;
      const bisa = o as typeof o & { isMesh?: boolean; isPoints?: boolean; isLine?: boolean };
      if (bisa.isMesh || bisa.isPoints || bisa.isLine) objek.push(o.name || o.type);
    });
    const jendela = window as unknown as {
      __render?: {
        calls: number;
        segitiga: number;
        titik: number;
        garis: number;
        /** Nama (atau tipe) tiap objek yang ikut digambar frame ini. Sensus inilah yang
         *  membedakan objek mana yang menambah call — agregat calls saja tidak menyebut
         *  siapa yang menggambar. */
        objek: string[];
      };
      /** Scene yang barusa digambar: verifier yang perlu koordinat dunia sebuah objek
       *  (mis. "kenapa garis ini tidak terlihat di pixel") membacanya dari sini. */
      __scene?: typeof scene;
    };
    jendela.__render = {
      calls: info.calls,
      segitiga: info.triangles,
      titik: info.points,
      garis: info.lines,
      objek,
    };
    jendela.__scene = scene;
  }, 1);

  return null;
};
