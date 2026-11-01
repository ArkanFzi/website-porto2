"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ExternalLink } from "lucide-react";
import type { Perjalanan } from "@/lib/server/journey";
import { usePortfolioMode } from "@/context/PortfolioModeContext";

interface CareerPhase {
  id: string;
  phase: string;
  title: string;
  org: string;
  year: string;
  summary: string;
  specs: string[];
  link?: string;
}

const ENGINEER_PHASES: CareerPhase[] = [
  {
    id: "01",
    phase: "PHASE 01 // CORE ARCHITECTURE",
    title: "Software Engineering Foundations",
    org: "SMKN 6 MALANG",
    year: "2024",
    summary: "Ignited engineering discipline through procedural and OOP paradigms. Deep dive into algorithms, system data structures, memory management, and robust low-level application architecture.",
    specs: ["PHP / C#", "OOP PARADIGMS", "DATA STRUCTURES", "ALGORITHMS"],
    link: "https://smkn6malang.sch.id",
  },
  {
    id: "02",
    phase: "PHASE 02 // DISTRIBUTED MICROSERVICES",
    title: "Industrial Class & Fullstack Systems",
    org: "SEKAWAN MEDIA ACADEMY",
    year: "2024 — 2025",
    summary: "Selected for intensive industrial mentorship. Mastered modern fullstack microservices architecture, Next.js App Router, API gateway contracts, and resilient service boundaries.",
    specs: ["NEXT.JS APP ROUTER", "DISTRIBUTED APIS", "TYPESCRIPT", "GO ENGINE"],
    link: "https://sekawanmedia.co.id",
  },
  {
    id: "03",
    phase: "PHASE 03 // ENTERPRISE HIGH-AVAILABILITY",
    title: "Full Stack Engineer Apprentice",
    org: "SEKAWAN MEDIA",
    year: "MAY 2026 — PRESENT",
    summary: "Active contributor maintaining and engineering two mission-critical enterprise microservices platforms (HRIS and recruitment ecosystems) with high-availability, low-latency PostgreSQL queries, and Docker virtualization.",
    specs: ["ENTERPRISE MICROSERVICES", "POSTGRESQL / GO", "DOCKER", "HIGH-CONCURRENCY"],
    link: "https://sekawanmedia.co.id",
  },
  {
    id: "04",
    phase: "PHASE 04 // COMPILER AST & SYSTEM TUNING",
    title: "Compiler AST Engines & Kernel Tuning",
    org: "GITHUB OPEN SOURCE",
    year: "2026",
    summary: "Architected and published graphify-devkit (AST-based codebase knowledge graph engine extracting cross-file AST dependencies with zero network overhead) and optimized Linux kernel workloads.",
    specs: ["TREE-SITTER AST", "GRAPH THEORY", "LINUX KERNEL", "NETWORKX"],
    link: "https://github.com/ArkanFzi",
  },
];

const CREATOR_PHASES: CareerPhase[] = [
  {
    id: "01",
    phase: "PHASE 01 // HAUTE-COUTURE DESIGN SYSTEMS",
    title: "Swiss Grid & Typography Foundations",
    org: "SMKN 6 MALANG & DESIGN LAB",
    year: "2024",
    summary: "Developed an obsessive eye for typography scales, Swiss International Style, visual tension, and systematic token hierarchies. Mastered restraint as the supreme expression of luxury UI craft.",
    specs: ["SWISS GRID SYSTEM", "HAUTE-COUTURE TOKENS", "EDITORIAL LAYOUT"],
    link: "https://smkn6malang.sch.id",
  },
  {
    id: "02",
    phase: "PHASE 02 // GENERATIVE AI & MULTIMODAL PIPELINES",
    title: "Pickertime Gemini Experience Engine",
    org: "SEKAWAN MEDIA ACADEMY",
    year: "2024 — 2025",
    summary: "Integrated Google Gemini LLM API into a fluid conversational interface. Engineered natural language meeting synthesis and real-time generative UI feedback loops.",
    specs: ["GEMINI 1.5 PRO", "MULTIMODAL AI", "GENERATIVE UI", "NATURAL LANGUAGE"],
    link: "https://sekawanmedia.co.id",
  },
  {
    id: "03",
    phase: "PHASE 03 // REAL-TIME 3D WEBGL & SHADERS",
    title: "Volumetric Shaders & Spatial Atelier",
    org: "AWWWARDS RESEARCH",
    year: "MAY 2026 — PRESENT",
    summary: "Sculpting immersive WebGL experiences using React Three Fiber, custom GLSL vertex/fragment displacement, luminance-driven depth maps, and velocity-coupled chromatic aberration.",
    specs: ["R3F / THREE.JS", "CUSTOM GLSL SHADERS", "LUMINANCE DISPLACEMENT", "CHROMATIC ABERRATION"],
    link: "https://sekawanmedia.co.id",
  },
  {
    id: "04",
    phase: "PHASE 04 // SPATIAL DESKTOP & WAYLAND UI",
    title: "Ferrari Ubuntu & Workstation Craft",
    org: "GITHUB OPEN SOURCE",
    year: "2026",
    summary: "Conceived and engineered ferrari-ubuntu: an aerodynamic desktop environment with custom GTK4 styling, Rosso Corsa accents, and tactile spatial window management for focused craft.",
    specs: ["GTK4 / WAYLAND", "MONZA RED AESTHETICS", "SPATIAL INTERACTION", "DARK LUXURY"],
    link: "https://github.com/ArkanFzi",
  },
];

export const ChapterDuality: React.FC<{ perjalanan?: Perjalanan[] }> = ({ perjalanan }) => {
  const { mode } = usePortfolioMode();
  const [activePhase, setActivePhase] = useState<string>("03");

  // Blend backend dynamic journey records if populated in database
  const hasDynamicDb = perjalanan && perjalanan.length >= 3;
  const currentPhases = hasDynamicDb
    ? perjalanan.map((p, idx) => ({
        id: String(idx + 1).padStart(2, "0"),
        phase: `PHASE ${String(idx + 1).padStart(2, "0")} // SECTOR ${idx + 1}`,
        title: p.title,
        org: p.linkLabel || "SEKAWAN MEDIA",
        year: p.year,
        summary: p.body,
        specs: ["POSTGRESQL SYNCED", "VERIFIED TELEMETRY"],
        link: p.linkHref,
      }))
    : (mode === "engineer" ? ENGINEER_PHASES : CREATOR_PHASES);

  return (
    <section
      id="chapter-02"
      className="relative w-full min-h-screen pt-36 sm:pt-44 pb-48 px-6 md:px-12 select-none"
    >
      <div className="w-full max-w-[1600px] mx-auto">
        
        {/* ── Top Header Tags ── */}
        <div className="flex items-center justify-between pb-6 swiss-border-b mb-16">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#D41E12]" />
            <span className="font-mono text-[11px] font-bold tracking-[0.25em] uppercase text-[#D41E12]">
              CHAPTER 02 // THE DUALITY & RACING LINE
            </span>
          </div>

          <div className="flex items-center gap-3">
            {hasDynamicDb && (
              <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-[#D41E12]">
                ● DB LIVE
              </span>
            )}
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#6E6A64]">
              {mode === "engineer" ? "SYSTEMS DISCIPLINE // SECTOR TIMING" : "CREATIVE VISION // SPATIAL TIMING"}
            </span>
          </div>
        </div>

        {/* ── 2-Column Grid (Reserved space on left md:col-span-5 for 3D Monolith) ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 lg:gap-16 items-start">
          
          {/* Left Column: Reserved clean space for 3D Monolith */}
          <div className="hidden md:block md:col-span-5 min-h-[400px] lg:min-h-[550px] pointer-events-none" />

          {/* Right Column: Editorial Headline & Swiss Line List */}
          <div className="col-span-1 md:col-span-7 flex flex-col">
            
            {/* Elegant Editorial Headline with Persona Motion */}
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="mb-14"
              >
                <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-[#D41E12] block mb-3">
                  {mode === "engineer" ? "THE DISCIPLINE // ENGINEERING" : "THE PHILOSOPHY // CREATIVE CRAFT"}
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#0A0A0A] leading-[1.08] mb-6">
                  {mode === "engineer" ? (
                    <>
                      ARCHITECTING SYSTEMS,<br />
                      ENGINEERING RELIABILITY.
                    </>
                  ) : (
                    <>
                      SCULPTING SPATIAL WEB,<br />
                      ELEVATING THE ESSENTIAL.
                    </>
                  )}
                </h2>
                <p className="font-sans text-sm sm:text-base text-[#6E6A64] leading-relaxed max-w-2xl">
                  {mode === "engineer"
                    ? "Formed in Malang and sharpened through enterprise production at Sekawan Media. Engineering microservices with Go and PostgreSQL, constructing AST knowledge graphs, and maintaining high-availability SLAs. Zero bloat, maximum velocity."
                    : "Merging haute-couture editorial typography with real-time WebGL shader physics. Every pixel, displacement vector, and optical rim light is placed with intentional poise. Restraint as the ultimate flex."}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Swiss Editorial Line List (Transparent, Separated by Hairline Borders) */}
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full flex flex-col border-t border-[rgba(10,10,10,0.12)]"
              >
                {currentPhases.map((item) => {
                  const isOpen = activePhase === item.id;
                  return (
                    <div
                      key={item.id}
                      className="group border-b border-[rgba(10,10,10,0.12)] hover:border-[#D41E12] transition-colors duration-300 py-6 sm:py-8 cursor-pointer"
                      onClick={() => setActivePhase(isOpen ? "" : item.id)}
                    >
                      <div className="flex items-start sm:items-center justify-between gap-4">
                        
                        <div className="flex items-start sm:items-center gap-4 sm:gap-6">
                          <span className="font-mono text-xs sm:text-sm font-bold text-[#D41E12] pt-0.5 sm:pt-0">
                            /{item.id}
                          </span>
                          
                          <div>
                            <span className="font-mono text-[9px] tracking-[0.22em] uppercase text-[#6E6A64] block mb-1">
                              {item.phase} • {item.org}
                            </span>
                            <h3
                              className={`font-serif text-xl sm:text-2xl font-bold transition-colors duration-300 ${
                                isOpen ? "text-[#D41E12]" : "text-[#0A0A0A] group-hover:text-[#D41E12]"
                              }`}
                            >
                              {item.title}
                            </h3>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0 pt-1 sm:pt-0">
                          <span className="font-mono text-xs font-bold text-[#0A0A0A]/70">
                            {item.year}
                          </span>
                          <ChevronDown
                            className={`w-4 h-4 text-[#D41E12] transition-transform duration-300 ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      </div>

                      {/* Accordion Content */}
                      {isOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          transition={{ duration: 0.3 }}
                          className="pt-4 mt-4 pl-8 sm:pl-12"
                        >
                          <p className="font-sans text-xs sm:text-sm text-[#6E6A64] leading-relaxed mb-4 max-w-2xl">
                            {item.summary}
                          </p>

                          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                            <div className="flex flex-wrap gap-2">
                              {item.specs.map((spec, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="font-mono text-[9px] font-bold px-2 py-0.5 rounded-sm bg-[#0A0A0A]/5 text-[#0A0A0A] uppercase tracking-wider"
                                >
                                  {spec}
                                </span>
                              ))}
                            </div>

                            {item.link && (
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold text-[#D41E12] hover:underline uppercase tracking-wider"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span>INSPECT RECORD</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </motion.div>
            </AnimatePresence>

          </div>

        </div>

      </div>
    </section>
  );
};

export default ChapterDuality;
