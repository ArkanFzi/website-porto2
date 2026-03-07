"use client";

import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useScroll, Html } from "@react-three/drei";
import * as THREE from "three";
import DossierContent from "./DossierContent";

export default function TopSecretFolder() {
    const groupRef = useRef<THREE.Group>(null);
    const frontCoverRef = useRef<THREE.Mesh>(null);
    const backCoverRef = useRef<THREE.Mesh>(null);
    const papersGroupRef = useRef<THREE.Group>(null);
    const scroll = useScroll();

    // Basic folder dimensions
    const width = 3.5;
    const height = 4.5;
    const depth = 0.05;

    useFrame((state, delta) => {
        // scroll.offset goes from 0 to 1
        const offset = scroll.offset;

        // 1. Initial Rotation (starts tilted, rotates to face camera as you scroll a bit)
        if (groupRef.current) {
            // Start at -Math.PI / 4, rotate to 0 at offset 0.2
            const targetRotX = THREE.MathUtils.lerp(-Math.PI / 6, 0, Math.min(offset / 0.15, 1));
            const targetRotY = THREE.MathUtils.lerp(-Math.PI / 8, 0, Math.min(offset / 0.15, 1));

            // Keep the folder scale consistent, we zoom the camera instead
            const targetScale = 0.5;

            groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, targetRotX, 4, delta);
            groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, targetRotY, 4, delta);
            groupRef.current.scale.setScalar(THREE.MathUtils.damp(groupRef.current.scale.x, targetScale, 4, delta));

            // Move folder slightly up as it opens
            const targetY = THREE.MathUtils.lerp(-1, 0.5, offset);
            groupRef.current.position.y = THREE.MathUtils.damp(groupRef.current.position.y, targetY, 4, delta);
        }

        // --- NEW: Camera Zoom Effect ---
        // Start at Z: 8. As we scroll (offset 0.1 to 0.4), swoop the camera in closer to Z: 3.5
        // Also move it up slightly on Y so we look down into the papers.
        let camProgress = 0;
        if (offset > 0.1) {
            camProgress = Math.min((offset - 0.1) / 0.4, 1);
        }
        const targetCamZ = THREE.MathUtils.lerp(8, 3.8, camProgress);
        const targetCamY = THREE.MathUtils.lerp(0, 0.8, camProgress);
        state.camera.position.z = THREE.MathUtils.damp(state.camera.position.z, targetCamZ, 4, delta);
        state.camera.position.y = THREE.MathUtils.damp(state.camera.position.y, targetCamY, 4, delta);

        // 2. Open the Front Cover
        if (frontCoverRef.current) {
            // Open cover from angle 0 to Math.PI between offset 0.2 and 0.5 (positive angle swings towards camera)
            let coverProgress = 0;
            if (offset > 0.2) {
                coverProgress = Math.min((offset - 0.2) / 0.3, 1);
            }
            const targetCoverAngle = THREE.MathUtils.lerp(0, Math.PI * 0.85, coverProgress);
            frontCoverRef.current.rotation.y = THREE.MathUtils.damp(frontCoverRef.current.rotation.y, targetCoverAngle, 5, delta);
        }

        // 3. Fan out the papers
        if (papersGroupRef.current) {
            // Fan out dramatically between offset 0.3 and 1.0
            let paperProgress = 0;
            if (offset > 0.3) {
                paperProgress = Math.min((offset - 0.3) / 0.7, 1);
            }

            papersGroupRef.current.children.forEach((paper, index) => {
                // Stagger the papers slightly more for depth
                const stagger = index * 0.2;
                const p = Math.max(0, paperProgress - stagger);

                // Emphasize the Z-depth (flying out towards the camera)
                // Paper 0 stays deeper, Paper 2 flies much closer
                const targetZ = THREE.MathUtils.lerp(0.01 * index, 0.2 + (index * 1.5), p);
                // Move them up so they stack vertically but offset downwards slightly to read like a waterfall
                const targetY = THREE.MathUtils.lerp(0, (index - 1) * -1.2, p);

                // Add a dynamic X rotation so it looks like they are floating in mid-air
                const targetRotX = THREE.MathUtils.lerp(0, index === 0 ? 0.05 : index === 1 ? -0.15 : 0.1, p);
                // Subtle Y rotation for a scattered look
                const targetRotY = THREE.MathUtils.lerp(0, index === 0 ? -0.05 : index === 1 ? 0.05 : -0.02, p);

                paper.position.z = THREE.MathUtils.damp(paper.position.z, targetZ, 4, delta);
                paper.position.y = THREE.MathUtils.damp(paper.position.y, targetY, 4, delta);
                paper.rotation.x = THREE.MathUtils.damp(paper.rotation.x, targetRotX, 4, delta);
                paper.rotation.y = THREE.MathUtils.damp(paper.rotation.y, targetRotY, 4, delta);
            });
        }
    });

    // Folder Materials
    const folderMaterial = new THREE.MeshStandardMaterial({
        color: "#0c0d10", // Dark grey/black
        roughness: 0.9,
        metalness: 0.1,
    });

    const paperMaterial = new THREE.MeshStandardMaterial({
        color: "#e8e9e4", // Off-white/cream
        roughness: 0.8,
    });

    return (
        <group ref={groupRef} position={[0, -1, 0]}>

            {/* Back Cover */}
            <mesh ref={backCoverRef} position={[0, 0, -depth / 2]} castShadow receiveShadow>
                <boxGeometry args={[width, height, depth]} />
                <primitive object={folderMaterial} />
                {/* Top Secret Stamp on inside back cover */}
                <Html position={[0, height / 3, 0.03]} transform occlude center scale={1 / 100}>
                    <div className="text-[#a0a0a0] font-mono font-bold text-4xl uppercase tracking-widest opacity-30 transform -rotate-12 border-8 border-[#a0a0a0] px-6 py-2 select-none pointer-events-none w-max">
                        RESTRICTED DATA
                    </div>
                </Html>
            </mesh>

            {/* Front Cover Container (hinged on the left edge) */}
            <group position={[-width / 2, 0, depth / 2]}>
                {/* Mesh is translated right by half width. This makes the left edge the origin. */}
                <mesh ref={frontCoverRef} position={[width / 2, 0, 0]} castShadow receiveShadow>
                    <boxGeometry args={[width, height, depth]} />
                    <primitive object={folderMaterial} />

                    {/* Front Cover Decals */}
                    {/* The mesh is translated by +width/2 to the right from the left hinge.
                        To center the HTML on the front cover, its local X position needs to be 0
                        because its parent mesh is centered at width/2 relative to the hinge group. */}
                    <Html position={[0, 0, 0.03]} transform occlude center scale={1 / 100}>
                        <div className="flex flex-col items-center justify-center pointer-events-none select-none w-[400px] h-[500px]">
                            <div className="w-20 h-20 border-2 border-[#c49a56] rounded-full mb-8 flex items-center justify-center opacity-80 shadow-lg bg-black/40">
                                <div className="w-16 h-16 border border-[#c49a56] rounded-full flex items-center justify-center">
                                    <span className="text-[#c49a56] font-serif italic text-3xl font-bold">Fz</span>
                                </div>
                            </div>
                            <h1 className="text-[#c49a56] font-sans font-bold text-6xl uppercase tracking-[0.3em] opacity-90 mb-4 drop-shadow-md">DOSSIER</h1>
                            <div className="h-[2px] w-48 bg-[#c49a56] opacity-50 mb-8" />
                            <span className="text-[#a0a0a0] font-mono text-xl uppercase tracking-widest opacity-70 text-center font-bold drop-shadow-sm">EYES ONLY • CLASSIFIED<br />SYSTEM ARCHITECT</span>
                        </div>
                    </Html>
                </mesh>
            </group>

            {/* Papers floating out */}
            {/* Start papers directly in the center above the back cover */}
            <group ref={papersGroupRef} position={[0, 0, depth]}>

                {/* Paper 1: Profile Summary */}
                <mesh position={[0, 0, 0.01]} receiveShadow castShadow>
                    <planeGeometry args={[width * 0.95, height * 0.95]} />
                    <primitive object={paperMaterial} />
                    <DossierContent pageIndex={0} width={width * 0.95} height={height * 0.95} />
                </mesh>

                {/* Paper 2: Experience */}
                <mesh position={[0, 0, 0.02]} receiveShadow castShadow>
                    <planeGeometry args={[width * 0.95, height * 0.95]} />
                    <primitive object={paperMaterial} />
                    <DossierContent pageIndex={1} width={width * 0.95} height={height * 0.95} />
                </mesh>

                {/* Paper 3: Skills & Final Notes */}
                <mesh position={[0, 0, 0.03]} receiveShadow castShadow>
                    <planeGeometry args={[width * 0.95, height * 0.95]} />
                    <primitive object={paperMaterial} />
                    <DossierContent pageIndex={2} width={width * 0.95} height={height * 0.95} />
                </mesh>

            </group>

        </group>
    );
}
