"use client";

/** KompasGulir: jarum arah gulir di sudut kanan-atas portal bab aktif.
 *
 *  Satu `<lineSegments>` = satu draw call, berisi dua potongan garis dari satu titik
 *  pusat: jarum searah gerakan dan ekor pendek berlawanan. Ekor dan jarum dua warna tapi
 *  tetap satu geometri, lewat atribut warna per titik — dua draw call untuk satu glyph
 *  kecil tidak seharga kanvas yang hari ini berhenti pada nol frame saat diam.
 *
 *  Saat gulir tidak bergerak, objeknya tidak ada: di render (kalau React kebetulan
 *  merender) dan di dalam frame (yang sebenarnya menjamin, karena velositas hidup di ref
 *  dan tidak pernah memicu render). */
import React, { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { AktorProps } from "../AktorPotret";
import { sikap } from "../koreografi";
import { usePortalRegistry } from "../usePortalRegistry";

/** Di bawah velositas ini jarum tidak lagi membaca arah apa pun, jadi jangan digambar. */
const AMBANG = 0.004;
/** Panjang maksimum jarum dalam satuan dunia. */
const MAKS = 0.9;
/** Akar, bukan garis lurus: velositas kecil masih punya panjang yang terbaca. */
const GAIN_AKAR = 0.09;
/** Ekor dibaca sebagai gaya tarik di belakang jarum, bukan sebagai busur wiper. */
const RASIO_EKOR = 0.3;
const KONONG = 0.02;
const KONONG_MAKS = 0.12;
/** Mundur dari tepi portal dalam pixel CSS: sudut kanan-atas jatuh tepat di batas papan
 *  hitam bab, dan garis yang menempel tepi tertimbun DOM. */
const MUNDUR = 12;

const WARNA_JARUM = "#F7F5F0";
const WARNA_EKOR = "#8A8A8A";
const OPASITAS = 0.9;

// Dua titik per segmen: [0]=pusat, [1]=ujung jarum, [2]=pusat, [3]=ujung ekor.
const TITIK = 4;

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

export const KompasGulir: React.FC<AktorProps> = ({ scrollProgressRef, scrollVelocityRef }) => {
  const garisRef = useRef<THREE.LineSegments>(null);
  const { size, viewport, camera } = useThree();
  const portal = usePortalRegistry();
  const kurangiGerak = useSyncExternalStore(
    dengarKurangiGerak,
    bacaKurangiGerak,
    bacaKurangiGerakSaatSSR
  );

  // Posisi DAN warna dialokasi sekali di sini. Warna tidak pernah berubah, jadi ia diisi
  // sekarang lewat THREE.Color (ruang kerja linear) supaya kedua warna itu identik dengan
  // yang dihasilkan prop `color` pada material. Setiap frame hanya menulis ulang dua
  // koordinat Y pada buffer posisi yang sama — tidak ada array baru, tidak ada geometry baru.
  const jarum = useMemo(() => {
    const posisi = new Float32Array(TITIK * 3);
    const warna = new Float32Array(TITIK * 3);
    const kepala = new THREE.Color(WARNA_JARUM);
    const buntut = new THREE.Color(WARNA_EKOR);
    warna[0] = kepala.r;
    warna[1] = kepala.g;
    warna[2] = kepala.b;
    warna[3] = kepala.r;
    warna[4] = kepala.g;
    warna[5] = kepala.b;
    warna[6] = buntut.r;
    warna[7] = buntut.g;
    warna[8] = buntut.b;
    warna[9] = buntut.r;
    warna[10] = buntut.g;
    warna[11] = buntut.b;

    const geometri = new THREE.BufferGeometry();
    geometri.setAttribute("position", new THREE.BufferAttribute(posisi, 3));
    geometri.setAttribute("color", new THREE.BufferAttribute(warna, 3));
    return geometri;
  }, []);

  useEffect(
    () => () => {
      jarum.dispose();
    },
    [jarum]
  );

  useFrame(() => {
    const garis = garisRef.current;
    if (!garis) return;

    const vel = scrollVelocityRef.current;
    const mutlak = Math.abs(vel);
    // Velositas datang dari ref dan tidak pernah memicu render, jadi mati-nya jarum
    // harus diputuskan di sini juga, bukan hanya di kondisi return null di bawah.
    if (mutlak < AMBANG) {
      garis.visible = false;
      return;
    }
    garis.visible = true;

    const p = Math.max(0, Math.min(1, scrollProgressRef.current));
    const k = sikap(p, portal.current);
    if (!k) return;

    const l = Math.min(MAKS, Math.sqrt(mutlak) * GAIN_AKAR);
    // Titik [1] = ujung jarum, titik [3] = ujung ekor; keduanya ditulis ke buffer yang
    // sudah ada lewat setY, jadi tidak ada alokasi dan tidak ada buffer baru.
    const posisi = garis.geometry.getAttribute("position");
    posisi.setY(1, l);
    posisi.setY(3, -l * RASIO_EKOR);
    posisi.needsUpdate = true;

    const dpp = viewport.width / size.width;
    const pxZ = (1 / dpp) * (camera.position.z / (camera.position.z - k.z));
    garis.position.set(
      (k.kotak.kiri + k.kotak.lebar - MUNDUR - size.width / 2) / pxZ,
      -(k.kotak.atas + MUNDUR - size.height / 2) / pxZ,
      k.z
    );
    // 0 rad = ke atas untuk gulir ke bawah, PI untuk gulir ke atas. Condong kecil
    // sebanding |velositas| membuat jarum terasa tertinggal, bukan menyapu seperti wiper.
    const condong = THREE.MathUtils.clamp(vel * KONONG, -KONONG_MAKS, KONONG_MAKS);
    garis.rotation.z = (vel >= 0 ? 0 : Math.PI) + condong;
  });

  // Menjaga spesifikasi "objeknya tidak ada saat gulir diam". Ref tidak memicu render,
  // jadi angka ini hanya sepanjang yang kebetulan dibaca saat React merender; `visible`
  // di dalam useFrame-lah yang benar-benar menjamin nol draw call saat diam.
  // eslint-disable-next-line react-hooks/refs
  const velRender = scrollVelocityRef.current;
  if (kurangiGerak || Math.abs(velRender) < AMBANG) return null;

  return (
    <lineSegments ref={garisRef} geometry={jarum}>
      <lineBasicMaterial vertexColors transparent opacity={OPASITAS} depthWrite={false} />
    </lineSegments>
  );
};

export default KompasGulir;
