"use client";

/** JendelaWaktu: satu bukaan persegi yang sisinya adalah angka p95 ritme frame pengunjung,
 *  dilukis dengan fungsi tinggi yang sama dengan bilah DOM di /arsip dan bilah instanced di
 *  panggung utama — `pecahanTinggi(rasioAmbang(p95))` dari lib/buketMenit.
 *
 *  Aturan yang membuat objek ini bukan dekorasi:
 *  - Tidak ada angka → tidak ada objek sama sekali. Bingkai dan garis ambang ikut hilang,
 *    karena dua-duanya hanya berarti sebagai acuan bagi bukaan yang diukur.
 *  - Bukaan hanya ditulis pada frame yang memang sedang jalan. Bacaan baru terbit ±20 detik
 *    sekali dan peristiwa itu hanya menandai geometri kotor; memanggil invalidate() akan
 *    membangunkan kanvas saat pengunjung diam dan menghapus nol-frame-saat-diam.
 *  - Satu `lineSegments` = satu draw call untuk tiga persegi, warna per vertex. */
import React, { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { pecahanTinggi, rasioAmbang } from "@/lib/buketMenit";
import { bacaTelemetri, dengarTelemetri, type PayloadTelemetri } from "@/lib/bacaTelemetri";

/** Sisi bingkai tetap, dalam satuan dunia; bukaan dinyatakan sebagai pecahan darinya. */
const SISI_BINGKAI = 2;
/** Tiga persegi × empat sisi × dua vertex. */
const JUMLAH_VERTEX = 24;
const MULAI_BUKAAN = 8;
const MULAI_AMBANG = 16;

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

/** Persegi sebagai empat segmen: delapan vertex, dimulai dari indeks `o`. */
const tulisPersegi = (arr: Float32Array, o: number, sisi: number) => {
  const k = sisi / 2;
  const titik: readonly [number, number][] = [
    [-k, -k], [k, -k], [k, -k], [k, k], [k, k], [-k, k], [-k, k], [-k, -k],
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
const tulisDebug = (p95: number, rasio: number, fraksi: number, sisi: number) => {
  const jendela = window as unknown as {
    __jendela?: { p95Ms: number; rasio: number; fraksi: number; sisi: number; bingkai: number };
  };
  jendela.__jendela = { p95Ms: p95, rasio, fraksi, sisi, bingkai: SISI_BINGKAI };
};

export const JendelaWaktu: React.FC = () => {
  const adaP95 = useSyncExternalStore(dengarTelemetri, bacaAdaP95, tidakAdaSaatSSR);
  const garisRef = useRef<THREE.LineSegments>(null);
  const kotor = useRef(true);
  const fraksiTergambar = useRef(-1);

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
    fraksiTergambar.current = -1;
    kotor.current = true;
    return dengarTelemetri(() => {
      const p95 = p95Dari(bacaTelemetri());
      if (p95 === null) return;
      if (pecahanTinggi(rasioAmbang(p95)) !== fraksiTergambar.current) kotor.current = true;
    });
  }, [adaP95]);

  useFrame(() => {
    const garis = garisRef.current;
    if (!garis || !kotor.current) return;
    const p95 = p95Dari(bacaTelemetri());
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
    tulisWarna(arrWarna, MULAI_AMBANG, JUMLAH_VERTEX, BINGKAI);

    posisi.needsUpdate = true;
    warna.needsUpdate = true;
    kotor.current = false;
    fraksiTergambar.current = fraksi;
    tulisDebug(p95, rasio, fraksi, sisi);
  });

  if (!adaP95) return null;

  return <lineSegments ref={garisRef} name="jendela" geometry={geometri} material={material} />;
};

export default JendelaWaktu;
