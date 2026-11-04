"use client";

/** KurvaIris: satu bidang kertas yang menutup layar sebagai diafragma kamera.
 *
 *  Ini-satu-satunya navigasi halaman /iris: tidak ada tombol, tidak ada link bab. Yang ada
 *  hanyalah berapa lebar diafragma sedang terbuka, dan angka itu datang dari satu slider
 *  role="slider" yang bisa dinaikkan-turunkan dengan panah keyboard.
 *
 *  Sengaja TIDAK memakai material panggung: shader chiaroscuro dan dua holder module-levelnya
 *  (SAPU_IRIS, SILANG_MOBIL) milik halaman utama, dan rute eksperimen tidak boleh menyalakan
 *  mesin di sana. Ada gerbang sumber di halaman-probe yang menjaga impor berkas ini. */
import React, { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

/** Warna token bg-paper, dalam komponen sRGB mentah. ShaderMaterial mentah menulis
 *  gl_FragColor apa adanya — tidak ada konversi ruang warna seperti pada material bawaan —
 *  jadi angkanya harus yang memang akan dilihat. THREE.Color menyimpan linear, dan memakai
 *  nilai itu membuat kertasnya lebih gelap dari halaman di belakangnya. */
const KERTAS = { r: 0xf7 / 255, g: 0xf5 / 255, b: 0xf0 / 255 };

/** Radius maksimum, dalam satuan tinggi bingkai: sudut terjauh dari tengah. Kalau diafragma
 *  dibuka selebar ini, tidak ada pixel yang tersisa untuk ditutupi. */
const JARI_MAKS = (aspek: number) => Math.hypot(aspek * 0.5, 0.5);

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uBuka;
  uniform float uAspek;
  varying vec2 vUv;

  void main() {
    // Koordinat pusat, x dikoreksi aspek supaya diafragmanya bundar, bukan elips.
    vec2 p = (vUv - 0.5) * vec2(uAspek, 1.0);
    float d = length(p);
    // Tebal tepi diambil dari turunan d per pixel: satu pixel, di resolution apa pun.
    float tepi = 2.0 * fwidth(d);
    float lubang = 1.0 - smoothstep(uBuka, uBuka + tepi, d);

    // Tinta. Dua duanya satu pixel dan dua-duanya hanya boleh jatuh di paruh bawah bingkai
    // (vUv.y < 0,5): gerbang luma mengklip sudut kiri-atas, dan garis yang lewat di sana akan
    // membuat angka "setengah = sekertas" mengukur garis, bukan kertas. Cincinnya di radius
    // bukaan, jadi ia menutup begitu diafragma melebar; hairline sumbu terpotong oleh lubangnya
    // sendiri, karena alpha di dalam bukaan nol — yang tersisa hanya goresan dari tepi ke luar.
    float bawah = step(p.y, -tepi);
    float cincin = (1.0 - smoothstep(tepi, 2.0 * tepi, abs(d - uBuka))) * bawah;
    float sumbu = (1.0 - smoothstep(tepi, 2.0 * tepi, -p.y)) * bawah;
    float tinta = max(cincin, sumbu);

    vec3 kertas = vec3(${KERTAS.r.toFixed(5)}, ${KERTAS.g.toFixed(5)}, ${KERTAS.b.toFixed(5)});
    gl_FragColor = vec4(mix(kertas, vec3(0.0392157), tinta), 1.0 - lubang);
  }
`;

interface BentukDebug {
  /** 0 = terbuka penuh, 1 = tertutup penuh. Perintah pengunjung apa adanya. */
  tutup: number;
  buka: number;
  jariMaks: number;
  aspek: number;
  sisi: "A" | "B";
}

declare global {
  interface Window {
    __iris?: BentukDebug;
  }
}

export const KurvaIris: React.FC<{ tutup: number; sisi: "A" | "B" }> = ({ tutup, sisi }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const ukuran = useThree((s) => s.size);
  const kamera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const mintaFrame = useThree((s) => s.invalidate);

  useEffect(() => {
    const mesh = meshRef.current;
    const mat = materialRef.current;
    if (!mesh || !mat) return;
    const aspek = Math.max(0.1, ukuran.width / Math.max(1, ukuran.height));
    // Bidang harus menutupi frustum pada kedalaman bidangnya sendiri, bukan seukuran kanvas
    // di piksel: keduanya beda karena kamera perspektif.
    const jarak = Math.abs(kamera.position.z);
    const tinggi = 2 * jarak * Math.tan(THREE.MathUtils.degToRad(kamera.fov / 2));
    mesh.scale.set(tinggi * aspek, tinggi, 1);
    const jari = JARI_MAKS(aspek);
    const buka = jari * (1 - tutup);
    mat.uniforms.uAspek.value = aspek;
    mat.uniforms.uBuka.value = buka;
    window.__iris = { tutup, buka, jariMaks: jari, aspek, sisi };
    mintaFrame();
  }, [ukuran, kamera, tutup, sisi, mintaFrame]);

  return (
    <mesh ref={meshRef} renderOrder={10}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{ uBuka: { value: JARI_MAKS(1.6) }, uAspek: { value: 1.6 } }}
        transparent={true}
        depthWrite={false}
      />
    </mesh>
  );
};

export default KurvaIris;
