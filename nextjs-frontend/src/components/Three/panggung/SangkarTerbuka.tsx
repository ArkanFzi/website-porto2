"use client";

/** SangkarTerbuka: kerangka kawat yang sama dengan RollCage di panggung utama, tapi di
 *  halaman sendiri dan tanpa koreografi.
 *
 *  RollCage aslinya menggantung pada dua hal yang tidak ada di sini: `sikap()` (posisi bab)
 *  dan registry portal (kotak DOM tempat kartu duduk). Yang dipertahankan hanya geometrinya
 *  — satu `lineSegments`, satu draw call — dan mekanikannya kini datang dari pengunjung
 *  sendiri lewat lib/putaran.ts, modul yang sama dengan kontrol HUD halaman utama. Tidak ada
 *  salinan logika sudut di berkas ini.
 *
 *  Buffer ini gabungan tiga hal dalam SATU objek (tetap satu draw call):
 *  - 24 vertex kerangka balok, diputar manual per frame (Euler yang sama dengan
 *    rotation.set(pitch, yaw, 0)) karena tanda skala tidak boleh ikut berputar;
 *  - 7 tanda skala + 1 tulang vertikal: ±BATAS_DERAJAT dengan langkah LANGKAH_PANAH,
 *    ditulis sekali, diam di dunia — acuan yang tidak bergerak adalah bagian dari ukurannya;
 *  - 1 penanda rosso dua vertex yang duduk di tinggi derajatX saat ini.
 *  Warna per vertex: kerangka boleh menjadi rosso hanya kalau perintah pengunjung benar-benar
 *  melewati nol (hukum yang lama), tanda skala selalu titanium, penanda selalu rosso. */
import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BATAS_DERAJAT, LANGKAH_PANAH, bacaTarget, derajat } from "@/lib/putaran";

/** Sangkar diparkir miring supaya terlihat sebagai benda tiga dimensi: dilihat tegak lurus,
 *  sebuah balok kawat hanya tampak seperti persegi. Perintah pengunjung ditambahkan di atas
 *  sikap awal ini, bukan menggantikannya. */
const YAW_AWAL = Math.PI / 4;
const PITCH_AWAL = THREE.MathUtils.degToRad(16);
const SISI = 1.5;

/** Tujuh tanda: -12°, -8°, ... +12° — langkahnya konstanta panah, bukan angka yang
 *  dikarang di sini, supaya penanda yang bergerak dan tanda yang diam memakai meteran sama. */
const LANGKAH_DERAJAT = Math.round(THREE.MathUtils.radToDeg(LANGKAH_PANAH));
const TANDA_DERAJAT: number[] = [];
for (let d = -BATAS_DERAJAT; d <= BATAS_DERAJAT; d += LANGKAH_DERAJAT) TANDA_DERAJAT.push(d);

/** Derajat → tinggi dunia tempat tanda duduk. +12° di atas, -12° di bawah. */
const TINGGI_SKALA = 0.9;
const skalaY = (d: number) => (d / BATAS_DERAJAT) * TINGGI_SKALA;
const TULANG_X = 1.5;
const TANDA_PANJANG = 0.22;

/** 24 kerangka + 7×2 tanda + 2 tulang + 2 penanda. */
const JUMLAH_VERTEX = 24 + TANDA_DERAJAT.length * 2 + 2 + 2;
const MULAI_TANDA = 24;
const MULAI_TULANG = MULAI_TANDA + TANDA_DERAJAT.length * 2;
const MULAI_PENANDA = MULAI_TULANG + 2;

const KAWAT = new THREE.Color(0x0a0a0a);
const MERAH = new THREE.Color(0xd41e12);
const TITANIUM = new THREE.Color(0xb4b0a8);

/** Bentuk window.__sangkar — dibaca verifier, tidak pernah dipakai kode produksi. */
const tulisDebug = (x: number, y: number) => {
  const jendela = window as unknown as {
    __sangkar?: {
      radX: number;
      radY: number;
      derajatX: number;
      derajatY: number;
      batasDerajat: number;
      yawAwal: number;
      pitchAwal: number;
      tanda: number;
      penandaDerajat: number;
      penandaY: number;
    };
  };
  jendela.__sangkar = {
    radX: x,
    radY: y,
    derajatX: derajat(x),
    derajatY: derajat(y),
    batasDerajat: BATAS_DERAJAT,
    yawAwal: YAW_AWAL,
    pitchAwal: PITCH_AWAL,
    tanda: TANDA_DERAJAT.length,
    penandaDerajat: derajat(x),
    penandaY: skalaY(Math.min(BATAS_DERAJAT, Math.max(-BATAS_DERAJAT, derajat(x)))),
  };
};

/** Sudut dasar kerangka (balok satuan, sebelum skala dan rotasi) — ditulis sekali. */
const sudutBalok = (): Float32Array => {
  const balok = new THREE.BoxGeometry(1, 1, 1);
  const g = new THREE.EdgesGeometry(balok);
  const src = g.getAttribute("position").array as Float32Array;
  const out = new Float32Array(src.length);
  out.set(src);
  g.dispose();
  balok.dispose();
  return out;
};

export const SangkarTerbuka: React.FC = () => {
  const garisRef = useRef<THREE.LineSegments>(null);
  // NaN, bukan 0: frame pertama harus menulis keadaan awal ke verifier, walaupun
  // pengunjung belum memerintahkan apa pun.
  const terakhir = useRef({ x: Number.NaN, y: Number.NaN });

  const { geometri, dasar } = useMemo(() => {
    const dasar = sudutBalok();
    const g = new THREE.BufferGeometry();
    const posisi = new THREE.BufferAttribute(new Float32Array(JUMLAH_VERTEX * 3), 3);
    const warna = new THREE.BufferAttribute(new Float32Array(JUMLAH_VERTEX * 3), 3);
    // Tanda skala dan tulang: statis, ditulis sekali di sini; kerangka dan penanda
    // ditulis ulang per interaksi di useFrame.
    const arr = posisi.array as Float32Array;
    const wrn = warna.array as Float32Array;
    for (let i = 0; i < TANDA_DERAJAT.length; i++) {
      const y = skalaY(TANDA_DERAJAT[i]);
      arr[(MULAI_TANDA + i * 2) * 3] = TULANG_X;
      arr[(MULAI_TANDA + i * 2) * 3 + 1] = y;
      arr[(MULAI_TANDA + i * 2 + 1) * 3] = TULANG_X + TANDA_PANJANG;
      arr[(MULAI_TANDA + i * 2 + 1) * 3 + 1] = y;
      tulisRentang(wrn, MULAI_TANDA + i * 2, MULAI_TANDA + i * 2 + 2, TITANIUM);
    }
    arr[MULAI_TULANG * 3] = TULANG_X;
    arr[MULAI_TULANG * 3 + 1] = -TINGGI_SKALA;
    arr[(MULAI_TULANG + 1) * 3] = TULANG_X;
    arr[(MULAI_TULANG + 1) * 3 + 1] = TINGGI_SKALA;
    tulisRentang(wrn, MULAI_TULANG, MULAI_PENANDA, TITANIUM);
    tulisRentang(wrn, MULAI_PENANDA, JUMLAH_VERTEX, MERAH);
    g.setAttribute("position", posisi);
    g.setAttribute("color", warna);
    return { geometri: g, dasar };
  }, []);

  useEffect(
    () => () => {
      geometri.dispose();
    },
    [geometri]
  );

  const kuaterner = useMemo(() => new THREE.Quaternion(), []);
  const euler = useMemo(() => new THREE.Euler(), []);
  const titik = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const garis = garisRef.current;
    if (!garis) return;
    const t = bacaTarget();
    if (t.x === terakhir.current.x && t.y === terakhir.current.y) return;

    const posisi = geometri.getAttribute("position") as THREE.BufferAttribute;
    const warna = geometri.getAttribute("color") as THREE.BufferAttribute;
    const arr = posisi.array as Float32Array;
    const wrn = warna.array as Float32Array;

    // Rotasi yang sama persis dengan rotation.set(pitch, yaw, 0) dulu — hanya sekarang
    // diterapkan ke vertex, karena tanda skala harus tinggal diam. Balok dasarnya satuan
    // (setengah sisi 0,5), jadi kali SISI menghasilkan setengah sisi 0,75 — tinggi yang
    // sama dengan scale.setScalar(SISI) yang lama.
    euler.set(PITCH_AWAL + t.y, YAW_AWAL + t.x, 0);
    kuaterner.setFromEuler(euler);
    for (let v = 0; v < 24; v++) {
      titik.set(dasar[v * 3] * SISI, dasar[v * 3 + 1] * SISI, dasar[v * 3 + 2] * SISI);
      titik.applyQuaternion(kuaterner);
      arr[v * 3] = titik.x;
      arr[v * 3 + 1] = titik.y;
      arr[v * 3 + 2] = titik.z;
    }

    // Penanda duduk di tinggi derajatX — angka yang sama yang dicetak DOM.
    const y = skalaY(Math.min(BATAS_DERAJAT, Math.max(-BATAS_DERAJAT, derajat(t.x))));
    arr[MULAI_PENANDA * 3] = TULANG_X - 0.05;
    arr[MULAI_PENANDA * 3 + 1] = y;
    arr[(MULAI_PENANDA + 1) * 3] = TULANG_X + TANDA_PANJANG + 0.05;
    arr[(MULAI_PENANDA + 1) * 3 + 1] = y;

    // Kawat menjadi rosso hanya kalau perintah pengunjung benar-benar melewati nol:
    // warnanya ikut angka, bukan ikut dekorasi.
    const kawat = t.x === 0 && t.y === 0 ? KAWAT : MERAH;
    tulisRentang(wrn, 0, MULAI_TANDA, kawat);

    posisi.needsUpdate = true;
    warna.needsUpdate = true;
    terakhir.current = { x: t.x, y: t.y };
    tulisDebug(t.x, t.y);
  });

  return (
    <lineSegments ref={garisRef} name="sangkar-terbuka" geometry={geometri}>
      <lineBasicMaterial vertexColors transparent opacity={0.92} depthWrite={false} />
    </lineSegments>
  );
};

const tulisRentang = (arr: Float32Array, dari: number, sampai: number, c: THREE.Color) => {
  for (let i = dari; i < sampai; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
};

export default SangkarTerbuka;
