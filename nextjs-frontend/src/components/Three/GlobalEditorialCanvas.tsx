"use client";

import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { ChiaroscuroMonolith } from "./ChiaroscuroMonolith";

interface CanvasProps {
  scrollProgress: number;
  hoveredProject: number | null;
  scrollVelocity: number;
}

export const GlobalEditorialCanvas: React.FC<CanvasProps> = ({
  scrollProgress,
  hoveredProject,
  scrollVelocity,
}) => {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 w-screen h-screen pointer-events-none z-[5] overflow-hidden"
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 42 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
      >
        <Suspense fallback={null}>
          <ChiaroscuroMonolith
            scrollProgress={scrollProgress}
            hoveredProject={hoveredProject}
            scrollVelocity={scrollVelocity}
          />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default GlobalEditorialCanvas;
