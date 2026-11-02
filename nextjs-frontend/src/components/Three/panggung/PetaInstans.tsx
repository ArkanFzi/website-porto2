"use client";

/** PetaInstans: semua repo dalam SATU InstancedMesh, tingginya bintang yang dilaporkan GitHub.
 *
 *  Ini alasan rute itu ada: dua puluh objek menjadi satu draw call bukan dengan menolak datanya,
 *  tapi dengan mengirim matriks per instance. Angka tingginya tidak dihitung di sini — halaman
 *  yang menghitung dan mencetaknya, jadi tidak ada dua tempat yang bisa berbeda pendapat. */
import React, { useEffect, useMemo, useRef } from "react";
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

const OBSIDIAN = new THREE.Color(0x0a0a0a);
const MERAH = new THREE.Color(0xd41e12);

interface BentukDebug {
  instance: number;
  tinggi: number[];
  langkah: number;
  lebar: number;
  tinggiBingkai: number;
  merah: number;
}

declare global {
  interface Window {
    __peta?: BentukDebug;
  }
}

export const PetaInstans: React.FC<{ bars: BatangPeta[] }> = ({ bars }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const jumlah = bars.length;

  const { geometri, material } = useMemo(
    () => ({
      geometri: new THREE.BoxGeometry(1, 1, TEBAL),
      material: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    }),
    []
  );

  useEffect(
    () => () => {
      geometri.dispose();
      material.dispose();
    },
    [geometri, material]
  );

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const langkah = LEBAR_RENTANG / jumlah;
    const lebar = langkah * 0.62;
    const m = new THREE.Matrix4();
    const tinggiTergambar: number[] = [];
    let merah = 0;
    for (let i = 0; i < jumlah; i++) {
      const b = bars[i];
      const t = b.tinggi * TINGGI_BINGKAI;
      // Nol tetap nol: kotak yang ditebal jadi terlihat adalah bentuk tanpa angka.
      m.makeScale(lebar, t, 1);
      m.setPosition(-LEBAR_RENTANG / 2 + langkah * (i + 0.5), -1 + t / 2, 0);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, b.tertinggi ? MERAH : OBSIDIAN);
      tinggiTergambar.push(t);
      if (b.tertinggi) merah++;
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    window.__peta = {
      instance: mesh.count,
      tinggi: tinggiTergambar,
      langkah,
      lebar,
      tinggiBingkai: TINGGI_BINGKAI,
      merah,
    };
  }, [bars, jumlah]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometri, material, jumlah]}
      frustumCulled={false}
    />
  );
};

export default PetaInstans;
