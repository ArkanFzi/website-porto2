"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ExternalLink, ShieldCheck, CheckCircle2 } from "lucide-react";
import type { Perjalanan } from "@/lib/server/journey";
import { Certificate, FALLBACK_CERTIFICATES } from "@/lib/server/certificates";
import type { Experience } from "@/lib/server/experience";
import { usePortfolioMode } from "@/context/PortfolioModeContext";
import MeshPortal from "./MeshPortal";

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
    org: "GITHUB OPEN SOURCE",
    year: "MAY 2026 — PRESENT",
    summary: "Sculpting immersive WebGL experiences using React Three Fiber, custom GLSL vertex/fragment displacement, luminance-driven depth maps, and velocity-coupled chromatic aberration.",
    specs: ["R3F / THREE.JS", "CUSTOM GLSL SHADERS", "LUMINANCE DISPLACEMENT", "CHROMATIC ABERRATION"],
    link: "https://github.com/ArkanFzi/website-porto2",
  },
  {
    id: "04",
    phase: "PHASE 04 // SPATIAL DESKTOP & WAYLAND UI",
    title: "Ferrari Ubuntu & Workstation Craft",
    org: "GITHUB OPEN SOURCE",
    year: "2026",
    summary: "Conceived and engineered ferrari-ubuntu: six GNOME Shell 46 extensions plus shell CSS, dconf and GDM overrides that restyle the Ubuntu desktop in Rosso Corsa — rev-light cluster, telemetry island and a start-light login gantry.",
    specs: ["GJS / GNOME SHELL 46", "MONZA RED AESTHETICS", "SPATIAL INTERACTION", "DARK LUXURY"],
    link: "https://github.com/ArkanFzi",
  },
];

interface DualityProps {
  perjalanan?: Perjalanan[];
  certificates?: Certificate[];
  experiences?: Experience[];
}

export const ChapterDuality: React.FC<DualityProps> = ({
  perjalanan,
  certificates,
  experiences,
}) => {
  const { mode } = usePortfolioMode();
  const [activePhase, setActivePhase] = useState<string>("01");
  const certList = certificates && certificates.length > 0 ? certificates : FALLBACK_CERTIFICATES;

  // Prioritas sumber timeline: tabel experiences (Postgres) → tabel journeys → fallback hardcoded.
  const phasesDariPengalaman: CareerPhase[] = (experiences ?? []).map((e, idx) => ({
    id: String(idx + 1).padStart(2, "0"),
    phase: `PHASE ${String(idx + 1).padStart(2, "0")} // EMPLOYMENT RECORD`,
    title: e.role,
    org: e.company.toUpperCase(),
    year: e.period,
    summary: "",
    specs: ["POSTGRESQL SYNCED", "VERIFIED EMPLOYMENT"],
  }));

  const phasesDariJourney: CareerPhase[] = (perjalanan ?? []).map((p, idx) => ({
    id: String(idx + 1).padStart(2, "0"),
    phase: `PHASE ${String(idx + 1).padStart(2, "0")} // SECTOR ${idx + 1}`,
    title: p.title,
    org: p.linkLabel || "SEKAWAN MEDIA",
    year: p.year,
    summary: p.body,
    specs: ["POSTGRESQL SYNCED", "VERIFIED TELEMETRY"],
    link: p.linkHref,
  }));

  const phasesDariDb =
    phasesDariPengalaman.length > 0 || phasesDariJourney.length >= 3;

  const currentPhases =
    phasesDariPengalaman.length > 0
      ? phasesDariPengalaman
      : phasesDariJourney.length >= 3
        ? phasesDariJourney
        : mode === "engineer"
          ? ENGINEER_PHASES
          : CREATOR_PHASES;

  return (
    <section
      id="chapter-02"
      className="relative w-full min-h-screen pt-36 sm:pt-44 pb-48 px-6 md:px-12 select-none"
    >
      <MeshPortal bab={2} className="left-[16.5vw] top-[20vh] h-[60vh] w-[23vw]" />
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
            {phasesDariDb && (
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
          <div className="col-span-1 md:col-span-7 flex flex-col md:pl-10 lg:pl-16">
            
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
                      className="group border-b border-[rgba(10,10,10,0.12)] hover:border-[#D41E12] transition-colors duration-300 py-6 sm:py-8"
                    >
                      <h3 className="font-serif text-xl sm:text-2xl font-bold">
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={`phase-panel-${item.id}`}
                        onClick={() => setActivePhase(isOpen ? "" : item.id)}
                        className="w-full flex items-start sm:items-center justify-between gap-4 text-left cursor-pointer"
                      >
                        
                        <span className="flex items-start sm:items-center gap-4 sm:gap-6">
                          <span className="font-mono text-xs sm:text-sm font-bold text-[#D41E12] pt-0.5 sm:pt-0">
                            /{item.id}
                          </span>
                          
                          <span className="flex flex-col items-start">
                            <span className="font-mono text-[9px] tracking-[0.22em] uppercase text-[#6E6A64] block mb-1">
                              {item.phase} • {item.org}
                            </span>
                            <span
                              className={`transition-colors duration-300 ${
                                isOpen ? "text-[#D41E12]" : "text-[#0A0A0A] group-hover:text-[#D41E12]"
                              }`}
                            >
                              {item.title}
                            </span>
                          </span>
                        </span>

                        <span className="flex items-center gap-4 shrink-0 pt-1 sm:pt-0">
                          <span className="font-mono text-xs font-bold text-[#0A0A0A]/70">
                            {item.year}
                          </span>
                          <ChevronDown
                            className={`w-4 h-4 text-[#D41E12] transition-transform duration-300 ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          />
                        </span>
                      </button>
                      </h3>

                      {/* Accordion Content */}
                      {isOpen && (
                        <motion.div
                          id={`phase-panel-${item.id}`}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          transition={{ duration: 0.3 }}
                          className="pt-4 mt-4 pl-8 sm:pl-12"
                        >
                          {item.summary && (
                            <p className="font-sans text-xs sm:text-sm text-[#6E6A64] leading-relaxed mb-4 max-w-2xl">
                              {item.summary}
                            </p>
                          )}

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

        {/* ── PART 2: VALIDATED CREDENTIALS & CERTIFICATIONS (POSTGRESQL SYNCED) ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 lg:gap-16 items-start mt-24 pt-16 border-t border-[rgba(10,10,10,0.12)]">
          
          {/* Left Column: Reserved clean space for 3D Monolith (NO TEXT OVERLAP) */}
          <div className="hidden md:block md:col-span-5 pointer-events-none" />

          {/* Right Column: Editorial Heading & Certificates List */}
          <div className="col-span-1 md:col-span-7 flex flex-col md:pl-10 lg:pl-16">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-[#D41E12]" />
              <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-[#D41E12] font-bold">
                VALIDATION // POSTGRESQL CRUD CONTRACT
              </span>
            </div>
            
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#0A0A0A] mb-3">
              OFFICIAL CERTIFICATIONS &amp; CREDENTIALS.
            </h2>
            
            <p className="font-sans text-sm text-[#6E6A64] leading-relaxed mb-6">
              Verified certifications, institutional accreditations, and engineering honors recorded in the PostgreSQL relational schema and managed via Go backend CRUD endpoints.
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/5 border border-black/10 font-mono text-[9px] text-[#0A0A0A] w-fit mb-8">
              <ShieldCheck className="w-3.5 h-3.5 text-[#D41E12]" />
              <span>DYNAMIC TABLE: certificates ({certList.length} RECORDS)</span>
            </div>

            {/* High-Craft Certificates List */}
            <div className="w-full flex flex-col divide-y divide-[rgba(10,10,10,0.1)] border-t border-[rgba(10,10,10,0.12)]">
              {certList.map((cert, idx) => (
                <div
                  key={cert.id || idx}
                  className="py-5 sm:py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:pl-2 transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                    <span className="font-mono text-xs font-bold text-[#D41E12] pt-1">
                      0{idx + 1}
                    </span>
                    <div>
                      <h3 className="font-serif text-lg sm:text-xl font-bold text-[#0A0A0A] group-hover:text-[#D41E12] transition-colors">
                        {cert.title}
                      </h3>
                      <span className="font-mono text-[10px] tracking-wider uppercase text-[#6E6A64] block mt-0.5">
                        {cert.issuer}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-center shrink-0">
                    <span className="font-mono text-xs font-semibold text-[#0A0A0A]/70">
                      {cert.date}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 font-mono text-[9px] font-bold">
                      <CheckCircle2 className="w-2.5 h-2.5" /> VERIFIED
                    </span>
                  </div>
                </div>
              ))}
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};

export default ChapterDuality;
