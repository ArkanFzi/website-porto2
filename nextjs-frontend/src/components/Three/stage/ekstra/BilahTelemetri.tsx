"use client";

/** Bilah telemetri panggung: enam bilah gumpalan ritme frame per menit (GET
 *  /api/telemetry → clientFrames.buket) dilukis sebagai SATU instancedMesh di dalam portal
 *  bab aktif.
 *
 *  Bilah ini dan bilah DOM di panel telemetri menggambar angka yang sama, dari store yang
 *  sama (lib/bacaTelemetri), lewat fungsi tinggi yang sama (lib/buketMenit). Kalau salah
 *  satu sisi menyisipkan konstantanya sendiri, tingginya berhenti cocok dengan angkanya.
 *
 *  Satu draw call dan nol frame tambahan: bacaan baru terbit ±20 detik sekali dan itu hanya
 *  menandai ring kotor; instans ditulis pada frame yang memang sedang jalan (gulir/pointer).
 *  useFrame tidak berjalan saat halaman diam, jadi bilah ikut diam.
 *
 *  Urutan bilah kronologis: kiri paling tua, kanan menit ini. Menit tanpa laporan ber-scale
 *  nol, bukan bilah dekoratif — aturan "tidak ada bentuk tanpa angka" ditegakkan di
 *  lib/buketMenit, tempat `tinggiBilah()` mengembalikan 0 untuk rasio tanpa angka. */
import React, { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { JUMLAH_BUKET, isiSlot, rasioAmbang, tinggiBilah } from "@/lib/buketMenit";
import {
  bacaTelemetri,
  dengarTelemetri,
  type PayloadTelemetri,
} from "@/lib/bacaTelemetri";
import type { AktorProps } from "../AktorPotret";
import { sikap, type Kunci, type Sikap } from "../koreografi";
import { usePortalRegistry } from "../usePortalRegistry";

const JUMLAH_BILAH = JUMLAH_BUKET;
/** Marka ambang ikut sebagai instans terakhir supaya tetap satu draw call: dia bukan
 *  bilah data, tapi garis acuan di ketinggian r = 1. */
const JUMLAH_INSTANS = JUMLAH_BILAH + 1;
/** Satu bilah dasar = 20 pixel CSS, BUKAN pecahan tinggi portal. Dengan rasio 0,42 dulu,
 *  bilah di atas ambang (tinggiBilah boleh sampai 2,2) tumbuh menjadi 0,92 × 60vh —
 *  sebuah kolom setinggi layar yang memanjat keluar dari tapaknya dan memotong judul bab
 *  04 dan nama raksasa bab 01. Angka yang sama tetap terbaca: yang berubah hanya satuan
 *  pengali, dan marka (r = 1) ikut satuan itu, jadi verifier masih menagih
 *  `tinggiPx / markaPx == tinggiBilah(rasio)`.
 *
 *  RodaPaddock duduk di kanan-bawah dengan jari 26 + margin 14, jadi baris ini tetap di
 *  kiri-bawah dan harus cukup ramping untuk tidak menyentuh kolom nilai panel dispatch. */
const TINGGI_DASAR_PX = 20;
/** Di bawah tinggi portal ini baris bilah tidak lagi punya tempat. Portal tingginya 60vh,
 *  jadi ambang 400 pixel berarti layar yang lebih pendek dari ±667 pixel: di situ tepi bawah
 *  portal jatuh di dalam tipografi bab (terukur: 1100×620, judul bab 04 berakhir 17 pixel di
 *  atas dasar portal), bukan di bawahnya. Tanpa tempat berarti tanpa bentuk — sama seperti
 *  slot tanpa angka — dan angkanya tetap terbaca di laci HUD. */
const BATAS_RUANG_PX = 400;
const JARAK_PX = 4;
const LEBAR_MAKS_PX = 10;
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

/** Snapshot berupa boolean, bukan objek: React hanya me-render ulang saat gumpalan pertama
 *  tiba, bukan setiap bacaan. Menit tanpa laporan belum dihitung sebagai bentuk. */
const bacaAdaBuket = () => {
  const b = bacaTelemetri()?.clientFrames?.buket;
  return !!b && b.some((m) => m.laporan > 0);
};
const tidakAdaSaatSSR = () => false;

/** Quaternion identitas dipakai bersama: `compose()` hanya membacanya. */
const PUTARAN_NOL = new THREE.Quaternion();

/** Ring 6 slot + alat tulis matriks. Semuanya hidup di dalam `useRef` yang sama supaya
 *  tidak ada alokasi saat menulis ulang instans, dan tidak ada state React yang ikut naik. */
interface AlatTulis {
  /** Rasio p95 tiap slot menit terhadap ambang 33 ms; 0 = menit itu tidak punya angka. */
  rasio: Float32Array;
  /** Kunci menit tiap slot, "" kalau slotnya kosong — dipakai verifikasi dua lukisan. */
  menit: string[];
  /** Tinggi yang benar-benar tergambar, dalam pixel CSS (satuan lokal mesh). */
  tinggi: Float32Array;
  matriks: THREE.Matrix4;
  posisi: THREE.Vector3;
  skala: THREE.Vector3;
  warna: THREE.Color;
}

const buatAlatTulis = (): AlatTulis => ({
  rasio: new Float32Array(JUMLAH_BILAH),
  menit: new Array(JUMLAH_BILAH).fill(""),
  tinggi: new Float32Array(JUMLAH_BILAH),
  matriks: new THREE.Matrix4(),
  posisi: new THREE.Vector3(),
  skala: new THREE.Vector3(),
  warna: new THREE.Color(),
});

/** Bentuk window.__bilah — dibaca verifier, tidak pernah dipakai kode produksi. */
const tulisBilahDebug = (a: AlatTulis, tinggiDasarPx: number) => {
  const jendela = window as unknown as {
    __bilah?: { menit: string[]; rasio: number[]; tinggiPx: number[]; markaPx: number };
  };
  jendela.__bilah = {
    menit: [...a.menit],
    rasio: [...a.rasio],
    tinggiPx: [...a.tinggi],
    markaPx: tinggiDasarPx,
  };
};

/** Salin enam slot menit dari bacaan ke ring, kronologis. Mengembalikan true hanya kalau
 *  angkanya benar-benar berubah, jadi bacaan yang sama tidak menandai bilah kotor. `kini`
 *  diambil dari cap waktu server karena kunci menit juga dibuat oleh server. */
const isiDariBacaan = (a: AlatTulis, p: PayloadTelemetri | null): boolean => {
  const b = p?.clientFrames?.buket;
  const slot = b ? isiSlot(b, p.timestamp) : [];
  let ubah = false;
  for (let j = 0; j < JUMLAH_BILAH; j++) {
    const baru = rasioAmbang(slot[j]?.p95RerataMs ?? 0);
    if (baru !== a.rasio[j]) {
      a.rasio[j] = baru;
      ubah = true;
    }
    const kunciBaru = slot[j]?.menit ?? "";
    if (kunciBaru !== a.menit[j]) {
      a.menit[j] = kunciBaru;
      ubah = true;
    }
  }
  return ubah;
};

/** Semua bahan lewat argumen: fungsi ini tidak menyentuh state React, jadi tidak ada
 *  yang perlu (atau boleh) di-memo — dipanggil hanya pada peristiwa, bukan tiap frame. */
const pasangBilah = (im: THREE.InstancedMesh, kunci: Kunci[], a: AlatTulis) => {
  if (!kunci.length) return;

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

  const tinggiDasar = tinggiDana < BATAS_RUANG_PX ? 0 : TINGGI_DASAR_PX;
  const baris = JUMLAH_BILAH * lebar + (JUMLAH_BILAH - 1) * jarak;
  const { matriks, posisi, skala, warna } = a;

  for (let j = 0; j < JUMLAH_BILAH; j++) {
    const r = a.rasio[j];
    const tinggi = tinggiDasar * tinggiBilah(r);
    a.tinggi[j] = tinggi;
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
  skala.set(baris, tinggiDasar > 0 ? TINGGI_MARKA_PX : 0, 1);
  matriks.compose(posisi, PUTARAN_NOL, skala);
  im.setMatrixAt(JUMLAH_BILAH, matriks);
  warna.setRGB(1, 1, 1);
  im.setColorAt(JUMLAH_BILAH, warna);

  im.instanceMatrix.needsUpdate = true;
  if (im.instanceColor) im.instanceColor.needsUpdate = true;
  tulisBilahDebug(a, tinggiDasar);
};

export const BilahTelemetri: React.FC<AktorProps> = ({ scrollProgressRef }) => {
  const reduceMotion = useSyncExternalStore(
    dengarKurangiGerak,
    bacaKurangiGerak,
    bacaKurangiGerakSaatSSR
  );
  const adaBuket = useSyncExternalStore(dengarTelemetri, bacaAdaBuket, tidakAdaSaatSSR);

  const { size, viewport, camera } = useThree();
  const portal = usePortalRegistry();
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const dpp = viewport.width / size.width;
  const pxPerWorld = useMemo(
    () => (z: number) => (1 / dpp) * (camera.position.z / (camera.position.z - z)),
    [dpp, camera]
  );

  const geometri = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: KERTAS }), []);

  // Ring 6 slot + scratch matriks/warna: satu wadah useRef, tidak ada alokasi saat
  // menulis ulang instans, dan tidak ada state React yang ikut naik tiap bacaan.
  const alat = useRef<AlatTulis>(buatAlatTulis());
  const kotor = useRef(true);
  const kunciTerpakai = useRef<Kunci[]>([]);
  const cacheSikap = useRef<{ p: number; kunci: Kunci[]; s: Sikap | undefined }>({
    p: -1,
    kunci: [],
    s: undefined,
  });

  /** Slot baru atau kotak portal dibaca ulang -> tandai kotor; penulisan instans terjadi
   *  di frame berikutnya, tidak pernah dibungkus sebagai callback React. */
  useEffect(() => {
    // Pengunjung yang minta gerakan dikurangi tidak boleh dibangunkan frame: tanpa mount,
    // tidak ada subscription sama sekali.
    if (reduceMotion || !adaBuket) return;
    const im = meshRef.current;
    if (!im) return;
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    isiDariBacaan(alat.current, bacaTelemetri());
    kotor.current = true;
    // Bacaan terbit ±20 detik sekali. Menggambar langsung + invalidate() akan membangunkan
    // kanvas terus-menerus bahkan saat pengunjung diam, dan itu menghapus nol-frame-saat-diam
    // yang dijaga GlobalEditorialCanvas. Jadi peristiwa ini hanya menandai ring kotor; frame
    // yang kebetulan jalan yang menggambar.
    return dengarTelemetri(() => {
      if (isiDariBacaan(alat.current, bacaTelemetri())) kotor.current = true;
    });
  }, [adaBuket, kotor, reduceMotion]);

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
      g.p = p;
      g.kunci = portal.current;
      g.s = sikap(p, portal.current);
      // Registry membaca ulang kotak portal saat layout/ukuran berubah; bacaan baru
      // berarti tata letak baris harus dihitung lagi.
      if (g.kunci !== kunciTerpakai.current) kotor.current = true;
    }
    if (kotor.current) {
      kunciTerpakai.current = g.kunci;
      pasangBilah(im, g.kunci, alat.current);
      kotor.current = false;
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

  if (reduceMotion || !adaBuket) return null;

  return (
    <instancedMesh
      ref={meshRef}
      name="bilah"
      args={[geometri, material, JUMLAH_INSTANS]}
      frustumCulled={false}
    />
  );
};

export default BilahTelemetri;
