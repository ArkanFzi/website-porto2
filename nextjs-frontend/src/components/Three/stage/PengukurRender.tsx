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
 *  Hasil ditulis ke window.__render untuk verifier di docs/verify.
 *
 *  Satu halaman bisa memegang dua root (kanvas editorial + satu island PanggungKecil). Kalau
 *  keduanya menulis variabel yang sama, yang menang adalah siapa pun yang render terakhir dan
 *  sensus verifier tiba di scene yang salah — "debu = 140 titik" membaca panggung hub lalu
 *  melaporkan 0. Karena itu setiap root tercatat sendiri di window.__renders[id] dan hanya root
 *  utama yang memegang __render/__scene. */
import React from "react";
import { useFrame } from "@react-three/fiber";

/** Penghitung frame per id, bukan per modul: verifier menghitung laju dari selisih dua
 *  pembacaan, dan frame kanvas tetangga bukan frame yang sedang diukurnya. */
const frameOlehId: Record<string, number> = {};

export interface BacaanRender {
  calls: number;
  segitiga: number;
  titik: number;
  garis: number;
  /** Nama (atau tipe) tiap objek yang ikut digambar frame ini. Sensus inilah yang
   *  membedakan objek mana yang menambah call — agregat calls saja tidak menyebut
   *  siapa yang menggambar. */
  objek: string[];
  /** Jumlah frame yang sudah digambar root ini sejak modul dimuat. */
  frame: number;
  /** Alokasi yang masih hidup di GPU-side cache three (gl.info.memory). Hitungan,
   *  bukan byte: three tidak mengekspos ukuran tiap geometri/tekstur, jadi angka MB
   *  tidak bisa dinyatakan jujur dari sini. */
  geometri: number;
  tekstur: number;
}

interface Props {
  /** Kunci root ini di window.__renders. Default "utama", dipakai kanvas editorial. */
  id?: string;
  /** Palsu = kanvas kedua di halaman ini: bacaannya hanya lewat __renders[id], tidak
   *  menimpa __render/__scene yang jadi kontrak verifier panggung utama. */
  utama?: boolean;
}

export const PengukurRender: React.FC<Props> = ({ id = "utama", utama = true }) => {
  useFrame((state) => {
    const { gl, scene, camera } = state;
    gl.render(scene, camera);
    frameOlehId[id] = (frameOlehId[id] ?? 0) + 1;

    const info = gl.info.render;
    const objek: string[] = [];
    scene.traverse((o) => {
      if (!o.visible) return;
      const bisa = o as typeof o & { isMesh?: boolean; isPoints?: boolean; isLine?: boolean };
      if (bisa.isMesh || bisa.isPoints || bisa.isLine) objek.push(o.name || o.type);
    });
    const bacaan: BacaanRender = {
      calls: info.calls,
      segitiga: info.triangles,
      titik: info.points,
      garis: info.lines,
      objek,
      frame: frameOlehId[id],
      geometri: gl.info.memory.geometries,
      tekstur: gl.info.memory.textures,
    };
    const jendela = window as unknown as {
      __render?: BacaanRender;
      /** Semua root yang ada di halaman ini, per id. Verifier yang perlu membandingkan
       *  dua kanvas (mis. "apakah island hub ikut menyalam saat tidu") membacanya dari sini. */
      __renders?: Record<string, BacaanRender>;
      /** Scene yang barusa digambar root utama: verifier yang perlu koordinat dunia sebuah
       *  objek (mis. "kenapa garis ini tidak terlihat di pixel") membacanya dari sini. */
      __scene?: typeof scene;
    };
    jendela.__renders = { ...jendela.__renders, [id]: bacaan };
    if (utama) {
      jendela.__render = bacaan;
      jendela.__scene = scene;
    }
  }, 1);

  return null;
};
