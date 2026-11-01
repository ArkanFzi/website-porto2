"use client";

import React, { useRef, useMemo, useEffect, useLayoutEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { usePortfolioMode } from "@/context/PortfolioModeContext";
import audioEngine from "@/lib/audioEngine";

interface MonolithProps {
  scrollProgressRef: React.RefObject<number>; // 0 to 1 from Lenis
  hoveredProject: number | null;
  scrollVelocityRef: React.RefObject<number>;
}

/** Rect portal dalam pixel CSS; elemen penandanya ber-jangkar layar (fixed), jadi
 *  nilainya tidak berubah saat halaman digulir dan cukup dibaca ulang saat resize. */
interface PortalRect {
  kiri: number;
  atas: number;
  lebar: number;
  tinggi: number;
}

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uVelocity;
  uniform float uPersona;
  uniform float uHover;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec2 vClip;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);

    vec3 pos = position;

    // Organic kinetic displacement
    float fluidWave = sin(pos.y * 3.5 + uTime * 2.2) * cos(pos.x * 3.0 + uTime * 1.8) * 0.035;
    float mechVibe = sin(pos.y * 24.0 + uTime * 4.0) * 0.008;
    float wave = mix(mechVibe, fluidWave, uPersona);
    pos.z += wave * clamp(uVelocity * 0.1, -0.2, 0.2);

    // Subtle 3D parallax responsive to cursor
    pos.z += (uMouse.x * pos.x + uMouse.y * pos.y) * 0.12;

    // Hover ripple on project inspect
    if (uHover > 0.01) {
      pos.z += sin(pos.y * 10.0 + uTime * 4.0) * 0.08 * uHover;
    }

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
    vClip = gl_Position.xy / gl_Position.w;
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uTexture;
  uniform float uTime;
  uniform float uVelocity;
  uniform float uPersona; // 0.0 = Engineer, 1.0 = Creator
  uniform float uScroll;  // 0.0 to 1.0
  uniform float uHover;
  uniform float uHoverIndex;
  uniform float uWireframe;
  uniform float uReveal;
  uniform vec2 uCursorUV;
  uniform vec4 uMask;      // batas portal dalam NDC: kiri, kanan, bawah, atas
  uniform vec2 uNdcPerPx;  // lebar/satu tinggi layar dalam NDC, untuk tepi potong

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec2 vClip;

  void main() {
    vec2 uv = vUv;

    // Velocity-based chromatic aberration at edges
    float aberrationBase = clamp(abs(uVelocity) * 0.015, 0.0, 0.025);
    float aberration = mix(aberrationBase * 0.6, aberrationBase * 1.4, uPersona);
    vec2 dir = normalize(uv - 0.5 + vec2(0.0001));

    float r = texture2D(uTexture, uv + dir * aberration).r;
    float g = texture2D(uTexture, uv).g;
    float b = texture2D(uTexture, uv - dir * aberration).b;
    vec3 baseColor = vec3(r, g, b);

    // Precision Leica Monochrom luminance calculation (Clean, natural black-and-white base)
    float lum = dot(baseColor, vec3(0.299, 0.587, 0.114));
    float contrastLum = smoothstep(0.04, 0.94, lum);
    vec3 monoBase = vec3(contrastLum);

    // ── NATURAL SCUDERIA RED ACCENTS (HALUS, ELEGAN, TIDAK MENOR) ──
    // 1. Subtle studio rim backlight on the outer silhouette/shoulders only
    float distCenter = length(uv - vec2(0.5));
    float rimLight = pow(distCenter * 1.4, 2.8);
    // Soft red rim accent only on outer edge (intensity 0.26)
    vec3 rossoRim = vec3(0.831, 0.117, 0.07) * rimLight * 0.26;

    // 2. Faint interactive cursor specular (warm reflection on suit, never flooding face)
    // uCursorUV adalah posisi pointer yang sudah diproyeksikan ke UV plane di JS;
    // memakai uMouse langsung (ndc*0.5+0.5) membuat "cahaya" tertinggal ~4x dari
    // kursor karena uv plane hanya membentang selebar kartu.
    vec2 cursorLightPos = uCursorUV;
    vec2 cursorSelisih = (uv - cursorLightPos) * vec2(1.0, 1.64); // koreksi rasio plane 1 : 1.64
    float cursorDist = length(cursorSelisih);
    float cursorGlow = smoothstep(0.45, 0.0, cursorDist);
    vec3 cursorSpecular = vec3(0.831, 0.117, 0.07) * cursorGlow * 0.14 * (1.0 - contrastLum);

    // ── PERSONA 1: THE ENGINEER (uPersona = 0.0) ──
    // Pristine high-contrast Leica monochrome with refined silhouette rim light
    vec3 engineerColor = monoBase + rossoRim + cursorSpecular;

    // ── PERSONA 2: THE CREATOR (uPersona = 1.0) ──
    // Natural warmth with subtle silk halation
    vec3 halation = vec3(0.831, 0.117, 0.07) * pow(contrastLum, 3.0) * 0.18;
    vec3 creatorColor = monoBase + rossoRim * 1.2 + halation + cursorSpecular * 1.3;

    // Smooth blend between personas
    vec3 finalColor = mix(engineerColor, creatorColor, uPersona);

    // ── MOUSE REVEAL MASK ──
    // Tekstur aslinya /FotoDiriFix.webp monokrom (saturasi rata terukur 0.003), jadi
    // "menyingkap warna asli" tidak menampilkan apa pun; yang dibuka adalah lapisan
    // rosso yang tetap mengikuti nada potret, bukan cakram warna datar.
    // uReveal sengaja 0 sampai pointer benar-benar bergerak, jadi perangkat sentuh dan
    // mode reduce-motion tidak melihat blob di tengah kartu.
    float reveal = smoothstep(0.30, 0.0, cursorDist) * uReveal;
    vec3 duotoneReveal = mix(vec3(0.16, 0.02, 0.015), vec3(0.72, 0.10, 0.06), contrastLum)
      * (0.35 + 0.65 * contrastLum);
    finalColor = mix(finalColor, duotoneReveal, reveal * 0.75);

    // ── CHAPTER 3 HOVER: PROJECT AURA ──
    if (uHover > 0.01) {
      float pulse = sin(uTime * 2.5) * 0.5 + 0.5;
      vec3 projectAura = vec3(0.831, 0.117, 0.07) * pulse * 0.35;
      finalColor = mix(finalColor, finalColor * vec3(1.08, 0.7, 0.6) + projectAura, uHover * 0.5);
    }

    // ── CHAPTER 4 FINALE: SCUDERIA DUOTONE SHIFT ──
    float ch4Factor = smoothstep(0.82, 0.96, uScroll);
    if (ch4Factor > 0.001) {
      vec3 deepCrimson = vec3(0.48, 0.04, 0.02);
      vec3 brightRosso = vec3(0.90, 0.15, 0.08);
      vec3 duotone = mix(deepCrimson, brightRosso, contrastLum);
      finalColor = mix(finalColor, duotone * 1.1, ch4Factor * 0.85);
    }

    // ── GPU WIREFRAME INSPECTOR OVERLAY ──
    if (uWireframe > 0.001) {
      vec2 grid = abs(fract(uv * 42.0 - 0.5) - 0.5) / (fwidth(uv * 42.0) + 0.0001);
      float line = min(grid.x, grid.y);
      float wire = 1.0 - min(line, 1.0);
      vec3 wireColor = vec3(0.831, 0.117, 0.07);
      vec3 chassisBacking = vec3(0.04, 0.04, 0.05);
      vec3 wireRender = mix(chassisBacking, wireColor * 1.6, wire);
      finalColor = mix(finalColor, wireRender, uWireframe * 0.92);
    }

    // ── CLEAN RECTANGULAR MONOLITH FRAMING (RESTRAINED & NATURAL) ──
    vec2 cardUv = abs(uv - 0.5) * 2.0; // from 0.0 (center) to 1.0 (border)
    vec2 cornerDist = max(cardUv - vec2(0.91, 0.95), 0.0);
    float cornerRadius = length(cornerDist);
    float cardAlpha = 1.0 - smoothstep(0.03, 0.08, cornerRadius);

    // Delicate restrained hairline edge (subtle dark titanium with faint red gleam)
    float hairline = smoothstep(0.08, 0.05, cornerRadius) - smoothstep(0.05, 0.02, cornerRadius);
    finalColor += vec3(0.831, 0.117, 0.07) * hairline * 0.35;

    // Fade out in Chapter 4
    float alpha = cardAlpha * (1.0 - ch4Factor * 0.85);

    // ── POTONG PORTAL ──
    // Kartu boleh lebih lebar dari kotaknya (parallax pointer, gelombang, miring);
    // sisanya dipotong pada batas kotak DOM bab, supaya kartu tidak pernah menutupi
    // teks. Tepi dibuat lunak ~3px agar tidak terlihat sebagai garis bergerigi.
    float luarX = max(max(uMask.x - vClip.x, vClip.x - uMask.y) / uNdcPerPx.x, 0.0);
    float luarY = max(max(uMask.z - vClip.y, vClip.y - uMask.w) / uNdcPerPx.y, 0.0);
    alpha *= 1.0 - smoothstep(0.0, 3.0, max(luarX, luarY));

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

export const ChiaroscuroMonolith: React.FC<MonolithProps> = ({
  scrollProgressRef,
  hoveredProject,
  scrollVelocityRef,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { mode, wireframe } = usePortfolioMode();
  const { viewport, size, camera, invalidate } = useThree();

  // Load real portrait texture from /FotoDiriFix.webp (1200x2150)
  const texture = useTexture("/FotoDiriFix.webp");

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

  // Portal = kotak DOM yang dideklarasikan tiap bab (MeshPortal). Posisi, ukuran, dan
  // batas potong kartu semuanya diturunkan dari rect portal, jadi menata ulang layout
  // bab otomatis menggeser kartu tanpa menyentuh angka koreografi di sini.
  const portal = useRef(new Map<number, PortalRect>());
  useLayoutEffect(() => {
    const simpul = Array.from(document.querySelectorAll<HTMLElement>("[data-portal]"));
    if (!simpul.length) return;
    const baca = () => {
      for (const el of simpul) {
        const r = el.getBoundingClientRect();
        const bab = Number(el.dataset.portal);
        if (r.width < 2 || r.height < 2) portal.current.delete(bab);
        else portal.current.set(bab, { kiri: r.left, atas: r.top, lebar: r.width, tinggi: r.height });
      }
      // Loop demand (TIER 1) tidak menggambar sendiri saat DOM berubah.
      invalidate();
    };
    baca();
    const pengamat = new ResizeObserver(baca);
    simpul.forEach((el) => pengamat.observe(el));
    window.addEventListener("resize", baca);
    return () => {
      pengamat.disconnect();
      window.removeEventListener("resize", baca);
    };
  }, [invalidate]);

  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture },
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uVelocity: { value: 0 },
      uPersona: { value: 0.0 },
      uScroll: { value: 0.0 },
      uHover: { value: 0 },
      uHoverIndex: { value: 0 },
      uWireframe: { value: 0.0 },
      uReveal: { value: 0.0 },
      uCursorUV: { value: new THREE.Vector2(0.5, 0.5) },
      // Terbuka penuh sampai portal pertama terukur, supaya frame sebelum effect
      // berjalan tidak memotong kartu seluruhnya.
      uMask: { value: new THREE.Vector4(-1, 1, -1, 1) },
      uNdcPerPx: { value: new THREE.Vector2(2 / 1440, 2 / 900) },
    }),
    [texture]
  );

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
    // Ambang gulir, kemiringan, dan parallax tetap seperti koreografi lama. Yang
    // berubah: kotak kartu tidak lagi dihitung dari fraksi viewport yang disalin,
    // melainkan dari rect portal bab (MeshPortal), dan tepi kotak itu sekaligus
    // menjadi batas potong lewat uMask.
    const p = Math.max(0, Math.min(1, scrollProgressRef.current));
    let babDari = 1;
    let babKe = 1;
    let t = 0;
    let rotDari = 0;
    let rotKe = 0;
    let zDari = 0;
    let zKe = 0;
    let geyang = 0.15;
    let rotGeyang = 0.1;

    if (p < 0.12) {
      // ── CHAPTER 01 (HERO): portal tengah ──
      babDari = 1; babKe = 1; t = 0;
    } else if (p < 0.22) {
      // ── TRANSITION: HERO -> CHAPTER 02 (glides ke kiri sebelum teks muncul) ──
      babDari = 1; babKe = 2; t = (p - 0.12) / 0.10; rotKe = 0.22;
      geyang = 0.12; rotGeyang = 0.06;
    } else if (p < 0.52) {
      // ── CHAPTER 02 (DUALITY): portal kolom kiri ──
      babDari = 2; babKe = 2; t = 1; rotDari = 0.22;
      geyang = 0.12; rotGeyang = 0.06;
    } else if (p < 0.62) {
      // ── TRANSITION: CHAPTER 02 -> CHAPTER 03 (glides ke gutter kanan) ──
      babDari = 2; babKe = 3; t = (p - 0.52) / 0.10; rotDari = 0.22; rotKe = -0.18; zKe = -0.4;
      geyang = 0.14; rotGeyang = 0.06;
    } else if (p < 0.84) {
      // ── CHAPTER 03 (WORKS): portal gutter kanan ──
      babDari = 3; babKe = 3; t = 1; rotDari = -0.18; zDari = -0.4;
      geyang = 0.14; rotGeyang = 0.06;
    } else {
      // ── CHAPTER 04 (FINALE): portal tengah, kartu mundur ke jauh ──
      babDari = 3; babKe = 4; t = (p - 0.84) / 0.16; rotDari = -0.18; zDari = -0.4; zKe = -2.5;
      geyang = 0.1; rotGeyang = 0.06;
    }

    const awal = portal.current.get(babDari);
    if (!awal) return;
    const akhir = portal.current.get(babKe) ?? awal;

    const layarX = size.width;
    const layarY = size.height;
    const dpp = viewport.width / layarX; // world per pixel pada bidang z = 0
    const pxPerWorld = (z: number) => (1 / dpp) * (camera.position.z / (camera.position.z - z));
    const campur = (a: number, b: number) => a + (b - a) * t;

    const kotak = {
      kiri: campur(awal.kiri, akhir.kiri),
      atas: campur(awal.atas, akhir.atas),
      lebar: campur(awal.lebar, akhir.lebar),
      tinggi: campur(awal.tinggi, akhir.tinggi),
    };

    const targetZ = campur(zDari, zKe);
    // Ukuran dihitung agar kartu pas di portal pada kedalaman zIsi. Untuk bab 04,
    // zKe jauh lebih dalam dari zIsi sehingga kartu tetap mengecil saat mundur.
    const zIsi = campur(zDari, Math.max(zKe, zDari));
    const pas = Math.min(kotak.lebar, kotak.tinggi / 1.64); // rasio plane 1 : 1.64

    const targetX = (kotak.kiri + kotak.lebar / 2 - layarX / 2) / pxPerWorld(targetZ) + mouse.current.x * geyang;
    const targetY = -(kotak.atas + kotak.tinggi / 2 - layarY / 2) / pxPerWorld(targetZ) + mouse.current.y * geyang;
    const targetRotY = campur(rotDari, rotKe) + mouse.current.x * rotGeyang;

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

    const skala = pas / pxPerWorld(zIsi);
    meshRef.current.scale.set(skala, skala, 1);

    meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, targetX, 0.08);
    meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, 0.08);
    meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, targetZ, 0.08);
    meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRotY + impulseRotY, 0.08);
    meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, -mouse.current.y * 0.08, 0.08);
    meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, impulseRotZ, 0.1);

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
      mat.uniforms.uCursorUV.value.set(pr.titik.x + 0.5, pr.titik.y / 1.64 + 0.5);
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      {/* 1 : 1.64 aspect ratio matching clean FotoDiriFix.webp (893x1464) */}
      <planeGeometry args={[1, 1.64, 96, 96]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
      />
    </mesh>
  );
};

export default ChiaroscuroMonolith;
