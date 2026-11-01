"use client";

/** RollCage: sangkar kawat dua belas sisi yang membingkai kartu potret saat satu baris
 *  arsip di-hover.
 *
 *  Satu `<lineSegments>` = satu draw call, dan objeknya TIDAK ADA sama sekali saat tidak
 *  ada baris yang di-hover. Kanvas berjalan pada frameloop "demand" dan berhenti total
 *  setelah pengunjung diam, jadi objek tambahan yang hidup terus akan menghapus nol-frame
 *  itu; sangkar harus ikut mati bersama hover-nya. */
import React, { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { AktorProps } from "../AktorPotret";
import { RASIO_POTRET } from "../chiaroscuroMaterial";
import { sikap } from "../koreografi";
import { usePortalRegistry, type PortalKotak } from "../usePortalRegistry";

/** Salinan persis `muat` di usePanggung. Sangkar harus selebar KARTU, bukan seukuran
 *  portal, dan tidak diekspor dari mesin kartu supaya objek ini tidak menggantungkan
 *  diri padanya. */
const muat = (kotak: PortalKotak) => Math.min(kotak.lebar, kotak.tinggi / RASIO_POTRET);

const WARNA_KAWAT = "#8A8A8A";
const OPASITAS = 0.9;
/** Kedalaman sangkar dalam satuan dunia — sumbu Z tidak ikut diturunkan dari portal. */
const KEDALAMAN = 0.7;

// MediaQueryList dibuat sekali di module scope, pola yang sama dengan
// GlobalEditorialCanvas. Sangkar adalah gerakan yang mengikuti pointer, jadi ia tidak
// boleh muncul sama sekali saat penonton minta gerak dikurangi.
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

export const RollCage: React.FC<AktorProps> = ({ scrollProgressRef, hoveredProject }) => {
  const garisRef = useRef<THREE.LineSegments>(null);
  const { size, viewport, camera } = useThree();
  const portal = usePortalRegistry();
  const kurangiGerak = useSyncExternalStore(
    dengarKurangiGerak,
    bacaKurangiGerak,
    bacaKurangiGerakSaatSSR
  );

  // Balok satuan (1x1x1). Sisi-sisnya ditentukan oleh scale per sumbu setiap frame, jadi
  // geometri tidak pernah dibangun ulang ketika portal berganti bab atau jendela dibesarkan.
  const kawat = useMemo(() => {
    const balok = new THREE.BoxGeometry(1, 1, 1);
    const geometri = new THREE.EdgesGeometry(balok);
    balok.dispose();
    return geometri;
  }, []);

  // Komponen ini di-mount dan di-unmount setiap kali hover berpindah. Tanpa rilis
  // eksplisit, satu buffer GPU tertinggal per hover dan tidak pernah diambil kembali.
  useEffect(
    () => () => {
      kawat.dispose();
    },
    [kawat]
  );

  useFrame(() => {
    const garis = garisRef.current;
    if (!garis) return;

    const p = Math.max(0, Math.min(1, scrollProgressRef.current));
    const k = sikap(p, portal.current);
    if (!k) return;

    const dpp = viewport.width / size.width;
    const camZ = camera.position.z;
    // Kartu diskala dengan pxPerWorld(pas) dan ditempatkan dengan pxPerWorld(z); kedua
    // angka itu dipakai di sini agar tapak sangkar identik dengan tapak kartu.
    const pxPas = (1 / dpp) * (camZ / (camZ - k.pas));
    const pxZ = (1 / dpp) * (camZ / (camZ - k.z));
    const lebar = muat(k.kotak) / pxPas;

    garis.position.set(
      (k.kotak.kiri + k.kotak.lebar / 2 - size.width / 2) / pxZ,
      -(k.kotak.atas + k.kotak.tinggi / 2 - size.height / 2) / pxZ,
      k.z
    );
    garis.scale.set(lebar, lebar * RASIO_POTRET, KEDALAMAN);
    // Hanya kemiringan bab; sangkar tidak berputar dengan sendirinya.
    garis.rotation.y = k.rot;
  });

  if (kurangiGerak || hoveredProject === null) return null;

  return (
    <lineSegments ref={garisRef} geometry={kawat}>
      <lineBasicMaterial
        color={WARNA_KAWAT}
        transparent
        opacity={OPASITAS}
        depthWrite={false}
      />
    </lineSegments>
  );
};

export default RollCage;
