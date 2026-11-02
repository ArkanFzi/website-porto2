"use client";

/** JendelaWaktu: satu bukaan persegi yang sisinya adalah angka p95 ritme frame pengunjung,
 *  dilukis dengan fungsi tinggi yang sama dengan bilah DOM di /arsip dan bilah instanced di
 *  panggung utama — `pecahanTinggi(rasioAmbang(p95))` dari lib/buketMenit.
 *
 *  Di bawah bukaan utama ada rail enam slot: satu persegi kecil per menit, tingginya dari
 *  p95 rerata gumpalan menit itu — angka yang sama yang dipakai bilah /arsip, lewat fungsi
 *  yang sama. Menit tanpa laporan tetap nol sisi: tidak ada bentuk tanpa angka. Crosshair
 *  empat vertex mengikuti pointer di dalam bingkai; ia mewakili jarum, bukan data, jadi ia
 *  tidak pernah tergambar sebelum pointer benar-benar bergerak.
 *
 *  Aturan yang membuat objek ini bukan dekorasi:
 *  - Tidak ada angka → tidak ada objek sama sekali. Bingkai, garis ambang, dan rail ikut
 *    hilang, karena ketiganya hanya berarti sebagai acuan bagi bukaan yang diukur.
 *  - Bukaan dan rail hanya ditulis pada frame yang memang sedang jalan. Bacaan baru terbit
 *    ±20 detik sekali dan peristiwa itu hanya menandai geometri kotor; memanggil
 *    invalidate() untuk bacaan akan membangunkan kanvas saat pengunjung diam dan menghapus
 *    nol-frame-saat-diam. invalidate() hanya dipanggil pointer — frame itu dibayar
 *    interaksi, bukan jam.
 *  - Satu `lineSegments` = satu draw call: bingkai + bukaan + ambang + 6 slot rail +
 *    crosshair = 76 vertex, warna per vertex. */
import React, { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { JUMLAH_BUKET, isiSlot, pecahanTinggi, rasioAmbang } from "@/lib/buketMenit";
import { bacaTelemetri, dengarTelemetri, type PayloadTelemetri } from "@/lib/bacaTelemetri";

/** Sisi bingkai tetap, dalam satuan dunia; bukaan dinyatakan sebagai pecahan darinya. */
const SISI_BINGKAI = 2;
/** Persegi kecil per menit di rail; slot ke-i duduk di sumbu x ini. */
const SISI_BUKET = 0.28;
const RAIL_X = (i: number) => -0.75 + i * 0.3;
/** Garisan dasar rail: sisi nol slot mana pun berhenti di tinggi ini. */
const RAIL_Y = -0.9;
/** Setang crosshair; hanya pernah tergambar saat pointer benar-benar bergerak. */
const SISI_JARUM = 0.16;

/** bingkai + bukaan + ambang (3 × 8) + rail (6 × 8) + crosshair (4). */
const JUMLAH_VERTEX = 76;
const MULAI_BUKAAN = 8;
const MULAI_AMBANG = 16;
const MULAI_RAIL = 24;
const MULAI_JARUM = MULAI_RAIL + JUMLAH_BUKET * 8;

const BINGKAI = new THREE.Color(0xb4b0a8);
const OBSIDIAN = new THREE.Color(0x0a0a0a);
const MERAH = new THREE.Color(0xd41e12);

const p95Dari = (p: PayloadTelemetri | null): number | null => {
  const v = p?.clientFrames?.p95Ms;
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
};

/** Snapshot boolean: React hanya me-render ulang saat angka pertama tiba atau saat hilang. */
const bacaAdaP95 = () => p95Dari(bacaTelemetri()) !== null;
const tidakAdaSaatSSR = () => false;

/** Persegi sebagai empat segmen: delapan vertex, dimulai dari indeks `o`, berpusat (cx, cy). */
const tulisPersegi = (arr: Float32Array, o: number, sisi: number, cx = 0, cy = 0) => {
  const k = sisi / 2;
  const titik: readonly [number, number][] = [
    [-k, -k], [k, -k], [k, -k], [k, k], [k, k], [-k, k], [-k, k], [-k, -k],
  ];
  for (let i = 0; i < titik.length; i++) {
    arr[(o + i) * 3] = titik[i][0] + cx;
    arr[(o + i) * 3 + 1] = titik[i][1] + cy;
    arr[(o + i) * 3 + 2] = 0;
  }
};

/** Dua segmen (horizontal + vertikal) yang bersilang di (x, y): empat vertex. */
const tulisJarum = (arr: Float32Array, o: number, x: number, y: number) => {
  const k = SISI_JARUM / 2;
  const titik: readonly [number, number][] = [
    [x - k, y], [x + k, y], [x, y - k], [x, y + k],
  ];
  for (let i = 0; i < titik.length; i++) {
    arr[(o + i) * 3] = titik[i][0];
    arr[(o + i) * 3 + 1] = titik[i][1];
    arr[(o + i) * 3 + 2] = 0;
  }
};

const tulisWarna = (arr: Float32Array, dari: number, sampai: number, c: THREE.Color) => {
  for (let i = dari; i < sampai; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
};

/** Bentuk window.__jendela — dibaca verifier, tidak pernah dipakai kode produksi. */
const tulisDebug = (
  p95: number,
  rasio: number,
  fraksi: number,
  sisi: number,
  slot: number,
  terisi: number,
  jarum: { x: number; y: number } | null
) => {
  const jendela = window as unknown as {
    __jendela?: {
      p95Ms: number;
      rasio: number;
      fraksi: number;
      sisi: number;
      bingkai: number;
      buketSlot: number;
      buketTerisi: number;
      jarum: { x: number; y: number } | null;
    };
  };
  jendela.__jendela = {
    p95Ms: p95,
    rasio,
    fraksi,
    sisi,
    bingkai: SISI_BINGKAI,
    buketSlot: slot,
    buketTerisi: terisi,
    jarum,
  };
};

export const JendelaWaktu: React.FC = () => {
  const adaP95 = useSyncExternalStore(dengarTelemetri, bacaAdaP95, tidakAdaSaatSSR);
  const garisRef = useRef<THREE.LineSegments>(null);
  const kotor = useRef(true);
  const jarum = useRef<{ x: number; y: number; aktif: boolean }>({ x: 0, y: 0, aktif: false });
  const gl = useThree((s) => s.gl);
  const viewport = useThree((s) => s.viewport);
  const invalidate = useThree((s) => s.invalidate);

  const { geometri, material } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(JUMLAH_VERTEX * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(JUMLAH_VERTEX * 3), 3));
    const m = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
    return { geometri: g, material: m };
  }, []);

  // Komponen ini dipasang dan dibongkar ulang setiap angka datang; tanpa rilis eksplisit,
  // satu buffer tertinggal per kunjungan.
  useEffect(
    () => () => {
      geometri.dispose();
      material.dispose();
    },
    [geometri, material]
  );

  useEffect(() => {
    if (!adaP95) return;
    kotor.current = true;
    // Setiap bacaan baru menandai kotor tanpa membangunkan kanvas: penulisannya baru
    // benar-benar terjadi pada frame yang memang sedang jalan.
    return dengarTelemetri(() => {
      kotor.current = true;
    });
  }, [adaP95]);

  // Crosshair mengikuti pointer dalam koordinat dunia di bidang z=0, lalu dijepit ke
  // bingkai — di luar bingkai ia menempel di tepinya, tidak pernah melayang di luar
  // acuan yang ia tunjuk.
  useEffect(() => {
    const el = gl.domElement;
    const gerak = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const x = ((e.clientX - r.left) / r.width - 0.5) * viewport.width;
      const y = -((e.clientY - r.top) / r.height - 0.5) * viewport.height;
      const k = SISI_BINGKAI / 2;
      jarum.current = {
        x: Math.min(k, Math.max(-k, x)),
        y: Math.min(k, Math.max(-k, y)),
        aktif: true,
      };
      kotor.current = true;
      invalidate();
    };
    el.addEventListener("pointermove", gerak);
    return () => el.removeEventListener("pointermove", gerak);
  }, [gl, viewport, invalidate]);

  useFrame(() => {
    const garis = garisRef.current;
    if (!garis || !kotor.current) return;
    const t = bacaTelemetri();
    const p95 = p95Dari(t);
    if (p95 === null) return;

    const rasio = rasioAmbang(p95);
    const fraksi = pecahanTinggi(rasio);
    const sisi = SISI_BINGKAI * fraksi;

    const posisi = geometri.getAttribute("position") as THREE.BufferAttribute;
    const warna = geometri.getAttribute("color") as THREE.BufferAttribute;
    const arrPos = posisi.array as Float32Array;
    const arrWarna = warna.array as Float32Array;

    tulisPersegi(arrPos, 0, SISI_BINGKAI);
    tulisPersegi(arrPos, MULAI_BUKAAN, sisi);
    tulisPersegi(arrPos, MULAI_AMBANG, SISI_BINGKAI * pecahanTinggi(1));

    tulisWarna(arrWarna, 0, MULAI_BUKAAN, BINGKAI);
    tulisWarna(arrWarna, MULAI_BUKAAN, MULAI_AMBANG, rasio > 1 ? MERAH : OBSIDIAN);
    tulisWarna(arrWarna, MULAI_AMBANG, MULAI_RAIL, BINGKAI);

    // Rail menit: slot yang sama, fungsi tinggi yang sama, angka yang sama dengan
    // bilah /arsip. Menit kosong ditulis sebagai sisi nol — empat vertex di satu
    // titik, sebuah segmen yang tidak menggambar apa pun.
    const slot = t?.clientFrames ? isiSlot(t.clientFrames.buket ?? [], t.timestamp) : [];
    let terisi = 0;
    for (let i = 0; i < JUMLAH_BUKET; i++) {
      const b = slot[i];
      const r = b ? rasioAmbang(b.p95RerataMs) : 0;
      const sisiB = SISI_BUKET * pecahanTinggi(r);
      if (b) terisi++;
      tulisPersegi(arrPos, MULAI_RAIL + i * 8, sisiB, RAIL_X(i), RAIL_Y + sisiB / 2);
      tulisWarna(arrWarna, MULAI_RAIL + i * 8, MULAI_RAIL + i * 8 + 8, r > 1 ? MERAH : OBSIDIAN);
    }

    if (jarum.current.aktif) {
      tulisJarum(arrPos, MULAI_JARUM, jarum.current.x, jarum.current.y);
      tulisWarna(arrWarna, MULAI_JARUM, JUMLAH_VERTEX, MERAH);
    } else {
      // Belum ada pointer sama sekali: empat vertex ditumpuk di satu titik jauh di luar
      // bingkai, bukan crosshair palsu di tengah.
      tulisJarum(arrPos, MULAI_JARUM, 0, -99);
      tulisWarna(arrWarna, MULAI_JARUM, JUMLAH_VERTEX, BINGKAI);
    }

    posisi.needsUpdate = true;
    warna.needsUpdate = true;
    kotor.current = false;
    tulisDebug(
      p95,
      rasio,
      fraksi,
      sisi,
      JUMLAH_BUKET,
      terisi,
      jarum.current.aktif ? { x: jarum.current.x, y: jarum.current.y } : null
    );
  });

  if (!adaP95) return null;

  return <lineSegments ref={garisRef} name="jendela" geometry={geometri} material={material} />;
};

export default JendelaWaktu;
