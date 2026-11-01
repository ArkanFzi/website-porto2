"use client";

/** Benang rosso: satu garis jahitan yang hanya ada selama kartu berpindah antar bab.
 *
 *  Titiknya diambil dari tepi portal DOM bab asal dan bab tujuan (registry yang
 *  mengukur keduanya), lalu dibengkokkan lewat kurva Kuadratik Bezier ke arah pusat
 *  layar. Satu objek = satu draw call, dan ia tidak pernah terpasang saat kartu diam
 *  di satu bab. Buffer posisi dipakai sebagai attribut deklaratif dan ditulis lewat
 *  objek yang sedang terpasang — nilai hasil useMemo tidak pernah dimutasi, karena
 *  reakt-compiler melarang itu dan diam-diam melewatkan tulisannya. */
import React, { useRef, useState, useSyncExternalStore } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { AktorProps } from "../AktorPotret";
import { sikap, type Kunci } from "../koreografi";
import { usePortalRegistry } from "../usePortalRegistry";

const TITIK = 24;

/** Seberapa jauh titik kendali ditarik ke pusat layar. 0 = garis lurus antar tepi. */
const TARIK_TENGAH = 0.42;

/** Isi buffer posisi garis. Identitasnya harus stabil supaya R3F tidak membuat ulang
 *  attribut tiap render; yang berubah hanya isinya, lewat objek yang terpasang. */
const POSISI_AWAL = new Float32Array(TITIK * 3);

// Sama seperti GlobalEditorialCanvas: MediaQueryList dibuat sekali di module scope
// supaya preferensi gerak dibaca lewat store tanpa effect-setState per frame.
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

/** Dicari dengan loop, bukan `find`: callback Arrow yang dibuat per frame adalah
 *  alokasi, dan frame adalah satu-satunya tempat komponen ini bekerja. */
const kunciBab = (daftar: Kunci[], bab: number): Kunci | undefined => {
  for (let i = 0; i < daftar.length; i++) if (daftar[i].bab === bab) return daftar[i];
  return undefined;
};

export const BenangRosso: React.FC<AktorProps> = ({ scrollProgressRef }) => {
  const reduce = useSyncExternalStore(
    dengarKurangiGerak,
    bacaKurangiGerak,
    bacaKurangiGerakSaatSSR
  );
  const { size, viewport, camera } = useThree();
  const portal = usePortalRegistry();
  const garis = useRef<THREE.Line>(null);

  // Gerbang hidup ada di React (objeknya memang tidak terpasang di luar perpindahan),
  // tapi yang membacanya tiap frame adalah useFrame di bawah. Ref ini menyimpan nilai
  // terakhir supaya setState hanya jalan saat gerbangnya benar-benar berbalik.
  const [jahit, setJahit] = useState(false);
  const jahitRef = useRef(false);

  useFrame(() => {
    const k = sikap(Math.max(0, Math.min(1, scrollProgressRef.current)), portal.current);
    const ada = !reduce && !!k && k.t > 0 && k.t < 1;
    if (ada !== jahitRef.current) {
      jahitRef.current = ada;
      setJahit(ada);
    }

    const objek = garis.current;
    if (!objek || !k || !ada) return;

    const dari = kunciBab(portal.current, k.babDari);
    const ke = kunciBab(portal.current, k.babKe);
    if (!dari || !ke) return;

    // Rumus pixel CSS -> satuan dunia yang dipakai kartu potret (lihat usePanggung).
    // Semua titik benang duduk pada kedalaman kartu, jadi satu angka saja cukup.
    const dpp = viewport.width / size.width;
    const pxPerWorld = (1 / dpp) * (camera.position.z / (camera.position.z - k.z));
    const tengahX = size.width / 2;
    const tengahY = size.height / 2;

    // Jahitan mengikuti arah baca: tepi portal yang menghadap bab tujuan, setinggi
    // tengahnya, supaya benang keluar dari bingkai yang sedang ditinggalkan.
    const keKanan = ke.kotak.kiri + ke.kotak.lebar / 2 >= dari.kotak.kiri + dari.kotak.lebar / 2;
    const x0 = keKanan ? dari.kotak.kiri + dari.kotak.lebar : dari.kotak.kiri;
    const y0 = dari.kotak.atas + dari.kotak.tinggi / 2;
    const x1 = keKanan ? ke.kotak.kiri : ke.kotak.kiri + ke.kotak.lebar;
    const y1 = ke.kotak.atas + ke.kotak.tinggi / 2;

    const pusX = (x0 + x1) / 2;
    const pusY = (y0 + y1) / 2;
    const cx = pusX + (tengahX - pusX) * TARIK_TENGAH;
    const cy = pusY + (tengahY - pusY) * TARIK_TENGAH;

    const atribut = objek.geometry.attributes.position as THREE.BufferAttribute;
    const arr = atribut.array as Float32Array;
    for (let i = 0; i < TITIK; i++) {
      const u = i / (TITIK - 1);
      const w = 1 - u;
      const cssX = w * w * x0 + 2 * w * u * cx + u * u * x1;
      const cssY = w * w * y0 + 2 * w * u * cy + u * u * y1;
      const j = i * 3;
      arr[j] = (cssX - tengahX) / pxPerWorld;
      arr[j + 1] = -(cssY - tengahY) / pxPerWorld;
      arr[j + 2] = k.z;
    }
    atribut.needsUpdate = true;

    // Sinus: benang muncul di awal perpindahan dan putus sendiri di akhir, jadi tidak
    // ada sisa objek saat kartu sudah mendarat di bab tujuan.
    (objek.material as THREE.LineBasicMaterial).opacity = Math.sin(Math.PI * k.t);
  });

  if (reduce || !jahit) return null;

  return (
    // `threeLine` adalah ejaan THREE.Line di R3F 9; `line` sudah diambil SVG oleh tipe React.
    <threeLine ref={garis} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[POSISI_AWAL, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color="#D41E12" transparent depthWrite={false} opacity={0} />
    </threeLine>
  );
};

export default BenangRosso;
