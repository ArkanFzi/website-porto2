import React, { useRef, useState } from "react";
import { Canvas, useFrame, invalidate } from "@react-three/fiber";
import { Float, Environment, useTexture } from "@react-three/drei";
import * as THREE from "three";

// Map languages to official Devicon SVG URLs (CORS-friendly and transparent)
const LANGUAGE_TEXTURES: Record<string, string> = {
    TypeScript: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/typescript/typescript-original.svg",
    JavaScript: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/javascript/javascript-original.svg",
    Python: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/python/python-original.svg",
    Java: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/java/java-original.svg",
    Go: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/go/go-original.svg",
    Rust: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/rust/rust-original.svg",
    Dart: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/dart/dart-original.svg",
    HTML: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/html5/html5-original.svg",
    CSS: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/css3/css3-original.svg",
    Default: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/github/github-original.svg"
};

function getTextureUrl(language?: string | null) {
    if (!language) return LANGUAGE_TEXTURES.Default;
    return LANGUAGE_TEXTURES[language] || LANGUAGE_TEXTURES.Default;
}

function DiamondMesh({ language }: { language?: string | null }) {
    const meshRef = useRef<THREE.Group>(null);
    const [hovered, setHover] = useState(false);

    const textureUrl = getTextureUrl(language);
    const texture = useTexture(textureUrl);

    // Provide proper color mapping for icons
    React.useLayoutEffect(() => {
        if (texture) {
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.generateMipmaps = true;
            texture.needsUpdate = true;
        }
    }, [texture]);

    useFrame((state, delta) => {
        if (meshRef.current) {
            if (hovered) {
                meshRef.current.rotation.y = THREE.MathUtils.lerp(
                    meshRef.current.rotation.y,
                    (state.pointer.x * Math.PI) / 2,
                    0.08
                );
                meshRef.current.rotation.x = THREE.MathUtils.lerp(
                    meshRef.current.rotation.x,
                    -(state.pointer.y * Math.PI) / 2,
                    0.08
                );
            } else {
                meshRef.current.rotation.y += delta * 0.3;
                meshRef.current.rotation.x += delta * 0.2;
            }
            invalidate(); // Request next frame only when animating
        }
    });

    return (
        <Float floatIntensity={2} rotationIntensity={0.5} speed={2}>
            <group
                ref={meshRef}
                onPointerOver={() => setHover(true)}
                onPointerOut={() => setHover(false)}
            >
                {/* Floating sprite inside that always faces camera */}
                <sprite scale={[1.6, 1.6, 1.6]}>
                    <spriteMaterial
                        map={texture}
                        transparent={true}
                        opacity={0.9}
                        depthWrite={false}
                        depthTest={false} // Will always render on top
                    />
                </sprite>

                {/* Outer Glass Diamond */}
                <mesh castShadow receiveShadow>
                    <octahedronGeometry args={[2.5, 0]} />
                    <meshPhysicalMaterial
                        color="#0c1410"
                        metalness={0.7}
                        roughness={0.05}
                        envMapIntensity={3}
                        clearcoat={1}
                        clearcoatRoughness={0.05}
                        opacity={0.7} // Semi-transparent black glass
                        transparent={true} // Replaced transmission with classic transparency
                        depthWrite={true}
                    />
                </mesh>

                {/* Outer Highlight Edge */}
                <mesh>
                    <octahedronGeometry args={[2.55, 0]} />
                    <meshBasicMaterial
                        color="#c49a56"
                        wireframe
                        transparent
                        opacity={hovered ? 0.4 : 0.15}
                        depthWrite={false}
                    />
                </mesh>
            </group>
        </Float>
    );
}

export default function Diamond3D({ language }: { language?: string | null }) {
    return (
        <div className="w-full h-full pointer-events-auto">
            <Canvas
                camera={{ position: [0, 0, 8], fov: 45 }}
                dpr={[1, 1.5]}  // Cap pixel ratio for performance
                performance={{ min: 0.5 }} // Allow adaptive quality
                gl={{ antialias: true, powerPreference: "high-performance" }}
            >
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 10, 5]} intensity={2} />
                <directionalLight position={[-10, -10, -5]} intensity={1} color="#c49a56" />

                <React.Suspense fallback={null}>
                    <DiamondMesh language={language} />
                    <Environment preset="apartment" />
                </React.Suspense>
            </Canvas>
        </div>
    );
}
