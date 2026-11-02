"use client";

/** Mesin panggung: mengubah satu angka gulir menjadi posisi, sikap, dan uniform
 *  kartu potret setiap frame. Dipisah dari komponen supaya objek 3D baru cukup
 *  mengimpor hook ini (atau menulis mesinnya sendiri) tanpa menyalin shader. */
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import audioEngine from "@/lib/audioEngine";
import {
  DURASI,
  bacaKurangiGerak,
  bacaKurangiGerakSaatSSR,
  dengarKurangiGerak,
} from "@/lib/motion";
import { bacaTarget, bacaFokusKartu, laporKotakKartu } from "@/lib/putaran";

import type { PortfolioMode } from "@/context/PortfolioModeContext";
import {
  buatUniformPanggung,
  RASIO_POTRET,
  SAPU_IRIS,
  SILANG_MOBIL,
} from "./chiaroscuroMaterial";
import { sikap, mobilDipanggil, type Sikap } from "./koreografi";
import {
  tulisParalaksTipografi,
  useParalaksTipografi,
} from "./useParalaksTipografi";
import { usePortalRegistry, type PortalKotak } from "./usePortalRegistry";

/** Lebar kartu agar mengisi portal: dibatasi lebar portal, kecuali portalnya lebih
 *  tinggi daripada rasio potret. */
const muat = (kotak: PortalKotak) => Math.min(kotak.lebar, kotak.tinggi / RASIO_POTRET);

/** Besarnya dolly kamera saat gulir paling cepat, DERAJAT fov. Batas satu derajat bukan
 *  rasa-rasa: di atas itu kartu visibly lepas dari kotak DOM yang memotongnya dan
 *  gerakannya terbaca sebagai zoom, bukan sebagai dorongan pendek. */
const DOLLY_DERAJAT = 1;

/** Velositas Lenis (pixel per frame) yang sudah memeroleh dolly penuh. */
const KECEPATAN_PENUH = 25;

/** Konstanta waktu pegas dolly, detik. */
const TAU_DOLLY = 0.14;

/** Setengah lebar inti sapuan, dalam t koreografi. Di dalam inti ini kartu tertutup
 *  habis. */
const SAPUAN_INTI = 0.08;

/** Lebar rampa pembuka di luar inti, dalam t yang sama. Jadi sapuan hanya ada di
 *  t 0,24–0,76 dan selebihnya kartu terbuka penuh: pita koreografi bisa 400–700 pixel
 *  gulir lebar, dan potret yang hilang sepanjang itu terbaca sebagai gangguan, bukan
 *  sebagai perpindahan. */
const SAPUAN_RAMPA = 0.18;

/** Bentuk window.__panggung — dibaca verifier, tidak pernah dipakai kode produksi. */
export interface PembacaanPanggung {
  p: number;
  babDari: number;
  babKe: number;
  t: number;
  x: number;
  y: number;
  z: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  skala: number;
  mask: [number, number, number, number];
  portal: [number, number, number, number];
  /** Rotasi yang DIPERINTAHKAN pengunjung, terpisah dari sikap koreografi:
   *  [terpasangX, terpasangY, targetX, targetY] radian. Verifier interaksi membacanya
   *  karena rotY total juga mengandung parallax pointer. */
  putar: [number, number, number, number];
  /** Jejak pointer: [jumlah sampel hidup, rentang terjauh antar sampel dalam UV]. */
  jejak: [number, number];
  /** Sisa flip MODE (1 → 0) dan silang wajah yang sedang berlaku (0 engineer, 1 creator). */
  balik: number;
  persona: number;
  /** Reticle kartu: [u, v, dipegang (0|1), reveal]. u,v = titik cahaya pada UV kartu. */
  kursor: [number, number, number, number];
  /** Penyimpangan fov kamera dari dasarnya, derajat bertanda. Gerbang verifier menuntut
   *  |nilai ini| tidak pernah melewati DOLLY_DERAJAT dan kembali ke nol setelah gulir. */
  dolly: number;
  /** [fov hidup, jarak kamera ke titik asal]. Verifier memakai dua angka ini untuk
   *  mengubah world→NDC sendiri, jadi klaim "kartu duduk di tengah kotaknya" bisa diuji
   *  tanpa menelan kalibrasi yang sedang diuji. */
  kamera: [number, number];
  /** Iris potong pada kotak portal: 0 = terbuka penuh, 1 = tertutup habis. Hanya bukan
   *  nol selama kartu benar-benar berpindah bab. */
  wipe: number;
  /** Silang potret→mobil: 0 kartu penuh, 1 mobil punya tempatnya. AktorSF26 memakai
   *  angka yang sama untuk alpha-nya, jadi verifier membandingkan dua objek dari satu
   *  sumber. */
  mobil: number;
}

const bundar = (n: number) => Math.round(n * 1e4) / 1e4;

/** Bacaan yang hanya ada untuk verifier; sisanya adalah sikap kartu yang juga dibaca
 *  shader. Dikumpulkan dalam satu objek supaya daftar posisi tidak terus memanjang. */
interface BacaanTambahan {
  putar: [number, number, number, number];
  jejak: [number, number];
  balik: number;
  persona: number;
  kursor: [number, number, number, number];
  dolly: number;
  kamera: [number, number];
  wipe: number;
  mobil: number;
}

const tulisPanggungDebug = (
  mesh: THREE.Mesh,
  mask: THREE.Vector4,
  p: number,
  k: Sikap,
  kotak: PortalKotak,
  tambahan: BacaanTambahan
) => {
  const { putar, jejak, balik, persona, kursor, dolly, kamera, wipe, mobil } = tambahan;
  const jendela = window as unknown as { __panggung?: PembacaanPanggung };
  jendela.__panggung = {
    p: bundar(p),
    babDari: k.babDari,
    babKe: k.babKe,
    t: bundar(k.t),
    x: bundar(mesh.position.x),
    y: bundar(mesh.position.y),
    z: bundar(mesh.position.z),
    rotX: bundar(mesh.rotation.x),
    rotY: bundar(mesh.rotation.y),
    rotZ: bundar(mesh.rotation.z),
    skala: bundar(mesh.scale.x),
    mask: [bundar(mask.x), bundar(mask.y), bundar(mask.z), bundar(mask.w)],
    portal: [bundar(kotak.kiri), bundar(kotak.atas), bundar(kotak.lebar), bundar(kotak.tinggi)],
    putar: putar.map(bundar) as [number, number, number, number],
    jejak,
    balik: bundar(balik),
    persona: bundar(persona),
    kursor: kursor.map(bundar) as [number, number, number, number],
    dolly: bundar(dolly),
    kamera: kamera.map(bundar) as [number, number],
    wipe: bundar(wipe),
    mobil: bundar(mobil),
  };
};


export interface PanggungProps {
  scrollProgressRef: React.RefObject<number>; // 0 to 1 from Lenis
  scrollVelocityRef: React.RefObject<number>;
  hoveredProject: number | null;
  mode: PortfolioMode;
  wireframe: boolean;
}

export const usePanggung = (texture: THREE.Texture, props: PanggungProps) => {
  const { scrollProgressRef, scrollVelocityRef, hoveredProject, mode, wireframe } = props;
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { size, camera, invalidate } = useThree();
  /** fov sebelum panggung menyentuh kamera, ditangkap pada effect mount. Kalibrasi
   *  pixel→world diturunkan dari angka ini, bukan dari camera.fov yang sedang berjalan,
   *  karena r3f hanya menghitung ulang viewport saat OBJEK kamera diganti — perubahan
   *  fov dari dolly tidak pernah terlihat di sana. */
  const fovDasar = useRef(0);
  const lensaRef = useRef<THREE.PerspectiveCamera | null>(null);
  const portal = usePortalRegistry();
  const kurangiGerak = useSyncExternalStore(
    dengarKurangiGerak,
    bacaKurangiGerak,
    bacaKurangiGerakSaatSSR
  );
  const uniforms = useMemo(() => buatUniformPanggung(texture), [texture]);
  /** Simpul tipografi yang boleh bergeser bersama kartu (lihat useParalaksTipografi). */
  const tipografi = useParalaksTipografi();

  const mouse = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, aktif: false });
  const proyeksi = useRef({
    ray: new THREE.Raycaster(),
    bidang: new THREE.Plane(),
    normal: new THREE.Vector3(),
    titik: new THREE.Vector3(),
    pusat: new THREE.Vector3(),
    ndc: new THREE.Vector2(),
    /** UV pointer pada bidang kartu, dan apakah pointer memang sedang di dalam jendela.
     *  Keduanya ditulis terus setiap frame meski reticle dipegang, supaya saat fokus
     *  dilepas cahaya langsung pulang ke posisi pointer yang sebenarnya. */
    uv: new THREE.Vector2(0.5, 0.5),
    diLayar: false,
  });

  const prevMode = useRef(mode);
  /** Sisa flip pergantian MODE: 1 = baru diperintahkan, 0 = kartu sudah utuh lagi. */
  const balik = useRef(0);
  /** uPersona saat flip dimulai — silang wajah dihitung dari sini, bukan dari 0/1. */
  const personaMulai = useRef(0);
  /** Rotasi hasil easing menuju sudut yang diperintahkan pengunjung (seret/panah). */
  const pusing = useRef({ x: 0, y: 0 });
  /** Sikap yaw/pitch hasil koreografi SEBELUM rotasi pengunjung. Ditulis terpisah karena
   *  lerp di bawah membaca nilai terakhir mesh: bila offset putaran ikut tertinggal di
   *  mesh.rotation, ia terakumulasi lintas frame (terukur 12x dari perintahnya). */
  const dasar = useRef({ rotY: 0, rotX: 0 });
  /** Cincin jejak pointer: indeks tulis + posisi terakhir yang memicu sampel baru. */
  const jejakRef = useRef({ i: 0, u: 0.5, v: 0.5 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouse.current.targetX = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
      mouse.current.aktif = true;
      proyeksi.current.diLayar = true;
    };
    // Pointer keluar jendela: proyeksi terakhir tidak boleh dipakai untuk melepas fokus
    // ke titik yang sudah bukan posisi kursor.
    const handleKeluar = () => {
      proyeksi.current.diLayar = false;
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("pointerleave", handleKeluar);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("pointerleave", handleKeluar);
    };
  }, []);

  // fov dasar ditangkap sebelum panggung sempat menyentuh kamera, lewat ref sendiri:
  // nilai dari useThree tidak boleh ditulis langsung dan polanya sama dengan meshRef.
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    lensaRef.current = cam;
    fovDasar.current = cam.fov;
  }, [camera]);

  // MODE, hover kartu arsip, dan wireframe adalah keadaan yang datang dari React, bukan
  // dari peristiwa input. Pada reduce-motion kanvas bahkan tidak memasang listener
  // aktivitas (frameloop "demand" permanen), jadi tanpa satu frame yang diminta di sini
  // pergantian wajah tidak akan pernah tampil — yang boleh mati itu rotasinya, bukan
  // keadaan kartunya.
  useEffect(() => {
    invalidate();
  }, [mode, hoveredProject, wireframe, invalidate]);

  // Pengunjung yang berhenti di tengah gerakan lalu meminta gerakan dikurangi tidak
  // akan pernah mendapat frame lagi untuk menghapus sisa geserannya, jadi nol-nya
  // ditulis dari effect, bukan dari loop render.
  useEffect(() => {
    if (kurangiGerak) tulisParalaksTipografi(tipografi, 0, 0, () => 0, true);
  }, [kurangiGerak, tipografi]);

  useFrame((_, delta) => {
    const mat = materialRef.current;
    if (!mat || !meshRef.current) return;

    // MODE jadi transisi, bukan sekadar ganti warna: nilai wajah saat pergantian
    // dibaca dari material yang benar-benar tampil di frame ini, jadi flip yang
    // dipotong di tengah tetap melanjutkan dari wajah yang sedang terlihat.
    if (prevMode.current !== mode) {
      personaMulai.current = mat.uniforms.uPersona.value as number;
      prevMode.current = mode;
      if (!kurangiGerak) balik.current = 1;
    }

    // Reticle dipegang sejak sini: nilainya datang dari modul putaran, tempat seret
    // pointer dan fokus keyboard menulis keadaan yang sama.
    const dipegang = bacaFokusKartu();

    // Smooth mouse interpolation
    mouse.current.x += (mouse.current.targetX - mouse.current.x) * 0.08;
    mouse.current.y += (mouse.current.targetY - mouse.current.y) * 0.08;
    // Kartu yang difokus lewat keyboard menyala sama terangnya dengan kartu yang disentuh
    // pointer: reveal tidak lagi milik pointer saja, karena cahaya itulah reticle-nya.
    mat.uniforms.uReveal.value = THREE.MathUtils.lerp(
      mat.uniforms.uReveal.value,
      mouse.current.aktif || dipegang ? 1 : 0,
      0.08
    );

    // MODE jadi transisi 3D: satu putaran penuh membawa pergantian wajah. Putarannya
    // 360°, bukan 180° — pada setengah putaran potret membaca cermin dan wajah penulis
    // terbalik, jadi putaran dihentikan di titik awal dengan sikap yang sama.
    if (balik.current > 0) {
      balik.current = Math.max(0, balik.current - delta / DURASI.lapang);
    }
    const maju = 1 - balik.current;

    mat.uniforms.uTime.value += delta;
    mat.uniforms.uMouse.value.set(mouse.current.x, mouse.current.y);
    mat.uniforms.uVelocity.value = THREE.MathUtils.lerp(mat.uniforms.uVelocity.value, scrollVelocityRef.current, 0.1);
    mat.uniforms.uScroll.value = scrollProgressRef.current;

    // ── DOLLY DARI KECEPATAN GULIR ──
    // Gulir cepat mendorong kamera ke dalam, gulir balik menariknya keluar, besarnya
    // dibatasi DOLLY_DERAJAT dari fov dasar. Pegasnya eksponensial per detik (bukan lerp
    // per frame) supaya satu frame panjang tidak membuat kamera melompat; begitu
    // velositas habis, targetnya fov dasar lagi dan kartu diam di tempat ia berangkat.
    // reduce-motion mengunci fov: yang boleh hilang gerakannya, bukan keadaan kameranya.
    // Kamera dipegang lewat ref sendiri: nilai yang datang dari useThree tidak boleh
    // ditulis langsung, dan dolly memang menulis fov — polanya sama dengan meshRef.
    const lensa = lensaRef.current;
    let dolly = 0;
    let sisaDolly = 0;
    if (lensa) {
      const laju = THREE.MathUtils.clamp(scrollVelocityRef.current / KECEPATAN_PENUH, -1, 1);
      const fovTarget = kurangiGerak ? fovDasar.current : fovDasar.current - laju * DOLLY_DERAJAT;
      sisaDolly = fovTarget - lensa.fov;
      if (Math.abs(sisaDolly) > 1e-4) {
        lensa.fov += sisaDolly * (1 - Math.exp(-delta / TAU_DOLLY));
        lensa.updateProjectionMatrix();
      } else if (lensa.fov !== fovTarget) {
        // Ditutup tepat: pegas asimptotik tidak pernah benar-benar sampai, dan fov yang
        // masih bergerak 1e-7 membuat loop "demand" tidak pernah boleh tidur.
        lensa.fov = fovTarget;
        lensa.updateProjectionMatrix();
        sisaDolly = 0;
      }
      dolly = lensa.fov - fovDasar.current;
    }

    // Persona: mode jadi basis, hover kartu arsip menyilangkan potret ke sisi
    // sebaliknya (engineer <-> creator) sehingga hover membaca perubahan wajah,
    // bukan hanya aura merah.
    const basisPersona = mode === "engineer" ? 0.0 : 1.0;
    const targetPersona = hoveredProject !== null ? 1 - basisPersona : basisPersona;
    if (balik.current > 0) {
      // Selama flip, silang wajah dipegang putaran (bukan lerp per frame): muka lama
      // bertahan sampai kartu tegak lurus kamera, wajah baru selesai sebelum putaran
      // berakhir — pergantian MODE terbaca sebagai satu tindakan, bukan dua efek.
      const campur = THREE.MathUtils.clamp((maju - 0.5) / 0.4, 0, 1);
      mat.uniforms.uPersona.value =
        personaMulai.current + (targetPersona - personaMulai.current) * campur;
    } else {
      mat.uniforms.uPersona.value = THREE.MathUtils.lerp(mat.uniforms.uPersona.value, targetPersona, 0.08);
    }

    // Smooth lerp for uWireframe
    const targetWireframe = wireframe ? 1.0 : 0.0;
    mat.uniforms.uWireframe.value = THREE.MathUtils.lerp(mat.uniforms.uWireframe.value, targetWireframe, 0.12);

    // Audio Engine scroll velocity rev
    audioEngine.updateScrollVelocity(scrollVelocityRef.current);

    // Hover state interpolation
    const targetHover = hoveredProject !== null ? 1.0 : 0.0;
    mat.uniforms.uHover.value = THREE.MathUtils.lerp(mat.uniforms.uHover.value, targetHover, 0.1);
    if (hoveredProject !== null) {
      mat.uniforms.uHoverIndex.value = hoveredProject;
    }

    // ── KOREOGRAFI PORTAL ──
    // Sikap kartu datang dari marker DOM bab (usePortalRegistry -> sikap()), bukan dari
    // tabel ambang gulir. Kotak portal sekaligus menjadi batas potong lewat uMask.
    const p = Math.max(0, Math.min(1, scrollProgressRef.current));
    const k = sikap(p, portal.current);
    if (!k) return;

    // Kartu menyerahkan tempatnya ke mobil HANYA kalau mobilnya memang dipanggil —
    // aturannya satu sumber (mobilDipanggil) supaya tidak ada bab yang kehilangan potret
    // tanpa pengganti. Angkanya dibagikan ke AktorSF26 lewat SILANG_MOBIL, jadi tidak ada
    // penghalusan kedua yang bisa tertinggal satu frame di antaranya.
    const targetMobil = mobilDipanggil(k.babDari, hoveredProject, kurangiGerak) ? 1.0 : 0.0;
    mat.uniforms.uMobil.value = THREE.MathUtils.lerp(mat.uniforms.uMobil.value, targetMobil, 0.1);
    // Holder module-level ditulis ULANG, bukan dipercaya sudah ditulis: R3F menyalin setiap
    // entri props `uniforms` ke objek baru saat memasang <shaderMaterial uniforms=…>
    // (@react-three/fiber applyProps: uniforms[name] = { ...uniform }), jadi
    // mat.uniforms.uMobil BUKAN SILANG_MOBIL. Yang dibagikan ke AktorSF26 adalah angka ini,
    // satu lerp, satu frame — mobil membaca holder-nya sendiri lewat material yang dibuat
    // imperatif (di sana tidak ada applyProps, identitasnya utuh).
    SILANG_MOBIL.value = mat.uniforms.uMobil.value;

    const layarX = size.width;
    const layarY = size.height;
    // world per pixel pada bidang z = 0, dari fov DASAR. Rumerusnya sama dengan
    // viewport.width / size.width milik r3f (2·tan(fov/2)·jarak / tinggi layar), tapi
    // tidak ikut berubah saat dolly bergerak — jadi kartu tetap seukuran kotak DOM-nya
    // pada sikap dasar dan dolly hanya terlihat sebagai dorongan ±1 derajat.
    const dpp =
      (2 * Math.tan(THREE.MathUtils.degToRad(fovDasar.current) / 2) * camera.position.z) / layarY;
    const pxPerWorld = (z: number) => (1 / dpp) * (camera.position.z / (camera.position.z - z));
    const kotak = k.kotak;

    const targetX = (kotak.kiri + kotak.lebar / 2 - layarX / 2) / pxPerWorld(k.z) + mouse.current.x * k.geyang;
    const targetY = -(kotak.atas + kotak.tinggi / 2 - layarY / 2) / pxPerWorld(k.z) + mouse.current.y * k.geyang;
    const targetRotY = k.rot + mouse.current.x * k.rotGeyang;
    const targetZ = k.z;

    const m = mat.uniforms.uMask.value;
    m.set(
      (kotak.kiri / layarX) * 2 - 1,
      ((kotak.kiri + kotak.lebar) / layarX) * 2 - 1,
      1 - ((kotak.atas + kotak.tinggi) / layarY) * 2,
      1 - (kotak.atas / layarY) * 2
    );
    mat.uniforms.uNdcPerPx.value.set(2 / layarX, 2 / layarY);

    // ── WIPE ANTAR BAB ──
    // Hidup hanya di dalam pita perpindahan (bab dari ≠ bab ke) dan hanya di tengahnya:
    // kartu menutup habis sebentar saat ia berada di "tidak ada rumah" antara dua portal,
    // lalu terbuka lagi sebelum mendarat. reduce-motion tidak mendapat sapuan — yang
    // boleh hilang adalah gerakannya, bukan kartunya.
    const jarakTengah = Math.abs(k.t - 0.5);
    const buka = THREE.MathUtils.clamp(
      1 - Math.max(0, jarakTengah - SAPUAN_INTI) / SAPUAN_RAMPA,
      0,
      1
    );
    const wipe = kurangiGerak || k.babDari === k.babKe ? 0 : buka;
    mat.uniforms.uWipe.value = wipe;
    // Sama seperti uMobil: kartu punya salinan sendiri, mobil membaca holder ini.
    SAPU_IRIS.value = wipe;

    // Putaran flip dilicinkan di kedua ujungnya (smoothstep) supaya kartu selalu
    // berhenti tepat pada yaw sikap bab-nya, tidak pernah di tengah putaran.
    const sudutBalik = balik.current > 0 ? Math.PI * 2 * (maju * maju * (3 - 2 * maju)) : 0;

    const skala = muat(kotak) / pxPerWorld(k.pas);
    meshRef.current.scale.set(skala, skala, 1);

    meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, targetX, 0.08);
    meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, 0.08);
    meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, targetZ, 0.08);
    dasar.current.rotY = THREE.MathUtils.lerp(dasar.current.rotY, targetRotY, 0.08);
    dasar.current.rotX = THREE.MathUtils.lerp(dasar.current.rotX, -mouse.current.y * 0.08, 0.08);
    // Sisa jarak kartu ke sikap yang dituntut portal. Angka ini ikut menahan loop
    // "demand" tetap bangun: tanpa itu satu frame pemicu (gerak pointer, satu tick
    // gulir) hanya menutup 8% dari jarak lalu tidurnya datang, dan kartu berhenti
    // beberapa pixel sebelum kotaknya — terlihat sebagai kartu yang tidak pernah
    // benar-benar mendarat, dan membuat verifier membaca sikap yang masih bergerak
    // sebagai sikap akhir.
    const sisaSikap =
      Math.abs(targetX - meshRef.current.position.x) +
      Math.abs(targetY - meshRef.current.position.y) +
      Math.abs(targetZ - meshRef.current.position.z) +
      Math.abs(targetRotY - dasar.current.rotY) +
      Math.abs(-mouse.current.y * 0.08 - dasar.current.rotX);

    // Rotasi perintah pengunjung (seret pointer atau panah keyboard) DITUMPUK di atas
    // koreografi bab, bukan menggantikannya: target nol berarti kartu pulang ke sikap
    // portal bab itu, dan nilai berapa pun hanya boleh sampai ±12°.
    const perintah = bacaTarget();
    pusing.current.x += (perintah.x - pusing.current.x) * 0.15;
    pusing.current.y += (perintah.y - pusing.current.y) * 0.15;
    meshRef.current.rotation.y = dasar.current.rotY + pusing.current.x + sudutBalik;
    meshRef.current.rotation.x = dasar.current.rotX + pusing.current.y;
    // Loop "demand" mati 4 detik setelah halaman diam. Tanpa meminta frame berikut
    // sendiri, pegas kembali, langkah panah, flip MODE, dan silang wajah berhenti di
    // tengah jalan — pada reduce-motion silang wajah adalah satu-satunya yang tersisa.
    // sudutBalik ikut diperiksa karena frame terakhir flip melaporkan sisanya 0 sambil
    // angkanya masih satu putaran penuh: tanpa frame penutup itu mesh berhenti di
    // rotY = sikap + 2π, yang secara visual sama tapi membuat siapa pun yang membandingkan
    // sikap membaca satu putaran yang tidak pernah ada.
    if (
      balik.current > 0 ||
      sudutBalik > 0 ||
      Math.abs(perintah.x - pusing.current.x) > 1e-4 ||
      Math.abs(perintah.y - pusing.current.y) > 1e-4 ||
      Math.abs((mat.uniforms.uPersona.value as number) - targetPersona) > 1e-3 ||
      Math.abs((mat.uniforms.uMobil.value as number) - targetMobil) > 1e-3 ||
      Math.abs(sisaDolly) > 1e-4 ||
      sisaSikap > 1e-3
    )
      invalidate();

    // ── PARALAKS TIPOGRAFI ──
    // Huruf besar di DOM digeser oleh proyeksi offset dunia yang SAMA dengan yang
    // dipakai kartu (geyang pointer milik bab ini), pada kedalamannya sendiri. Bukan
    // selisih posisi kartu terhadap kotaknya: selisih itu adalah sisa lerp, dan selama
    // penerbangan ia bernilai ratusan pixel — huruf ikut terbang dan mendorong halaman
    // keluar dari lebarnya (terukur 205px dan 141px overflow pada percobaan pertama).
    // Yang dibagikan di sini adalah rumus dan sumber angkanya, bukan sisa perjalanan.
    tulisParalaksTipografi(
      tipografi,
      mouse.current.x * k.geyang,
      mouse.current.y * k.geyang,
      (kedalaman) => pxPerWorld(k.z + kedalaman),
      kurangiGerak
    );

    // Mesin kartu yang tahu di mana kartu duduk, jadi modul seret tidak perlu menebak
    // tata letak: seret hanya diterima di atas kartu dan tepi 40px-nya.
    laporKotakKartu(kotak);

    // Proyeksikan pointer ke bidang kartu SETELAH transform frame ini dipakai, supaya
    // cahaya benar-benar jatuh di bawah kursor meski kartu bergeser/miring.
    const mesh = meshRef.current;
    const pr = proyeksi.current;
    pr.ndc.set(mouse.current.x, mouse.current.y);
    pr.ray.setFromCamera(pr.ndc, camera);
    pr.normal.set(0, 0, 1).applyQuaternion(mesh.quaternion);
    mesh.updateWorldMatrix(true, false);
    pr.bidang.setFromNormalAndCoplanarPoint(pr.normal, mesh.getWorldPosition(pr.pusat));
    const jatuh = pr.ray.ray.intersectPlane(pr.bidang, pr.titik) !== null;
    if (jatuh) {
      mesh.worldToLocal(pr.titik);
      pr.uv.set(pr.titik.x + 0.5, pr.titik.y / RASIO_POTRET + 0.5);
    }
    const uv = mat.uniforms.uCursorUV.value;
    if (dipegang) {
      // Focus-lock: cahaya DITAHAN pada titik kartu tempat pengunjung mengambilnya,
      // bukan dilayani ulang setiap frame. Memutar kartu 12° menggeser proyeksi pointer
      // jauh lebih besar daripada gerakan jarinya, jadi tanpa penahanan ini cahaya
      // meluncur keluar wajah justru pada saat orang paling ingin melihat wajah itu.
      // Penahan hanya berlaku selama titik itu masih di dalam kartu: reticle yang
      // tertinggal di luar kartu — pointer yang sudah cabut lalu kontrol keyboard difokus
      // — ditarik ke tengah, supaya pengguna keyboard melihat wajah menyala, bukan hitam.
      const diLuar =
        !pr.diLayar || uv.x < -0.05 || uv.x > 1.05 || uv.y < -0.05 || uv.y > 1.05;
      if (diLuar) {
        uv.x += (0.5 - uv.x) * 0.18;
        uv.y += (0.5 - uv.y) * 0.18;
        if (Math.abs(0.5 - uv.x) > 1e-3 || Math.abs(0.5 - uv.y) > 1e-3) invalidate();
      }
    } else if (jatuh) {
      uv.set(pr.uv.x, pr.uv.y);
    }

    // Jejak pointer: 12 sampel terakhir pada UV kartu, dipakai shader sebagai pita reveal.
    // Umurnya diluruhkan per detik (bukan per frame) supaya kecepatannya tidak berubah
    // saat DPR turun atau mesin melambat, dan hanya diperbarui bila pointer benar-benar
    // berpindah — pointer yang diam tidak boleh meninggalkan tambalan merah.
    const pita = mat.uniforms.uJejak.value;
    // Peluruhan eksponensial, bukan (1 - delta * k): pada k linear, satu frame yang lebih
    // panjang dari 1/k menghapus SELURUH jejak (terukur pada perenderan perangkat lunak,
    // delta 0,5s → faktor 0), jadi pita hilang justru di mesin yang paling lambat.
    const luntur = Math.exp(-delta / 0.34);
    let pitaHidup = false;
    for (const s of pita) {
      s.z *= luntur;
      if (s.z > 0.05) pitaHidup = true;
    }
    // Peluruhan hanya berjalan kalau frame-nya ada. Loop "demand" berhenti begitu
    // peristiwa pointer selesai, dan satu gerakan hanya menyumbang satu frame: tanpa
    // bangun sendiri, jejak membeku pada umur terakhirnya (merah yang tidak pernah
    // padam) dan hanya satu sampel yang pernah tertulis per gerakan.
    if (pitaHidup) invalidate();
    const cv = mat.uniforms.uCursorUV.value;
    const je = jejakRef.current;
    if (Math.hypot(cv.x - je.u, cv.y - je.v) > 0.01) {
      je.i = (je.i + 1) % pita.length;
      pita[je.i].set(cv.x, cv.y, 1);
      je.u = cv.x;
      je.v = cv.y;
    }

    // Salinan sikap kartu untuk verifier (docs/verify/panggung-probe.mjs). Hanya hidup
    // di development; produksi tidak menulis apa pun ke window.
    if (process.env.NODE_ENV !== "production") {
      let hidup = 0;
      let rentang = 0;
      for (let a = 0; a < pita.length; a++) {
        if (pita[a].z <= 0.05) continue;
        hidup++;
        for (let b = a + 1; b < pita.length; b++) {
          if (pita[b].z <= 0.05) continue;
          rentang = Math.max(rentang, Math.hypot(pita[a].x - pita[b].x, pita[a].y - pita[b].y));
        }
      }
      tulisPanggungDebug(mesh, mat.uniforms.uMask.value, p, k, kotak, {
        putar: [pusing.current.x, pusing.current.y, perintah.x, perintah.y],
        jejak: [hidup, bundar(rentang)],
        balik: balik.current,
        persona: mat.uniforms.uPersona.value as number,
        mobil: mat.uniforms.uMobil.value as number,
        kursor: [uv.x, uv.y, dipegang ? 1 : 0, mat.uniforms.uReveal.value as number],
        dolly,
        kamera: [lensa?.fov ?? fovDasar.current, camera.position.z],
        wipe,
      });

    }
  });

  return { meshRef, materialRef, uniforms };
};
