"use client";

/** Roda paddock: cincin di sudut kanan-bawah portal bab penutup yang bergulir dari
 *  velositas gulir pengunjung.
 *
 *  Yang menggerakkan roda adalah `scrollVelocityRef` — angka Lenis yang sama yang dipakai
 *  debu, kompas, dan dolly kamera — dan sudutnya DIJUMLAH dari waktu ke waktu, bukan
 *  dipasang langsung dari velositas. Kalau sudutnya disamakan dengan velositas, roda
 *  berhenti menjadi benda yang bergulir dan mulai menjadi jarum yang menunjuk: ia
 *  melompat bolak-balik mengikuti tanda velositas dan kehilangan arah perjalanannya.
 *
 *  Cincinnya tidak penuh (sekitar 0,85 lingkar): cincin yang sempurna simetris tidak pernah
 *  terlihat berputar, jadi celah itu bukan hiasan — dia satu-satunya hal yang membuat
 *  rotasinya bisa dibaca mata.
 *
 *  Saat gulir diam objeknya di-unmount, mengikuti Debu dan KompasGulir: velositas hidup di
 *  ref yang tidak pernah memicu render, jadi gerbangnya ditulis ke state di dalam useFrame.
 *  Itu menjaga invariant "nol frame saat diam" yang dijaga GlobalEditorialCanvas. */
import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { AktorProps } from "../AktorPotret";
import { sikap } from "../koreografi";
import { usePortalRegistry } from "../usePortalRegistry";

/** Di bawah velositas ini roda tidak lagi menggulir jarak yang nyata. */
const AMBANG = 0.004;
/** Bab tempat roda ini berada: paddock/penutup. */
const BAB_PADDOCK = 4;
/** Setengah diameter roda dalam pixel CSS, dan patokan keliling untuk menghitung putaran. */
const JARI_PX = 26;
/** Roda tidak boleh lebih besar dari seperempat lebar portal: bab penutup menyempit. */
const JARI_MAKS_RASIO = 0.24;
/** Mundur dari tepi portal dalam pixel CSS, sama seperti kompas, supaya cincin tidak
 *  terpotong batas papan. */
const MUNDUR = 14;
/** Kecembungan lingkaran per pixel jalan: satu putaran penuh = keliling roda. */
const KELILING = Math.PI * 2;
/** Bagian lingkar yang dilukis; sisanya jadi celah pembaca rotasi. */
const ARC = Math.PI * 1.7;
const KERTAS = 0xf7f5f0;

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

/** Bentuk window.__roda — dibaca verifier, tidak pernah dipakai kode produksi. `putaran`
 *  adalah jumlah putaran penuh sejak mounted, supaya verifier bisa membandingkan besar
 *  putaran dengan jarak gulir nyata tanpa harus menelusuri lompatan modulo. */
const tulisRodaDebug = (sudutRad: number, vel: number, jariPx: number, putaran: number) => {
  const jendela = window as unknown as {
    __roda?: { sudut: number; velositas: number; jariPx: number; putaran: number };
  };
  jendela.__roda = { sudut: sudutRad, velositas: vel, jariPx, putaran };
};

export const RodaPaddock: React.FC<AktorProps> = ({ scrollProgressRef, scrollVelocityRef }) => {
  const { size, viewport, camera } = useThree();
  const portal = usePortalRegistry();
  const meshRef = useRef<THREE.Mesh>(null);
  const kurangiGerak = useSyncExternalStore(
    dengarKurangiGerak,
    bacaKurangiGerak,
    bacaKurangiGerakSaatSSR
  );

  // Geometri satuan: radius 1, ketebalan relatif tetap, lalu diskalakan per frame menurut
  // penggaris pixel→dunia. Satu geometri untuk semua ukuran layar, tanpa alokasi per frame.
  const geometri = useMemo(() => new THREE.TorusGeometry(1, 0.17, 8, 28, ARC), []);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ color: KERTAS, transparent: true, opacity: 0.9 }),
    []
  );

  const [bergulir, setBergulir] = useState(false);
  const bergulirRef = useRef(false);
  /** Sudut kumulatif radian. Dijaga tetap dalam satu lingkar supaya penjumlahan ribuan
   *  frame tidak menggerus presisi float. */
  const sudut = useRef(0);
  /** Putaran bersih sejak mounted, tanpa modulo — verifier membandingkan besarnya dengan
   *  jarak gulir nyata, yang tidak bisa dilakukan pada sudut yang sudah dibungkus modulo. */
  const putaran = useRef(0);

  useEffect(
    () => () => {
      geometri.dispose();
      material.dispose();
    },
    [geometri, material]
  );

  useFrame((_, delta) => {
    const vel = scrollVelocityRef.current;

    const p = Math.max(0, Math.min(1, scrollProgressRef.current));
    const k = sikap(p, portal.current);
    const diPaddock = k?.babKe === BAB_PADDOCK;
    const jalan = !kurangiGerak && diPaddock && Math.abs(vel) >= AMBANG;
    if (jalan !== bergulirRef.current) {
      bergulirRef.current = jalan;
      setBergulir(jalan);
    }
    if (!k) return;
    // Jari-jari dibatasi lebar portal, dan posisi dihitung dari jari-jari yang sama, jadi
    // cincin tetap seluruhnya di dalam portal pada layar sempit.
    const jari = Math.min(JARI_PX, k.kotak.lebar * JARI_MAKS_RASIO);

    // Jarak gulir frame ini dibagi keliling roda: arah putaran mengikuti tanda velositas dan
    // lajunya proporsional dengan besarnya. Faktor 60 yang mengubah px/frame Lenis menjadi
    // px/detik sengaja tidak dipakai — dengan itu roda sekecil ini menempuh ~9 putaran per
    // detik pada gulir cepat, dan yang terlihat mata hanya blur, bukan gulir.
    const langkah = (vel / jari) * KELILING * Math.min(delta, 0.05);

    // Oleng — jarak yang sudah ditempuh — dihitung SEBELUM mesh-nya ada. `bergulir` adalah
    // state React, jadi frame pertama velositas selalu datang tanpa roda di panggung; buang
    // frame itu berarti menghapus jarak yang benar-benar ditempuh, dan pada gulir pendek
    // (terukur: satu lompatan = satu frame velositas) rodanya tidak pernah berputar sama
    // sekali. Yang butuh mesh hanya gambar: rotasi, posisi, skala.
    if (jalan) {
      sudut.current = (sudut.current + langkah) % KELILING;
      putaran.current += langkah / KELILING;
      tulisRodaDebug(sudut.current, vel, jari, putaran.current);
    }

    const roda = meshRef.current;
    if (!roda || !diPaddock) return;

    const dpp = viewport.width / size.width;
    const pxw = (1 / dpp) * (camera.position.z / (camera.position.z - k.z));
    roda.rotation.z = -sudut.current;

    roda.position.set(
      (k.kotak.kiri + k.kotak.lebar - MUNDUR - jari - size.width / 2) / pxw,
      -(k.kotak.atas + k.kotak.tinggi - MUNDUR - jari - size.height / 2) / pxw,
      k.z
    );
    roda.scale.setScalar(jari / pxw);
    tulisRodaDebug(sudut.current, vel, jari, putaran.current);
  });

  if (kurangiGerak || !bergulir) return null;

  // scale 0 di awal: objeknya baru saja dibuat dan useFrame belum sempat memosisikannya,
  // jadi satu frame tanpa batas ini yang mencegah cincin seukuran layar muncul di tengah.
  return <mesh ref={meshRef} name="roda" geometry={geometri} material={material} scale={0} />;
};

export default RodaPaddock;
