"use client";

/** Benang rosso: satu garis jahitan yang hanya ada selama kartu berpindah antar bab.
 *
 *  Titiknya diambil dari tepi portal DOM bab asal dan bab tujuan (registry yang
 *  mengukur keduanya), lalu dibengkokkan lewat kurva Kuadratik Bezier ke arah pusat
 *  layar. Satu objek = satu draw call, dan ia tidak pernah terpasang saat kartu diam
 *  di satu bab.
 *
 * Objeknya dibangun imperatif lalu dipasang lewat `<primitive>`: ejaan `<threeLine>` di
 * R3F 9 hanya ada di tipe (`three-types.d.ts:47`), runtime tetap mencari `THREE.ThreeLine`
 * dan melempar "not part of the THREE namespace", jadi garis tidak pernah muncul sama
 * sekali. Buffer posisi ditulis lewat objek yang sedang terpasang (`garis.current`),
 * bukan lewat nilai useMemo, karena react-compiler melarang mutasi memo. */
import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { AktorProps } from "../AktorPotret";
import { sikap, type Kunci } from "../koreografi";
import { usePortalRegistry } from "../usePortalRegistry";

const TITIK = 24;

/** Seberapa jauh titik kendali ditarik ke pusat layar. 0 = garis lurus antar tepi. */
const TARIK_TENGAH = 0.42;
/** Kartu potret digambar pada z portal dan menutupi seluruh kotak portalnya, jadi garis
 *  pada z yang sama tidak pernah terlihat (dua objek transparan pada kedalaman yang sama
 *  urutnya tidak menentu). Sedikit ke depan kamera membuat jahitan terbaca di atas kartu. */
const Z_DEPAN = 0.3;

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

  // Satu geometri + satu material untuk seumur komponen; perpindahan bab hanya menulis
  // ulang isinya. Komponen ini tidak pernah di-unmount selama canvas hidup, jadi tidak
  // ada buffer yang tertinggal per perpindahan.
  const benang = useMemo(() => {
    const geometri = new THREE.BufferGeometry();
    geometri.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(TITIK * 3), 3)
    );
    const material = new THREE.LineBasicMaterial({
      color: "#D41E12",
      transparent: true,
      depthWrite: false,
      opacity: 0,
    });
    const jahitan = new THREE.Line(geometri, material);
    jahitan.frustumCulled = false;
    jahitan.name = "benang";
    return jahitan;
  }, []);

  useEffect(
    () => () => {
      benang.geometry.dispose();
      (benang.material as THREE.LineBasicMaterial).dispose();
    },
    [benang]
  );

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
    // Angka z yang dipakai untuk MENULIS titik harus sama dengan angka yang dipakai untuk
    // MEMPROYEKSIKAN koordinat portal, kalau tidak kedua ujung benang meleset dari tepi
    // portalnya sendiri (parallax 0.3 satuan ≈ 6% pada kamera z=5).
    const dpp = viewport.width / size.width;
    const z = k.z + Z_DEPAN;
    const pxPerWorld = (1 / dpp) * (camera.position.z / (camera.position.z - z));
    const tengahX = size.width / 2;
    const tengahY = size.height / 2;

    // Jahitan ditarik dari pusat portal bab asal ke pusat portal bab tujuan. Tepi yang
    // saling menghadap pernah dicoba dan tidak terbaca: portal bab yang bersebelahan bisa
    // saling bertumpuk (bab 1 kiri=554, bab 2 kanan=569 pada 1440px), jadi tepi-ke-tepi
    // hanya sepanjang 15px sementara pusat-ke-pusat 316px.
    const x0 = dari.kotak.kiri + dari.kotak.lebar / 2;
    const y0 = dari.kotak.atas + dari.kotak.tinggi / 2;
    const x1 = ke.kotak.kiri + ke.kotak.lebar / 2;
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
      arr[j + 2] = z;
    }
    atribut.needsUpdate = true;

    // Sinus: benang muncul di awal perpindahan dan putus sendiri di akhir, jadi tidak
    // ada sisa objek saat kartu sudah mendarat di bab tujuan.
    (objek.material as THREE.LineBasicMaterial).opacity = Math.sin(Math.PI * k.t);
  });

  if (reduce || !jahit) return null;

  return <primitive object={benang} ref={garis} />;
};

export default BenangRosso;
