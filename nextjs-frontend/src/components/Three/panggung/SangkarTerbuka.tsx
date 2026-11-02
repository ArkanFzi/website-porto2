"use client";

/** SangkarTerbuka: kerangka kawat yang sama dengan RollCage di panggung utama, tapi di
 *  halaman sendiri dan tanpa koreografi.
 *
 *  RollCage aslinya menggantung pada dua hal yang tidak ada di sini: `sikap()` (posisi bab)
 *  dan registry portal (kotak DOM tempat kartu duduk). Yang dipertahankan hanya geometrinya
 *  — satu `lineSegments` dari EdgesGeometry balok, satu draw call — dan mekanikannya kini
 *  datang dari pengunjung sendiri lewat lib/putaran.ts, modul yang sama dengan kontrol HUD
 *  halaman utama. Tidak ada salinan logika sudut di berkas ini. */
import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BATAS_DERAJAT, bacaTarget, derajat } from "@/lib/putaran";

/** Sangkar diparkir miring supaya terlihat sebagai benda tiga dimensi: dilihat tegak lurus,
 *  sebuah balok kawat hanya tampak seperti persegi. Perintah pengunjung ditambahkan di atas
 *  sikap awal ini, bukan menggantikannya. */
const YAW_AWAL = Math.PI / 4;
const PITCH_AWAL = THREE.MathUtils.degToRad(16);
const SISI = 1.5;
const WARNA_KAWAT = "#0A0A0A";

/** Bentuk window.__sangkar — dibaca verifier, tidak pernah dipakai kode produksi. */
const tulisDebug = (x: number, y: number) => {
  const jendela = window as unknown as {
    __sangkar?: {
      radX: number;
      radY: number;
      derajatX: number;
      derajatY: number;
      batasDerajat: number;
      yawAwal: number;
      pitchAwal: number;
    };
  };
  jendela.__sangkar = {
    radX: x,
    radY: y,
    derajatX: derajat(x),
    derajatY: derajat(y),
    batasDerajat: BATAS_DERAJAT,
    yawAwal: YAW_AWAL,
    pitchAwal: PITCH_AWAL,
  };
};

export const SangkarTerbuka: React.FC = () => {
  const garisRef = useRef<THREE.LineSegments>(null);
  const materialRef = useRef<THREE.LineBasicMaterial>(null);
  // NaN, bukan 0: frame pertama harus menulis keadaan awal ke verifier, walaupun
  // pengunjung belum memerintahkan apa pun.
  const terakhir = useRef({ x: Number.NaN, y: Number.NaN });

  const geometri = useMemo(() => {
    const balok = new THREE.BoxGeometry(1, 1, 1);
    const g = new THREE.EdgesGeometry(balok);
    balok.dispose();
    return g;
  }, []);

  useEffect(
    () => () => {
      geometri.dispose();
    },
    [geometri]
  );

  useFrame(() => {
    const garis = garisRef.current;
    if (!garis) return;
    const t = bacaTarget();
    garis.rotation.set(PITCH_AWAL + t.y, YAW_AWAL + t.x, 0);
    garis.scale.setScalar(SISI);
    // Kawat menjadi rosso hanya kalau perintah pengunjung benar-benar melewati nol:
    // warnanya ikut angka, bukan ikut dekorasi.
    if (materialRef.current && (t.x !== terakhir.current.x || t.y !== terakhir.current.y)) {
      materialRef.current.color.setHex(t.x === 0 && t.y === 0 ? 0x0a0a0a : 0xd41e12);
      terakhir.current = { x: t.x, y: t.y };
      tulisDebug(t.x, t.y);
    }
  });

  return (
    <lineSegments ref={garisRef} name="sangkar-terbuka" geometry={geometri}>
      <lineBasicMaterial ref={materialRef} color={WARNA_KAWAT} transparent opacity={0.92} depthWrite={false} />
    </lineSegments>
  );
};

export default SangkarTerbuka;
