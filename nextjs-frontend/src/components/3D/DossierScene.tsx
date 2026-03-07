"use client";

import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { ScrollControls, Environment, PerspectiveCamera, OrbitControls } from "@react-three/drei";
import TopSecretFolder from "./TopSecretFolder";
import Preloader from "@/components/UI/Preloader"; // reuse existing preloader

export default function DossierScene() {
    return (
        <div className="w-full h-screen bg-[#020307]">
            {/* HTML Overlay hints */}
            <div className="fixed top-1/2 left-4 md:left-10 -translate-y-1/2 flex flex-col items-center gap-10 z-[100] pointer-events-none mb-4 mix-blend-difference">
                <span className="text-[10px] text-white/50 tracking-[0.3em] font-mono transform -rotate-90">SCROLL</span>
                <div className="w-[1px] h-20 bg-gradient-to-b from-white to-transparent opacity-50 relative">
                    {/* Scroll animated dot */}
                    <div className="absolute top-0 left-[-2px] w-[5px] h-[5px] rounded-full bg-white opacity-80 animate-[bounce_2s_infinite]" />
                </div>
            </div>

            <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] pointer-events-none text-center">
                <h1 className="text-white/20 font-sans font-black text-[12vw] tracking-tighter uppercase whitespace-nowrap opacity-10 select-none">
                    DOSSIER
                </h1>
            </div>

            <Suspense fallback={<Preloader />}>
                {/* Wider FOV and pulled back camera for a broader view */}
                <Canvas shadows dpr={[1, 2.5]}>
                    <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={35} />

                    {/* Cinematic Lighting Setup */}
                    <ambientLight intensity={0.2} color="#ffffff" />

                    {/* Main spotlight aimed at the folder */}
                    <spotLight
                        position={[5, 5, 5]}
                        angle={0.25}
                        penumbra={1}
                        intensity={2}
                        color="#ffffff"
                        castShadow
                        shadow-bias={-0.0001}
                    />

                    {/* Fill light coming from left */}
                    <directionalLight position={[-5, 2, 0]} intensity={0.5} color="#c49a56" />

                    {/* Accent light coming from below/behind for cinematic edges */}
                    <pointLight position={[0, -2, -2]} intensity={1} color="#1a5c3a" />

                    <ScrollControls pages={3} damping={0.25}>
                        <TopSecretFolder />
                    </ScrollControls>
                </Canvas>
            </Suspense>
        </div>
    );
}
