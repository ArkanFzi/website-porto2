"use client";

import { Canvas } from '@react-three/fiber';
import { Stars, Preload } from '@react-three/drei';
import { Suspense } from 'react';

interface SceneProps {
  children?: React.ReactNode;
}

export default function Scene({ children }: SceneProps) {
  return (
    <div className="fixed inset-0 z-[-1] w-full h-full pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 1] }}
        dpr={[1, 1.5]}          // Cap at 1.5x — was 2x (big win on retina)
        gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
      >
        <Suspense fallback={null}>
          {children}
          <Stars
            radius={100}
            depth={50}
            count={1500}         // Was 5000 — cut by 70%
            factor={4}
            saturation={0}
            fade
            speed={0.5}          // Slower movement = less GPU work
          />
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <Preload all />
        </Suspense>
      </Canvas>
    </div>
  );
}
