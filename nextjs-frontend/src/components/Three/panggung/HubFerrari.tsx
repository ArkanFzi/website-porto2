"use client";

/** HubFerrari: panggung section akses — SF-26 diparkir di atas alas putar melingkar,
 *  halunya menoleh ke node menu yang sedang ditunjuk pengunjung.
 *
 *  Ini island PanggungKecil, bukan aktor kanvas global: tidak ada registry portal, tidak
 *  ada uMask, tidak ada silang potret→mobil.
 *
 *  Yang membuatnya panggung peluncuran, bukan mobil di atas kertas gelap: alas silinder
 *  yang punya ketebalan, cincin neon di tepinya lengkap dengan halo dan ban cahaya di
 *  keliling bawah, trek PCB yang disiku di permukaan alas, lantai kisi yang terus ke
 *  horizon, tiga sorot (kerucut kabut + spotLight sungguhan pada posisi yang sama) yang
 *  bertemu di dada mobil, satu kolam cahaya tempat sorot jatuh, dan satu elips kontak yang
 *  mengikat ban ke alas. Latar belakangnya gradien radial di CSS — nol draw call, dan tepi
 *  kotak tetap kotak.
 *
 *  Warna body datang dari file, bukan dari shader: sf26-livery.glb membawa baseColor +
 *  normal map per material, jadi scene-nya dirender apa adanya dengan MeshStandardMaterial
 *  bawaan glTF. Yang tersisa di kode ini hanya rig lampunya — kunci dari kiri-atas layar
 *  dan satu sapuan rosso dari belakang, bahasa lighting yang sama dengan AktorSF26, supaya
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

/** Aset hub: SF-26 dengan livery aslinya (baseColor + normal per material), hasil
 *  `gltf-transform optimize --simplify --compress meshopt --join --texture-compress webp
 *  --texture-size 512`: 31,23 MB → 1,76 MB, 272.038 → 93.980 segitiga, 32 draw call.
 *  sf26.glb yang lama tetap dipakai AktorSF26: model ini tidak punya node roda terpisah
 *  (keempat ban dibake jadi satu mesh), jadi gulir roda bab 03 tidak bisa diturunkan dari sini.
 *  Kredit CC-BY-4.0 ikut di samping file (sf26-livery-LICENSE.txt) dan ditagih di halaman. */
const ALAMAT = "/models/sf26-livery.glb";

/** Jari-jari platform dalam satuan dunia. Cincin, garis sirkuit, dan ukuran mobil
 *  semuanya diukur dari angka yang sama. */
const JARI = 1.9;
/** Pecahan JARI yang boleh diisi bola batas mobil — sisanya ruang visual cincin.
 *  0,62 terlihat aman sampai hidungnya diuji terhadap POLIGON cincin yang diproyeksi, bukan
 *  terhadap radiusnya: tiga sudut rendah bodi (wing/floorboard) jatuh di luar busur dekat
 *  kamera dan itu tidak hilang dengan mengubah aspect atau mundurkan kamera (fov vertikal
 *  membuat selisihnya konstan ~18% di 1140x558, 1400x720, dan 1900x720). Batas geometrisnya
 *  0,58 — tepat nol titik di luar cincin — dan 0,55 duduk sedikit di bawahnya supaya ada
 *  margin ruang, bukan sekadar "tidak menyentuh garis". */
const ISI = 0.55;
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
const GELAP = new THREE.Color(0x141416);
/** Abu trek PCB: cukup untuk dibaca sebagai jalur, cukup redup untuk tidak bersaing
 *  dengan cincin neon dan penanda rosso yang aktif. */
const PUTIH_REDUP = new THREE.Color(0x585862);
/** Putih studio hangat: kunci sorot panggung, kontras dengan rosso yang datang miring. */
const SOROT = new THREE.Color(0xf2efe9);
/** Biru titanium dingin — rim pemisah siluet. Bukan SOROT yang diulang: yang dibutuhkan
 *  sayap belakang dan ban belakang bukan cahaya, tapi tepi yang BERBEDA WARNA dari latar
 *  hitam, supaya mata memisahkan mobil dari kanvas. */
const RIM = new THREE.Color(0xd8dee8);
/** Tebal alas panggung. Dulu lantai cuma satu lingkaran datar tanpa sisi — dari kamera
 *  42° yang melihat sedikit dari atas, panggung mewah justru terbaca dari ketebalannya. */
const TEBAL = 0.13;
/** Titik temu semua sorot: dada mobil, bukan titik (0,0,0) — kalau halunya jatuh ke
 *  lantai, kerucutnya terlihat menyorot lantai dan mobilnya tetap gelap. */
const SASARAN: [number, number, number] = [0, 0.3, 0];

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

/** Tekstur gradien radial pada kanvas 2D: dipakai dua kali, sebagai kolam cahaya putih
 *  (aditif, tempat sorot jatuh) dan sebagai bayangan kontak hitam (normal, mengikat mobil
 *  ke alas). Dibuat sekali saat mount — tidak ada frame yang menggambar ulangnya. */
const bikinGradien = (berhenti: [number, string][]) => {
  const k = document.createElement("canvas");
  k.width = k.height = 256;
  const ctx = k.getContext("2d");
  if (!ctx) return null;
  const g = ctx.createRadialGradient(128, 128, 6, 128, 128, 128);
  for (const [t, warna] of berhenti) g.addColorStop(t, warna);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(k);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

const KOLAM = () =>
  bikinGradien([
    [0, "rgba(255,252,246,0.5)"],
    [0.42, "rgba(214,206,192,0.14)"],
    [0.88, "rgba(240,238,232,0.03)"],
    // Puncak halo mepet ke dalam garis cincin (0,96 × JARI*1,02 ≈ JARI): neon di referensi
    // punya tumpah, tapi pita selebar ini di luar tepi alas terbaca sebagai gelembung kaca.
    [0.96, "rgba(255,253,248,0.9)"],
    [1, "rgba(255,253,248,0)"],
  ]);

const SENTUH = () =>
  bikinGradien([
    [0, "rgba(0,0,0,0.85)"],
    [0.55, "rgba(0,0,0,0.35)"],
    [1, "rgba(0,0,0,0)"],
  ]);

const ATAS_KERUCUT = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vLihat;
void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vLihat = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

/* Kabut cahaya, bukan toples kaca: terang di sumber, padam menuju alas, dan tepiannya
 * ditebalkan lewat siluet (jalur pandang terpanjang justru di tepi kerucut). */
const BAWAH_KERUCUT = /* glsl */ `
uniform vec3 warna;
uniform float kuat;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vLihat;
void main() {
  // vUv.y = 1 di titik lampu, 0 di alas. Sorot panggung justru paling dibutuhkan di ujung
  // yang jauh dari lampu: batang yang padam sebelum menyentuh mobil terbaca sebagai coretan,
  // bukan sorotan — jadi tepinya cuma diturunkan, tidak dihapus.
  float sepanjang = mix(0.55, 1.0, clamp(vUv.y, 0.0, 1.0));
  float siluet = 1.0 - abs(dot(normalize(vNormal), normalize(vLihat)));
  float kabut = mix(0.5, 1.0, pow(clamp(siluet, 0.0, 1.0), 1.4));
  float a = sepanjang * kabut * kuat;
  gl_FragColor = vec4(warna * a, a);
}
`;

const SUMBU_BAWAH = new THREE.Vector3(0, -1, 0);

/** Satu sorot: kerucut terbuka 28 segmen + spotLight sungguhan pada posisi yang sama,
 *  supaya yang terlihat kena lampu memang kena — kerucut alone cuma menggambar kabut.
 *  `berkas` dan `terang` dipisah: yang pertama mengatur tebal kabut di layar, yang kedua
 *  berapa banyak cahaya yang benar-benar mendarat di lantai. Digabung jadi satu angka,
 *  sorot rosso yang cukup untuk dilihat ternyata membanjiri separuh panggung.
 *  Arah dihitung sekali dari titik lampu ke SASARAN; tidak ada useFrame di sini.
 *  Kerucut cahaya TIDAK diberi sudut sendiri: lebarnya diturunkan dari radius dan panjang
 *  berkas yang memang digambar, supaya kolam cahaya di lantai tidak bisa lebih lebar dari
 *  sorot yang terlihat menuju ke sana. */
const Sorot: React.FC<{
  nama: string;
  dari: [number, number, number];
  warna: THREE.Color;
  radius: number;
  berkas: number;
  terang: number;
}> = ({ nama, dari, warna, radius, berkas, terang }) => {
  const bangun = useMemo(() => {
    const asal = new THREE.Vector3(dari[0], dari[1], dari[2]);
    const arah = new THREE.Vector3(SASARAN[0], SASARAN[1], SASARAN[2]).sub(asal);
    const panjang = arah.length();
    const q = new THREE.Quaternion().setFromUnitVectors(SUMBU_BAWAH, arah.normalize());
    // Setengah sudut berkas, sedikit dilebarkan: penumbra yang melunakkan tepinya.
    const sudut = Math.atan(radius / panjang) * 1.35;
    return { asal, panjang, q, sudut };
  }, [dari, radius]);

  const geometri = useMemo(() => {
    const g = new THREE.ConeGeometry(radius, bangun.panjang, 28, 1, true);
    // Puncak kerucut ada di +tinggi/2; digeser supaya tepat di titik lampu dan tubuhnya
    // memanjang sepanjang -Y sebelum diputar ke arah sasaran.
    g.translate(0, -bangun.panjang / 2, 0);
    return g;
  }, [bangun, radius]);

  const bahan = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { warna: { value: warna }, kuat: { value: berkas } },
        vertexShader: ATAS_KERUCUT,
        fragmentShader: BAWAH_KERUCUT,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [warna, berkas]
  );

  useEffect(
    () => () => {
      geometri.dispose();
      bahan.dispose();
    },
    [geometri, bahan]
  );

  return (
    <>
      <spotLight
        position={dari}
        angle={bangun.sudut}
        penumbra={0.85}
        intensity={terang}
        distance={bangun.panjang * 2.2}
        color={warna}
      />
      <group position={bangun.asal.toArray()} quaternion={bangun.q}>
        {/* Nama duduk di mesh-nya, bukan di grup: sensus PengukurRender hanya mencatat
            objek yang digambar, dan grup pembawa rotasi tidak pernah ikut digambar. */}
        <mesh name={nama} geometry={geometri} material={bahan} raycast={() => null} />
      </group>
    </>
  );
};

/** Tiga lampu sorot panggung: kunci putih dari kiri-atas, rosso menyilang dari kanan
 *  belakang, dan satu pengisi lembut dari depan. Posisi dipakai bersama oleh kerucut dan
 *  spotLight-nya, jadi tidak ada dua sumber kebenaran tentang dari mana cahaya datang.
 *  Titik lampunya sengaja duduk di y 2,6–2,9 — di atas tepi frame: kamera di [0, 1.7, 3.9]
 *  dengan fov 42 hanya memperlihatkan sampai y ≈ 1,7 pada bidang fokus (tan 21° × jarak 4,21),
 *  jadi yang masuk layar adalah batang cahayanya, persis seperti sorot panggung peluncuran
 *  yang menyorot dari luar bidikan kamera. */
const SOROTAN: {
  nama: string;
  dari: [number, number, number];
  warna: THREE.Color;
  radius: number;
  berkas: number;
  terang: number;
}[] = [
  { nama: "hub-sorot-kunci", dari: [-3.1, 2.8, 1.9], warna: SOROT, radius: 0.8, berkas: 0.36, terang: 52 },
  // Rosso sengaja tipis terang: berkasnya yang harus terlihat, bukan lantainya yang harus
  // merah — lantai sudah mengilap dan langsung menangkap setiap lampu yang mengarah ke sana.
  { nama: "hub-sorot-rosso", dari: [3.2, 2.6, -1.5], warna: MERAH, radius: 0.6, berkas: 0.32, terang: 2 },
  { nama: "hub-sorot-isi", dari: [0.4, 2.9, -2.7], warna: SOROT, radius: 0.9, berkas: 0.22, terang: 16 },
];

/** Lantai kisi di kejauhan. Yang membuat referensi terasa "showroom" bukan hanya podiumnya,
 *  tapi fakta bahwa podium itu berdiri di atas lantai yang terus ke horizon. Digambar aditif
 *  dengan garis yang melebar mengikuti jarak (fwidth) supaya tidak berkedip, dan dimatikan
 *  sendiri sebelum radius 11 — jadi tidak pernah menutupi cincin atau menabrak vignette. */
const ATAS_KISI = /* glsl */ `
varying vec2 vDatar;
void main() {
  vec4 dunia = modelMatrix * vec4(position, 1.0);
  vDatar = dunia.xz;
  gl_Position = projectionMatrix * viewMatrix * dunia;
}
`;

const BAWAH_KISI = /* glsl */ `
varying vec2 vDatar;
float kisi(vec2 p, float langkah) {
  vec2 q = p / langkah;
  vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q);
  return 1.0 - min(min(g.x, g.y), 1.0);
}
void main() {
  float jauh = 1.0 - smoothstep(2.6, 11.0, length(vDatar));
  float a = kisi(vDatar, 1.0) * 0.42 * jauh;
  gl_FragColor = vec4(vec3(0.6, 0.62, 0.68) * a, a);
}
`;

const Kisi: React.FC = () => {
  const bahan = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: ATAS_KISI,
        fragmentShader: BAWAH_KISI,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );
  useEffect(() => () => bahan.dispose(), [bahan]);
  return (
    <mesh
      name="hub-kisi"
      rotation-x={-Math.PI / 2}
      position={[0, -TEBAL - 0.002, 0]}
      material={bahan}
      raycast={() => null}
    >
      <planeGeometry args={[26, 26]} />
    </mesh>
  );
};

/** Satu lineSegments gabungan: cincin neon tepi + trek PCB di permukaan alas + tick radial
 *  + penanda rosso dua vertex yang pindah ke sudut node aktif. Warna per vertex, pola yang
 *  sama dengan buffer gabungan /sangkar — satu objek, satu draw call, satu tempat untuk
 *  menagih. Semua trek ditulis lewat tulis() SEBELUM dua vertex penanda dialokasikan di
 *  ujung buffer, jadi jumlah segmennya bebas berubah tanpa menyentuh useFrame. */
const SEG_MELINGKAR = 72;
const RADIAL = 12;
const JEJAK = 14;

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
    // Cincin tepi: penuh, putih terang — garis yang dibaca sebagai "panggung", dan satu-
    // satunya yang membuat alas terbaca sebagai neon, bukan sebagai lingkaran abu-abu.
    lingkaran(JARI, 0, SEG_MELINGKAR, SOROT);
    // Trek PCB: radial dengan dua siku, tiap trek keempat rosso, tiap ujungnya dikasih
    // simpul. Dua orbit penuh yang lama dibuang — di referensi yang mengelilingi mobil
    // bukan lingkaran hiasan melainkan jalur yang belok dan berhenti.
    const kutub = (r: number, a: number): [number, number] => [Math.cos(a) * r, Math.sin(a) * r];
    const garis = (poin: [number, number][], c: THREE.Color) => {
      for (let i = 0; i < poin.length - 1; i++) {
        tulis(poin[i][0], 0.0015, poin[i][1], c);
        tulis(poin[i + 1][0], 0.0015, poin[i + 1][1], c);
      }
    };
    for (let i = 0; i < JEJAK; i++) {
      const a = (i / JEJAK) * Math.PI * 2 + 0.13;
      const c = i % 4 === 0 ? MERAH : PUTIH_REDUP;
      const arah = i % 2 === 0 ? 1 : -1;
      const siku = 0.1 + (i % 3) * 0.05;
      const dalam = JARI * (0.2 + (i % 3) * 0.04);
      garis(
        [
          kutub(dalam, a),
          kutub(JARI * 0.52, a),
          kutub(JARI * 0.68, a + arah * siku),
          kutub(JARI * 0.84, a + arah * siku),
          kutub(JARI * 0.93, a),
        ],
        c
      );
      const [sx, sz] = kutub(JARI * 0.93, a);
      garis([[sx - 0.028, sz], [sx + 0.028, sz]], c);
      garis([[sx, sz - 0.028], [sx, sz + 0.028]], c);
    }
    // Radial rosso pendek di tepi: patahan garis sirkuit reference, diwakili tick.
    for (let i = 0; i < RADIAL; i++) {
      const a = (i / RADIAL) * Math.PI * 2;
      const c = i % 3 === 0 ? MERAH : PUTIH_REDUP;
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

  const kolam = useMemo(() => {
    const tekstur = KOLAM();
    if (!tekstur) return null;
    return new THREE.MeshBasicMaterial({
      map: tekstur,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.6,
    });
  }, []);

  // Bayangan kontak, bukan shadow map: satu gradien hitam yang digambar normal di atas
  // alas. Tanpa ini mobil terlihat mengambang di atas panggung glossy — dan shadow map per
  // mesh dibayar tiap frame di GPU terintegrasi, yang tidak mau ditanggung hukum diam.
  const sentuh = useMemo(() => {
    const tekstur = SENTUH();
    if (!tekstur) return null;
    return new THREE.MeshBasicMaterial({
      map: tekstur,
      transparent: true,
      depthWrite: false,
      opacity: 0.75,
    });
  }, []);

  useEffect(
    () => () => {
      kolam?.map?.dispose();
      kolam?.dispose();
      sentuh?.map?.dispose();
      sentuh?.dispose();
    },
    [kolam, sentuh]
  );

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
      <Kisi />
      {/* Alas panggung: dulu satu lingkaran datar tanpa sisi, sekarang silinder pendek
          dengan lacquer gelap — dari kamera 42° yang melihat sedikit dari atas, panggung
          terbaca sebagai benda yang punya ketebalan. Mengilap seperti karbon showroom, tapi
          roughness-nya tidak boleh lebih licin dari ini: lantai cermin memantulkan rosso
          directional sebagai satu blob merah selebar separuh alas, dan yang tersisa dari
          referensi cuma lingkaran hitam. */}
      <mesh name="hub-lantai" position={[0, -TEBAL / 2, 0]}>
        <cylinderGeometry args={[JARI, JARI * 0.982, TEBAL, SEG_MELINGKAR]} />
        <meshStandardMaterial color={0x0e0e11} roughness={0.38} metalness={0.45} />
      </mesh>
      {/* Ban cahaya di keliling alas: yang di referensi membuat panggung terbaca sebagai
          benda yang MENYALA, bukan sebagai lingkaran yang diberi warna. */}
      <mesh name="hub-girang" rotation-x={-Math.PI / 2} position={[0, -TEBAL * 0.66, 0]}>
        <torusGeometry args={[JARI * 0.992, 0.014, 6, 96]} />
        <meshBasicMaterial
          color={SOROT}
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* Tempat sorot jatuh + halo cincin: gradien radial aditif di atas alas. Radiusnya
          sedikit melebihi JARI supaya puncak halo 0,96 jatuh tepat di garis cincin. */}
      {kolam && (
        <mesh
          name="hub-kolam"
          rotation-x={-Math.PI / 2}
          position={[0, 0.002, 0]}
          renderOrder={2}
          raycast={() => null}
        >
          <circleGeometry args={[JARI * 1.02, SEG_MELINGKAR]} />
          <primitive object={kolam} attach="material" />
        </mesh>
      )}
      {/* Elips kontak di bawah mobil — lebih panjang sejajar bodi, mengikuti arah parkir. */}
      {sentuh && (
        <mesh
          name="hub-bayang"
          rotation-x={-Math.PI / 2}
          position={[0, 0.0035, 0]}
          scale={[1.5, 1, 0.85]}
          renderOrder={3}
          raycast={() => null}
        >
          <circleGeometry args={[JARI * 0.34, 48]} />
          <primitive object={sentuh} attach="material" />
        </mesh>
      )}
      <lineSegments name="hub-sirkuit" geometry={geometri.geometry} renderOrder={1}>
        <lineBasicMaterial vertexColors transparent opacity={0.9} depthWrite={false} />
      </lineSegments>
      {SOROTAN.map((s) => (
        <Sorot key={s.nama} {...s} />
      ))}
    </>
  );
};

/** Rig lampu menerjemahkan bahasa shader lama ke material bawaan glTF: kunci dari
 *  kiri-atas layar (arah -0,35 0,75 0,6 yang dulu ditulis di fragment) dan satu rosso rim
 *  dari belakang, supaya mobil tidak tiba dengan pencahayaan yang berbeda dari potret.
 *  Intensitasnya diturunkan saat tiga sorot panggung di Platform ikut menyala: tanpa itu
 *  mobil hanya jadi lebih terang, bukan tersorot — yang menjual panggung adalah kontras
 *  antara hotspot dan sisa lantai yang gelap.
 *  Bayangan sengaja tidak dinyalakan: shadow map per mesh dibayar tiap frame di GPU
 *  terintegrasi, dan hukum diam halaman ini tidak mau menanggungnya. */
const Lampu: React.FC = () => (
  <>
    <hemisphereLight args={[0xf7f5f2, 0x0c0c0e, 0.34]} />
    <directionalLight position={[-1.4, 3.0, 2.4]} intensity={1.5} />
    {/* Rosso dari belakang-kanan, tapi LANDAI (y 0,55 terhadap jarak horizontal 4,4).
        Lantai glossy memantulkan directional sebagai satu titik cermin: cermin kamera
        [0, 1.7, 3.9] terhadap bidang lantai di (0, -1.7, 3.9), lalu P = cermin + arahLampu *
        (1,7 / arahLampu.y). Pada y 0,9 yang lama P ≈ (1,2, 0, -0,2) — tepat di kanan alas,
        dan blob-nya lebih besar dari rim yang diterima mobil. Terukur: kotak kanan-alas
        turun dari RGB(198,28,39) ke RGB(26,24,24) saat lampu ini dimatikan, sementara
        spotLight rosso dan kerucutnya masing-masing terbukti nol pengaruhnya. Dengan y 0,55
        P terdorong ke (8, 0, -7,2), keluar dari podium; yang tersisa di lantai cuma sheen
        lebar, dan mobil tetap dapat sapuan rosso — sudut raking justru yang membuat rim. */}
    <directionalLight position={[2.6, 0.55, -3.6]} intensity={0.9} color={MERAH} />
    {/* Rim dingin dari belakang-atas: sayap belakang dan ban kiri-belum tenggelam ke latar
        karena keduanya gelap DAN di belakangnya gelap. Arahnya sengaja curam (y 4,5
        terhadap jarak horizontal 3,2) — dua alasan yang sama: directional yang tinggi
        menaruh titik cerminnya DI LUAR podium (L ternormalisasi ≈ (-0,07 0,81 -0,58),
        P = cermin kamera + (1,7/0,81)·L ≈ (-0,15, 0, 2,69), |P| 2,69 > JARI 1,9), jadi
        blob rosso yang dulu tidak punya kesempatan terulang; dan diffuse-nya ke lantai
        tetap hitungan kecil karena albedo alas 0x0e0e11 ≈ 0,0045 linier. */}
    <directionalLight position={[-0.4, 4.5, -3.2]} intensity={1.4} color={RIM} />
  </>
);

const Mobil: React.FC<{ sudut: number[]; node: number | null }> = ({ sudut, node }) => {
  const { scene } = useGLTF(ALAMAT);
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

  /** Susunan dibaca sekali dari scene hasil parse. Model livery tidak punya nama semantik —
   *  33 node-nya Object_0…31 dan keempat ban dibake jadi satu mesh — jadi tidak ada lagi
   *  pencarian "sasis"/"roda-LF": kotak batas gabungan semua mesh yang menentukan skala dan
   *  tinggi duduk. Sumbu sudah benar di dalam file (node mesh membawa rotasi +90° pada X,
   *  koreksi Z-up→Y-up dari alat ekspor), jadi PARKED dan NOSE lama tetap dipakai dan tetap
   *  ditagih lewat screenshot, bukan diasumsikan. */
  const susun = useMemo(() => {
    const kotak = new THREE.Box3();
    const sementara = new THREE.Box3();
    let jumlah = 0;
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      jumlah++;
      m.updateWorldMatrix(true, false);
      kotak.union(sementara.setFromObject(m));
    });
    if (!jumlah) return null;
    const pusat = kotak.getCenter(new THREE.Vector3());
    const radius = kotak.getSize(new THREE.Vector3()).length() / 2;
    return { pusat, bawah: kotak.min.y, skala: (JARI * ISI) / radius, jumlah };
  }, [scene]);

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
   * offset grup luar; grup dalam hanya memusatkan bola batas ke poros yaw. Scene-nya
   * sendiri dipakai apa adanya — material, tekstur, dan rotasi koreksi sumbu sudah benar
   * dari file, jadi tidak ada lagi penataan per mesh seperti di sf26.glb. */
  return (
    <>
      <Lampu />
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
          <primitive object={scene} />
        </group>
      </group>
    </>
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
  <PanggungKecil
    className="w-full h-full"
    kamera={[0, 1.7, 3.9]}
    fov={42}
    aktif={terlihat}
    pengukurId="hub"
  >
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
