"use client";

/** AktorSF26: SF-26 menggantikan potret saat baris "01 — Ferrari Ubuntu Architecture"
 *  di-hover di bab arsip.
 *
 *  Asetnya hasil pipeline sendiri: 272.038 triangle sumber jadi 40.285 unik, tiga material,
 *  satu mesh sasis dan SATU mesh roda yang dipakai empat node. Karena rodanya satu geometry,
 *  empat roda di-render sebagai dua InstancedMesh (ban + pelek) sehingga biayanya
 *  1 + 2 = tiga draw call, bukan 1 + 8. Atlas warna dibuang semua di hulu — logo sponsor
 *  ikut hilang bersama teksturnya — jadi yang dilukis di sini grafit panggung dengan satu
 *  sapuan rosso, bukan material PBR.
 *
 *  Objeknya hanya ada selama silang potret→mobil hidup. Kanvas berjalan pada frameloop
 *  "demand" dan invariant halaman ini nol frame saat diam, jadi aktor yang terpasang terus
 *  akan menghapus invariant itu. */
import React, { Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { AktorProps } from "../AktorPotret";
import { SAPU_IRIS, SILANG_MOBIL, glslPotongPortal } from "../chiaroscuroMaterial";
import { mobilDipanggil, sikap } from "../koreografi";
import { usePortalRegistry } from "../usePortalRegistry";

const ALAMAT = "/models/sf26.glb";

/** Setengah lingkar + sasis dilihat dari kamera: stance tiga-perempat menunjukkan flank
 *  dan front wing sekaligus. Pemasangan diukur dari BOLA batas, bukan kotak siluet, karena
 *  bola tidak berubah oleh yaw — mobil tidak bisa pernah meluap dari portal berapa pun
 *  angkanya. */
const PUSAKA = Math.PI / 4;
/** Kemiringan LAYAR: mobil yang berbaring diagonal memakai tinggi portal yang tersedia.
 *  Dipasang pada grup terluar supaya rotasinya terjadi di ruang layar, bukan pada sumbu
 *  panjang mobil (yang memberi efek berguling). */
const MIRING = -0.3;
/** Pecahan kotak portal yang diisi siluet. Sisanya dibiarkan untuk ramp 1,5px tepi potong. */
const ISI_PORTAL = 0.94;
/** Di bawah velositas ini roda tidak lagi menggulir jarak yang nyata — ambang yang sama
 *  dengan RodaPaddock supaya dua objek yang berputar dari angka yang sama tidak terasa
 *  berbeda laju. */
const AMBANG = 0.004;
const KELILING = Math.PI * 2;
/** Selama silang masih di atas angka ini mobil harus tetap terpasang: kartunya menahan
 *  alpha pada nilai yang sama, jadi melepas lebih awal meninggalkan portal kosong. */
const TETAS = 0.001;

/** Nama node roda di dalam aset. Empat node, satu geometry — urutan ini juga urutan
 *  instance yang dipakai kedua InstancedMesh. */
const NAMA_RODA = ["roda-LF", "roda-RF", "roda-LR", "roda-RR"] as const;

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

const vertexMobil = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec2 vClip;

  void main() {
    vec4 letak = vec4(position, 1.0);
    #ifdef USE_INSTANCING
      letak = instanceMatrix * letak;
    #endif
    vec4 lihat = modelViewMatrix * letak;
    vView = -lihat.xyz;
    // normalMatrix sudah inverse-transpose dari modelViewMatrix, jadi rotasi instance
    // dititipkan lewat mat3()-nya. Pada roda kita (rotasi poros + skala 1,142 SEARAH poros)
    // normal permukaan ban tidak punya komponen X, jadi transformasi ini tetap eksak.
    #ifdef USE_INSTANCING
      vNormal = normalize(normalMatrix * (mat3(instanceMatrix) * normal));
    #else
      vNormal = normalize(normalMatrix * normal);
    #endif
    gl_Position = projectionMatrix * lihat;
    vClip = gl_Position.xy / gl_Position.w;
  }
`;

const fragmentMobil = /* glsl */ `
  uniform vec4 uMask;
  uniform vec2 uNdcPerPx;
  uniform float uWipe;
  uniform float uMobil;

  varying vec3 vNormal;
  varying vec3 vView;
  varying vec2 vClip;

  void main() {
    vec3 n = normalize(vNormal);
    // Satu lampu studio dari kiri-atas layar, arah yang sama dengan rim light potret supaya
    // mobil tidak tiba dengan bahasa pencahayaan sendiri.
    float kunci = max(dot(n, normalize(vec3(-0.35, 0.75, 0.6))), 0.0);
    float grafit = smoothstep(0.02, 0.92, kunci);
    vec3 warna = mix(vec3(0.055, 0.055, 0.062), vec3(0.80, 0.80, 0.79), grafit);

    // Satu sapuan rosso pada sisi yang menggantung, intensitas 0,26 — angka rim kartu.
    float pinggir = pow(1.0 - max(dot(n, normalize(vView)), 0.0), 2.8);
    warna += vec3(0.831, 0.117, 0.07) * pinggir * 0.26;

    // alpha = silang: 0 selama kartu masih punya tempatnya, 1 saat mobil yang menempati.
    float alpha = uMobil;
${glslPotongPortal}
    gl_FragColor = vec4(warna, alpha);
  }
`;

/** Bacaan verifier. Kehadiran objek sudah dibuktikan sensus window.__render; angka di sini
 *  menjelaskan keadaan yang tidak terlihat dari sensus — seberapa jauh silang berjalan dan
 *  berapa jauh roda sudah bergulir (putaran bersih, tanpa modulo). */
const tulisMobilDebug = (
  silang: number,
  sudut: number,
  putaran: number,
  skala: number,
  jariPx: number
) => {
  const bundar = (n: number) => Math.round(n * 1e4) / 1e4;
  const jendela = window as unknown as {
    __sf26?: { silang: number; sudut: number; putaran: number; skala: number; jariPx: number };
  };
  jendela.__sf26 = {
    silang: bundar(silang),
    sudut: bundar(sudut),
    putaran: bundar(putaran),
    skala: bundar(skala),
    jariPx: bundar(jariPx),
  };
};

/** Prime: bab arsip sudah mendekat, jadi aset 1,5 MB boleh mulai diunduh. Menaruh useGLTF
 *  langsung di jalur utama menyeretnya ke bundle kritis halaman, padahal mobil ini muncul
 *  atas permintaan satu hover. Suspense sendiri bukan hiasan: tanpa batas ini, fetch yang
 *  menggantung akan melempar suspensi ke batas seukuran canvas dan melepas SELURUH aktor
 *  panggung sampai aset tiba. */
const AktorSF26: React.FC<AktorProps> = (props) => {
  const [dekat, setDekat] = useState(false);
  useEffect(() => {
    const target = document.getElementById("chapter-03");
    if (!target) return;
    const io = new IntersectionObserver(
      (daftar) => {
        if (!daftar.some((e) => e.isIntersecting)) return;
        useGLTF.preload(ALAMAT);
        setDekat(true);
        io.disconnect();
      },
      { rootMargin: "60% 0px" }
    );
    io.observe(target);
    return () => io.disconnect();
  }, []);

  if (!dekat) return null;
  return (
    <Suspense fallback={null}>
      <Mobil {...props} />
    </Suspense>
  );
};

/** Motong dan penggaris pixel mobil duduk di objek module-level, sama seperti SAPU_IRIS dan
 *  SILANG_MOBIL: satu kanvas berarti satu mobil, dan menaruh Vector di hasil useMemo akan
 *  membuat setiap penulisan per frame menjadi perubahan nilai hook. Nilainya dibaca shader
 *  lewat material, ditulis oleh useFrame. */
const MASK_MOBIL = { value: new THREE.Vector4(-1, 1, -1, 1) };
const NDC_MOBIL = { value: new THREE.Vector2(2 / 1440, 2 / 900) };

const Mobil: React.FC<AktorProps> = ({ scrollProgressRef, scrollVelocityRef, hoveredProject }) => {
  const { nodes } = useGLTF(ALAMAT);
  const { size, viewport, camera } = useThree();
  const portal = usePortalRegistry();
  const kurangiGerak = useSyncExternalStore(
    dengarKurangiGerak,
    bacaKurangiGerak,
    bacaKurangiGerakSaatSSR
  );

  /** Satu material untuk ketiga bagian: draw call tetap tiga (objeknya yang tiga), dan
   *  uWipe + uMobil SENGAJA objek module-level yang sama dengan yang ditulis usePanggung —
   *  menyalinnya berarti punya dua sapuan yang bisa berbeda satu frame. */
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertexMobil,
        fragmentShader: fragmentMobil,
        uniforms: { uMask: MASK_MOBIL, uNdcPerPx: NDC_MOBIL, uWipe: SAPU_IRIS, uMobil: SILANG_MOBIL },
        transparent: true,
        // Benda padat: tanpa tulisan depth, sisi dalam mobil akan menutupi sisi luarnya.
        depthWrite: true,
      }),
    []
  );

  /** Yang ditulis per frame dipegang lewat REF, bukan lewat hasil useMemo: eslint-plugin
   *  react-hooks melarang mengubah nilai yang dikembalikan hook, dan R3F memang meminta
   *  objek scene graph dipegang begitu. useMemo hanya berisi bacaan — geometry, matriks
   *  dasar, ukuran — yang tidak berubah sejak aset tiba. */
  const grupRef = useRef<THREE.Group>(null);
  const pusingRef = useRef<THREE.Group>(null);
  const perkakas = useRef({
    putar: new THREE.Matrix4(),
    hasil: [new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4()],
  });
  /** InstancedMesh dipasang dengan dispose={null} (lihat JSX), jadi buffer instanceMatrix
   *  miliknyalah yang dilepas di cleanup. Callback ref dipakai supaya objeknya masih bisa
   *  dijangkau saat cleanup jalan, ketika React sudah melepas ref biasa. */
  const roda = useRef<{ ban?: THREE.InstancedMesh; pelek?: THREE.InstancedMesh }>({});

  const sudut = useRef(0);
  const putaran = useRef(0);
  const hidupRef = useRef(false);
  const [terpasang, setTerpasang] = useState(false);

  /** Geometri TIDAK disalin di sini: ia bagian dari cache useGLTF yang dipakai bersama setiap
   *  hover. Yang dihitung hanyalah bacaan yang dibutuhkan pemasangan dan hukum gulir. */
  const aset = useMemo(() => {
    const semua = nodes as unknown as Record<string, THREE.Object3D | undefined>;
    const sasisNode = semua["sasis"] as THREE.Mesh | undefined;
    const rodaNode = semua["roda-LF"] as THREE.Group | undefined;
    const prim = (namaMaterial: string) =>
      rodaNode?.children.find((c) => {
        const mat = (c as THREE.Mesh).material as THREE.Material | THREE.Material[];
        return (Array.isArray(mat) ? mat[0] : mat)?.name === namaMaterial;
      }) as THREE.Mesh | undefined;
    const banNode = prim("ban");
    const pelekNode = prim("pelek");
    if (!sasisNode || !rodaNode || !banNode || !pelekNode) return null;

    // Transform node dibaca dari position/quaternion/scale, bukan dari .matrix: loader tidak
    // pernah memperbarui matriks objek yang tidak di-attach ke scene, jadi membacanya sebelum
    // frame pertama selalu memberi matrix identity.
    const duduk: THREE.Matrix4[] = [];
    const angkat: THREE.Matrix4[] = [];
    for (const nama of NAMA_RODA) {
      const node = semua[nama];
      if (!node) return null;
      duduk.push(
        new THREE.Matrix4().compose(new THREE.Vector3(0, 0, 0), node.quaternion, node.scale)
      );
      angkat.push(
        new THREE.Matrix4().makeTranslation(node.position.x, node.position.y, node.position.z)
      );
    }

    // Empat node roda, satu geometry. duduk = rotasi+skala node, angkat = terjemahannya;
    // keduanya disimpan TERPISAH supaya putaran poros bisa disisipkan di antaranya:
    // M = T(pusat) · Rx(sudut) · (R·S). Digabung jadi satu matriks, rodanya berputar mengorbit
    // titik asal model, bukan pada porosnya sendiri.
    const kotak = new THREE.Box3();
    const tambah = (geom: THREE.BufferGeometry, m: THREE.Matrix4) => {
      if (!geom.boundingBox) geom.computeBoundingBox();
      kotak.union(geom.boundingBox!.clone().applyMatrix4(m));
    };
    const mSasis = new THREE.Matrix4().compose(
      sasisNode.position,
      sasisNode.quaternion,
      sasisNode.scale
    );
    tambah(sasisNode.geometry, mSasis);
    for (let i = 0; i < 4; i++) tambah(banNode.geometry, angkat[i].clone().multiply(duduk[i]));
    const pusat = kotak.getCenter(new THREE.Vector3());
    const radius = kotak.getSize(new THREE.Vector3()).length() / 2;

    // Jari-jari roda dalam ruang model: setengah lingkar pada sumbu yang tegak lurus poros
    // (X), dikali skala node yang mengompensasi kuantisasi posisi. Kelilingnya yang membagi
    // jarak gulir menjadi satu putaran roda. Node belakang hanya berbeda skala pada X, jadi
    // ukuran lingkar roda depan sah untuk keempatnya.
    if (!banNode.geometry.boundingBox) banNode.geometry.computeBoundingBox();
    const lingkaran = banNode.geometry.boundingBox!.getSize(new THREE.Vector3());
    const jari = (Math.max(lingkaran.y, lingkaran.z) / 2) * Math.max(rodaNode.scale.y, rodaNode.scale.z);

    return {
      sasisGeom: sasisNode.geometry,
      banGeom: banNode.geometry,
      pelekGeom: pelekNode.geometry,
      sasisT: sasisNode.position.toArray() as [number, number, number],
      sasisQ: sasisNode.quaternion.toArray() as [number, number, number, number],
      sasisS: sasisNode.scale.toArray() as [number, number, number],
      pusat: pusat.toArray() as [number, number, number],
      radius,
      jari,
      duduk,
      angkat,
    };
  }, [nodes]);

  useEffect(
    () => () => {
      roda.current.ban?.dispose();
      roda.current.pelek?.dispose();
      material.dispose();
    },
    [material]
  );

  useFrame((_, delta) => {
    const p = Math.max(0, Math.min(1, scrollProgressRef.current));
    const k = sikap(p, portal.current);
    if (!k) return;

    const panggil = mobilDipanggil(k.babDari, hoveredProject, kurangiGerak);
    // Lepas HANYA setelah silang habis: usePanggung menulis angka yang sama ke alpha kartu,
    // jadi selama nilainya masih di atas nol ada objek yang harus menutupi tempat itu.
    const hidup = !kurangiGerak && (panggil || SILANG_MOBIL.value > TETAS);
    if (hidup !== hidupRef.current) {
      hidupRef.current = hidup;
      setTerpasang(hidup);
    }
    if (!hidup || !aset) return;

    const grup = grupRef.current;
    const pusing = pusingRef.current;
    const ban = roda.current.ban;
    const pelek = roda.current.pelek;
    if (!grup || !pusing || !ban || !pelek) return;

    const layarX = size.width;
    const layarY = size.height;
    const dpp = viewport.width / layarX;
    const camZ = camera.position.z;
    const pxw = (1 / dpp) * (camZ / (camZ - k.z));

    // Motong pada kotak DOM bab yang sama, dengan hukum yang sama seperti kartu.
    MASK_MOBIL.value.set(
      (k.kotak.kiri / layarX) * 2 - 1,
      ((k.kotak.kiri + k.kotak.lebar) / layarX) * 2 - 1,
      1 - ((k.kotak.atas + k.kotak.tinggi) / layarY) * 2,
      1 - (k.kotak.atas / layarY) * 2
    );
    NDC_MOBIL.value.set(2 / layarX, 2 / layarY);

    const skala =
      (ISI_PORTAL * Math.min(k.kotak.lebar, k.kotak.tinggi)) / (2 * aset.radius * pxw);
    grup.position.set(
      (k.kotak.kiri + k.kotak.lebar / 2 - layarX / 2) / pxw,
      -(k.kotak.atas + k.kotak.tinggi / 2 - layarY / 2) / pxw,
      k.z
    );
    grup.scale.setScalar(skala);
    grup.rotation.z = MIRING;
    pusing.rotation.y = k.rot + PUSAKA;

    // Roda: jarak gulir frame ini dibagi keliling roda. Sama seperti RodaPaddock, velositas
    // tidak pernah dipasang langsung sebagai sudut — sudut DIJUMLAH, supaya tanda gulir
    // menjadi arah jalan dan bukan jarum yang menunjuk.
    const vel = scrollVelocityRef.current;
    const jariPx = aset.jari * skala * pxw;
    if (Math.abs(vel) >= AMBANG) {
      const langkah = (vel / jariPx) * KELILING * Math.min(delta, 0.05);
      sudut.current = (sudut.current + langkah) % KELILING;
      putaran.current += langkah / KELILING;
    }
    perkakas.current.putar.makeRotationX(-sudut.current);
    for (let i = 0; i < 4; i++) {
      const m = perkakas.current.hasil[i];
      m.copy(aset.angkat[i]).multiply(perkakas.current.putar).multiply(aset.duduk[i]);
      ban.setMatrixAt(i, m);
      pelek.setMatrixAt(i, m);
    }
    ban.instanceMatrix.needsUpdate = true;
    pelek.instanceMatrix.needsUpdate = true;

    if (process.env.NODE_ENV !== "production") {
      tulisMobilDebug(SILANG_MOBIL.value, sudut.current, putaran.current, skala, jariPx);
    }
  });

  if (!terpasang || !aset) return null;
  /* dispose={null} di setiap objek: R3F melepas objek BUATAN-nya dengan berjalan ke seluruh
   *  properti dan memanggil dispose() pada masing-masing — termasuk geometry dan material
   *  yang di sini adalah punyanya cache useGLTF. Yang dimiliki aktor ini hanya material dan
   *  dua buffer instanceMatrix, dan keduanya dilepas di cleanup atas. */
  return (
    <group ref={grupRef} scale={0} dispose={null}>
      <group ref={pusingRef} dispose={null}>
        <group
          position={[-aset.pusat[0], -aset.pusat[1], -aset.pusat[2]]}
          dispose={null}
        >
          <mesh
            geometry={aset.sasisGeom}
            material={material}
            position={aset.sasisT}
            quaternion={aset.sasisQ}
            scale={aset.sasisS}
            name="sf26-sasis"
            dispose={null}
          />
          <instancedMesh
            args={[aset.banGeom, material, 4]}
            frustumCulled={false}
            name="sf26-ban"
            dispose={null}
            ref={(obj: THREE.InstancedMesh | null) => {
              if (obj) {
                obj.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
                roda.current.ban = obj;
              }
            }}
          />
          <instancedMesh
            args={[aset.pelekGeom, material, 4]}
            frustumCulled={false}
            name="sf26-pelek"
            dispose={null}
            ref={(obj: THREE.InstancedMesh | null) => {
              if (obj) {
                obj.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
                roda.current.pelek = obj;
              }
            }}
          />
        </group>
      </group>
    </group>
  );
};

export { AktorSF26 };
export default AktorSF26;
