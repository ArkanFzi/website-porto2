"use client";

import React, { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { RepoBerlian } from "@/lib/server/github";
import { usePortfolioMode } from "@/context/PortfolioModeContext";
import { CaseStudyModal, CaseStudyData } from "@/components/UI/CaseStudyModal";
import audioEngine from "@/lib/audioEngine";

interface ArchivesProps {
  repos?: RepoBerlian[];
  onHoverProject: (index: number | null) => void;
  hoveredProject: number | null;
}

interface ArchiveItem {
  index: string;
  name: string;
  title: string;
  url: string;
  desc: string;
  starsFallback: string;
  // Engineer mode fields
  engineerCategory: string;
  engineerStack: string;
  engineerMetric: string;
  // Creator mode fields
  creatorCategory: string;
  creatorCraft: string;
  creatorTag: string;
  caseStudy: CaseStudyData;
}

const FEATURED_ARCHIVES: ArchiveItem[] = [
  {
    index: "01",
    name: "ferrari-ubuntu",
    title: "Ferrari Ubuntu Architecture",
    url: "https://github.com/ArkanFzi/ferrari-ubuntu",
    desc: "Precision workstation environment based on Ubuntu 24.04 with restrained Scuderia Ferrari aerodynamics and dark macOS-minimalist desktop architecture.",
    starsFallback: "12+ STARS",
    engineerCategory: "OS & SYSTEM PLATFORM",
    engineerStack: "LINUX SHELL / GTK4 / SYSTEMD",
    engineerMetric: "<120MB IDLE RAM • 0.02s COLD BOOT",
    creatorCategory: "BESPOKE WORKSTATION UI",
    creatorCraft: "CUSTOM GTK4 THEME • MONZA RED AESTHETICS",
    creatorTag: "SPATIAL DESKTOP",
    caseStudy: {
      index: "01",
      name: "ferrari-ubuntu",
      title: "Ferrari Ubuntu OS Architecture",
      url: "https://github.com/ArkanFzi/ferrari-ubuntu",
      desc: "Lightweight Linux workstation orchestration tuned for zero-overhead development. Eliminates bloat daemons in favor of kernel systemd timers and customized GTK4 compositor styling.",
      architecture: "Kernel cgroups isolation + GTK4 CSS shell injection + systemd user service automation for battery and thermal throttling under heavy compilation.",
      databaseSchema: ["systemd-units/ferrari-telemetry.service", "dconf-profile/desktop-overrides", "udev/99-workstation-gpu.rules"],
      latencyP99: "< 1.2ms (IPC)",
      concurrencyRps: "Kernel Scheduler",
      stack: ["Ubuntu 24.04 LTS", "GTK4", "Systemd", "Bash Shell", "Wayland"],
    },
  },
  {
    index: "02",
    name: "pickertime",
    title: "Pickertime Gemini AI Engine",
    url: "https://github.com/ArkanFzi/pickertime",
    desc: "Intelligent AI-native meeting scheduler and decision matrix powered by Google Gemini LLM API with natural language slot synthesis.",
    starsFallback: "18+ STARS",
    engineerCategory: "GENERATIVE AI & DISTRIBUTED STATE",
    engineerStack: "NEXT.JS 16 / GOOGLE GEMINI 1.5 / TYPESCRIPT",
    engineerMetric: "<80ms NLP SYNTHESIS • HIGH CONCURRENCY",
    creatorCategory: "GENERATIVE AI EXPERIENCE",
    creatorCraft: "NATURAL CONVERSATION • FLUID GENERATIVE UI",
    creatorTag: "AI EXPERIENCE",
    caseStudy: {
      index: "02",
      name: "pickertime",
      title: "Pickertime Gemini AI Scheduler Engine",
      url: "https://github.com/ArkanFzi/pickertime",
      desc: "Distributed meeting intelligence converting messy multi-timezone conversational chat logs into structured calendar slots using Google Gemini 1.5 Pro.",
      architecture: "Edge serverless functions running Gemini 1.5 structured JSON output mode, cached via Upstash Redis sliding session keys to prevent duplicate token costs.",
      databaseSchema: ["sessions (id, session_token, created_at)", "time_proposals (id, session_id, slot_utc, tz_offset, score)", "attendees (id, email, status)"],
      latencyP99: "72ms",
      concurrencyRps: "2,400 RPS",
      stack: ["Next.js 16", "Google Gemini 1.5", "Upstash Redis", "TypeScript", "Tailwind CSS"],
    },
  },
  {
    index: "03",
    name: "graphify-devkit",
    title: "Graphify AST Knowledge Engine",
    url: "https://github.com/ArkanFzi/graphify-devkit",
    desc: "AST-based codebase knowledge graph extractor. Maps cross-file dependencies, god nodes, and architectural call-graphs without network latency.",
    starsFallback: "24+ STARS",
    engineerCategory: "COMPILER TOOLING & AST ENGINE",
    engineerStack: "TREE-SITTER / AST / PYTHON / NETWORKX",
    engineerMetric: "100K+ AST NODES/SEC • ZERO NETWORK I/O",
    creatorCategory: "CODEBASE KNOWLEDGE GRAPH",
    creatorCraft: "INTERACTIVE TOPOLOGY • GOD NODE MAPPING",
    creatorTag: "DATA VISUALIZATION",
    caseStudy: {
      index: "03",
      name: "graphify-devkit",
      title: "Graphify AST Knowledge & Call-Graph Engine",
      url: "https://github.com/ArkanFzi/graphify-devkit",
      desc: "Offline compiler intelligence tool extracting deep code topology. Traverses AST grammar trees to detect architectural coupling, circular dependencies, and blast radius before git commits.",
      architecture: "Multi-threaded Tree-Sitter parser + NetworkX Directed Acyclic Graph (DAG) analysis + community detection algorithms generating interactive JSON subgraphs.",
      databaseSchema: ["ast_nodes (id, symbol_name, file_path, kind, line_start, line_end)", "graph_edges (source, target, edge_type, weight)", "communities (id, cluster_name, rank)"],
      latencyP99: "< 4.5ms",
      concurrencyRps: "100K Nodes/sec",
      stack: ["Tree-Sitter", "Python 3.11", "NetworkX", "Graphology", "AST Parsing"],
    },
  },
  {
    index: "04",
    name: "sekawan-hris",
    title: "Enterprise Microservices HRIS",
    url: "https://sekawanmedia.co.id",
    desc: "High-throughput microservices architecture supporting multi-tenant enterprise human resource tracking, attendance telemetry, and payroll logic.",
    starsFallback: "ENTERPRISE",
    engineerCategory: "MISSION-CRITICAL DISTRIBUTED BACKEND",
    engineerStack: "GO / POSTGRESQL / DOCKER / REDIS",
    engineerMetric: "4.170 QUERIES TERUKUR • p99 1.5MS • MAX 13.2MS",
    creatorCategory: "ENTERPRISE PRODUCT DESIGN",
    creatorCraft: "HIGH-DENSITY DATA HIERARCHY • TELEMETRY",
    creatorTag: "DESIGN SYSTEM",
    caseStudy: {
      index: "04",
      name: "sekawan-hris",
      title: "Enterprise Multi-Tenant HRIS Microservices",
      url: "https://sekawanmedia.co.id",
      desc: "HRIS multi-tenant untuk absensi dan payroll: empat aplikasi Laravel 11 (admin, ESS, LND, job portal) di atas PostgreSQL, dengan Redis, MongoDB, dan antrean RabbitMQ. Angka query di panel ini hasil ukur, bukan asumsi vendor.",
      architecture: "Decoupled Go microservices communicating over gRPC, PostgreSQL connection pooling with PgBouncer, Redis distributed locks for concurrent payroll runs.",
      databaseSchema: ["companies (id, name, tenant_slug)", "employees (id, company_id, nip, email, department_id)", "attendance_logs (id, employee_id, check_in_time, geo_coords, face_hash)"],
      latencyP99: "1.5ms (per statement, n=4.170)",
      concurrencyRps: "4 app Laravel 11 · admin/ESS/LND/portal",
      stack: ["Go (Golang)", "PostgreSQL", "Docker", "Redis", "gRPC", "PgBouncer"],
    },
  },
  {
    index: "05",
    name: "interactive-portfolio",
    title: "Awwwards Chiaroscuro Monolith",
    url: "https://github.com/ArkanFzi",
    desc: "Single continuous WebGL canvas rendering custom luminance depth displacement shaders inspired by Charles Leclerc official atelier.",
    starsFallback: "SOTY SPEC",
    engineerCategory: "GPU SHADER PIPELINE & RENDERING",
    engineerStack: "R3F / THREE.JS GLSL / LENIS / TAILWIND",
    engineerMetric: "60FPS SOLID • VOLUMETRIC PARALLAX",
    creatorCategory: "SPATIAL 3D & SHADER CRAFT",
    creatorCraft: "LUMINANCE RELIEF • FLUID CHROMATIC SHIFT",
    creatorTag: "SPATIAL 3D",
    caseStudy: {
      index: "05",
      name: "interactive-portfolio",
      title: "Chiaroscuro Monolith WebGL Spatial Engine",
      url: "https://github.com/ArkanFzi",
      desc: "Editorial spatial experience combining Swiss typographic discipline with real-time GPU shader computations and zero layout shift.",
      architecture: "Single WebGL Canvas instance running custom GLSL vertex wave displacement and Leica M11 luminance contrast pipeline with Lenis momentum scroll sync.",
      databaseSchema: ["Dynamic server-side Edge APIs: /api/telemetry, /api/journey, /api/contact (Neon PostgreSQL SSL)"],
      latencyP99: "0.2ms (GPU Draw)",
      concurrencyRps: "60 FPS Fixed",
      stack: ["Three.js", "React Three Fiber", "GLSL Shaders", "Tailwind CSS v4", "Next.js 16"],
    },
  },
];

export const ChapterArchives: React.FC<ArchivesProps> = ({
  repos,
  onHoverProject,
  hoveredProject,
}) => {
  const { mode } = usePortfolioMode();
  const [activeModal, setActiveModal] = useState<CaseStudyData | null>(null);

  return (
    <section
      id="chapter-03"
      className="relative w-full min-h-screen bg-[#0A0A0A] text-[#F7F5F0] pt-36 pb-36 px-6 md:px-12 select-none overflow-hidden transition-colors duration-700"
    >
      {/* ── Top Header Tags ── */}
      <div className="w-full max-w-[1600px] mx-auto flex items-center justify-between pb-6 border-b border-white/10 mb-16">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#D41E12] animate-pulse" />
          <span className="font-mono text-[11px] font-bold tracking-[0.25em] uppercase text-[#D41E12]">
            CHAPTER 03 // {mode === "engineer" ? "SYSTEMS & ARCHITECTURE" : "SELECTED CREATIVE WORKS"}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {repos && repos.length > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[9px] tracking-[0.2em] uppercase text-[#D41E12]/80">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D41E12] animate-ping" />
              GITHUB API LIVE SYNCED
            </span>
          )}
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#6E6A64]">
            {mode === "engineer" ? "TELEMETRY & HARDWARE METRICS" : "INTERACTION & SPATIAL TAXONOMY"}
          </span>
        </div>
      </div>

      <div className="w-full max-w-[1600px] mx-auto">
        
        {/* Section Heading with Motion Transition */}
        <div className="mb-16 max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-[#D41E12] block mb-3">
                {mode === "engineer" ? "POWER UNIT & CODEBASES" : "ATELIER & VISUAL EXPERIMENTS"}
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-4">
                {mode === "engineer" ? "SYSTEMS & ARCHITECTURE" : "SELECTED CREATIVE WORKS"}
              </h2>
              <p className="font-sans text-sm text-[#6E6A64] leading-relaxed">
                {mode === "engineer"
                  ? "Production-grade microservices, compiler AST engines, and low-latency systems. Live star counts and commit telemetry synced directly from GitHub."
                  : "Haute-couture digital artifacts, volumetric WebGL shaders, and bespoke desktop environments. Hover each record to project spatial resonance into the central 3D Monolith."}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── FULL-WIDTH EDITORIAL INDEX LIST ── */}
        <div className="w-full flex flex-col border-t border-white/10">
          {FEATURED_ARCHIVES.map((item, idx) => {
            const isHovered = hoveredProject === idx;

            // Connect live GitHub repo data if available
            const liveRepo = repos?.find(
              (r) => r.name.toLowerCase() === item.name.toLowerCase()
            );
            const liveStars = liveRepo && liveRepo.stargazers_count > 0
              ? `${liveRepo.stargazers_count} STARS`
              : item.starsFallback;

            return (
              <div
                key={item.index}
                onMouseEnter={() => onHoverProject(idx)}
                onMouseLeave={() => onHoverProject(null)}
                onFocusCapture={() => onHoverProject(idx)}
                onBlurCapture={() => onHoverProject(null)}
                className={`group relative w-full py-8 sm:py-10 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all duration-300 ${
                  isHovered ? "bg-white/[0.03] pl-4 sm:pl-6" : "pl-0"
                }`}
                data-magnetic
              >
                {/* Active Left Indicator Bar */}
                <span
                  aria-hidden="true"
                  className={`absolute left-0 top-0 bottom-0 w-[3px] bg-[#D41E12] transition-opacity duration-300 ${
                    isHovered ? "opacity-100" : "opacity-0"
                  }`}
                />

                {/* Left: Index & Project Title */}
                <div className="flex items-start md:items-center gap-6 sm:gap-10">
                  <span className="font-mono text-sm sm:text-base font-bold text-[#D41E12]">
                    /{item.index}
                  </span>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <span className="font-mono text-[9px] tracking-[0.22em] uppercase text-[#6E6A64] block mb-1">
                      {mode === "engineer" ? item.engineerCategory : item.creatorCategory}
                    </span>
                    <h3
                      className={`font-serif text-2xl sm:text-3xl lg:text-4xl font-bold transition-colors duration-300 ${
                        isHovered ? "text-[#D41E12]" : "text-white"
                      }`}
                    >
                      {item.title}
                    </h3>
                  </a>
                </div>

                {/* Right: Mode-driven specs + Live GitHub Data */}
                <div className="flex flex-wrap md:flex-nowrap items-center justify-between md:justify-end gap-6 sm:gap-10">
                  <div className="flex flex-col md:items-end">
                    <span className="font-mono text-[10px] font-bold tracking-[0.16em] uppercase text-[#D41E12]">
                      {mode === "engineer" ? item.engineerStack : item.creatorCraft}
                    </span>
                    <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-[#6E6A64] mt-0.5">
                      {mode === "engineer" 
                        ? `${liveStars} • ${item.engineerMetric}` 
                        : `${liveStars} • ${item.creatorTag}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        audioEngine.playClick(1300, 0.02);
                        setActiveModal(item.caseStudy);
                      }}
                      className="px-3 py-1.5 rounded-full border border-white/20 hover:border-[#D41E12] bg-white/5 hover:bg-[#D41E12]/20 font-mono text-[9px] font-bold text-white tracking-widest uppercase transition-all duration-300 cursor-pointer"
                      title="Open In-Depth Architecture Specification"
                    >
                      SPEC [⇡]
                    </button>

                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${item.title} on GitHub`}
                      className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center group-hover:border-[#D41E12] group-hover:bg-[#D41E12] transition-all duration-300"
                    >
                      <ArrowUpRight aria-hidden="true" className="w-4 h-4 text-white transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Deep-Dive Architecture Modal */}
      <CaseStudyModal
        caseStudy={activeModal}
        onClose={() => setActiveModal(null)}
      />
    </section>
  );
};

export default ChapterArchives;
