"use client";

/** HubFerrari: panggung section akses — SF-26 diparkir di atas platform cincin, halunya
 *  menoleh ke node menu yang sedang ditunjuk pengunjung.
 *
 *  Ini island PanggungKecil, bukan aktor kanvas global: tidak ada registry portal, tidak
 *  ada uMask, tidak ada silang potret→mobil. Yang dipertahankan dari AktorSF26 hanyalah
 *  bahasa materialnya — grafit satu lampu studio + satu sapuan rosso di pinggir — supaya
 *  mobil yang sama tidak tiba dengan wajah yang berbeda.
 *
 *  Hukum diam tetap yang mengikat: mobil TIDAK berputar sendiri. Frame hanya diminta
 *  selama yaw masih mengejar target (invalidate per frame selama settle, berhenti saat
 *  |selisih| habis), jadi jendela ukur probe tetap melihat nol frame saat pengunjung diam.
 *  Roda juga diam: mobil ini parked, bukan melaju, jadi tidak ada gulir yang perlu
 *  dibayar. */
import React, { Suspense, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import PanggungKecil from "./PanggungKecil";
import {
  bacaKurangiGerak,
  bacaKurangiGerakSaatSSR,
  dengarKurangiGerak,
} from "@/lib/motion";

const ALAMAT = "/models/sf26.glb";

/** Jari-jari platform dalam satuan dunia. Cincin, garis sirkuit, dan ukuran mobil
 *  semuanya diukur dari angka yang sama. */
const JARI = 1.9;
/** Pecahan JARI yang boleh diisi bola batas mobil — sisanya ruang visual cincin. */
const ISI = 0.62;
/** Yaw parkir: tiga-perempat seperti reference, hidung ke kiri-bawah layar.
 *  NOSE mengoreksi sumbu hidung model; keduanya diukur dari screenshot, bukan dikira. */
const PARKED = 0.62;
const NOSE = Math.PI / 2;
/** Konstanta peluruhan kejar-yaw, per detik. Settle ~0,5 s di GPU normal: cukup cepat untuk
 *  terasa mengikuti pointer, cukup lambat untuk tetap terlihat berat. BATAS_SETTLE adalah
 *  tenggat waktu — di renderer lambat (SwiftShader probe) kejar-eksponensial dengan delta
 *  yang di-clamp bisa makan puluhan frame, dan setiap frame meminta berikutnya; tanpa
 *  tenggat, loop masih settle saat gerbang "nol frame saat diam" mengukur. Setelah tenggat
 *  haluan dilompatkan ke target: gerak dibatasi waktu, bukan jumlah frame. */
const LAJU = 7;
const BATAS_SETTLE = 1500;
const HABIS = 1e-4;

const MERAH = new THREE.Color(0xd41e12);
const TITANIUM = new THREE.Color(0xb4b0a8);
const GELAP = new THREE.Color(0x141416);

/** Nama node roda di dalam aset — sama dengan AktorSF26; satu geometry dipakai empat node,
 *  jadi rodanya dua InstancedMesh (ban + pelek), total tiga draw call untuk mobil. */
const NAMA_RODA = ["roda-LF", "roda-RF", "roda-LR", "roda-RR"] as const;

/** Bacaan verifier — bentuk window.__hub, ditulis hanya di development. */
const tulisHubDebug = (node: number | null, yaw: number, target: number) => {
  if (process.env.NODE_ENV === "production") return;
  const bundar = (n: number) => Math.round(n * 1e4) / 1e4;
  const jendela = window as unknown as {
    __hub?: { node: number | null; yaw: number; target: number };
  };
  jendela.__hub = { node, yaw: bundar(yaw), target: bundar(target) };
};

/** Kamera PanggungKecil hanya diberi posisi; tatapannya harus diminta sekali, kalau tidak
 *  platform terlihat tergeser ke bawah dan cincin tidak simetris terhadap node DOM. */
const Tatapan: React.FC = () => {
  const { camera, invalidate } = useThree();
  useEffect(() => {
    camera.lookAt(0, 0.12, 0);
    camera.updateMatrixWorld();
    invalidate();
  }, [camera, invalidate]);
  return null;
};

/** Satu lineSegments gabungan: cincin putih + dua orbit redup + garis sirkuit radial +
 *  penanda rosso dua vertex yang pindah ke sudut node aktif. Warna per vertex, pola yang
 *  sama dengan buffer gabungan /sangkar — satu objek, satu draw call, satu tempat untuk
 *  menagih. */
const SEG_MELINGKAR = 72;
const RADIAL = 12;

const Platform: React.FC<{ sudut: number[]; node: number | null }> = ({ sudut, node }) => {
  const penandaRef = useRef<number | null>(null);
  const { invalidate } = useThree();

  const geometri = useMemo(() => {
    const posisi: number[] = [];
    const warna: number[] = [];
    const tulis = (x: number, y: number, z: number, c: THREE.Color) => {
      posisi.push(x, y, z);
      warna.push(c.r, c.g, c.b);
    };
    const lingkaran = (r: number, dari: number, sampai: number, c: THREE.Color) => {
      for (let i = dari; i < sampai; i++) {
        const a1 = (i / SEG_MELINGKAR) * Math.PI * 2;
        const a2 = ((i + 1) / SEG_MELINGKAR) * Math.PI * 2;
        tulis(Math.cos(a1) * r, 0.001, Math.sin(a1) * r, c);
        tulis(Math.cos(a2) * r, 0.001, Math.sin(a2) * r, c);
      }
    };
    // Cincin tepi: penuh, terang — garis yang dibaca sebagai "panggung".
    lingkaran(JARI, 0, SEG_MELINGKAR, TITANIUM);
    // Dua orbit dalam, redup, dengan jeda tiap kuart agar terasa sebagai sirkuit, bukan
    // dua lingkaran hiasan.
    const jeda = (r: number, c: THREE.Color) => {
      for (let k = 0; k < 4; k++) lingkaran(r, k * 18 + 2, k * 18 + 16, c);
    };
    jeda(JARI * 0.78, GELAP);
    jeda(JARI * 0.55, GELAP);
    // Radial rosso pendek di tepi: patahan garis sirkuit reference, diwakili tick.
    for (let i = 0; i < RADIAL; i++) {
      const a = (i / RADIAL) * Math.PI * 2;
      const c = i % 3 === 0 ? MERAH : GELAP;
      tulis(Math.cos(a) * JARI * 0.82, 0.001, Math.sin(a) * JARI * 0.82, c);
      tulis(Math.cos(a) * JARI * 0.96, 0.001, Math.sin(a) * JARI * 0.96, c);
    }
    // Dua vertex penanda selalu ada di ujung buffer; tanpa node aktif warnanya gelap,
    // jadi tidak ada cabang mount/unmount di tengah frame.
    const g = new THREE.BufferGeometry();
    const arr = new Float32Array(posisi.length + 6);
    arr.set(posisi);
    const wrn = new Float32Array(warna.length + 6);
    wrn.set(warna);
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    g.setAttribute("color", new THREE.BufferAttribute(wrn, 3));
    // Simpan offset komponen penanda supaya useFrame tidak perlu menebak jumlah vertex.
    return { geometry: g, mulai: posisi.length };
  }, []);

  useEffect(() => () => geometri.geometry.dispose(), [geometri]);

  // Satu frame per perubahan node. Tanpa permintaan ini, pengunjung yang minta kurang gerak
  // (frameloop "demand" permanen, tidak ada peristiwa yang membangunkan loop) atau node yang
  // berpindah saat haluan sudah tepat di sasaran tidak pernah melihat tick rosso itu pindah:
  // tulisannya masuk ke buffer yang tidak ada yang melukisnya. Permintaan datang dari effect,
  // bukan dari useFrame, karena useFrame sendiri hanya jalan kalau frame-nya sudah ada.
  useEffect(() => {
    invalidate();
  }, [node, invalidate]);

  useFrame(() => {
    if (node === penandaRef.current) return;
    penandaRef.current = node;
    const { geometry: g, mulai } = geometri;
    const wrn = g.getAttribute("color") as THREE.BufferAttribute;
    const arr = g.getAttribute("position") as THREE.BufferAttribute;
    const w = wrn.array as Float32Array;
    const p = arr.array as Float32Array;
    const c = node === null ? GELAP : MERAH;
    w[mulai] = w[mulai + 3] = c.r;
    w[mulai + 1] = w[mulai + 4] = c.g;
    w[mulai + 2] = w[mulai + 5] = c.b;
    if (node !== null) {
      const a = sudut[node];
      p[mulai] = Math.cos(a) * JARI * 0.68;
      p[mulai + 2] = -Math.sin(a) * JARI * 0.68;
      p[mulai + 3] = Math.cos(a) * JARI * 0.99;
      p[mulai + 5] = -Math.sin(a) * JARI * 0.99;
    }
    wrn.needsUpdate = true;
    arr.needsUpdate = true;
  });

  return (
    <>
      <mesh rotation-x={-Math.PI / 2} name="hub-lantai">
        <circleGeometry args={[JARI * 0.995, SEG_MELINGKAR]} />
        <meshBasicMaterial color={0x0c0c0e} />
      </mesh>
      <lineSegments name="hub-sirkuit" geometry={geometri.geometry}>
        <lineBasicMaterial vertexColors transparent opacity={0.9} depthWrite={false} />
      </lineSegments>
    </>
  );
};

/** Vertex sama dengan AktorSF26 (rotasi instance untuk roda), fragment tanpa potong
 *  portal: mobil island ini tidak pernah terpotong kotak DOM, alpha-nya selalu 1. */
const vertexMobil = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;

  void main() {
    vec4 letak = vec4(position, 1.0);
    #ifdef USE_INSTANCING
      letak = instanceMatrix * letak;
    #endif
    vec4 lihat = modelViewMatrix * letak;
    vView = -lihat.xyz;
    #ifdef USE_INSTANCING
      vNormal = normalize(normalMatrix * (mat3(instanceMatrix) * normal));
    #else
      vNormal = normalize(normalMatrix * normal);
    #endif
    gl_Position = projectionMatrix * lihat;
  }
`;

const fragmentMobil = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;

  void main() {
    vec3 n = normalize(vNormal);
    float kunci = max(dot(n, normalize(vec3(-0.35, 0.75, 0.6))), 0.0);
    float grafit = smoothstep(0.02, 0.92, kunci);
    vec3 warna = mix(vec3(0.055, 0.055, 0.062), vec3(0.80, 0.80, 0.79), grafit);
    float pinggir = pow(1.0 - max(dot(n, normalize(vView)), 0.0), 2.8);
    warna += vec3(0.831, 0.117, 0.07) * pinggir * 0.26;
    gl_FragColor = vec4(warna, 1.0);
  }
`;

const Mobil: React.FC<{ sudut: number[]; node: number | null }> = ({ sudut, node }) => {
  const { nodes } = useGLTF(ALAMAT);
  const { invalidate } = useThree();
  const grupRef = useRef<THREE.Group>(null);
  const yaw = useRef(PARKED);
  const kejar = useRef({ target: Number.NaN, batas: 0 });
  // Kurang gerak = haluan diam: node tetap bisa diklik, tapi tidak ada frame yang dibayar
  // untuk rotasi yang tidak diinginkan pengunjung.
  const kurangiGerak = useSyncExternalStore(
    dengarKurangiGerak,
    bacaKurangiGerak,
    bacaKurangiGerakSaatSSR
  );

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertexMobil,
        fragmentShader: fragmentMobil,
      }),
    []
  );

  /** Susunan dibaca sekali dari cache useGLTF: bola batas untuk skala+tinggi duduk,
   *  matriks T·(R·S) per roda untuk dua InstancedMesh statis. Tidak ada per-frame
   *  seperti AktorSF26 karena rodanya tidak bergulir. */
  const susun = useMemo(() => {
    const semua = nodes as unknown as Record<string, THREE.Object3D | undefined>;
    const sasis = semua["sasis"] as THREE.Mesh | undefined;
    const rodaNode = semua["roda-LF"] as THREE.Group | undefined;
    const prim = (nama: string) =>
      rodaNode?.children.find((c) => {
        const mat = (c as THREE.Mesh).material as THREE.Material | THREE.Material[];
        return (Array.isArray(mat) ? mat[0] : mat)?.name === nama;
      }) as THREE.Mesh | undefined;
    const ban = prim("ban");
    const pelek = prim("pelek");
    if (!sasis || !rodaNode || !ban || !pelek) return null;

    const kotak = new THREE.Box3();
    const tambah = (geom: THREE.BufferGeometry, m: THREE.Matrix4) => {
      if (!geom.boundingBox) geom.computeBoundingBox();
      kotak.union(geom.boundingBox!.clone().applyMatrix4(m));
    };
    const mSasis = new THREE.Matrix4().compose(sasis.position, sasis.quaternion, sasis.scale);
    tambah(sasis.geometry, mSasis);

    const hasil: THREE.Matrix4[] = [];
    for (const nama of NAMA_RODA) {
      const nodeRoda = semua[nama];
      if (!nodeRoda) return null;
      const duduk = new THREE.Matrix4().compose(
        new THREE.Vector3(0, 0, 0),
        nodeRoda.quaternion,
        nodeRoda.scale
      );
      const angkat = new THREE.Matrix4().makeTranslation(
        nodeRoda.position.x,
        nodeRoda.position.y,
        nodeRoda.position.z
      );
      const m = angkat.clone().multiply(duduk);
      tambah(ban.geometry, m);
      hasil.push(m);
    }

    const pusat = kotak.getCenter(new THREE.Vector3());
    const radius = kotak.getSize(new THREE.Vector3()).length() / 2;
    const skala = (JARI * ISI) / radius;
    return {
      sasisGeom: sasis.geometry,
      banGeom: ban.geometry,
      pelekGeom: pelek.geometry,
      sasisT: sasis.position.toArray() as [number, number, number],
      sasisQ: sasis.quaternion.toArray() as [number, number, number, number],
      sasisS: sasis.scale.toArray() as [number, number, number],
      pusat,
      bawah: kotak.min.y,
      skala,
      roda: hasil,
    };
  }, [nodes]);

  const roda = useRef<{ ban?: THREE.InstancedMesh; pelek?: THREE.InstancedMesh }>({});

  useEffect(() => {
    // Matriks roda ditulis sekali setelah mount: posisinya tidak pernah berubah lagi
    // (mobil ini parked), jadi tidak ada yang perlu dipegang per frame.
    const grup = grupRef.current;
    if (!grup || !susun) return;
    for (const nama of ["hub-ban", "hub-pelek"] as const) {
      const obj = grup.getObjectByName(nama) as THREE.InstancedMesh | undefined;
      if (!obj) continue;
      roda.current[nama === "hub-ban" ? "ban" : "pelek"] = obj;
      for (let i = 0; i < 4; i++) obj.setMatrixAt(i, susun.roda[i]);
      obj.instanceMatrix.needsUpdate = true;
    }
  }, [susun]);

  useEffect(
    () => () => {
      // dispose={null} di JSX menahan geometry cache useGLTF tetap utuh; yang dimiliki
      // aktor ini hanya material dan dua buffer instanceMatrix — keduanya dilepas di sini,
      // sama seperti AktorSF26.
      roda.current.ban?.dispose();
      roda.current.pelek?.dispose();
      material.dispose();
    },
    [material]
  );

  useFrame((_, delta) => {
    const grup = grupRef.current;
    if (!grup || !susun) return;
    const target = node === null || kurangiGerak ? PARKED : sudut[node] + NOSE;
    if (target !== kejar.current.target) {
      kejar.current.target = target;
      kejar.current.batas = performance.now() + BATAS_SETTLE;
    }
    let selisih = target - yaw.current;
    selisih = Math.atan2(Math.sin(selisih), Math.cos(selisih));
    if (Math.abs(selisih) < HABIS) {
      tulisHubDebug(node, yaw.current, target);
      return;
    }
    if (performance.now() > kejar.current.batas) yaw.current = target;
    else yaw.current += selisih * (1 - Math.exp(-LAJU * Math.min(delta, 0.05)));
    grup.rotation.y = yaw.current;
    tulisHubDebug(node, yaw.current, target);
    // Frame berikutnya hanya ada kalau kita yang memintanya: settle tidak boleh
    // terbangun oleh loop, dan berhenti sendiri saat selisih habis.
    invalidate();
  });

  if (!susun) return null;
  /* Titik kontak roda (kotak.min.y, ruang model) dinaikkan ke lantai platform lewat
   * offset grup luar; grup dalam hanya memusatkan bola batas ke poros yaw. */
  return (
    <group
      ref={grupRef}
      name="hub-mobil"
      position={[0, susun.skala * (susun.pusat.y - susun.bawah) + 0.004, 0]}
      rotation-y={PARKED}
      dispose={null}
    >
      <group
        scale={susun.skala}
        position={[-susun.pusat.x * susun.skala, -susun.pusat.y * susun.skala, -susun.pusat.z * susun.skala]}
        dispose={null}
      >
        <mesh
          geometry={susun.sasisGeom}
          material={material}
          position={susun.sasisT}
          quaternion={susun.sasisQ}
          scale={susun.sasisS}
          name="hub-sasis"
          dispose={null}
        />
        <instancedMesh args={[susun.banGeom, material, 4]} frustumCulled={false} name="hub-ban" dispose={null} />
        <instancedMesh args={[susun.pelekGeom, material, 4]} frustumCulled={false} name="hub-pelek" dispose={null} />
      </group>
    </group>
  );
};

interface Props {
  /** Sudut layar tiap node, radian — sumber yang sama dengan posisi DOM di ChapterHub. */
  sudut: number[];
  /** Indeks node yang sedang ditunjuk; null = parkir. */
  node: number | null;
  /** False sampai section mendekat: aset 1,6 MB tidak boleh ikut jalur kritis halaman. */
  dekat: boolean;
  /** Palsu saat section sudah lewat lagi: kanvas tidur, hukum diam tidak mendaftar listener. */
  terlihat: boolean;
}

const HubPanggung: React.FC<Props> = ({ sudut, node, dekat, terlihat }) => (
  <PanggungKecil className="w-full h-full" kamera={[0, 1.7, 3.9]} fov={42} aktif={terlihat}>
    <Tatapan />
    <Platform sudut={sudut} node={node} />
    {dekat && (
      <Suspense fallback={null}>
        <Mobil sudut={sudut} node={node} />
      </Suspense>
    )}
  </PanggungKecil>
);

export default HubPanggung;
