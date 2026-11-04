"use client";

/** Debu: partikel yang hanya ada saat halaman benar-benar bergulir.
 *
 *  Tidak ada state yang menumpuk: seed tiap partikel tetap, jangkar dunianya dihitung
 *  ulang hanya saat bab aktif berganti, dan geserannya murni fungsi dari posisi gulir
 *  + kecepatan gulir. Saat pengunjung diam objek ini tidak terpasang, jadi ia tidak
 *  menambah draw call sama sekali.
 *
 *  Semua buffer ditulis lewat objek yang sedang terpasang (`titik.current.geometry`),
 *  bukan lewat nilai hasil useMemo — react-compiler menganggap mutasi hasil hook sebagai
 *  error, dan lewat jalur itu tulisan ke GPU tidak dijamin sampai. */
import React, { useRef, useState, useSyncExternalStore } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { AktorProps } from "../AktorPotret";
import { sikap, type Kunci } from "../koreografi";
import { usePortalRegistry } from "../usePortalRegistry";

const PARTIKEL = 140;

/** Kecepatan gulir (pixel per frame dari Lenis) di bawah nilai ini dianggap diam. */
const AMBANG = 0.002;
/** Opasitas = |kecepatan| * PEGAS, dibatasi KEPADATAN. */
const PEGAS = 8;
const KEPADATAN = 0.5;
/** Seberapa jauh partikel tertinggal, sebagai fraksi jarak yang ditempuh gulir. */
const TALIH = 0.35;
/** Ayunan mendatar murni dari posisi gulir, satuan dunia. */
const AYUN = 0.012;
/** Rentang kedalaman debu di depan bidang kartu, satuan dunia. */
const KEDALAMAN = 0.6;

const TAU = Math.PI * 2;

/** Identitas buffer posisi harus stabil supaya R3F tidak membuat atribut ulang tiap render;
 *  yang berubah hanya isinya, lewat objek yang sedang terpasang. */
const POSISI_AWAL = new Float32Array(PARTIKEL * 3);

// Hash tanpa state: susunan debu sama di setiap sesi, dan tidak ada yang berubah
// antar render. Float32Array ini tidak pernah ditulis ulang setelah dibuat.
const acak = (i: number, g: number) => {
  const x = Math.sin(i * 12.9898 + g * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const SEED = new Float32Array(PARTIKEL * 3);
for (let i = 0; i < PARTIKEL; i++) {
  SEED[i * 3] = acak(i, 1);
  SEED[i * 3 + 1] = acak(i, 2);
  SEED[i * 3 + 2] = acak(i, 3);
}

// MediaQueryList dibuat sekali (pola GlobalEditorialCanvas) supaya bacaan preferensi
// gerak tidak menjadi effect-setState.
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

/** Dicari dengan loop agar tidak ada closure per frame; `bab` unik di registry. */
const kunciBab = (daftar: Kunci[], bab: number): Kunci | undefined => {
  for (let i = 0; i < daftar.length; i++) if (daftar[i].bab === bab) return daftar[i];
  return undefined;
};

/** Isi scratch jangkar per partikel: x, y, z dunia, lalu dunia-per-pixel-CSS pada z itu
 *  (entri ke-4 untuk mengubah kecepatan gulir pixel/frame jadi satuan dunia). */
const isiJangkar = (
  keluar: Float32Array,
  kunci: Kunci,
  lebar: number,
  tinggi: number,
  dpp: number,
  kameraZ: number
) => {
  const kotak = kunci.kotak;
  for (let i = 0; i < PARTIKEL; i++) {
    const s = i * 3;
    const j = i * 4;
    const z = kunci.z + SEED[s + 2] * KEDALAMAN;
    const pxPerWorld = (1 / dpp) * (kameraZ / (kameraZ - z));
    keluar[j] = (kotak.kiri + SEED[s] * kotak.lebar - lebar / 2) / pxPerWorld;
    keluar[j + 1] = -(kotak.atas + SEED[s + 1] * kotak.tinggi - tinggi / 2) / pxPerWorld;
    keluar[j + 2] = z;
    keluar[j + 3] = 1 / pxPerWorld;
  }
};

export const Debu: React.FC<AktorProps> = ({ scrollProgressRef, scrollVelocityRef }) => {
  const reduce = useSyncExternalStore(
    dengarKurangiGerak,
    bacaKurangiGerak,
    bacaKurangiGerakSaatSSR
  );
  const { size, viewport, camera } = useThree();
  const portal = usePortalRegistry();
  const titik = useRef<THREE.Points>(null);

  const [bergulir, setBergulir] = useState(false);
  const bergulirRef = useRef(false);

  // Jangkar dunia per partikel adalah scratch, jadi hidupnya di ref dan ditulis ulang
  // hanya saat bab aktif atau ukuran layar berganti — bukan tiap frame, dan bukan hasil
  // useMemo (mutasinya ditolak react-compiler).
  const jangkar = useRef(new Float32Array(PARTIKEL * 4));
  const jejakBab = useRef(-1);
  const jejakUkuran = useRef("");

  useFrame(() => {
    const p = Math.max(0, Math.min(1, scrollProgressRef.current));
    const v = scrollVelocityRef.current;
    const k = sikap(p, portal.current);

    // Bab aktif = bab yang sedang memegang viewport.
    const kunci = k ? kunciBab(portal.current, k.t < 0.5 ? k.babDari : k.babKe) : undefined;
    const dpp = viewport.width / size.width;
    const ukuran = `${size.width}x${size.height}x${dpp}x${camera.position.z}`;
    if (kunci && (kunci.bab !== jejakBab.current || ukuran !== jejakUkuran.current)) {
      jejakBab.current = kunci.bab;
      jejakUkuran.current = ukuran;
      isiJangkar(jangkar.current, kunci, size.width, size.height, dpp, camera.position.z);
    }

    const gerak = !reduce && !!kunci && Math.abs(v) >= AMBANG;
    if (gerak !== bergulirRef.current) {
      bergulirRef.current = gerak;
      setBergulir(gerak);
    }

    const objek = titik.current;
    if (!objek) return;

    const atribut = objek.geometry.attributes.position as THREE.BufferAttribute;
    const arr = atribut.array as Float32Array;
    const a = jangkar.current;
    for (let i = 0; i < PARTIKEL; i++) {
      const s = i * 3;
      const j = i * 4;
      arr[s] = a[j] + Math.sin(p * TAU * 1.5 + SEED[s] * TAU) * AYUN;
      arr[s + 1] = a[j + 1] - v * a[j + 3] * TALIH;
      arr[s + 2] = a[j + 2];
    }
    atribut.needsUpdate = true;
    (objek.material as THREE.PointsMaterial).opacity = Math.min(KEPADATAN, Math.abs(v) * PEGAS);
  });

  if (reduce || !bergulir) return null;

  return (
    <points ref={titik} name="debu" frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[POSISI_AWAL, 3]} />
      </bufferGeometry>
      {/* sizeAttenuation=false membuat `size` dibaca sebagai pixel layar, bukan satuan
          dunia — debu tetap 2 px di kedalaman mana pun. */}
      <pointsMaterial
        size={2}
        sizeAttenuation={false}
        color="#8A8A8A"
        transparent
        depthWrite={false}
        opacity={0}
      />
    </points>
  );
};

export default Debu;
