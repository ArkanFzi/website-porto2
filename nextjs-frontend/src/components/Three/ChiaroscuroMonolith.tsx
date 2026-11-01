"use client";

import React, { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { usePortfolioMode } from "@/context/PortfolioModeContext";

interface MonolithProps {
  scrollProgress: number; // 0 to 1 from Lenis
  hoveredProject: number | null;
  scrollVelocity: number;
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
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uTexture;
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uVelocity;
  uniform float uPersona; // 0.0 = Engineer, 1.0 = Creator
  uniform float uScroll;  // 0.0 to 1.0
  uniform float uHover;
  uniform float uHoverIndex;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

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

    // Precision Leica Monochrom luminance calculation
    float lum = dot(baseColor, vec3(0.299, 0.587, 0.114));
    float contrastLum = smoothstep(0.03, 0.95, lum);
    vec3 monoBase = vec3(contrastLum);

    // ── SCUDERIA ROSSO ACCENTS (MERAH SCUDERIA) ──
    // 1. Precision Red contour bands tracing chiaroscuro relief
    float contourBand = abs(fract(lum * 13.0 - uTime * 0.04) - 0.5);
    float laserContour = smoothstep(0.09, 0.02, contourBand);
    vec3 rossoLaser = vec3(0.831, 0.117, 0.07) * laserContour * (1.1 - contrastLum * 0.5);

    // 2. Interactive Cursor Reactive Red Lighting
    vec2 cursorLightPos = (uMouse * 0.5 + 0.5);
    float cursorDist = distance(uv, cursorLightPos);
    float cursorGlow = smoothstep(0.65, 0.0, cursorDist);
    vec3 cursorRed = vec3(1.0, 0.157, 0.0) * cursorGlow * (0.35 + (1.0 - contrastLum) * 0.65);

    // 3. Silhouette Rosso Rim Specular
    float distCenter = length(uv - vec2(0.5));
    float rimLight = pow(distCenter * 1.45, 2.2);
    vec3 rossoRim = vec3(1.0, 0.157, 0.0) * rimLight * 0.55;

    // ── PERSONA 1: THE ENGINEER (uPersona = 0.0) ──
    // High-contrast monochrome with sharp, vivid Scuderia Rosso laser telemetry
    vec3 engineerColor = monoBase + rossoLaser * 0.95 + cursorRed * 0.55 + rossoRim * 0.45;

    // ── PERSONA 2: THE CREATOR (uPersona = 1.0) ──
    // Warm cinematic halation & expressive Rosso Corsa silk glow
    vec3 halation = vec3(0.98, 0.16, 0.06) * pow(contrastLum, 2.2) * 0.6;
    vec3 creatorColor = monoBase + rossoLaser * 0.5 + halation + cursorRed * 0.75 + rossoRim * 0.5;

    // Smooth blend between personas
    vec3 finalColor = mix(engineerColor, creatorColor, uPersona);

    // ── CHAPTER 3 HOVER: PROJECT AURA ──
    if (uHover > 0.01) {
      float pulse = sin(uTime * 3.0) * 0.5 + 0.5;
      vec3 projectAura = vec3(0.831, 0.117, 0.07) * pulse * 0.6;
      finalColor = mix(finalColor, finalColor * vec3(1.15, 0.4, 0.3) + projectAura, uHover * 0.7);
    }

    // ── CHAPTER 4 FINALE: SCUDERIA DUOTONE SHIFT ──
    float ch4Factor = smoothstep(0.82, 0.96, uScroll);
    if (ch4Factor > 0.001) {
      vec3 deepCrimson = vec3(0.48, 0.04, 0.02);
      vec3 brightRosso = vec3(0.90, 0.15, 0.08);
      vec3 duotone = mix(deepCrimson, brightRosso, contrastLum);
      finalColor = mix(finalColor, duotone * 1.2, ch4Factor * 0.9);
    }

    // ── CLEAN RECTANGULAR MONOLITH FRAMING (BEBAS BLOB BULAT) ──
    vec2 cardUv = abs(uv - 0.5) * 2.0; // from 0.0 (center) to 1.0 (border)
    vec2 cornerDist = max(cardUv - vec2(0.90, 0.94), 0.0);
    float cornerRadius = length(cornerDist);
    float cardAlpha = 1.0 - smoothstep(0.04, 0.09, cornerRadius);

    // Subtle Scuderia Rosso hairline border glow around monolith card
    float hairline = smoothstep(0.09, 0.05, cornerRadius) - smoothstep(0.05, 0.02, cornerRadius);
    finalColor += vec3(0.831, 0.117, 0.07) * hairline * 1.6;

    // Fade out in Chapter 4
    float alpha = cardAlpha * (1.0 - ch4Factor * 0.85);

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

export const ChiaroscuroMonolith: React.FC<MonolithProps> = ({
  scrollProgress,
  hoveredProject,
  scrollVelocity,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { mode } = usePortfolioMode();
  const { viewport } = useThree();

  // Load real portrait texture from /FotoDiriFix.webp (1200x2150)
  const texture = useTexture("/FotoDiriFix.webp");

  const mouse = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const prevMode = useRef(mode);
  const tiltImpulse = useRef(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouse.current.targetX = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
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
    }),
    [texture]
  );

  useFrame((_, delta) => {
    const mat = materialRef.current;
    if (!mat || !meshRef.current) return;

    // Smooth mouse interpolation
    mouse.current.x += (mouse.current.targetX - mouse.current.x) * 0.08;
    mouse.current.y += (mouse.current.targetY - mouse.current.y) * 0.08;

    // Smooth decay of tilt impulse
    tiltImpulse.current = THREE.MathUtils.lerp(tiltImpulse.current, 0, 0.08);

    mat.uniforms.uTime.value += delta;
    mat.uniforms.uMouse.value.set(mouse.current.x, mouse.current.y);
    mat.uniforms.uVelocity.value = THREE.MathUtils.lerp(mat.uniforms.uVelocity.value, scrollVelocity, 0.1);
    mat.uniforms.uScroll.value = scrollProgress;

    // Smooth lerp for uPersona (0.0 for engineer, 1.0 for creator)
    const targetPersona = mode === "engineer" ? 0.0 : 1.0;
    mat.uniforms.uPersona.value = THREE.MathUtils.lerp(mat.uniforms.uPersona.value, targetPersona, 0.08);

    // Hover state interpolation
    const targetHover = hoveredProject !== null ? 1.0 : 0.0;
    mat.uniforms.uHover.value = THREE.MathUtils.lerp(mat.uniforms.uHover.value, targetHover, 0.1);
    if (hoveredProject !== null) {
      mat.uniforms.uHoverIndex.value = hoveredProject;
    }

    // ── CALIBRATED SIZING (1200x2150 Aspect Ratio = 1.792) ──
    const baseW = Math.min(viewport.width * 0.26, 2.3);
    meshRef.current.scale.set(baseW, baseW, 1);

    // ── PRECISION CHOREOGRAPHED SCROLL POSITIONS ──
    const p = Math.max(0, Math.min(1, scrollProgress));
    const isNarrow = viewport.width < 8.5;
    const colLeftX = isNarrow ? -viewport.width * 0.18 : -Math.min(viewport.width * 0.25, 2.3);
    const colRightX = isNarrow ? viewport.width * 0.18 : Math.min(viewport.width * 0.25, 2.2);

    let targetX = 0;
    let targetY = 0;
    let targetZ = 0;
    let targetRotY = 0;

    if (p < 0.12) {
      // ── CHAPTER 01 (HERO): Center [0, 0.05, 0] ──
      targetX = mouse.current.x * 0.15;
      targetY = 0.05 + mouse.current.y * 0.15;
      targetZ = 0;
      targetRotY = mouse.current.x * 0.1;
    } else if (p < 0.22) {
      // ── TRANSITION: HERO -> CHAPTER 02 (Glides to left before text appears) ──
      const t = (p - 0.12) / 0.10;
      targetX = THREE.MathUtils.lerp(0, colLeftX, t) + mouse.current.x * 0.12;
      targetY = THREE.MathUtils.lerp(0.05, 0.0, t) + mouse.current.y * 0.12;
      targetZ = 0;
      targetRotY = THREE.MathUtils.lerp(0, 0.22, t) + mouse.current.x * 0.06;
    } else if (p < 0.52) {
      // ── CHAPTER 02 (DUALITY): Locked in Left Column ──
      targetX = colLeftX + mouse.current.x * 0.12;
      targetY = mouse.current.y * 0.12;
      targetZ = 0;
      targetRotY = 0.22 + mouse.current.x * 0.06;
    } else if (p < 0.62) {
      // ── TRANSITION: CHAPTER 02 -> CHAPTER 03 (Glides to right column) ──
      const t = (p - 0.52) / 0.10;
      targetX = THREE.MathUtils.lerp(colLeftX, colRightX, t) + mouse.current.x * 0.14;
      targetY = mouse.current.y * 0.14;
      targetZ = THREE.MathUtils.lerp(0, -0.4, t);
      targetRotY = THREE.MathUtils.lerp(0.22, -0.18, t);
    } else if (p < 0.84) {
      // ── CHAPTER 03 (WORKS): Locked in Right Column ──
      targetX = colRightX + mouse.current.x * 0.14;
      targetY = mouse.current.y * 0.14;
      targetZ = -0.4;
      targetRotY = -0.18 + mouse.current.x * 0.06;
    } else {
      // ── CHAPTER 04 (FINALE): Recedes into distance ──
      const t = (p - 0.84) / 0.16;
      targetX = THREE.MathUtils.lerp(colRightX, 0, t);
      targetY = -0.3;
      targetZ = THREE.MathUtils.lerp(-0.4, -2.5, t);
      targetRotY = THREE.MathUtils.lerp(-0.18, 0, t);
    }

    // Apply quick tilt impulse when persona changes
    const impulseRotZ = Math.sin(mat.uniforms.uTime.value * 12.0) * tiltImpulse.current;
    const impulseRotY = tiltImpulse.current * (mode === "engineer" ? -0.12 : 0.12);

    meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, targetX, 0.08);
    meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, 0.08);
    meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, targetZ, 0.08);
    meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRotY + impulseRotY, 0.08);
    meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, -mouse.current.y * 0.08, 0.08);
    meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, impulseRotZ, 0.1);
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      {/* 1 : 1.792 aspect ratio matching FotoDiriFix.webp (1200x2150) */}
      <planeGeometry args={[1, 1.792, 96, 96]} />
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
