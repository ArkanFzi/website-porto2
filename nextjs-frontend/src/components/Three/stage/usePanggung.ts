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
  buatSalinanKabur,
  buatUniformPanggung,
  FOKUS_RENTANG,
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

/** Laju pelicin pointer dan pegas sikap kartu, per detik. Setara dengan lerp 0,08 per
 *  frame pada 60 fps (−ln(0,92)·60 ≈ 5), jadi terasa sama di layar yang sehat. Dalam
 *  fraksi per frame angka itu adalah kecepatan yang berbeda-beda per mesin: pada 7 fps
 *  (perenderan perangkat lunak) satu kibasan pointer butuh ±115 frame ≈ 16 detik untuk
 *  settle, dan kartu yang pegasnya sendiri 0,08/frame tertinggal di belakang huruf DOM
 *  yang membaca angka yang sama — terukur huruf berhenti di −8,99px dari tujuan +34px. */
const PELICIN_LAJU = 5;

/** Panggung masih berutang gerakan: pegas sikap, sisa pointer, flip MODE, atau silang
 *  wajah yang belum sampai. Ditulis setiap frame, dibaca hukum diam kanvas
 *  (`useDiamKanvas`) sebelum ia membolehkan loop pindah ke "demand".
 *
 *  Tanpa rem ini tidurnya datang di tengah penerbangan: flip "always → demand" pernah
 *  mematikan loop pada frame yang SUDAH memanggil `invalidate()` dengan sisa 0,0043 unit
 *  (≈1px) terbuka — `__render.frame` berhenti maju tiga jeda penuh, dan baru lanjut lagi
 *  setelah ada peristiwa pointer. Di mesin lambat geyang pointer lalu mendarat di tengah
 *  jalan (terukur huruf berhenti di 19,24px dari tujuan 22,16px) dan verifier membaca
 *  sikap yang belum selesai sebagai sikap akhir. */
export const SISA_PANGGUNG = { hidup: false };

/** Laju silang potret→mobil per detik. Setara dengan alpha 0,1 per frame pada 60 fps
 *  (−ln(0,9)·60 ≈ 6,3), jadi terasa sama di layar yang sehat. */
const SILANG_LAJU = 6.3;

/** Di bawah selisih ini tujuan dianggap sudah dicapai: 0,002 alpha ≈ setengah langkah
 *  nilai 8-bit, tak terlihat, dan memaksa angka mendarat PERSIS di 0 atau 1. */
const SILANG_HABIS = 0.002;

/** Setengah lebar inti sapuan, dalam t koreografi. Di dalam inti ini kartu tertutup
 *  habis. */
const SAPUAN_INTI = 0.08;

/** Lebar rampa pembuka di luar inti, dalam t yang sama. Jadi sapuan hanya ada di
 *  t 0,24–0,76 dan selebihnya kartu terbuka penuh: pita koreografi bisa 400–700 pixel
 *  gulir lebar, dan potret yang hilang sepanjang itu terbaca sebagai gangguan, bukan
 *  sebagai perpindahan. */
const SAPUAN_RAMPA = 0.18;

/** Plafon kekuatan kabur. Bukan 1: kartu yang kehilangan seluruh detaknya terbaca
 *  sebagai gambar yang salah render, bukan sebagai lensa. Sisa detail masih membuat
 *  potret dikenali sebagai potret. */
const KABUR_PLAFON = 0.6;

/** Batas atas jarak kartu ke bidang fokus, dalam PECAHAN rentang fokus, di bawah mana
 *  efeknya ditutup seluruhnya supaya sembilan tap tidak dibayar untuk kabur yang lebih
 *  halus dari satu pixel. 0,06 rentang = 0,03 satuan dunia. Angka ini juga harus berada
 *  di atas sisa pegas sikap: kartu yang parkir tertinggal ±0,015 satuan dari bidang
 *  fokusnya (lurp asimtotik, dan loop demand tidur 4 detik sebelum benar-benar sampai),
 *  jadi ambang yang lebih kecil akan menyalakan kabur pada kartu yang diam. */
const KABUR_AMBANG = 0.06;

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
  /** Kekaburan terbesar yang boleh terlihat frame ini: jarak pusat kartu ke bidang fokus
   *  ditambah tepi yang tersohong oleh sudutnya, dikali plafon yang sedang aktif. Nol
   *  berarti shader sama sekali tidak mengambil tap kabur. */
  kabur: number;
  /** Dimensi salinan yang jadi sumber kabur: [lebar, tinggi, lebarSumber, tinggiSumber].
   *  Keempatnya nol kalau salinannya tidak berhasil dibangun, dan kabur akan ikut nol. */
  kaburSalinan: [number, number, number, number];
}

const bundar = (n: number) => Math.round(n * 1e4) / 1e4;

/** Dimensi sumber tekstur dalam pixel; tipenya {} di three, jadi dibaca lewat cast. */
const ukuranTekstur = (t: THREE.Texture | null): [number, number] => {
  const gambar = t?.image as { width?: number; height?: number } | undefined;
  return [gambar?.width ?? 0, gambar?.height ?? 0];
};

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
  kabur: number;
  kaburSalinan: [number, number, number, number];
}

const tulisPanggungDebug = (
  mesh: THREE.Mesh,
  mask: THREE.Vector4,
  p: number,
  k: Sikap,
  kotak: PortalKotak,
  tambahan: BacaanTambahan
) => {
  const {
    putar,
    jejak,
    balik,
    persona,
    kursor,
    dolly,
    kamera,
    wipe,
    mobil,
    kabur,
    kaburSalinan,
  } = tambahan;
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
    kabur: bundar(kabur),
    kaburSalinan,
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
  /** Salinan ¼-res yang menjadi sumber kabur, dibangun dalam memo yang sama dengan
   *  uniform-nya supaya serah-terimanya terjadi sekali dan tidak perlu menulis ulang
   *  uniform di luar loop render. Null berarti salinan tidak bisa dibangun (gambar
   *  belum siap); plafon kabur ikut nol sehingga kartu tetap tajam dan jujur tentang
   *  alasannya. */
  const { uniforms, salinanKabur, salinanUkuran } = useMemo(() => {
    const u = buatUniformPanggung(texture);
    const salinan = buatSalinanKabur(texture);
    if (salinan) u.uKaburPeta.value = salinan;
    const [ls, ts] = ukuranTekstur(salinan);
    const [ld, td] = ukuranTekstur(texture);
    // [lebarSalinan, tinggiSalinan, lebarSumber, tinggiSumber] — bahan gerbang verifier
    // bahwa yang dikaburkan memang seperempat potret, bukan salinan seukuran sumber.
    return {
      uniforms: u,
      salinanKabur: salinan,
      salinanUkuran: [salinan ? ls : 0, salinan ? ts : 0, ld, td] as [
        number,
        number,
        number,
        number
      ],
    };
  }, [texture]);

  useEffect(() => () => salinanKabur?.dispose(), [salinanKabur]);

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

    // Smooth mouse interpolation. Lajunya per detik (PELICIN_LAJU), bukan fraksi per
    // frame: kartu dan huruf DOM membaca nilai yang sama, jadi kecepatan penghalusannya
    // tidak boleh berubah ikut kemampuan mesin.
    const pelicin = 1 - Math.exp(-delta * PELICIN_LAJU);
    mouse.current.x += (mouse.current.targetX - mouse.current.x) * pelicin;
    mouse.current.y += (mouse.current.targetY - mouse.current.y) * pelicin;
    // Jarak pointer yang belum dilewati pelicinya. Ini yang menahan loop "demand" tetap
    // bangun setelah peristiwa pointer berhenti: tanpa dihitung, satu gerakan hanya
    // menyumbang beberapa frame (terukur: 4–6 frame lalu tidurnya datang, huruf berhenti
    // di −8,99px dari tujuan +34px dan kartu tertinggal di belakangnya), jadi geyang
    // pointer mendarat di tengah jalan dan baru lanjut lagi saat kursor digerakkan lagi.
    // Di 60fps gejalanya halus — cursor yang diam sesudah kibasan tetap kehilangan
    // sehelai parallax — di mesin lambat ia membeku.
    const sisaPointer =
      Math.abs(mouse.current.targetX - mouse.current.x) +
      Math.abs(mouse.current.targetY - mouse.current.y);
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
    // Pegasnya per-detik, bukan alpha per-frame, dan ditutup dengan snap. Alpha 0,1 per
    // frame membuat lama perpindahan = jumlah frame, dan jumlah frame bukan milik kita:
    // diukur 1–3 frame per 250 ms pada swiftshader, silang berhenti di 0,9114 saat dipanggil
    // dan 0,0012 saat dilepas — kartu tertinggal setengah crossfade permanen di mesin lambat,
    // dan mobil yang belum habis silangnya tetap menahan tiga draw call-nya.
    const silangLama = mat.uniforms.uMobil.value;
    const selisihMobil = targetMobil - silangLama;
    const silang =
      Math.abs(selisihMobil) < SILANG_HABIS
        ? targetMobil
        : silangLama + selisihMobil * (1 - Math.exp(-SILANG_LAJU * Math.min(delta, 0.05)));
    mat.uniforms.uMobil.value = silang;
    // Holder module-level ditulis ULANG, bukan dipercaya sudah ditulis: R3F menyalin setiap
    // entri props `uniforms` ke objek baru saat memasang <shaderMaterial uniforms=…>
    // (@react-three/fiber applyProps: uniforms[name] = { ...uniform }), jadi
    // mat.uniforms.uMobil BUKAN SILANG_MOBIL. Yang dibagikan ke AktorSF26 adalah angka ini,
    // satu lerp, satu frame — mobil membaca holder-nya sendiri lewat material yang dibuat
    // imperatif (di sana tidak ada applyProps, identitasnya utuh).
    SILANG_MOBIL.value = silang;
    // Frame berikutnya hanya ada selama silang masih dikejar; sampai di tujuan permintaan
    // berhenti sendiri, jadi "nol frame saat diam" tetap utuh.
    if (silang !== targetMobil) invalidate();

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

    meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, targetX, pelicin);
    meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, pelicin);
    meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, targetZ, pelicin);
    dasar.current.rotY = THREE.MathUtils.lerp(dasar.current.rotY, targetRotY, pelicin);
    dasar.current.rotX = THREE.MathUtils.lerp(dasar.current.rotX, -mouse.current.y * 0.08, pelicin);
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

    // ── FOKUS ──
    // Bidang fokus = kedalaman tempat kartu ini seharusnya duduk (k.pas), bukan ambang
    // yang dikarang per bab. Yang keluar fokus hanyalah bagian yang benar-benar berpindah
    // kedalaman: tepi kartu saat ia miring di tengah perpindahan atau saat diseret, dan
    // seluruh kartu pada bab penutup yang memang mundur 2,1 satuan.
    //
    // Ditulis SETELAH lurp sikap dan rotasi supaya gerbangnya menilai geometri frame ini,
    // bukan frame kemarin. Batasnya adalah jarak TERJAUH kartu ke bidang fokus dalam pecahan
    // rentang: pusat yang sudah dilurp, ditambah tepi yang tersohong oleh sudut yang benar-
    // benar terpasang pada mesh. Di bawah ambang uKabur = 0 dan shader tidak mengambil
    // sembilan tap itu sama sekali — bukan hanya "tidak terpakai". Kartu yang diam di
    // kotaknya tertinggal 0,015 satuan dari bidang fokusnya (lurp asimtotik + loop yang
    // tidur 4 detik), jadi ambangnya harus berada di atas sisa itu supaya efek tidak
    // menyala untuk kabur yang lebih halus dari satu pixel.
    const pusat = Math.abs(meshRef.current.position.z - k.pas) / FOKUS_RENTANG;
    const tepi = Math.max(
      ((skala * RASIO_POTRET * 0.5) / FOKUS_RENTANG) *
        Math.abs(Math.sin(meshRef.current.rotation.y)),
      ((skala * 0.5) / FOKUS_RENTANG) * Math.abs(Math.sin(meshRef.current.rotation.x))
    );
    mat.uniforms.uFokus.value = camera.position.z - k.pas;
    mat.uniforms.uKabur.value =
      pusat + tepi < KABUR_AMBANG || kurangiGerak || !salinanKabur ? 0 : KABUR_PLAFON;
    // Kekaburan TERBESAR yang boleh terlihat frame ini: pusat kartu plus tepi terjauh,
    // dibatasi plafon yang sedang aktif. Batas atas yang sama yang dipakai gerbang di atas,
    // jadi verifier membaca angka yang sama dengan yang memutuskan shader.
    const kaburTertinggi =
      Math.min(pusat + tepi, 1) * (mat.uniforms.uKabur.value as number);
    // Loop "demand" mati 4 detik setelah halaman diam. Tanpa meminta frame berikut
    // sendiri, pegas kembali, langkah panah, flip MODE, dan silang wajah berhenti di
    // tengah jalan — pada reduce-motion silang wajah adalah satu-satunya yang tersisa.
    // sudutBalik ikut diperiksa karena frame terakhir flip melaporkan sisanya 0 sambil
    // angkanya masih satu putaran penuh: tanpa frame penutup itu mesh berhenti di
    // rotY = sikap + 2π, yang secara visual sama tapi membuat siapa pun yang membandingkan
    // sikap membaca satu putaran yang tidak pernah ada.
    const adaSisa =
      balik.current > 0 ||
      sudutBalik > 0 ||
      sisaPointer > 1e-4 ||
      Math.abs(perintah.x - pusing.current.x) > 1e-4 ||
      Math.abs(perintah.y - pusing.current.y) > 1e-4 ||
      Math.abs((mat.uniforms.uPersona.value as number) - targetPersona) > 1e-3 ||
      Math.abs((mat.uniforms.uMobil.value as number) - targetMobil) > 1e-3 ||
      Math.abs(sisaDolly) > 1e-4 ||
      sisaSikap > 1e-3;
    // Angka yang sama dipakai hukum diam kanvas untuk memutuskan boleh tidurnya loop:
    // selama panggung masih berutang gerakan, flip "always → demand" ditunda.
    SISA_PANGGUNG.hidup = adaSisa;
    if (adaSisa) invalidate();

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
        kabur: kaburTertinggi,
        kaburSalinan: salinanUkuran,
      });
    }
  });

  return { meshRef, materialRef, uniforms };
};
