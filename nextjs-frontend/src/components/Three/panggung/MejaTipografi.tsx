"use client";

/** MejaTipografi: potret chiaroscuro panggung utama, dilepas dari mesin bab dan diberi knob.
 *
 *  Yang tersisa hanya materialnya — shader yang sama, tekstur yang sama, uniforms yang sama.
 *  Yang tidak ada: usePanggung (koreografi bab), registry portal, dan dua holder module-level
 *  yang dipakai panggung untuk menyelaraskan sapuan iris lintas objek. Dua holder yang terakhir
 *  ini justru alasan rute ini ada: di halaman utama satu kanvas berarti satu mobil dan satu
 *  sapuan, jadi nilainya dibagi lewat objek bersama. Di sini materialnya punya holder sendiri,
 *  dan debug obyek membuktikan SAPU_IRIS/SILANG_MOBIL tetap nol walaupun knob iris digas penuh. */
import React, { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import {
  RASIO_POTRET,
  SAPU_IRIS,
  SILANG_MOBIL,
  buatSalinanKabur,
  buatUniformPanggung,
  fragmentShader,
  vertexShader,
} from "../stage/chiaroscuroMaterial";

/** Kartu dipasang seukuran ini supaya tingginya (~3,3 satuan) hampir memenuhi bingkai
 *  pada kamera z = 5, fov 42 — sudut pandang yang sama dengan kanvas editorial. */
const SKALA_KARTU = 2;

/** Enam angka yang diperintahkan pengunjung. Sengaja semua bersatuan 0..1 kecuali FOKUS,
 *  yang dalam satuan dunia supaya bisa dibandingkan langsung dengan jarak kamera. */
export interface MejaNilai {
  persona: number;
  sorot: number;
  fokus: number;
  kabur: number;
  iris: number;
  /** Fraksi dari setengah lebar/tinggi viewport yang dihapus pada tiap tepi. */
  potong: number;
}

/** Satu-satunya tempat rumus potong dihitung: dipakai DOM untuk mencetak angkanya dan dipakai
 *  kanvas untuk menulis uniform. Kalau rumus ini disalin, verifier tidak lagi membandingkan
 *  dua hal yang berbeda. */
export const potongKeMask = (p: number): [number, number, number, number] => [
  -1 + 2 * p,
  1 - 2 * p,
  -1 + 2 * p,
  1 - 2 * p,
];

interface BentukDebug {
  persona: number;
  sorot: number;
  fokus: number;
  kabur: number;
  iris: number;
  potong: number;
  mobil: number;
  mask: [number, number, number, number];
  ndcPerPx: [number, number];
  /** Holder panggung utama — dibaca, tidak pernah ditulis rute ini. */
  globalIris: number;
  globalMobil: number;
  vertex: number;
  segitiga: number;
  salinanKabur: [number, number] | null;
}

declare global {
  interface Window {
    __meja?: BentukDebug;
  }
}

export const MejaTipografi: React.FC<{ nilai: MejaNilai }> = ({ nilai }) => {
  const tekstur = useTexture("/FotoDiriFix.webp");
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const geometriRef = useRef<THREE.PlaneGeometry>(null);
  const kanvas = useThree((s) => s.gl.domElement);
  // Mengubah knob bukan gerakan tapi perintah, jadi ia harus menghasilkan tepat satu frame
  // bahkan ketika hukum diam sedang menahan loop (reduce-motion, atau tab yang baru kembali).
  const mintaFrame = useThree((s) => s.invalidate);
  // Nilai terbaru disimpan di ref supaya useFrame membacanya tanpa membuat ulang material.
  // Ref-nya ditulis di effect, bukan di badan render: membaca/menulis ref saat render
  // dilarang React dan hasilnya tidak sureun dengan render ganda.
  const perintah = useRef(nilai);
  const terkirim = useRef<string>("");

  const seragam = useMemo(() => {
    const dasar = buatUniformPanggung(tekstur);
    // Holder bersama diganti dengan milik rute ini: menulis uWipe di sini tidak boleh
    // menyentuh panggung utama, dan uMobil tanpa AktorSF26 hanya akan mematikan kartu.
    return {
      ...dasar,
      uWipe: { value: 0 },
      uMobil: { value: 0 },
      // Kartu ini tidak punya jejak pointer dan tidak di-hover: keduanya nol sejak awal,
      // dan tidak ada yang menulisnya.
      uHover: { value: 0 },
      uScroll: { value: 0 },
    };
  }, [tekstur]);

  const salinan = useMemo(() => buatSalinanKabur(tekstur), [tekstur]);

  useEffect(() => () => salinan?.dispose(), [salinan]);

  useEffect(() => {
    // Sumber kabur ditulis melalui material yang hidup, bukan lewat objek props: R3F menyalin
    // tiap entri uniforms saat pemasangan, jadi menulis ke salinan lokal tidak akan pernah
    // sampai ke GPU.
    perintah.current = nilai;
    mintaFrame();
  }, [nilai, salinan, mintaFrame]);

  useFrame(() => {
    const mat = materialRef.current;
    if (!mat) return;
    const n = perintah.current;
    const mask = potongKeMask(n.potong);
    // Ukuran kanvas ikut ditulis tiap frame karena bingkai feather potong dihitung dari
    // per-pixel NDC; kalau ini dibiarkan nilai awal 1440x900, lebarnya salah di kanvas kecil.
    const u = 2 / Math.max(1, kanvas.clientWidth);
    const v = 2 / Math.max(1, kanvas.clientHeight);
    mat.uniforms.uNdcPerPx.value.set(u, v);
    mat.uniforms.uPersona.value = n.persona;
    mat.uniforms.uReveal.value = n.sorot;
    mat.uniforms.uFokus.value = n.fokus;
    mat.uniforms.uKabur.value = n.kabur;
    mat.uniforms.uWipe.value = n.iris;
    mat.uniforms.uMask.value.set(mask[0], mask[1], mask[2], mask[3]);
    if (salinan && mat.uniforms.uKaburPeta.value !== salinan) {
      mat.uniforms.uKaburPeta.value = salinan;
    }

    const tanda = `${n.persona}|${n.sorot}|${n.fokus}|${n.kabur}|${n.iris}|${n.potong}|${u}|${v}`;
    if (tanda === terkirim.current) return;
    terkirim.current = tanda;
    const plane = geometriRef.current;
    window.__meja = {
      persona: mat.uniforms.uPersona.value as number,
      sorot: mat.uniforms.uReveal.value as number,
      fokus: mat.uniforms.uFokus.value as number,
      kabur: mat.uniforms.uKabur.value as number,
      iris: mat.uniforms.uWipe.value as number,
      potong: n.potong,
      mobil: mat.uniforms.uMobil.value as number,
      mask: [
        mat.uniforms.uMask.value.x,
        mat.uniforms.uMask.value.y,
        mat.uniforms.uMask.value.z,
        mat.uniforms.uMask.value.w,
      ],
      ndcPerPx: [u, v],
      globalIris: SAPU_IRIS.value,
      globalMobil: SILANG_MOBIL.value,
      vertex: plane?.attributes.position.count ?? 0,
      // Bidang three.js terindeks: empat vertex tapi hanya dua segitiga yang benar-benar
      // dikirim ke GPU, dan itu angka yang ditagih verifier.
      segitiga: plane?.index ? plane.index.count / 3 : (plane?.attributes.position.count ?? 0) / 3,
      // Dilaporkan dari uniform yang hidup, bukan dari variabel closure: yang ditagih
      // verifier adalah bahwa salinan ¼-res benar-benar terpasang di material.
      salinanKabur: (() => {
        const im = (mat.uniforms.uKaburPeta.value as THREE.Texture | null)?.image as
          | { width?: number; height?: number }
          | undefined;
        return im?.width && im.height ? [im.width, im.height] : null;
      })(),
    };
  });

  return (
    <mesh scale={SKALA_KARTU}>
      {/* Satu segmen saja: tanpa uHover tidak ada vertex yang bergeser, dan dua segitiga
          yang dilaporkan ke verifier harus bisa dihitung dengan jari. */}
      <planeGeometry ref={geometriRef} args={[1, RASIO_POTRET]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={seragam}
        transparent={true}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

export default MejaTipografi;
