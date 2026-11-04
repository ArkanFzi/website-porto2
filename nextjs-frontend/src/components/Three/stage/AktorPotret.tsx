"use client";

import React from "react";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";
import { usePortfolioMode } from "@/context/PortfolioModeContext";
import { fragmentShader, RASIO_POTRET, vertexShader } from "./chiaroscuroMaterial";
import { usePanggung, type PanggungProps } from "./usePanggung";

export type AktorProps = Omit<PanggungProps, "mode" | "wireframe">;

/** Aktor pertama panggung: potret chiaroscuro penulis. Polanya sama untuk objek
 *  berikutnya — pakai usePanggung (atau mesin sendiri), deklarasikan geometri,
 *  dan biarkan portal DOM yang menentukan di mana objek duduk. */
export const AktorPotret: React.FC<AktorProps> = (props) => {
  const { mode, wireframe } = usePortfolioMode();
  // Load real portrait texture from /FotoDiriFix.webp (1200x2150)
  const texture = useTexture("/FotoDiriFix.webp");
  const { meshRef, materialRef, uniforms } = usePanggung(texture, { ...props, mode, wireframe });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      {/* 1 : 1.64 aspect ratio matching clean FotoDiriFix.webp (893x1464) */}
      <planeGeometry args={[1, RASIO_POTRET, 96, 96]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

export default AktorPotret;
