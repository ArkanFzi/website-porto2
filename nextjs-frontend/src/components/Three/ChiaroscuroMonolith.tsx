"use client";

import React, { useRef, useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { usePortfolioMode } from "@/context/PortfolioModeContext";

interface MonolithProps {
  scrollProgress: number; // 0.0 to 1.0
  hoveredProject: number | null; // index of hovered project in Ch 3
  scrollVelocity: number;
}

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uVelocity;
  uniform float uDepthScale;
  uniform float uChapter;
  uniform float uHover;
  uniform float uPersona; // 0.0 = Engineer, 1.0 = Creator

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);

    vec3 pos = position;

    // Mode-dependent vertex distortion
    // Creator: Fluid organic liquid wave
    float fluidWave = sin(pos.y * 4.0 + uTime * 2.8) * cos(pos.x * 3.0 + uTime * 2.0);
    // Engineer: Precision mechanical vibration
    float mechVibe = sin(pos.y * 30.0 + uTime * 5.0) * 0.015;

    float wave = mix(mechVibe, fluidWave, uPersona);
    pos.z += wave * clamp(uVelocity * 0.12, -0.28, 0.28);

    // Micro interactive cursor parallax tilt
    pos.z += (uMouse.x * pos.x + uMouse.y * pos.y) * 0.18;

    // Hover ripple on project inspect
    if (uHover > 0.01) {
      pos.z += sin(pos.y * 12.0 + uTime * 4.5) * 0.12 * uHover;
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
  uniform float uChapter; // 0.0 to 3.0
  uniform float uHover;
  uniform float uHoverIndex;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vec2 uv = vUv;

    // Liquid Chromatic Aberration scaled by velocity and persona
    float aberrationBase = clamp(abs(uVelocity) * 0.025, 0.0, 0.04);
    float aberration = mix(aberrationBase * 0.5, aberrationBase * 1.5, uPersona);
    vec2 dir = normalize(uv - 0.5 + vec2(0.001));

    float r = texture2D(uTexture, uv + dir * aberration * 1.5).r;
    float g = texture2D(uTexture, uv).g;
    float b = texture2D(uTexture, uv - dir * aberration * 1.5).b;
    vec3 baseColor = vec3(r, g, b);

    // Luminance computation from chiaroscuro portrait
    float lum = dot(baseColor, vec3(0.299, 0.587, 0.114));

    // Interactive Chiaroscuro Specular & Rosso Corsa Rim Light
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(vec3(uMouse.x * 2.5, uMouse.y * 2.5, 1.4));
    vec3 viewDir = normalize(vViewPosition);

    float diffuse = max(dot(normal, lightDir), 0.0);
    float rim = 1.0 - max(dot(viewDir, normal), 0.0);
    rim = pow(rim, 3.2);

    // Fluorescent Maranello Red (#FF2800) rim light
    vec3 rimColor = vec3(1.0, 0.157, 0.0) * rim * 1.6;

    // Crisp high-contrast monochrome base
    vec3 finalColor = vec3(lum);
    finalColor += rimColor * (0.6 + diffuse * 0.4);

    // ── PERSONA 1: THE ENGINEER (uPersona = 0.0) ──
    // Precision technical grid & red contour scanlines over shadow regions
    float engineerScan = sin(uv.y * 380.0) * 0.04;
    float contourBands = abs(fract(lum * 16.0 + uTime * 0.08) - 0.5);
    float laserContour = smoothstep(0.06, 0.01, contourBands);
    vec3 engineerColor = finalColor + engineerScan;
    engineerColor = mix(engineerColor, vec3(0.83, 0.117, 0.07), laserContour * 0.65 * (1.0 - lum));

    // ── PERSONA 2: THE CREATOR (uPersona = 1.0) ──
    // Warm cinematic halation & expressive Rosso Corsa silk glow
    vec3 halation = vec3(0.98, 0.12, 0.05) * pow(lum, 2.2) * 0.55;
    vec3 creatorColor = finalColor + halation;

    // Blend between Engineer & Creator shaders smoothly
    finalColor = mix(engineerColor, creatorColor, uPersona);

    // ── CHAPTER 3 HOVER: PROJECT AURA ──
    if (uHover > 0.01) {
      float pulse = sin(uTime * 3.5) * 0.5 + 0.5;
      vec3 projectAura = vec3(0.83, 0.117, 0.07) * pulse * 0.8;
      finalColor = mix(finalColor, finalColor * vec3(1.2, 0.35, 0.25) + projectAura, uHover * 0.8);
    }

    // ── CHAPTER 4 FINALE: HIGH-CONTRAST SCUDERIA RED DUOTONE ──
    float ch4Factor = smoothstep(2.2, 2.9, uChapter);
    if (ch4Factor > 0.001) {
      vec3 deepCrimson = vec3(0.478, 0.043, 0.02);
      vec3 brightRosso = vec3(0.831, 0.117, 0.07);
      vec3 duotone = mix(deepCrimson, brightRosso, lum);
      finalColor = mix(finalColor, duotone * 1.4, ch4Factor * 0.95);
    }

    // Vignette falloff around edges of monolith
    float d = distance(uv, vec2(0.5));
    finalColor *= smoothstep(0.72, 0.35, d);

    gl_FragColor = vec4(finalColor, 1.0);
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

  // Load portrait texture
  const texture = useTexture("/images/arkan-portrait.png");

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
      tiltImpulse.current = 0.35;
      prevMode.current = mode;
    }
  }, [mode]);

  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture },
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uVelocity: { value: 0 },
      uDepthScale: { value: 0.35 },
      uPersona: { value: 0.0 },
      uChapter: { value: 0 },
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
    
    // Smooth lerp for uPersona (0.0 for engineer, 1.0 for creator)
    const targetPersona = mode === "engineer" ? 0.0 : 1.0;
    mat.uniforms.uPersona.value = THREE.MathUtils.lerp(mat.uniforms.uPersona.value, targetPersona, 0.08);

    // Map scrollProgress (0 to 1) to chapters (0.0 to 3.0)
    const chapter = scrollProgress * 3.0;
    mat.uniforms.uChapter.value = chapter;

    // Hover state interpolation
    const targetHover = hoveredProject !== null ? 1.0 : 0.0;
    mat.uniforms.uHover.value = THREE.MathUtils.lerp(mat.uniforms.uHover.value, targetHover, 0.1);
    if (hoveredProject !== null) {
      mat.uniforms.uHoverIndex.value = hoveredProject;
    }

    // ── CHAPTER-CHOREOGRAPHED TRANSFORMS ──
    const baseW = Math.min(viewport.width * 0.38, 3.8);
    const baseH = baseW / 0.746;
    meshRef.current.scale.set(baseW, baseH, 1);

    let targetX = 0;
    let targetY = 0;
    let targetZ = 0;
    let targetRotY = 0;

    if (chapter < 0.8) {
      // Section 01 (Hero): Center [0, 0, 0]
      targetX = mouse.current.x * 0.2;
      targetY = mouse.current.y * 0.2;
      targetZ = 0;
      targetRotY = mouse.current.x * 0.12;
    } else if (chapter < 1.8) {
      // Section 02 (About): Left Column [-2.2, 0, 0], rotY 0.25 rad
      const t = (chapter - 0.8) / 1.0;
      targetX = THREE.MathUtils.lerp(0, -2.2, t) + mouse.current.x * 0.15;
      targetY = mouse.current.y * 0.15;
      targetZ = 0;
      targetRotY = THREE.MathUtils.lerp(0, 0.25, t) + mouse.current.x * 0.08;
    } else if (chapter < 2.6) {
      // Section 03 (Works): Right Column [2.0, 0, -0.5], rotY -0.2 rad
      const t = (chapter - 1.8) / 0.8;
      targetX = THREE.MathUtils.lerp(-2.2, 2.0, t) + mouse.current.x * 0.18;
      targetY = mouse.current.y * 0.18;
      targetZ = THREE.MathUtils.lerp(0, -0.5, t);
      targetRotY = THREE.MathUtils.lerp(0.25, -0.2, t);
    } else {
      // Section 04 (Finale): Silhouette Far Back [0, -0.4, -2.0]
      const t = (chapter - 2.6) / 0.4;
      targetX = THREE.MathUtils.lerp(2.0, 0, t);
      targetY = -0.4;
      targetZ = THREE.MathUtils.lerp(-0.5, -2.0, t);
      targetRotY = THREE.MathUtils.lerp(-0.2, -0.1, t);
    }

    // Apply quick tilt impulse when persona changes
    const impulseRotZ = Math.sin(mat.uniforms.uTime.value * 14.0) * tiltImpulse.current;
    const impulseRotY = tiltImpulse.current * (mode === "engineer" ? -0.15 : 0.15);

    meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, targetX, 0.08);
    meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, 0.08);
    meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, targetZ, 0.08);
    meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRotY + impulseRotY, 0.08);
    meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, -mouse.current.y * 0.1, 0.08);
    meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, impulseRotZ, 0.1);
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <planeGeometry args={[1, 1, 96, 96]} />
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
