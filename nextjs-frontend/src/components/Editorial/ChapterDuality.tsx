"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { usePortfolioMode } from "@/context/PortfolioModeContext";
import { ChevronDown, ExternalLink } from "lucide-react";
import type { Perjalanan } from "@/lib/server/journey";

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

const CAREER_PHASES: CareerPhase[] = [
  {
    id: "01",
    phase: "PHASE 01 // FORMATION LAP",
    title: "Software Engineering Foundations",
    org: "SMKN 6 MALANG",
    year: "2024",
    summary: "Ignited engineering discipline through rigorous procedural and OOP paradigms. Deep dive into algorithms, system data structures, and foundational architecture.",
    specs: ["PHP / C#", "OOP PARADIGMS", "DATA STRUCTURES"],
    link: "https://smkn6malang.sch.id",
  },
  {
    id: "02",
    phase: "PHASE 02 // DRS ACCELERATION",
    title: "Industrial Class & Fullstack Systems",
    org: "SEKAWAN MEDIA ACADEMY",
    year: "2024 — 2025",
    summary: "Selected for intensive industrial mentorship. Mastered modern fullstack architecture, Next.js App Router, and integrated Pickertime with Google Gemini LLM API.",
    specs: ["NEXT.JS APP ROUTER", "GEMINI AI INTEGRATION", "REST APIS"],
    link: "https://sekawanmedia.co.id",
  },
  {
    id: "03",
    phase: "PHASE 03 // THE APEX",
    title: "Full Stack Engineer Apprentice",
    org: "SEKAWAN MEDIA",
    year: "MAY 2026 — PRESENT",
    summary: "Active contributor maintaining and engineering two mission-critical enterprise microservices platforms (HRIS and recruitment ecosystems) with high-availability requirements.",
    specs: ["ENTERPRISE MICROSERVICES", "POSTGRESQL / GO", "HIGH-CONCURRENCY"],
    link: "https://sekawanmedia.co.id",
  },
  {
    id: "04",
    phase: "PHASE 04 // SPATIAL & OPEN SOURCE",
    title: "Compiler AST Engines & Workstations",
    org: "GITHUB OPEN SOURCE",
    year: "2026",
    summary: "Created and published graphify-devkit (AST-based codebase knowledge graph engine) and ferrari-ubuntu workstation architecture for elite developer environments.",
    specs: ["AST PARSER", "THREE.JS SHADERS", "LINUX KERNEL UI"],
    link: "https://github.com/ArkanFzi",
  },
];

export const ChapterDuality: React.FC<{ perjalanan?: Perjalanan[] }> = ({ perjalanan }) => {
  const { mode } = usePortfolioMode();
  const [activePhase, setActivePhase] = useState<string>("03");

  const displayPhases = (perjalanan && perjalanan.length > 0)
    ? perjalanan.map((p, idx) => ({
        id: String(idx + 1).padStart(2, "0"),
        phase: `PHASE ${String(idx + 1).padStart(2, "0")} // SECTOR ${idx + 1}`,
        title: p.title,
        org: p.linkLabel || "SEKAWAN MEDIA",
        year: p.year,
        summary: p.body,
        specs: ["TELEMETRY VERIFIED", "FULL-CYCLE ARCHITECTURE"],
        link: p.linkHref,
      }))
    : CAREER_PHASES;

  return (
    <section
      id="chapter-02"
      className="relative w-full min-h-screen pt-32 pb-32 px-6 md:px-12 select-none"
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

          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#6E6A64]">
            CAREER TRAJECTORY // SECTOR TIMING
          </span>
        </div>

        {/* ── 2-Column Grid (Left: Space for 3D Monolith, Right: Career Accordion) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          
          {/* Left Column (Allocated space where 3D Monolith is positioned) */}
          <div className="lg:col-span-5 flex flex-col justify-end min-h-[300px] lg:min-h-[600px] pointer-events-none">
            <div className="bg-[#EFECE6]/40 p-6 rounded-xl border border-[rgba(10,10,10,0.06)] backdrop-blur-sm pointer-events-auto mt-auto max-w-sm">
              <span className="font-mono text-[9px] font-bold tracking-[0.2em] uppercase text-[#D41E12]">
                CHIAROSCURO MONOLITH // YAW 15°
              </span>
              <p className="font-sans text-xs text-[#0A0A0A]/70 leading-relaxed mt-2">
                {mode === "engineer"
                  ? "Volumetric parallax displacement derived from photograph luminance values. Reactive rim lighting simulates telemetry pit-wall light banks."
                  : "Continuous WebGL canvas tracking user gaze. Silk halation glow softens diagonal chiaroscuro shadows into editorial texture."}
              </p>
            </div>
          </div>

          {/* Right Column: Bio Statement & Career Phases Accordion */}
          <div className="lg:col-span-7 flex flex-col">
            
            {/* Editorial Bio Statement */}
            <div className="mb-14">
              <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-[#6E6A64] block mb-3">
                THE PHILOSOPHY
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#0A0A0A] leading-[1.1] mb-6">
                &ldquo;Engineering with restraint is the ultimate flex.&rdquo;
              </h2>
              <p className="font-sans text-sm sm:text-base text-[#6E6A64] leading-relaxed max-w-2xl">
                Trained in Malang, accelerated through Sekawan Media&apos;s industrial class, and now architecting scalable microservices while pioneering real-time WebGL creative tools. No unnecessary layers. Every line of code exists with purposeful aerodynamic velocity.
              </p>
            </div>

            {/* 4 Career Phases Accordion with Vertical Red Line */}
            <div className="relative pl-6 sm:pl-8">
              {/* Vertical Red Progress Line */}
              <div
                aria-hidden="true"
                className="absolute left-0 top-2 bottom-2 w-[2px] bg-[rgba(10,10,10,0.08)]"
              >
                <div className="w-full h-3/4 bg-gradient-to-b from-[#D41E12] via-[#FF2800] to-[#D41E12]" />
              </div>

              <div className="flex flex-col gap-6">
                {displayPhases.map((item) => {
                  const isOpen = activePhase === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`group p-6 rounded-xl border transition-all duration-300 cursor-pointer ${
                        isOpen
                          ? "bg-white border-[#D41E12]/40 shadow-[0_4px_24px_rgba(212,30,18,0.06)]"
                          : "bg-[#EFECE6]/30 border-[rgba(10,10,10,0.06)] hover:border-[rgba(10,10,10,0.18)]"
                      }`}
                      onClick={() => setActivePhase(isOpen ? "" : item.id)}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs font-bold text-[#D41E12]">
                            {item.id}
                          </span>
                          <div>
                            <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-[#6E6A64] block">
                              {item.phase}
                            </span>
                            <h3 className="font-serif text-lg sm:text-xl font-bold text-[#0A0A0A] mt-0.5">
                              {item.title}
                            </h3>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
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

                      {/* Expanded Content */}
                      {isOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          transition={{ duration: 0.3 }}
                          className="pt-4 mt-4 border-t border-[rgba(10,10,10,0.06)]"
                        >
                          <p className="font-sans text-xs sm:text-sm text-[#6E6A64] leading-relaxed mb-4">
                            {item.summary}
                          </p>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                            <div className="flex flex-wrap gap-2">
                              {item.specs.map((spec, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="font-mono text-[9px] font-bold px-2.5 py-1 rounded-sm bg-[#0A0A0A]/5 text-[#0A0A0A] uppercase tracking-wider"
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
                                <span>INSPECT TELEMETRY</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};

export default ChapterDuality;
