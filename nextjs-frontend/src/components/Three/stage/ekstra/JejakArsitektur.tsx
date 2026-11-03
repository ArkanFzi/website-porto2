"use client";

/** Jejak arsitektur panggung: garis waktu horizontal satu request /api/telemetry, dilukis
 *  sebagai SATU instancedMesh di dalam portal bab aktif.
 *
 *  Panjang tiap segmen adalah durasi yang benar-benar terukur, dibagi dengan satu penggaris
 *  pixel-per-milidetik yang sama untuk semua hop (lib/jejakArsitektur). Baris ARCHITECTURE
 *  TRACE di panel telemetri memakai hukum dan angka yang sama dari store yang sama, jadi
 *  rasio kedua lukisan tidak bisa berpisah.
 *
 *  Hop yang tidak diukur tidak dapat bentuk. PostgreSQL masuk daftar tapi tidak pernah punya
 *  durasi — go-backend hanya menjawab "ok"/"error" — jadi slotnya berpanjang 0, bukan kotak
 *  kecil "biar rata". Begitulah "data jujur sebagai bentuk" bekerja di level komponen.
 *
 *  Satu draw call, nol frame tambahan: bacaan baru terbit ±20 detik sekali dan hanya menandai
 *  ring kotor; penulisan instans terjadi pada frame yang memang sedang jalan. */
import React, { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  hopsDari,
  panjangPx,
  penggaris,
  totalMs,
  type HopId,
} from "@/lib/jejakArsitektur";
import { bacaTelemetri, dengarTelemetri, type PayloadTelemetri } from "@/lib/bacaTelemetri";
import type { AktorProps } from "../AktorPotret";
import { sikap, type Kunci, type Sikap } from "../koreografi";
import { usePortalRegistry } from "../usePortalRegistry";

const ID_HOP: HopId[] = ["node", "backend", "database"];
const JUMLAH_HOP = ID_HOP.length;
/** Marka batas hop ikut dalam mesh yang sama supaya tetap satu draw call. */
const JUMLAH_MARKA = JUMLAH_HOP + 1;
const JUMLAH_INSTANS = JUMLAH_HOP + JUMLAH_MARKA;
/** Anggaran lebar: 60% kotak tersempit, sisa 40% dibiarkan kosong supaya garis waktu tidak
 *  pernah mengaku "satu layar penuh" saat angkanya cuma beberapa milidetik. */
const LEBAR_DANA_RASIO = 0.6;
const TEBAL_BILAH_PX = 3;
const TEBAL_MARKA_PX = 1;
const TINGGI_MARKA_PX = 9;
/** Turun dari tepi atas kotak, supaya tidak bertumpuk dengan bilah telemetri di bawah DAN
 *  tidak jatuh di atas label bab. Portal menempel 20vh dari puncak layar sementara baris
 *  "CHAPTER 0N // …" duduk tepat di bawah pita HUD: pada 14 px garis waktu ini mendarat di
 *  tengah label bab 02 (terukur: label 192..209, garis 194..199). 40 px menaruh garis di
 *  bawah label, di atas kepala kartu — tempat yang sama di semua bab dan semua ukuran. */
const JARAK_ATAS_PX = 40;
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

/** Snapshot boolean, bukan objek: React hanya me-render ulang saat jejak pertama punya angka
 *  untuk dilukis, bukan tiap bacaan. Angka yang menjumlah nol (belum ada request terukur, atau
 *  requestnya nol milidetik) tidak boleh membangunkan satu piksel pun. */
const bacaAdaJejak = () => {
  const p = bacaTelemetri();
  return totalMs(hopsDari(p?.latencyMs, p?.backend?.rttMs)) > 0;
};
const tidakAdaSaatSSR = () => false;

/** Quaternion identitas dipakai bersama: `compose()` hanya membacanya. */
const PUTARAN_NOL = new THREE.Quaternion();

/** Ring hop + alat tulis matriks, semuanya di satu `useRef`: tidak ada alokasi saat instans
 *  ditulis ulang dan tidak ada state React yang ikut naik. */
interface AlatTulis {
  /** Durasi tiap hop; -1 = tidak terukur, jadi hop itu tidak boleh punya panjang. */
  ms: Float32Array;
  /** Panjang yang benar-benar tergambar, pixel CSS (satuan lokal mesh). */
  px: Float32Array;
  /** Titik mulai tiap segmen pada garis waktu, pixel CSS dari kiri anggaran. */
  mulai: Float32Array;
  /** Jumlah durasi yang benar-benar terukur, dari hop yang punya angka. */
  total: number;
  /** Penggaris terakhir yang dipakai, ikut dilaporkan supaya verifier bisa menghitung ulang. */
  pxPerMs: number;
  anggaranPx: number;
  matriks: THREE.Matrix4;
  posisi: THREE.Vector3;
  skala: THREE.Vector3;
  warna: THREE.Color;
}

const buatAlatTulis = (): AlatTulis => ({
  ms: new Float32Array(JUMLAH_HOP).fill(-1),
  px: new Float32Array(JUMLAH_HOP),
  mulai: new Float32Array(JUMLAH_HOP),
  total: 0,
  pxPerMs: 0,
  anggaranPx: 0,
  matriks: new THREE.Matrix4(),
  posisi: new THREE.Vector3(),
  skala: new THREE.Vector3(),
  warna: new THREE.Color(),
});

/** Bentuk window.__jejak — dibaca verifier, tidak pernah dipakai kode produksi. */
const tulisJejakDebug = (a: AlatTulis) => {
  const jendela = window as unknown as {
    __jejak?: {
      hop: string[];
      ms: (number | null)[];
      px: number[];
      mulai: number[];
      pxPerMs: number;
      anggaranPx: number;
      totalMs: number;
      tebalPx: number;
    };
  };
  jendela.__jejak = {
    hop: [...ID_HOP],
    ms: [...a.ms].map((v) => (v < 0 ? null : v)),
    px: [...a.px],
    mulai: [...a.mulai],
    pxPerMs: a.pxPerMs,
    anggaranPx: a.anggaranPx,
    totalMs: a.total,
    tebalPx: TEBAL_BILAH_PX,
  };
};

/** Salin hop dari bacaan ke ring. Mengembalikan true hanya kalau angkanya benar-benar
 *  berubah, jadi bacaan yang sama tidak menandai jejak kotor. */
const isiDariBacaan = (a: AlatTulis, p: PayloadTelemetri | null): boolean => {
  const hops = hopsDari(p?.latencyMs, p?.backend?.rttMs);
  const total = totalMs(hops);
  let ubah = total !== a.total;
  a.total = total;
  for (let i = 0; i < JUMLAH_HOP; i++) {
    // Hop tanpa angka disimpan sebagai -1, bukan 0: 0 adalah hasil ukur ("nol milidetik"),
    // -1 adalah "tidak diukur". Keduanya sama-sama tidak berbentuk, tapi hanya yang kedua
    // yang tidak boleh dilaporkan sebagai angka.
    const baru = hops[i]?.ms ?? -1;
    if (baru !== a.ms[i]) {
      a.ms[i] = baru;
      ubah = true;
    }
  }
  return ubah;
};

/** Semua bahan lewat argumen: fungsi ini tidak menyentuh state React, jadi tidak ada
 *  yang perlu (atau boleh) di-memo — dipanggil hanya pada peristiwa, bukan tiap frame. */
const pasangJejak = (im: THREE.InstancedMesh, kunci: Kunci[], a: AlatTulis) => {
  if (!kunci.length) return;

  // Anggaran dari portal TERSEMPIT: kotak saat perpindahan hasil campur antar portal, jadi
  // portal aktif saja tidak menjamin garis sepanjang ini muat.
  let lebarDana = Infinity;
  for (const k of kunci) if (k.kotak.lebar < lebarDana) lebarDana = k.kotak.lebar;
  const anggaran = lebarDana * LEBAR_DANA_RASIO;
  const pxPerMs = penggaris(anggaran, a.total);
  if (!(pxPerMs > 0)) return;

  a.pxPerMs = pxPerMs;
  a.anggaranPx = anggaran;
  const { matriks, posisi, skala, warna } = a;
  let x = 0;

  for (let i = 0; i < JUMLAH_HOP; i++) {
    const ms = a.ms[i] < 0 ? null : a.ms[i];
    const px = panjangPx(ms, pxPerMs);
    a.px[i] = px;
    a.mulai[i] = x;
    posisi.set(x + px / 2, -JARAK_ATAS_PX, 0);
    // Segmen berpanjang 0 tetap ditulis: skalanya nol, jadi tidak ada piksel yang bertambah.
    skala.set(px, TEBAL_BILAH_PX, 1);
    matriks.compose(posisi, PUTARAN_NOL, skala);
    im.setMatrixAt(i, matriks);
    warna.setRGB(1, 1, 1);
    im.setColorAt(i, warna);
    x += px;
  }

  // Marka = struktur garis waktu, bukan data: dia merah supaya batas hop terbaca tanpa harus
  // menebak panjang segmen. Marka terakhir duduk di ujung total, jadi tidak ada panjang hop
  // keempat yang perlu dibaca.
  let batas = 0;
  for (let m = 0; m < JUMLAH_MARKA; m++) {
    posisi.set(batas, -JARAK_ATAS_PX, 0);
    skala.set(TEBAL_MARKA_PX, TINGGI_MARKA_PX, 1);
    matriks.compose(posisi, PUTARAN_NOL, skala);
    im.setMatrixAt(JUMLAH_HOP + m, matriks);
    warna.setHex(MERAH);
    im.setColorAt(JUMLAH_HOP + m, warna);
    if (m < JUMLAH_HOP) batas += a.px[m];
  }

  im.instanceMatrix.needsUpdate = true;
  if (im.instanceColor) im.instanceColor.needsUpdate = true;
  tulisJejakDebug(a);
};

export const JejakArsitektur: React.FC<AktorProps> = ({ scrollProgressRef }) => {
  const reduceMotion = useSyncExternalStore(
    dengarKurangiGerak,
    bacaKurangiGerak,
    bacaKurangiGerakSaatSSR
  );
  const adaJejak = useSyncExternalStore(dengarTelemetri, bacaAdaJejak, tidakAdaSaatSSR);

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

  const alat = useRef<AlatTulis>(buatAlatTulis());
  const kotor = useRef(true);
  const kunciTerpakai = useRef<Kunci[]>([]);
  const cacheSikap = useRef<{ p: number; kunci: Kunci[]; s: Sikap | undefined }>({
    p: -1,
    kunci: [],
    s: undefined,
  });

  useEffect(() => {
    // Pengunjung yang minta gerakan dikurangi tidak boleh dibangunkan frame: tanpa mount,
    // tidak ada subscription sama sekali.
    if (reduceMotion || !adaJejak) return;
    const im = meshRef.current;
    if (!im) return;
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    isiDariBacaan(alat.current, bacaTelemetri());
    kotor.current = true;
    // Peristiwa data hanya menandai ring kotor; frame yang kebetulan jalan yang menggambar,
    // supaya nol-frame-saat-diam yang dijaga GlobalEditorialCanvas tidak terhapus.
    return dengarTelemetri(() => {
      if (isiDariBacaan(alat.current, bacaTelemetri())) kotor.current = true;
    });
  }, [adaJejak, kotor, reduceMotion]);

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
    if (p !== g.p || g.kunci !== portal.current) {
      g.p = p;
      g.kunci = portal.current;
      g.s = sikap(p, portal.current);
      if (g.kunci !== kunciTerpakai.current) kotor.current = true;
    }
    if (kotor.current) {
      kunciTerpakai.current = g.kunci;
      pasangJejak(im, g.kunci, alat.current);
      kotor.current = false;
    }
    const k = g.s;
    if (!k) return;
    const z = k.z + Z_DEPAN;
    const pxw = pxPerWorld(z);
    // Point asal mesh = kiri-atas kotak portal; satuan lokalnya pixel CSS, dan sumbu y
    // lokal negatif berarti turun ke dalam kotak.
    im.position.set(
      (k.kotak.kiri - size.width / 2) / pxw,
      -(k.kotak.atas - size.height / 2) / pxw,
      z
    );
    im.scale.setScalar(1 / pxw);
  });

  if (reduceMotion || !adaJejak) return null;

  return (
    <instancedMesh
      ref={meshRef}
      name="jejak"
      args={[geometri, material, JUMLAH_INSTANS]}
      frustumCulled={false}
    />
  );
};

export default JejakArsitektur;
