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

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);

    vec3 pos = position;

    // Volumetric liquid wave when scroll velocity is high
    float wave = sin(pos.y * 3.5 + uTime * 2.5) * cos(pos.x * 2.5 + uTime * 1.8);
    pos.z += wave * clamp(uVelocity * 0.12, -0.3, 0.3);

    // Micro interactive cursor parallax tilt
    pos.z += (uMouse.x * pos.x + uMouse.y * pos.y) * 0.18;

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
  uniform float uMode; // 0.0 = engineer, 1.0 = creator
  uniform float uChapter; // 0.0 to 3.0
  uniform float uHover;
  uniform float uHoverIndex;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vec2 uv = vUv;

    // Liquid Chromatic Aberration on velocity
    float aberration = clamp(abs(uVelocity) * 0.025, 0.0, 0.04);
    vec2 dir = normalize(uv - 0.5 + vec2(0.001));

    float r = texture2D(uTexture, uv + dir * aberration * 1.5).r;
    float g = texture2D(uTexture, uv).g;
    float b = texture2D(uTexture, uv - dir * aberration * 1.5).b;
    vec3 baseColor = vec3(r, g, b);

    // Luminance computation
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

    // Start with crisp high-contrast monochrome
    vec3 finalColor = vec3(lum);

    // Add specular rim light
    finalColor += rimColor * (0.6 + diffuse * 0.4);

    // ── MODE 1: THE ENGINEER (Topographic Laser Red Contours) ──
    if (uMode < 0.5) {
      float lines = abs(fract(lum * 14.0 + uTime * 0.1) - 0.5);
      float laser = smoothstep(0.05, 0.01, lines);
      finalColor = mix(finalColor, vec3(0.83, 0.117, 0.07), laser * 0.55 * (1.0 - lum));
    }
    // ── MODE 2: THE CREATOR (Warm Cinematic Halation & Silk Glow) ──
    else {
      vec3 halation = vec3(0.98, 0.12, 0.05) * pow(lum, 2.2) * 0.5;
      finalColor += halation;
    }

    // ── CHAPTER 3 HOVER: PROJECT AURA ──
    if (uHover > 0.01) {
      float pulse = sin(uTime * 3.0) * 0.5 + 0.5;
      vec3 projectAura = vec3(0.83, 0.117, 0.07) * pulse * 0.7;
      finalColor = mix(finalColor, finalColor * vec3(1.2, 0.4, 0.3) + projectAura, uHover * 0.7);
    }

    // ── CHAPTER 4 FINALE: HIGH-CONTRAST SCUDERIA RED DUOTONE ──
    float ch4Factor = smoothstep(2.3, 3.0, uChapter);
    if (ch4Factor > 0.001) {
      vec3 deepCrimson = vec3(0.478, 0.043, 0.02);
      vec3 brightRosso = vec3(0.831, 0.117, 0.07);
      vec3 duotone = mix(deepCrimson, brightRosso, lum);
      finalColor = mix(finalColor, duotone * 1.4, ch4Factor * 0.92);
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

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouse.current.targetX = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture },
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uVelocity: { value: 0 },
      uDepthScale: { value: 0.35 },
      uMode: { value: 0.0 },
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

    mat.uniforms.uTime.value += delta;
    mat.uniforms.uMouse.value.set(mouse.current.x, mouse.current.y);
    mat.uniforms.uVelocity.value = THREE.MathUtils.lerp(mat.uniforms.uVelocity.value, scrollVelocity, 0.1);
    mat.uniforms.uMode.value = THREE.MathUtils.lerp(mat.uniforms.uMode.value, mode === "engineer" ? 0.0 : 1.0, 0.1);

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
    const baseW = Math.min(viewport.width * 0.4, 4.2);
    const baseH = baseW / 0.746;
    meshRef.current.scale.set(baseW, baseH, 1);

    let targetX = 0;
    let targetY = 0;
    let targetZ = 0;
    let targetRotY = 0;

    if (chapter < 1.0) {
      targetX = mouse.current.x * 0.2;
      targetY = mouse.current.y * 0.2;
      targetZ = 0;
      targetRotY = mouse.current.x * 0.12;
    } else if (chapter < 2.0) {
      const t = chapter - 1.0;
      targetX = THREE.MathUtils.lerp(0, -viewport.width * 0.24, t) + mouse.current.x * 0.15;
      targetY = mouse.current.y * 0.15;
      targetZ = THREE.MathUtils.lerp(0, -0.2, t);
      targetRotY = THREE.MathUtils.lerp(0, 0.26, t) + mouse.current.x * 0.08;
    } else if (chapter < 2.8) {
      const t = (chapter - 2.0) / 0.8;
      targetX = THREE.MathUtils.lerp(-viewport.width * 0.24, 0, t) + mouse.current.x * 0.2;
      targetY = mouse.current.y * 0.2;
      targetZ = THREE.MathUtils.lerp(-0.2, -0.7, t);
      targetRotY = THREE.MathUtils.lerp(0.26, 0, t);
    } else {
      const t = (chapter - 2.8) / 0.2;
      targetX = 0;
      targetY = -0.3;
      targetZ = THREE.MathUtils.lerp(-0.7, -1.8, t);
      targetRotY = -0.12;
    }

    meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, targetX, 0.08);
    meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, 0.08);
    meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, targetZ, 0.08);
    meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRotY, 0.08);
    meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, -mouse.current.y * 0.1, 0.08);
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
