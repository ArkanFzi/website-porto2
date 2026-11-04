"use client";

/** PetaInstans: semua repo dalam SATU InstancedMesh, tingginya bintang yang dilaporkan GitHub.
 *
 *  Ini alasan rute itu ada: dua puluh objek menjadi satu draw call bukan dengan menolak datanya,
 *  tapi dengan mengirim matriks per instance. Angka tingginya tidak dihitung di sini — halaman
 *  yang menghitung dan mencetaknya, jadi tidak ada dua tempat yang bisa berbeda pendapat.
 *
 *  Dua hal yang boleh berubah setelah matriks pertama ditulis, dan keduanya satu draw call juga:
 *  - gerak masuk: seluruh instance diskalakan dari nol ke tingginya yang dicetak, sekali, lalu
 *    tidak pernah disentuh lagi;
 *  - warna pilihan: baris yang sedang ditunjuk dicelup warna batu. Penanda puncak tetap rosso,
 *    jadi keadaan "dipilih" tidak meminjam kosakata data. */
import React, { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export interface BatangPeta {
  nama: string;
  /** Barisnya hidup di DOM, jadi tautannya ikut dikirim supaya keduanya menyebut repo yang sama. */
  tautan: string;
  bintang: number;
  /** 0..1: pecahan dari TINGGI_BINGKAI. */
  tinggi: number;
  tertinggi: boolean;
}

const TINGGI_BINGKAI = 2;
const LEBAR_RENTANG = 3.2;
const TEBAL = 0.02;
/** Gerak masuk harus selesai jauh sebelum verifier membaca (probe menunggu 1,6 detik). */
const LAMA_MASUK_MS = 700;

const OBSIDIAN = new THREE.Color(0x0a0a0a);
const MERAH = new THREE.Color(0xd41e12);
const BATU = new THREE.Color(0xb4b0a8);

interface BentukDebug {
  instance: number;
  tinggi: number[];
  langkah: number;
  lebar: number;
  tinggiBingkai: number;
  merah: number;
  /** Indeks baris yang sedang ditunjuk pengunjung, -1 kalau tidak ada. */
  pilih: number;
}

declare global {
  interface Window {
    __peta?: BentukDebug;
  }
}

interface Props {
  bars: BatangPeta[];
  pilih?: number;
  /** false saat prefers-reduced-motion: matriks ditulis penuh sekali, tanpa animasi. */
  gambarMasuk?: boolean;
}

export const PetaInstans: React.FC<Props> = ({ bars, pilih = -1, gambarMasuk = false }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const jumlah = bars.length;
  const selesai = useRef(!gambarMasuk);
  const awal = useRef(0);
  const invalidate = useThree((s) => s.invalidate);

  const geometri = useMemo(
    () => new THREE.BoxGeometry(1, 1, TEBAL),
    []
  );
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ color: 0xffffff }),
    []
  );

  const tata = useMemo(() => {
    const langkah = LEBAR_RENTANG / jumlah;
    return { langkah, lebar: langkah * 0.62 };
  }, [jumlah]);

  useEffect(
    () => () => {
      geometri.dispose();
      material.dispose();
    },
    [geometri, material]
  );

  /** Satu tulis = satu keadaan yang bisa dibaca verifier: tinggi yang digambar, bukan yang
   *  direncanakan. Saat gerak masuk selesai angkanya persis yang dicetak di barisnya. */
  const tulis = React.useCallback(
    (progres: number) => {
      const mesh = meshRef.current;
      if (!mesh) return;
      const m = new THREE.Matrix4();
      const tinggiTergambar: number[] = [];
      let merah = 0;
      for (let i = 0; i < jumlah; i++) {
        const b = bars[i];
        const t = b.tinggi * TINGGI_BINGKAI * progres;
        // Nol tetap nol: kotak yang ditebal jadi terlihat adalah bentuk tanpa angka.
        m.makeScale(tata.lebar, t, 1);
        m.setPosition(-LEBAR_RENTANG / 2 + tata.langkah * (i + 0.5), -1 + t / 2, 0);
        mesh.setMatrixAt(i, m);
        if (b.tertinggi) merah++;
        tinggiTergambar.push(t);
      }
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      window.__peta = {
        instance: mesh.count,
        tinggi: tinggiTergambar,
        langkah: tata.langkah,
        lebar: tata.lebar,
        tinggiBingkai: TINGGI_BINGKAI,
        merah,
        pilih,
      };
    },
    [bars, jumlah, tata, pilih]
  );

  // Ditulis sejak frame pertama: tanpa ini matriks identitas InstancedMesh sempat terlihat
  // sebagai balok satu satuan di tengah, lalu menyusut — flash yang tidak dijanjikan angka apa pun.
  useEffect(() => {
    tulis(selesai.current ? 1 : 0);
  }, [tulis]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let i = 0; i < jumlah; i++) {
      mesh.setColorAt(i, i === pilih ? BATU : bars[i].tertinggi ? MERAH : OBSIDIAN);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    const d = window.__peta;
    if (d) d.pilih = pilih;
    invalidate();
  }, [pilih, bars, jumlah, invalidate]);

  useFrame((state) => {
    if (selesai.current) return;
    if (!awal.current) awal.current = state.clock.elapsedTime;
    const p = Math.min(1, ((state.clock.elapsedTime - awal.current) * 1000) / LAMA_MASUK_MS);
    // ease-out cubic: cepat di awal, mengendap di akhir — sama dengan EASE.keluar di CSS.
    tulis(1 - Math.pow(1 - p, 3));
    if (p >= 1) {
      selesai.current = true;
      return;
    }
    invalidate();
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometri, material, jumlah]}
      frustumCulled={false}
    />
  );
};

export default PetaInstans;
