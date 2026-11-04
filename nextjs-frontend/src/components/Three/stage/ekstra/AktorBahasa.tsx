"use client";

/** AktorBahasa: logo bahasa dominan sebuah repo, diekstrusi, menempati kotak kartu pada
 *  baris arsip yang terukur.
 *
 *  Ini pasangan AktorSF26, bukan salinannya. Yang sama: dua gerbang (bab arsip mendekat,
 *  lalu silang pengganti hidup), satu material imperatif unlit, dan potongan portal dari
 *  glslPotongPortal. Yang berbeda: tidak ada aset yang diunduh — bentuknya datang dari
 *  data path yang sudah ada di bundle kanvas — jadi gerbang pertama menahan PARSE SVG dan
 *  triangulasi, bukan fetch 1,5 MB.
 *
 *  Yang menentukan bentuk bukan selera: `bahasaBaris` adalah hasil ukur
 *  tools/ci/ukur-kartu.mjs atas berkas ter-commit tiap repo. Baris yang bahasa dominannya
 *  tidak ada di whitelist logoBahasa tidak mendapat objek, dan kartu tidak memudar untuk
 *  objek yang tidak datang — aturan itu satu sumber dengan kartu (aktorDipanggil). */
import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { AktorProps } from "../AktorPotret";
import {
  SAPU_IRIS,
  SILANG_MOBIL,
  glslPotongPortal,
  muatKartu,
} from "../chiaroscuroMaterial";
import { BARIS_DIAM, aktorDipanggil, sikap, type AktorPanggung } from "../koreografi";
import { usePortalRegistry } from "../usePortalRegistry";
import { bentukLogo, segitigaBentuk } from "./bentukLogo";
import { logoUntuk, type BahasaId } from "@/data/logoBahasa";

/** Pecahan tapak kartu yang diisi logo. Sangkar (RollCage) memakai 1,0 dan ia memang
 *  bingkainya; logo yang ikut 1,0 akan menempel kawat di keempat sisinya. 0,62 adalah
 *  angka yang tersisa dari situ — cukup besar untuk dibaca sebagai benda, cukup kecil
 *  untuk masih terlihat ada ruang di dalam kotak. */
const ISI_KOTAK = 0.62;

/** Di bawah silang ini objek sudah tidak menyumbang pixel, dan ia wajib lepas dari scene
 *  graph: kanvas berjalan pada frameloop "demand", dan satu draw call yang tertinggal
 *  selamanya adalah pelanggaran invariant nol frame saat diam. */
const TETAS = 0.001;

const vertexLogo = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec2 vClip;

  void main() {
    vec4 lihat = modelViewMatrix * vec4(position, 1.0);
    vView = -lihat.xyz;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * lihat;
    vClip = gl_Position.xy / gl_Position.w;
  }
`;

const fragmentLogo = /* glsl */ `
  uniform vec4 uMask;
  uniform vec2 uNdcPerPx;
  uniform float uWipe;
  uniform float uMobil;

  varying vec3 vNormal;
  varying vec3 vView;
  varying vec2 vClip;

  void main() {
    vec3 n = normalize(vNormal);
    // Kunci dari kiri-atas layar: arah yang sama dengan potret dan dengan mobil, supaya
    // tiga bahasa visual di panggung ini tidak punya tiga pencahayaan sendiri.
    float kunci = max(dot(n, normalize(vec3(-0.35, 0.75, 0.6))), 0.0);
    float grafit = smoothstep(0.02, 0.92, kunci);
    vec3 warna = mix(vec3(0.055, 0.055, 0.062), vec3(0.80, 0.80, 0.79), grafit);

    // Sapuan rosso pada tepi yang menggantung — angka intensitas rim kartu, bukan baru.
    float pinggir = pow(1.0 - max(dot(n, normalize(vView)), 0.0), 2.8);
    warna += vec3(0.831, 0.117, 0.07) * pinggir * 0.26;

    float alpha = uMobil;
${glslPotongPortal}
    gl_FragColor = vec4(warna, alpha);
  }
`;

/** Bacaan verifier: id yang SEDANG dibangun, jumlah segitiga yang akan masuk sensus, dan
 *  silang yang menghidupkannya. `id` dibandingkan dengan data-bahasa di DOM baris, jadi
 *  angka ini yang membuktikan objek datang dari pengukuran dan bukan dari karangan. */
const tulisBahasaDebug = (id: string | null, tris: number, silang: number, skala: number) => {
  const bundar = (n: number) => Math.round(n * 1e4) / 1e4;
  const jendela = window as unknown as {
    __bahasa?: { id: string | null; tris: number; silang: number; skala: number };
  };
  jendela.__bahasa = { id, tris: bundar(tris), silang: bundar(silang), skala: bundar(skala) };
};

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

const AktorBahasa: React.FC<AktorProps> = (props) => {
  // Gerbang pertama: bab arsip belum tentu dikunjungi, dan membangun empat geometri +
  // mem-parse 77 KB SVGLoader untuk halaman yang berhenti di bab satu adalah kerja yang
  // tidak diminta siapa pun. Tidak ada aset di sini, jadi yang ditahan hanyalah CPU.
  const [dekat, setDekat] = useState(false);
  useEffect(() => {
    const target = document.getElementById("chapter-03");
    if (!target) return;
    const io = new IntersectionObserver(
      (daftar) => {
        if (!daftar.some((e) => e.isIntersecting)) return;
        setDekat(true);
        io.disconnect();
      },
      { rootMargin: "60% 0px" }
    );
    io.observe(target);
    return () => io.disconnect();
  }, []);

  if (!dekat) return null;
  return <Logo {...props} />;
};

/** Motong dan penggaris pixel duduk di objek module-level, sama seperti MASK_MOBIL: satu
 *  kanvas berarti satu logo pada satu waktu, dan menaruh Vector di hasil useMemo akan
 *  membuat setiap penulisan per frame menjadi perubahan nilai hook. */
const MASK_BAHASA = { value: new THREE.Vector4(-1, 1, -1, 1) };
const NDC_BAHASA = { value: new THREE.Vector2(2 / 1440, 2 / 900) };

const Logo: React.FC<AktorProps> = ({
  scrollProgressRef,
  hoveredProject,
  bahasaBaris,
}) => {
  const { size, viewport, camera, invalidate } = useThree();
  const portal = usePortalRegistry();
  const kurangiGerak = useSyncExternalStore(
    dengarKurangiGerak,
    bacaKurangiGerak,
    bacaKurangiGerakSaatSSR
  );

  const grupRef = useRef<THREE.Group>(null);
  const hidupRef = useRef(false);
  /** Aktor yang terakhir dipanggil menurut aturan yang sama; ditahan cuma untuk pelepasan. */
  const pemilik = useRef<AktorPanggung | null>(null);
  const [terpasang, setTerpasang] = useState(false);

  /** Bentuk yang sedang dipegang mesh. Dibangun lewat cache module-level bentukLogo, jadi
   *  berpindah baris lalu kembali tidak pernah men-triangulasi ulang. */
  const [isi, setIsi] = useState<{ id: BahasaId; geom: THREE.BufferGeometry } | null>(null);
  const idRef = useRef<BahasaId | null>(null);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertexLogo,
        fragmentShader: fragmentLogo,
        uniforms: { uMask: MASK_BAHASA, uNdcPerPx: NDC_BAHASA, uWipe: SAPU_IRIS, uMobil: SILANG_MOBIL },
        transparent: true,
        // Benda padat, sama seperti mobil: tanpa tulisan depth, dinding dalam ekstrusi
        // akan menutupi wajah luarnya.
        depthWrite: true,
      }),
    []
  );

  useEffect(
    () => () => {
      // Hanya material yang dimiliki aktor ini. Geometrinya punyanya cache bentukLogo dan
      // dipakai ulang setiap hover berikutnya.
      material.dispose();
    },
    [material]
  );

  useFrame(() => {
    const p = Math.max(0, Math.min(1, scrollProgressRef.current));
    const k = sikap(p, portal.current);
    if (!k) return;

    const aku = aktorDipanggil(k.babDari, hoveredProject, kurangiGerak, bahasaBaris);
    if (aku !== null) pemilik.current = aku;
    // Lepas hanya setelah silang habis, dan hanya kalau yang menempati kotak tadi memang
    // logo: `aku` kembali null saat hover lepas sementara silang masih dikejar, dan tanpa
    // pemilik ini mobil akan ikut naik ke panggung di bawah logo yang sedang memudar.
    const hidup =
      !kurangiGerak &&
      (aku === "bahasa" || (aku === null && pemilik.current === "bahasa" && SILANG_MOBIL.value > TETAS));
    if (hidup !== hidupRef.current) {
      hidupRef.current = hidup;
      setTerpasang(hidup);
      invalidate();
    }
    if (!hidup) return;

    // Bahasa baris yang sedang aktif. Saat pelepasan hovered sudah null dan BARIS_DIAM
    // bukan baris bahasa: bentuk terakhir dibiarkan terpasang supaya ia ikut memudar
    // bersama kartu, bukan hilang mendahului silangnya sendiri.
    const baris = hoveredProject ?? BARIS_DIAM;
    const mauId = baris === null ? null : logoUntuk(bahasaBaris[baris] ?? null);
    if (mauId && mauId !== idRef.current) {
      const geom = bentukLogo(mauId);
      idRef.current = mauId;
      // null di sini berarti data path-nya rusak: objek tidak dipasang, dan itu harus
      // terlihat di __bahasa.id, bukan menyisakan kotak kosong tanpa jejak.
      setIsi(geom ? { id: mauId, geom } : null);
      invalidate();
    }

    const grup = grupRef.current;
    if (!grup) return;

    const layarX = size.width;
    const layarY = size.height;
    const dpp = viewport.width / layarX;
    const camZ = camera.position.z;
    const pxPas = (1 / dpp) * (camZ / (camZ - k.pas));
    const pxZ = (1 / dpp) * (camZ / (camZ - k.z));

    MASK_BAHASA.value.set(
      (k.kotak.kiri / layarX) * 2 - 1,
      ((k.kotak.kiri + k.kotak.lebar) / layarX) * 2 - 1,
      1 - ((k.kotak.atas + k.kotak.tinggi) / layarY) * 2,
      1 - (k.kotak.atas / layarY) * 2
    );
    NDC_BAHASA.value.set(2 / layarX, 2 / layarY);

    // Tapak dihitung dari kartu, bukan dari portal — hukum yang sama dengan sangkar, jadi
    // logo tidak pernah lebih besar dari kotaknya sendiri berapa pun babnya.
    const skala = (muatKartu(k.kotak) / pxPas) * ISI_KOTAK;
    grup.position.set(
      (k.kotak.kiri + k.kotak.lebar / 2 - layarX / 2) / pxZ,
      -(k.kotak.atas + k.kotak.tinggi / 2 - layarY / 2) / pxZ,
      k.z
    );
    // Geometri sudah dibungkus di bujur sangkar satuan dan dipusatkan di asal, jadi skala
    // seragam adalah satu-satunya yang dibutuhkan.
    grup.scale.setScalar(skala);
    // Hanya kemiringan bab, sama seperti sangkar: tidak ada putaran bebas, karena kanvas
    // ini harus tetap nol frame saat pengunjung diam.
    grup.rotation.y = k.rot;

    if (process.env.NODE_ENV !== "production") {
      tulisBahasaDebug(
        isi?.id ?? idRef.current,
        isi ? segitigaBentuk(isi.geom) : 0,
        SILANG_MOBIL.value,
        skala
      );
    }
  });

  if (!terpasang || !isi) return null;
  return (
    <group ref={grupRef} dispose={null}>
      <mesh geometry={isi.geom} material={material} name="bahasa-logo" dispose={null} />
    </group>
  );
};

export { AktorBahasa };
export default AktorBahasa;
