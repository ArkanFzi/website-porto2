"use client";

import React from "react";
import { Html } from "@react-three/drei";

interface DossierContentProps {
    pageIndex: number;
    width: number;
    height: number;
}

export default function DossierContent({ pageIndex, width, height }: DossierContentProps) {
    // The plane geometry is `width` x `height` in 3D units.
    // If we want sharp html text without overflow, we set a pixel ratio (e.g. 1 3D unit = 100 HTML pixels)
    const pxPerUnit = 200;

    // The CSS width/height must match the 3D limits converted to pixels
    const htmlWidth = width * pxPerUnit;
    const htmlHeight = height * pxPerUnit;

    return (
        <Html
            transform
            center
            // Setting zIndexRange securely sets HTML on top of the canvas
            zIndexRange={[100, 0]}
            position={[0, 0, 0.01]}
            // By scaling the Html down inversely proportional to the px ratio, 
            // 1 CSS pixel becomes exactly (1/pxPerUnit) 3D units.
            // This ensures the <html> block fits perfectly flush over the plane geometry.
            scale={1 / pxPerUnit}
            style={{
                width: `${htmlWidth}px`,
                height: `${htmlHeight}px`,
                // Paper styling
                backgroundColor: "transparent",
                color: "#111",
                padding: "80px",
                boxSizing: "border-box",
                fontFamily: "var(--f-sans), sans-serif",
                opacity: 0.95,
            }}
        >
            <div className="w-full h-full flex flex-col relative overflow-hidden text-2xl" style={{ fontFamily: "Montserrat, var(--f-sans), sans-serif" }}>

                {/* Common Header for all papers */}
                <div className="flex justify-between items-start border-b border-black/20 pb-4 mb-6">
                    <div className="flex flex-col">
                        <span className="font-serif font-bold text-xl tracking-tight uppercase">M. Arkan Fauzi</span>
                        <span className="font-mono text-[9px] uppercase tracking-widest text-[#1a5c3a] font-bold">Subject Record: Active</span>
                    </div>
                    <div className="text-right">
                        <span className="font-mono text-[8px] uppercase tracking-widest block text-black/50">ID: AF-6712-X</span>
                        <span className="font-mono text-[8px] uppercase tracking-widest block text-black/50">PAGE {pageIndex + 1}/3</span>
                    </div>
                </div>

                {/* Content specific to each paper */}
                {pageIndex === 0 && (
                    <div className="flex-1 flex flex-col">
                        <h2 className="font-bold uppercase tracking-widest text-xs mb-4 text-[#c49a56]">Executive Summary</h2>
                        <p className="font-serif text-justify text-xs leading-relaxed mb-6">
                            A highly specialized Software Engineer focused on architecting resilient, full-stack systems ecosystems.
                            Demonstrates exceptional proficiency in TypeScript, React, Next.js, and backend integrations (.NET, Node, Go).
                            History of rapidly learning new paradigms and deploying secure architectures.
                        </p>

                        <h2 className="font-bold uppercase tracking-widest text-xs mb-4 mt-auto text-[#c49a56]">Current Directive</h2>
                        <div className="p-3 bg-black/5 border border-black/10 text-xs font-mono leading-relaxed">
                            &gt; STATUS: Seeking highly impactful, systems-level engineering roles.<br />
                            &gt; CLEARANCE: Full-Stack Developer.<br />
                            &gt; SPECIALTY: UI/UX Engineering, Database Architecture, Performance Tuning.
                        </div>

                        <div className="absolute right-0 bottom-10 opacity-10">
                            <svg width="100" height="100" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="40" stroke="red" strokeWidth="2" fill="none" />
                                <circle cx="50" cy="50" r="30" stroke="red" strokeWidth="1" strokeDasharray="5,5" fill="none" />
                                <path d="M10,50 L90,50 M50,10 L50,90" stroke="red" strokeWidth="1" />
                            </svg>
                        </div>
                    </div>
                )}

                {pageIndex === 1 && (
                    <div className="flex-1 overflow-hidden flex flex-col">
                        <h2 className="font-bold uppercase tracking-widest text-xs mb-4 text-[#c49a56]">Operational History</h2>

                        <div className="flex-1 flex flex-col gap-4">
                            <div className="border-l-2 border-black/30 pl-3">
                                <span className="font-mono text-[9px] uppercase tracking-widest block text-black/50">2023 - Present</span>
                                <strong className="block text-sm font-serif">Full-Stack System Architect</strong>
                                <span className="text-[10px] block mt-1 leading-snug">Spearheaded the design and implementation of highly scalable Next.js and backend integrations. Optimised state management and database query efficiency.</span>
                            </div>

                            <div className="border-l-2 border-black/30 pl-3 mt-2">
                                <span className="font-mono text-[9px] uppercase tracking-widest block text-black/50">2022 - 2023</span>
                                <strong className="block text-sm font-serif">Frontend Specialist</strong>
                                <span className="text-[10px] block mt-1 leading-snug">Developed immersive, high-performance UI components using React and Framer Motion. Reduced LCP by 40% globally.</span>
                            </div>

                            <div className="border-l-2 border-black/30 pl-3 mt-2 opacity-60">
                                <span className="font-mono text-[9px] uppercase tracking-widest block text-black/50">Classified</span>
                                <strong className="block text-sm font-serif">[REDACTED PROJECT]</strong>
                                <span className="text-[10px] block mt-1 leading-snug bg-black text-black">This section is classified under the National Security Act of... this text is redacted.</span>
                            </div>
                        </div>
                    </div>
                )}

                {pageIndex === 2 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <h2 className="font-bold uppercase tracking-[0.3em] text-sm mb-8 text-black">Technological Arsenal</h2>

                        <div className="grid grid-cols-2 gap-x-12 gap-y-6 w-full px-8 text-left">
                            <div>
                                <span className="font-mono text-[9px] uppercase tracking-widest text-[#c49a56]">Frontend</span>
                                <div className="mt-2 text-xs font-serif font-bold">React / Next.js <span className="opacity-50 float-right">95%</span></div>
                                <div className="w-full h-[1px] bg-black/20 mt-1"><div className="h-full bg-black w-[95%]"></div></div>

                                <div className="mt-4 text-xs font-serif font-bold">Tailwind CSS <span className="opacity-50 float-right">90%</span></div>
                                <div className="w-full h-[1px] bg-black/20 mt-1"><div className="h-full bg-black w-[90%]"></div></div>
                            </div>
                            <div>
                                <span className="font-mono text-[9px] uppercase tracking-widest text-[#c49a56]">Backend</span>
                                <div className="mt-2 text-xs font-serif font-bold">Node.js / Express <span className="opacity-50 float-right">85%</span></div>
                                <div className="w-full h-[1px] bg-black/20 mt-1"><div className="h-full bg-black w-[85%]"></div></div>

                                <div className="mt-4 text-xs font-serif font-bold">C# / .NET <span className="opacity-50 float-right">80%</span></div>
                                <div className="w-full h-[1px] bg-black/20 mt-1"><div className="h-full bg-black w-[80%]"></div></div>
                            </div>
                        </div>

                        {/* Stamp at the bottom */}
                        <div className="mt-auto pt-8 flex w-full justify-between items-end">
                            <div className="text-left font-mono text-[8px] text-black/40">
                                GENERATED: {new Date().toISOString().split('T')[0]}<br />
                                AUTHORISED BY: SYSTEM
                            </div>
                            <div className="border-4 border-red-800 text-red-800 px-3 py-1 font-bold tracking-[0.2em] transform rotate-[-15deg] opacity-70">
                                APPROVED
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </Html>
    );
}
