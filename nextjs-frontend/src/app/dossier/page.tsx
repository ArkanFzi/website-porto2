"use client";

import React from "react";
import { motion } from "framer-motion";
import Navigation from "@/app/components/Navigation";
import DataCards from "@/components/Dossier/DataCards";
import SuperCTA from "@/components/Dossier/SuperCTA";

// Remove metadata export since this is now a client component
// export const metadata = {
//     title: "Dossier — M. Arkan Fauzi",
//     description: "Classified professional record and experience of M. Arkan Fauzi.",
// };

export default function DossierPage() {
    return (
        <main className="w-full bg-[#111111] min-h-screen text-white font-sans selection:bg-[#c49a56]/30 overflow-x-hidden">
            <div className="fixed top-0 z-[1000] w-full">
                <Navigation />
            </div>

            {/* 1. HERO SECTION (Folioblox Style) */}
            <div className="relative w-full h-[90vh] min-h-[700px] rounded-b-[4rem] overflow-hidden bg-black flex flex-col justify-between pt-32 px-12 md:px-24 pb-12 shadow-2xl">
                {/* Background Image & Gradient Overlays */}
                <div className="absolute inset-0 z-0 overflow-hidden">
                    <img
                        src="https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&q=80&w=2000"
                        alt="Dark Cyber Topography"
                        className="w-full h-full object-cover object-center opacity-[0.85] grayscale"
                    />
                    <div className="absolute inset-0 bg-[#0a0f0c]/70 mix-blend-multiply" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-transparent to-black/50" />
                </div>

                {/* Hero Top Content */}
                <motion.div 
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                    className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end w-full mt-12 gap-12"
                >
                    <div className="flex flex-col">
                        <span className="text-xl md:text-2xl font-medium mb-4 text-white/90">Halo, saya</span>
                        <h1 className="text-5xl md:text-[7vw] font-bold leading-[0.9] tracking-tighter text-white">
                            M. Arkan Fauzi.
                        </h1>
                    </div>

                    <div className="max-w-xs md:mb-[1vw]">
                        <h3 className="text-2xl font-bold mb-4">Kode adalah seni.</h3>
                        <p className="text-sm text-white/60 leading-relaxed font-light">
                            Dari arsitektur backend yang kokoh hingga antarmuka pengguna yang menawan, saya membangun ekosistem digital yang fungsional dan estetis.
                        </p>
                    </div>
                </motion.div>

                {/* Hero Bottom Columns */}
                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.8, ease: "easeOut" }}
                    className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-8 w-full border-t border-white/10 pt-8 mt-16"
                >
                    <div>
                        <span className="text-[#ff5500] font-mono text-xs block mb-2">/ 01</span>
                        <h4 className="text-sm font-medium text-white/80">Arsitektur Perangkat Lunak</h4>
                    </div>
                    <div>
                        <span className="text-[#ff5500] font-mono text-xs block mb-2">/ 02</span>
                        <h4 className="text-sm font-medium text-white/80">Pengembangan Antarmuka</h4>
                    </div>
                    <div>
                        <span className="text-[#ff5500] font-mono text-xs block mb-2">/ 03</span>
                        <h4 className="text-sm font-medium text-white/80">Integrasi Sistem Backend</h4>
                    </div>
                    <div>
                        <span className="text-[#ff5500] font-mono text-xs block mb-2">/ 04</span>
                        <h4 className="text-sm font-medium text-white/80">Desain UI/UX Eksperimental</h4>
                    </div>
                </motion.div>
            </div>

            {/* 2. MARQUEE / TRUSTED BY (CSS Animation) */}
            <motion.div 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1 }}
                className="w-full py-12 flex items-center border-b border-white/5 bg-[#111111] px-8 relative"
            >
                {/* Static Text - Fixed on the left */}
                <span className="text-sm text-white/40 uppercase tracking-widest whitespace-nowrap z-10 shrink-0">
                    Teknologi Inti
                </span>
                
                {/* Scrolling Container - 3px gap from the text */}
                <div className="flex-1 overflow-hidden ml-[3px] relative flex items-center [mask-image:linear-gradient(to_right,transparent,black_20px,black_calc(100%-20px),transparent)]">
                    <div className="flex w-max animate-[scrollLeft_30s_linear_infinite]">
                        {/* 2 exact duplicates for perfect -50% translation */}
                        {[...Array(2)].map((_, i) => (
                            <div key={i} className="flex items-center gap-16 px-8 shrink-0" aria-hidden={i === 1 ? "true" : "false"}>
                                <span className="text-xl font-bold text-white/80 shrink-0">TypeScript</span>
                                <span className="text-xl font-bold text-white/80 shrink-0">React / Next.js</span>
                                <span className="text-xl font-bold text-white/80 shrink-0">Node.js</span>
                                <span className="text-xl font-bold text-white/80 shrink-0">Go / Golang</span>
                                <span className="text-xl font-bold text-white/80 shrink-0">C# / .NET</span>
                                <span className="text-xl font-bold text-white/80 shrink-0">JavaScript</span>
                                <span className="text-xl font-bold text-white/80 shrink-0">Laravel / Blade</span>
                                <span className="text-xl font-bold text-white/80 shrink-0">Flutter / Dart</span>
                                <span className="text-xl font-bold text-white/80 shrink-0">TailwindCSS</span>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* 3. BEHIND THE DESIGNS */}
            <section className="w-full px-12 md:px-24 py-32 bg-[#111111] overflow-hidden">
                <div className="flex flex-col md:flex-row justify-between items-start gap-16 mb-24">
                    <motion.div 
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="max-w-2xl"
                    >
                        <span className="text-[#ff5500] font-bold text-lg mb-6 block">Filosofi Kode</span>
                        <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight">
                            Membentuk Pengalaman Digital yang Bermakna
                        </h2>
                    </motion.div>
                    <motion.div 
                        initial={{ opacity: 0, x: 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                        className="max-w-sm mt-4 md:mt-16"
                    >
                        <p className="text-xl text-white/90 font-medium mb-8">
                            Fokus utama saya selalu bermuara pada kesempurnaan detail, clean code, dan fungsionalitas murni yang dibalut desain visual yang kuat.
                        </p>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-white/50">Siap membangun<br />sesuatu bersama?</span>
                            <a href="mailto:arkanfzi@example.com" className="bg-[#ff5500] text-white px-8 py-3 rounded-full text-sm font-bold hover:bg-white hover:text-[#ff5500] transition-colors flex items-center gap-2">
                                Hubungi Saya <span className="text-xl font-normal leading-none mb-1">→</span>
                            </a>
                        </div>
                    </motion.div>
                </div>

               {/* 4. DATA CARDS / SHOWCASE GRID */}
            <motion.section 
                initial={{ opacity: 0, y: 100 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="w-full px-4 md:px-12 lg:px-24 pb-32 bg-[#111111] relative z-20"
            >
                <DataCards />
            </motion.section>
            </section>

            <SuperCTA />
        </main>
    );
}
