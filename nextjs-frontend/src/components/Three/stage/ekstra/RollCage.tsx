"use client";

/** RollCage: sangkar kawat dua belas sisi yang membingkai objek yang menempati kotak
 *  pada bab arsip.
 *
 *  Satu `<lineSegments>` = satu draw call. Hukum hidupnya bukan hover, melainkan silang
 *  pengganti (`SILANG_MOBIL`): selama kotak dipegang oleh mobil atau logo, sangkarnya
 *  ikut; begitu silang habis, keduanya hilang bersama. Kanvas berjalan pada frameloop
 *  "demand" dan berhenti total setelah pengunjung diam, jadi sangkar tidak boleh hidup
 *  terus-menerus di luar bab arsip — angka penentunya satu sumber dengan isinya. */
import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { AktorProps } from "../AktorPotret";
import { RASIO_POTRET, SILANG_MOBIL, muatKartu } from "../chiaroscuroMaterial";
import { sikap } from "../koreografi";
import { usePortalRegistry } from "../usePortalRegistry";

const WARNA_KAWAT = "#8A8A8A";
const OPASITAS = 0.9;
/** Kedalaman sangkar dalam satuan dunia — sumbu Z tidak ikut diturunkan dari portal. */
const KEDALAMAN = 0.7;
/** Ambang yang sama dengan pemakai SILANG_MOBIL yang lain: di bawah ini tidak ada pixel
 *  pengganti yang tersisa, jadi bingkai tidak ada gunanya lagi. */
const TETAS = 0.001;

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

export const RollCage: React.FC<AktorProps> = ({ scrollProgressRef }) => {
  const garisRef = useRef<THREE.LineSegments>(null);
  const hidupRef = useRef(false);
  const [terpasang, setTerpasang] = useState(false);
  const { size, viewport, camera, invalidate } = useThree();
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
    const p = Math.max(0, Math.min(1, scrollProgressRef.current));
    const k = sikap(p, portal.current);
    if (!k) return;

    // Bingkai mengikuti isinya, bukan pointer: `SILANG_MOBIL` adalah angka yang menulis
    // alpha pengganti, jadi selama angkanya di atas nol ada benda yang perlu dibingkai.
    const hidup = !kurangiGerak && SILANG_MOBIL.value > TETAS;
    if (hidup !== hidupRef.current) {
      hidupRef.current = hidup;
      setTerpasang(hidup);
      // Frame yang menulis sensus bisa jadi frame yang sama dengan pemasangan ini; tanpa
      // permintaan eksplisit keadaan "sangkar sudah ada" tidak pernah tergambar.
      invalidate();
    }

    const garis = garisRef.current;
    if (!garis) return;

    const dpp = viewport.width / size.width;
    const camZ = camera.position.z;
    // Kartu diskala dengan pxPerWorld(pas) dan ditempatkan dengan pxPerWorld(z); kedua
    // angka itu dipakai di sini agar tapak sangkar identik dengan tapak kartu.
    const pxPas = (1 / dpp) * (camZ / (camZ - k.pas));
    const pxZ = (1 / dpp) * (camZ / (camZ - k.z));
    const lebar = muatKartu(k.kotak) / pxPas;

    garis.position.set(
      (k.kotak.kiri + k.kotak.lebar / 2 - size.width / 2) / pxZ,
      -(k.kotak.atas + k.kotak.tinggi / 2 - size.height / 2) / pxZ,
      k.z
    );
    garis.scale.set(lebar, lebar * RASIO_POTRET, KEDALAMAN);
    // Hanya kemiringan bab; sangkar tidak berputar dengan sendirinya.
    garis.rotation.y = k.rot;
  });

  if (!terpasang) return null;

  return (
    <lineSegments ref={garisRef} name="sangkar" geometry={kawat}>
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
