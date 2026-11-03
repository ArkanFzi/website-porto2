"use client";

/** HubFerrari: panggung section akses — SF-26 diparkir di atas alas putar melingkar,
 *  halunya menoleh ke node menu yang sedang ditunjuk pengunjung.
 *
 *  Ini island PanggungKecil, bukan aktor kanvas global: tidak ada registry portal, tidak
 *  ada uMask, tidak ada silang potret→mobil.
 *
 *  Yang ada di sini sekarang: podium karbon yang DUDUK di atas kertas — kanvasnya alpha,
 *  jadi tidak ada kotak hitam di belakangnya — satu cincin hairline dengan tick di tepinya,
 *  trek sirkuit di permukaan alas, penanda rosso yang pindah ke node yang ditunjuk, dan satu
 *  elips kontak yang mengikat ban ke alas. Yang sengaja dibuang bersama kotak hitamnya:
 *  tiga kerucut sorot beserta spotLight-nya, kolam cahaya tempat sorot jatuh, ban cahaya di
 *  keliling alas, lantai kisi sampai horizon, dan vignette. Semua itu bahasa Panggung
 *  Peluncuran — gelap, disinari, dilihat dari kursi — sedangkan halaman ini adalah kertas
 *  Swiss: objek yang tercetak, diterangi, dilihat dari atas meja.
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

/** Kamera panggung, diturunkan dari kotak panggung yang sebenarnya (1180x558 pada 62vh di
 *  viewport 900, aspect dikunci oleh lebar kolom editorial), bukan dari selera:
 *  `docs/verify` memproyeksi lingkaran JARI pada y=0 lewat PerspectiveCamera fov 42 dan
 *  mencari posisi terbesar yang masih memuat elips LABEL (1,16x cincin) dengan marjin >= 40px
 *  di keempat sisinya. [0, 2,15, 5,3] memuatkan cincin 508 px = 43% lebar kolom dan podium
 *  itu terbaca sebagai stempel kecil yang mengambang di kertas; [0, 1,4, 3,6] dengan tatapan
 *  -0,35 memuatkan 801 px = 68% — 1,6x lebih besar — pada kemiringan yang hampir sama (pipih
 *  0,406 vs 0,394, jadi cincin tidak berubah jadi pita) dan marjin 102/77/125 px.
 *  Yang TIDAK bisa dinaikkan: tinggi kotak. Band bebas antara kolom HUD atas dan pita
 *  legibilitas bawah terukur 589 px di viewport 900, kotak 62vh sudah 558 px — jadi satu-satunya
 *  jalan membesarkan panggung adalah mendekatkan kamera, bukan memperlebar kotaknya. */
const KAMERA: [number, number, number] = [0, 1.4, 3.6];
/** Titik tatap kamera. -0,35 (di bawah dek) memiringkan kamera turun dan menggeser cincin naik
 *  di dalam kotak: pusat 52,3% vs 57% pada tatapan -0,2, jadi label bawah dapat marjin 77 px
 *  dan podium duduk di tengah kotak alih-alih menempel di dasarnya. */
const TATAPAN = -0.35;

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
 *  dengan penanda rosso yang aktif. */
const PUTIH_REDUP = new THREE.Color(0x585862);
/** Hairline cincin tepi. Dulu SOROT — putih studio yang satu nama dengan kunci sorot
 *  panggung, dan tanpa sorot garis seterang itu terbaca sebagai neon yang menyala sendiri.
 *  Sekarang warna kertas hangat: di atas alas karbon ia tetap garis paling terang, tapi
 *  jumlahnya terbaca sebagai hairline cetak, bukan lampu. */
const HELAI = new THREE.Color(0xb4b0a8);
/** Biru titanium dingin — rim pemisah siluet. Bukan HELAI yang diulang: yang dibutuhkan
 *  sayap belakang dan ban belakang bukan cahaya, tapi tepi yang BERBEDA WARNA dari latar,
 *  supaya mata memisahkan mobil dari podium. */
const RIM = new THREE.Color(0xd8dee8);
/** Tebal alas panggung. Dulu lantai cuma satu lingkaran datar tanpa sisi — dari kamera
 *  42° yang melihat sedikit dari atas, panggung mewah justru terbaca dari ketebalannya. */
const TEBAL = 0.13;

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
    camera.lookAt(0, TATAPAN, 0);
    camera.updateMatrixWorld();
    invalidate();
  }, [camera, invalidate]);
  return null;
};

/** Tekstur gradien radial pada kanvas 2D: bayangan kontak hitam, digambar normal di atas
 *  alas supaya ban mengikat ke podium. Dibuat sekali saat mount — tidak ada frame yang
 *  menggambar ulangnya. */
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

const SENTUH = () =>
  bikinGradien([
    [0, "rgba(0,0,0,0.85)"],
    [0.55, "rgba(0,0,0,0.35)"],
    [1, "rgba(0,0,0,0)"],
  ]);

/** Satu lineSegments gabungan: hairline cincin tepi + trek PCB di permukaan alas + tick radial
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
    // Cincin tepi: satu hairline setipis mungkin yang masih terbaca di atas karbon,
    // dilengkapi tick radial di bawahnya — bahasa gambar yang sama dengan lingkaran
    // register di halaman cetak, bukan neon yang menyala sendiri.
    lingkaran(JARI, 0, SEG_MELINGKAR, HELAI);
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
      sentuh?.map?.dispose();
      sentuh?.dispose();
    },
    [sentuh]
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
      {/* Alas panggung: silinder pendek. Warnanya dinaikkan dari karbon nyaris hitam ke
          grafit ketika kotak hitam di belakangnya dihapus — di atas kertas, disc 0x151517
          tidak terbaca sebagai podium tapi sebagai lubang di halaman, dan tidak ada
          permukaannya yang terlihat selain pantulan. Roughness ikut dinaikkan: lantai cermin
          memantulkan bianco halaman sebagai satu bidang abu-abu basah, dan rosso directional
          masih meninggalkan blob merahnya di tepi alas. */}
      <mesh name="hub-lantai" position={[0, -TEBAL / 2, 0]}>
        <cylinderGeometry args={[JARI, JARI * 0.982, TEBAL, SEG_MELINGKAR]} />
        <meshStandardMaterial color={0x2f2f34} roughness={0.72} metalness={0.16} />
      </mesh>
      {/* Elips kontak di bawah mobil — lebih panjang sejajar bodi, mengikuti arah parkir.
          Satu-satunya yang mengikat mobil ke kertas sekarang: tanpa sorot dan kolam cahaya,
          tanpa ini podium terlihat mengambang. */}
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
    </>
  );
};

/** Rig lampu menerjemahkan bahasa shader lama ke material bawaan glTF: kunci dari
 *  kiri-atas layar (arah -0,35 0,75 0,6 yang dulu ditulis di fragment) dan satu rosso rim
 *  dari belakang, supaya mobil tidak tiba dengan pencahayaan yang berbeda dari potret.
 *  Tiga sorot panggung yang ikut menerangi sudah dibuang bersama kotak hitamnya, jadi kunci
 *  dan pengisi dinaikkan: yang dilawan siluet sekarang bukan lagi kegelapan di belakangnya,
 *  tapi kertas bianco selebar layar — tanpa itu mobil terbaca sebagai stiker gelap.
 *  Warna tanah hemisphere ikut diganti ke tone kertas: pantulan halaman adalah satu-satunya
 *  cahaya yang datang dari bawah sekarang, dan itu yang membuat podium duduk di kertas,
 *  bukan melayang di atasnya.
 *  Bayangan sengaja tidak dinyalakan: shadow map per mesh dibayar tiap frame di GPU
 *  terintegrasi, dan hukum diam halaman ini tidak mau menanggungnya. */
const Lampu: React.FC = () => (
  <>
    <hemisphereLight args={[0xf7f5f2, 0xd9d5cc, 0.52]} />
    <directionalLight position={[-1.4, 3.0, 2.4]} intensity={1.95} />
    {/* Rosso dari belakang-kanan, tapi LANDAI (y 0,55 terhadap jarak horizontal 4,4).
        Alas memantulkan directional sebagai satu titik cermin: cermin kamera [0, 1,4, 3,6]
        terhadap bidang lantai di (0, -1,4, 3,6), lalu P = cermin + arahLampu *
        (1,4 / arahLampu.y). Pada y 0,9 yang lama P ≈ (1,2, 0, -0,2) — tepat di kanan alas,
        dan blob-nya lebih besar dari rim yang diterima mobil. Terukur: kotak kanan-alas
        turun dari RGB(198,28,39) ke RGB(26,24,24) saat lampu ini dimatikan, sementara
        spotLight rosso dan kerucutnya (keduanya sudah dibuang) terbukti nol pengaruhnya.
        Dengan y 0,55 P terdorong ke (6,62, 0, -5,56) — radius 8,65, jauh keluar JARI 1,9 —
        jadi tidak ada blob yang ikut membesar saat kamera didekatkan; yang tersisa di lantai
        cuma sheen lebar, dan mobil tetap dapat sapuan rosso — sudut raking justru yang
        membuat rim. */}
    <directionalLight position={[2.6, 0.55, -3.6]} intensity={0.9} color={MERAH} />
    {/* Rim dingin dari belakang-atas. Dulu tugasnya memisahkan sayap dan ban dari latar yang
        sama-sama hitam; setelah kotaknya dihapus latar itu kertas terang, jadi yang dituntut
        dari lampu ini bukan lagi keterbacaan siluet melainkan warna — satu tepi dingin di
        bodi yang gelap supaya mobil tidak terlihat seperti potongan hitam. Arahnya tetap
        curam (y 4,5 terhadap jarak horizontal 3,2) karena satu alasan yang masih berlaku:
        directional yang tinggi menaruh titik cerminnya DI LUAR podium (L ternormalisasi
        ≈ (-0,07 0,81 -0,58), P = cermin kamera + (1,4/0,81)·L ≈ (-0,12, 0, 2,60),
        |P| 2,61 > JARI 1,9), jadi tidak ada blob terang di atas alas — termasuk setelah
        kamera didekatkan, yang memperkecil margin ini dari 3,77 ke 2,61; dan diffuse-nya ke
        lantai tetap hitungan kecil karena albedo alas 0x2f2f34 ≈ 0,026 linier. */}
    <directionalLight position={[-0.4, 4.5, -3.2]} intensity={1.15} color={RIM} />
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
    kamera={KAMERA}
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
