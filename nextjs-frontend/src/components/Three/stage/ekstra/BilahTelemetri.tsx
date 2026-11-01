"use client";

/** Bilah telemetri panggung: dua belas bilah hasil ukur ritme frame pengunjung
 *  (lib/perfStats) dilukis sebagai SATU instancedMesh di dalam portal bab aktif.
 *
 *  Satu draw call dan nol frame tambahan: tinggi bilah hanya berubah saat cuplikan baru
 *  terbit (~1 detik sekali), dan itu satu-satunya hal yang membangunkan loop demand di
 *  luar gulir/pointer yang sudah ditangani kanvas. Posisi barisnya ikut kotak portal lewat
 *  useFrame — useFrame tidak berjalan saat halaman diam, jadi tidak ada biaya saat idle.
 *
 *  Urutan bilah kronologis: kiri paling tua, kanan paling baru, tanpa interpolasi di
 *  antara sampel. Slot yang belum punya sampel ber-scale nol, bukan bilah dekoratif. */
import React, { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { bacaCuplik, dengarCuplik, type CuplikanFrame } from "@/lib/perfStats";
import type { AktorProps } from "../AktorPotret";
import { sikap, type Kunci, type Sikap } from "../koreografi";
import { usePortalRegistry } from "../usePortalRegistry";

const JUMLAH_BILAH = 12;
/** Marka ambang ikut sebagai instans terakhir supaya tetap satu draw call: dia bukan
 *  bilah data, tapi garis acuan di ketinggian r = 1. */
const JUMLAH_INSTANS = JUMLAH_BILAH + 1;
/** Ambang 33 ms dipakai karena perfStats sudah menghitung `over33ms` pada angka yang sama
 *  (satu frame > 33 ms = di bawah ~30 fps), jadi tinggi bilah terbaca sebagai "sejauh mana
 *  p95 melewati batas 30 fps", bukan sebagai milidetik yang ditafsirkan ulang. */
const BATAS_MS = 33;
/** Kelebihan di atas ambang tetap digambar, hanya dipadatkan, supaya overshoot terbaca
 *  sebagai kelebihan dan tidak diam-diam diratakan ke puncak. */
const MAMPAT_KELEBIHAN = 0.35;
const TINGGI_MAKS_RASIO = 2.2;
const TINGGI_DASAR_RASIO = 0.42;
const JARAK_PX = 4;
const LEBAR_MAKS_PX = 16;
const TINGGI_MARKA_PX = 2;
/** Sedikit di depan kartu agar tidak terpotong shader kartu (uMask memotong pada z kartu). */
const Z_DEPAN = 0.35;
const KERTAS = 0xf7f5f0;
const MERAH = 0xd41e12;

// Query dihemat; ambang batas tidak boleh mengubah hasilnya jadi diam.
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

/** Snapshot berupa boolean, bukan objek: React hanya me-render ulang saat cuplikan pertama
 *  tiba, bukan setiap detik. */
const bacaAdaCuplik = () => {
  const c = bacaCuplik();
  return c !== null && c.frames > 0;
};
const tidakAdaSaatSSR = () => false;

/** Quaternion identitas dipakai bersama: `compose()` hanya membacanya. */
const PUTARAN_NOL = new THREE.Quaternion();

/** Ring 12 sampel + alat tulis matriks. Semuanya hidup di dalam `useRef` yang sama supaya
 *  tidak ada alokasi saat menulis ulang instans, dan tidak ada state React yang ikut naik. */
interface AlatTulis {
  /** p95Ms yang benar-benar sudah terbit; slot yang belum terisi tidak dianggap. */
  nilai: Float32Array;
  kepala: number;
  isi: number;
  matriks: THREE.Matrix4;
  posisi: THREE.Vector3;
  skala: THREE.Vector3;
  warna: THREE.Color;
}

const buatAlatTulis = (): AlatTulis => ({
  nilai: new Float32Array(JUMLAH_BILAH),
  kepala: 0,
  isi: 0,
  matriks: new THREE.Matrix4(),
  posisi: new THREE.Vector3(),
  skala: new THREE.Vector3(),
  warna: new THREE.Color(),
});

/** Satu sampel terbit = satu entri baru; yang paling tua keluar. Tidak ada interpolasi
 *  di antara entri dan ring tidak pernah tumbuh, jadi nol alokasi per peristiwa. */
const dorongSampel = (p95Ms: number, a: AlatTulis) => {
  a.nilai[a.kepala] = p95Ms;
  a.kepala = (a.kepala + 1) % JUMLAH_BILAH;
  if (a.isi < JUMLAH_BILAH) a.isi += 1;
};

/** Semua bahan lewat argumen: fungsi ini tidak menyentuh state React, jadi tidak ada
 *  yang perlu (atau boleh) di-memo — dipanggil hanya pada peristiwa, bukan tiap frame. */
const pasangBilah = (im: THREE.InstancedMesh, kunci: Kunci[], a: AlatTulis) => {
  if (!kunci.length || a.isi === 0) return;

  // Anggaran diambil dari portal TERSEMPIT: kotak yang dipakai saat perpindahan adalah
  // hasil campur antar portal, jadi portal aktif saja tidak menjamin baris muat.
  let lebarDana = Infinity;
  let tinggiDana = Infinity;
  for (const k of kunci) {
    if (k.kotak.lebar < lebarDana) lebarDana = k.kotak.lebar;
    if (k.kotak.tinggi < tinggiDana) tinggiDana = k.kotak.tinggi;
  }
  const jarak = Math.min(JARAK_PX, lebarDana / (2 * JUMLAH_BILAH));
  const lebar = Math.min(LEBAR_MAKS_PX, (lebarDana - (JUMLAH_BILAH - 1) * jarak) / JUMLAH_BILAH);
  if (lebar <= 0) return;

  const tinggiDasar = tinggiDana * TINGGI_DASAR_RASIO;
  const baris = JUMLAH_BILAH * lebar + (JUMLAH_BILAH - 1) * jarak;
  const { matriks, posisi, skala, warna } = a;

  for (let j = 0; j < JUMLAH_BILAH; j++) {
    const r = j < a.isi ? a.nilai[(a.kepala + j) % JUMLAH_BILAH] / BATAS_MS : 0;
    const t = Math.min(r <= 1 ? r : 1 + (r - 1) * MAMPAT_KELEBIHAN, TINGGI_MAKS_RASIO);
    const tinggi = tinggiDasar * t;
    posisi.set(j * (lebar + jarak) + lebar / 2, tinggi / 2, 0);
    skala.set(lebar, tinggi, 1);
    matriks.compose(posisi, PUTARAN_NOL, skala);
    im.setMatrixAt(j, matriks);
    // Warna instans dikali warna material, jadi kertas dibiarkan putih agar tepat
    // #F7F5F0 dan hanya bilah di atas ambang yang diberi merah.
    if (r > 1) warna.setHex(MERAH);
    else warna.setRGB(1, 1, 1);
    im.setColorAt(j, warna);
  }

  posisi.set(baris / 2, tinggiDasar, 0);
  skala.set(baris, TINGGI_MARKA_PX, 1);
  matriks.compose(posisi, PUTARAN_NOL, skala);
  im.setMatrixAt(JUMLAH_BILAH, matriks);
  warna.setRGB(1, 1, 1);
  im.setColorAt(JUMLAH_BILAH, warna);

  im.instanceMatrix.needsUpdate = true;
  if (im.instanceColor) im.instanceColor.needsUpdate = true;
};

export const BilahTelemetri: React.FC<AktorProps> = ({ scrollProgressRef }) => {
  const reduceMotion = useSyncExternalStore(
    dengarKurangiGerak,
    bacaKurangiGerak,
    bacaKurangiGerakSaatSSR
  );
  const adaCuplik = useSyncExternalStore(dengarCuplik, bacaAdaCuplik, tidakAdaSaatSSR);

  const { size, viewport, camera, invalidate } = useThree();
  const portal = usePortalRegistry();
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const dpp = viewport.width / size.width;
  const pxPerWorld = useMemo(
    () => (z: number) => (1 / dpp) * (camera.position.z / (camera.position.z - z)),
    [dpp, camera]
  );

  const geometri = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: KERTAS }), []);

  // Ring 12 sampel + scratch matriks/warna: satu wadah useRef, tidak ada alokasi saat
  // menulis ulang instans, dan tidak ada state React yang ikut naik tiap sampel.
  const alat = useRef<AlatTulis>(buatAlatTulis());
  const cuplikTerakhir = useRef<CuplikanFrame | null>(null);
  const cacheSikap = useRef<{ p: number; kunci: Kunci[]; s: Sikap | undefined }>({
    p: -1,
    kunci: [],
    s: undefined,
  });

  /** Ditulis ulang hanya pada peristiwa (sampel baru, kotak portal dibaca ulang),
   *  bukan per frame — see `pasangBilah`. */
  useEffect(() => {
    // Pengunjung yang minta gerakan dikurangi tidak boleh dibangunkan frame: tanpa mount,
    // tidak ada subscription dan tidak ada invalidate.
    if (reduceMotion || !adaCuplik) return;
    const im = meshRef.current;
    const a = alat.current;
    if (!im) return;
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const terima = () => {
      const c = bacaCuplik();
      // Referensi objek yang sama = cuplikan yang sudah masuk ring; ini terjadi saat effect
      // dipasang ulang, bukan sampel baru.
      if (!c || c.frames === 0 || c === cuplikTerakhir.current) return false;
      cuplikTerakhir.current = c;
      dorongSampel(c.p95Ms, a);
      return true;
    };

    const baru = terima();
    pasangBilah(im, portal.current, a);
    if (baru) invalidate();
    const bubar = dengarCuplik(() => {
      if (!terima()) return;
      pasangBilah(im, portal.current, a);
      invalidate();
    });
    return bubar;
  }, [adaCuplik, alat, invalidate, portal, reduceMotion]);

  useEffect(
    () => () => {
      geometri.dispose();
      material.dispose();
    },
    [geometri, material]
  );

  useFrame(() => {
    const im = meshRef.current;
    if (!im) return;
    const p = Math.max(0, Math.min(1, scrollProgressRef.current));
    const g = cacheSikap.current;
    // `sikap()` membuat objek baru, jadi dihitung ulang hanya saat angkanya benar-benar
    // berubah. Saat halaman diam tidak ada frame sama sekali, jadi tidak ada alokasi.
    if (p !== g.p || g.kunci !== portal.current) {
      const kotakDibacaUlang = g.kunci !== portal.current;
      g.p = p;
      g.kunci = portal.current;
      g.s = sikap(p, portal.current);
      // Registry membaca ulang kotak portal saat layout/ukuran berubah, dan pembacaan
      // itulah yang membangunkan frame ini: tata letak baris ditulis sekali per peristiwa.
      if (kotakDibacaUlang) pasangBilah(im, portal.current, alat.current);
    }
    const k = g.s;
    if (!k) return;
    const z = k.z + Z_DEPAN;
    const pxw = pxPerWorld(z);
    // Titik pangkal baris = kiri-bawah kotak portal; satuan lokal mesh-nya pixel CSS.
    im.position.set(
      (k.kotak.kiri - size.width / 2) / pxw,
      -(k.kotak.atas + k.kotak.tinggi - size.height / 2) / pxw,
      z
    );
    im.scale.setScalar(1 / pxw);
  });

  if (reduceMotion || !adaCuplik) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometri, material, JUMLAH_INSTANS]}
      frustumCulled={false}
    />
  );
};

export default BilahTelemetri;
