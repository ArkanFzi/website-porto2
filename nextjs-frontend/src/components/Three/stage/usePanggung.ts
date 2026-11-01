"use client";

/** Mesin panggung: mengubah satu angka gulir menjadi posisi, sikap, dan uniform
 *  kartu potret setiap frame. Dipisah dari komponen supaya objek 3D baru cukup
 *  mengimpor hook ini (atau menulis mesinnya sendiri) tanpa menyalin shader. */
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import audioEngine from "@/lib/audioEngine";
import { bacaTarget, laporKotakKartu } from "@/lib/putaran";
import type { PortfolioMode } from "@/context/PortfolioModeContext";
import { buatUniformPanggung, RASIO_POTRET } from "./chiaroscuroMaterial";
import { sikap, type Sikap } from "./koreografi";
import { usePortalRegistry, type PortalKotak } from "./usePortalRegistry";

/** Lebar kartu agar mengisi portal: dibatasi lebar portal, kecuali portalnya lebih
 *  tinggi daripada rasio potret. */
const muat = (kotak: PortalKotak) => Math.min(kotak.lebar, kotak.tinggi / RASIO_POTRET);

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
}

const bundar = (n: number) => Math.round(n * 1e4) / 1e4;

const tulisPanggungDebug = (
  mesh: THREE.Mesh,
  mask: THREE.Vector4,
  p: number,
  k: Sikap,
  kotak: PortalKotak,
  putar: [number, number, number, number]
) => {
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
  const { viewport, size, camera, invalidate } = useThree();
  const portal = usePortalRegistry();
  const uniforms = useMemo(() => buatUniformPanggung(texture), [texture]);

  const mouse = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, aktif: false });
  const proyeksi = useRef({
    ray: new THREE.Raycaster(),
    bidang: new THREE.Plane(),
    normal: new THREE.Vector3(),
    titik: new THREE.Vector3(),
    pusat: new THREE.Vector3(),
    ndc: new THREE.Vector2(),
  });
  const prevMode = useRef(mode);
  const tiltImpulse = useRef(0);
  /** Rotasi hasil easing menuju sudut yang diperintahkan pengunjung (seret/panah). */
  const pusing = useRef({ x: 0, y: 0 });
  /** Sikap yaw/pitch hasil koreografi SEBELUM rotasi pengunjung. Ditulis terpisah karena
   *  lerp di bawah membaca nilai terakhir mesh: bila offset putaran ikut tertinggal di
   *  mesh.rotation, ia terakumulasi lintas frame (terukur 12x dari perintahnya). */
  const dasar = useRef({ rotY: 0, rotX: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouse.current.targetX = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
      mouse.current.aktif = true;
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Trigger tilt kick whenever mode changes
  useEffect(() => {
    if (prevMode.current !== mode) {
      tiltImpulse.current = 0.28;
      prevMode.current = mode;
    }
  }, [mode]);

  useFrame((_, delta) => {
    const mat = materialRef.current;
    if (!mat || !meshRef.current) return;

    // Smooth mouse interpolation
    mouse.current.x += (mouse.current.targetX - mouse.current.x) * 0.08;
    mouse.current.y += (mouse.current.targetY - mouse.current.y) * 0.08;
    mat.uniforms.uReveal.value = THREE.MathUtils.lerp(
      mat.uniforms.uReveal.value,
      mouse.current.aktif ? 1 : 0,
      0.08
    );

    // Smooth decay of tilt impulse
    tiltImpulse.current = THREE.MathUtils.lerp(tiltImpulse.current, 0, 0.08);

    mat.uniforms.uTime.value += delta;
    mat.uniforms.uMouse.value.set(mouse.current.x, mouse.current.y);
    mat.uniforms.uVelocity.value = THREE.MathUtils.lerp(mat.uniforms.uVelocity.value, scrollVelocityRef.current, 0.1);
    mat.uniforms.uScroll.value = scrollProgressRef.current;

    // Persona: mode jadi basis, hover kartu arsip menyilangkan potret ke sisi
    // sebaliknya (engineer <-> creator) sehingga hover membaca perubahan wajah,
    // bukan hanya aura merah.
    const basisPersona = mode === "engineer" ? 0.0 : 1.0;
    const targetPersona = hoveredProject !== null ? 1 - basisPersona : basisPersona;
    mat.uniforms.uPersona.value = THREE.MathUtils.lerp(mat.uniforms.uPersona.value, targetPersona, 0.08);

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

    const layarX = size.width;
    const layarY = size.height;
    const dpp = viewport.width / layarX; // world per pixel pada bidang z = 0
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

    // Apply quick tilt impulse when persona changes
    const impulseRotZ = Math.sin(mat.uniforms.uTime.value * 12.0) * tiltImpulse.current;
    const impulseRotY = tiltImpulse.current * (mode === "engineer" ? -0.12 : 0.12);

    const skala = muat(kotak) / pxPerWorld(k.pas);
    meshRef.current.scale.set(skala, skala, 1);

    meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, targetX, 0.08);
    meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, 0.08);
    meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, targetZ, 0.08);
    dasar.current.rotY = THREE.MathUtils.lerp(dasar.current.rotY, targetRotY + impulseRotY, 0.08);
    dasar.current.rotX = THREE.MathUtils.lerp(dasar.current.rotX, -mouse.current.y * 0.08, 0.08);
    meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, impulseRotZ, 0.1);

    // Rotasi perintah pengunjung (seret pointer atau panah keyboard) DITUMPUK di atas
    // koreografi bab, bukan menggantikannya: target nol berarti kartu pulang ke sikap
    // portal bab itu, dan nilai berapa pun hanya boleh sampai ±12°.
    const perintah = bacaTarget();
    pusing.current.x += (perintah.x - pusing.current.x) * 0.15;
    pusing.current.y += (perintah.y - pusing.current.y) * 0.15;
    meshRef.current.rotation.y = dasar.current.rotY + pusing.current.x;
    meshRef.current.rotation.x = dasar.current.rotX + pusing.current.y;
    // Loop "demand" mati 4 detik setelah halaman diam. Tanpa meminta frame berikut
    // sendiri, pegas kembali dan langkah panah berhenti di tengah jalan.
    if (
      Math.abs(perintah.x - pusing.current.x) > 1e-4 ||
      Math.abs(perintah.y - pusing.current.y) > 1e-4
    )
      invalidate();

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
    if (pr.ray.ray.intersectPlane(pr.bidang, pr.titik)) {
      mesh.worldToLocal(pr.titik);
      mat.uniforms.uCursorUV.value.set(pr.titik.x + 0.5, pr.titik.y / RASIO_POTRET + 0.5);
    }

    // Salinan sikap kartu untuk verifier (docs/verify/panggung-probe.mjs). Hanya hidup
    // di development; produksi tidak menulis apa pun ke window.
    if (process.env.NODE_ENV !== "production") {
      tulisPanggungDebug(mesh, mat.uniforms.uMask.value, p, k, kotak, [
        pusing.current.x,
        pusing.current.y,
        perintah.x,
        perintah.y,
      ]);
    }
  });

  return { meshRef, materialRef, uniforms };
};
