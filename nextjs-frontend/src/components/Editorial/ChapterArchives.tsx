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
    desc: "Six GNOME Shell 46 extensions plus a GDM theme and Plymouth splash that restyle Ubuntu 24.04 in Ferrari livery — GJS and shell CSS, not a GTK or systemd stack.",
    starsFallback: "OPEN SOURCE",
    engineerCategory: "GNOME SHELL EXTENSION SUITE",
    engineerStack: "GJS / ST-CLUTTER / DCONF / DBUS",
    engineerMetric: "6 EXTENSIONS IN-PROCESS • NO DAEMON",
    creatorCategory: "BESPOKE WORKSTATION UI",
    creatorCraft: "SHELL CSS OVERRIDE • MONZA RED AESTHETICS",
    creatorTag: "SPATIAL DESKTOP",
    caseStudy: {
      index: "01",
      name: "ferrari-ubuntu",
      title: "Ferrari Ubuntu Shell Extension Suite",
      url: "https://github.com/ArkanFzi/ferrari-ubuntu",
      desc: "Full desktop look-and-feel shipped as own code: noir-island, noir-rail, noir-cluster, noir-clock, noir-startlights and noir-telemetry, plus a dconf profile, shell CSS overrides, GDM resource and Plymouth splash.",
      architecture: "GJS extensions running inside the gnome-shell process on the St/Clutter scene graph; state through gsettings/dconf schemas and D-Bus signals for media and battery. Wayland cannot restart the shell, so JS changes need a session reload.",
      databaseSchema: ["extensions/noir-island@arkan/extension.js", "settings/noir.dconf", "theme/overrides/gnome-shell"],
      latencyP99: "n/a — in-process, no IPC",
      concurrencyRps: "6 extensions, 1 shell process",
      stack: ["Ubuntu 24.04 LTS", "GNOME Shell 46", "GJS", "D-Bus / gsettings", "Wayland"],
    },
  },
  {
    index: "02",
    name: "pickertime",
    title: "Pickertime Gemini AI Engine",
    url: "https://github.com/ArkanFzi/pickertime",
    desc: "AI-native meeting scheduler built as an Expo/React Native app on PocketBase, with a server-side Gemini proxy hook and a per-account request limiter.",
    starsFallback: "OPEN SOURCE",
    engineerCategory: "GENERATIVE AI & MOBILE BACKEND",
    engineerStack: "EXPO 54 / POCKETBASE / TYPESCRIPT",
    engineerMetric: "589–774ms SYNTHESIS TERUKUR • 10 REQ/MIN",
    creatorCategory: "GENERATIVE AI EXPERIENCE",
    creatorCraft: "NATURAL CONVERSATION • FLUID GENERATIVE UI",
    creatorTag: "AI EXPERIENCE",
    caseStudy: {
      index: "02",
      name: "pickertime",
      title: "Pickertime Gemini Scheduler on PocketBase",
      url: "https://github.com/ArkanFzi/pickertime",
      desc: "Meeting intelligence converting messy multi-timezone conversational chat logs into structured calendar slots through Gemini 3.5 Flash-Lite, called from a PocketBase JS hook rather than the client.",
      architecture: "Expo SDK 54 client + PocketBase backend. pb_hooks/ai_proxy.pb.js pins the model name, requests structured JSON output, enforces a 10 request/min fixed window per account and streams task updates over SSE (3–6 ms measured).",
      databaseSchema: ["Tasks", "Focus_Sessions", "Workspace_Events", "Profiles"],
      latencyP99: "589–774 ms (Gemini call, n=3)",
      concurrencyRps: "10 req/min per account",
      stack: ["Expo SDK 54", "React Native", "PocketBase", "Gemini 3.5 Flash-Lite", "TypeScript"],
    },
  },
  {
    index: "03",
    name: "graphify-devkit",
    title: "Graphify DevKit — Guardrail Layer",
    url: "https://github.com/ArkanFzi/graphify-devkit",
    desc: "Shell and Python tooling around the graphify AST engine: post-commit graph refresh, blast-radius gate for AI coding agents, ChromaDB sync and a live topology viewer.",
    starsFallback: "OPEN SOURCE",
    engineerCategory: "AGENT GUARDRAILS & GRAPH OPS",
    engineerStack: "BASH / PYTHON / CHROMADB / GIT HOOKS",
    engineerMetric: "657–706 NODES/SEC TERUKUR • OFFLINE EXTRACT",
    creatorCategory: "CODEBASE KNOWLEDGE GRAPH",
    creatorCraft: "INTERACTIVE TOPOLOGY • GOD NODE MAPPING",
    creatorTag: "DATA VISUALIZATION",
    caseStudy: {
      index: "03",
      name: "graphify-devkit",
      title: "Graphify DevKit — Ops Layer over an Upstream AST Engine",
      url: "https://github.com/ArkanFzi/graphify-devkit",
      desc: "Guardrails that keep AI coding agents honest on large PHP monoliths: the dependency graph re-extracts on every commit, blast radius is reported before an edit, and results stay reviewable offline.",
      architecture: "Parsing and graph analysis are done by the upstream graphifyy engine (Tree-Sitter based, by Graphify-Labs). This repo adds the post-commit hook, a background worker, a ChromaDB sync for embeddings and a stdlib HTTP server feeding the viewer.",
      databaseSchema: ["bin/graphify-git-hook", "bin/graphify-bg-worker", "bin/graphify-chroma-sync"],
      latencyP99: "not measured — querylog off by default",
      concurrencyRps: "657–706 nodes/sec (n=2 runs)",
      stack: ["Bash", "Python 3", "graphifyy (upstream)", "ChromaDB", "Git hooks"],
    },
  },
  {
    index: "04",
    name: "sekawan-hris",
    title: "Enterprise Microservices HRIS",
    url: "https://sekawanmedia.co.id",
    desc: "Multi-tenant HRIS for attendance and payroll: four Laravel 11 applications on PostgreSQL, with Redis cache, MongoDB logs and RabbitMQ queues.",
    starsFallback: "ENTERPRISE",
    engineerCategory: "MISSION-CRITICAL ENTERPRISE BACKEND",
    engineerStack: "PHP 8.3 / LARAVEL 11 / POSTGRESQL / REDIS",
    engineerMetric: "4.170 QUERIES TERUKUR • p99 1.5MS • MAX 13.2MS",
    creatorCategory: "ENTERPRISE PRODUCT DESIGN",
    creatorCraft: "HIGH-DENSITY DATA HIERARCHY • TELEMETRY",
    creatorTag: "DESIGN SYSTEM",
    caseStudy: {
      index: "04",
      name: "sekawan-hris",
      title: "Enterprise Multi-Tenant HRIS (4 Laravel 11 apps)",
      url: "https://sekawanmedia.co.id",
      desc: "HRIS multi-tenant untuk absensi dan payroll: empat aplikasi Laravel 11 (admin, ESS, LND, job portal) di atas PostgreSQL, dengan Redis, MongoDB, dan antrean RabbitMQ. Angka query di panel ini hasil ukur, bukan asumsi vendor.",
      architecture: "Four Laravel 11 apps over one PostgreSQL database with company-scoped queries, predis for cache and queues, a MongoDB connection for activity logs, and RabbitMQ for deferred jobs — watched by a daily GitHub Actions probe.",
      databaseSchema: ["companies (id, name, tenant_slug)", "employees (id, company_id, nip, email, department_id)", "attendance_logs (id, employee_id, check_in_time, geo_coords, face_hash)"],
      latencyP99: "1.5ms (per statement, n=4.170)",
      concurrencyRps: "n/a — tidak ada load test",
      stack: ["PHP 8.3", "Laravel 11", "PostgreSQL", "Redis (predis)", "RabbitMQ", "MongoDB"],
    },
  },
  {
    index: "05",
    name: "interactive-portfolio",
    title: "Awwwards Chiaroscuro Monolith",
    url: "https://github.com/ArkanFzi",
    desc: "One continuous WebGL canvas rendering a custom GLSL luminance-displacement monolith over a Swiss editorial grid — measured at 60 FPS on GPU, 23.5 FPS on software rendering.",
    starsFallback: "PUBLIC REPO",
    engineerCategory: "GPU SHADER PIPELINE & RENDERING",
    engineerStack: "R3F / THREE.JS GLSL / LENIS / TAILWIND",
    engineerMetric: "60 FPS @1440×900 • n=360 • 0 DROP",
    creatorCategory: "SPATIAL 3D & SHADER CRAFT",
    creatorCraft: "LUMINANCE RELIEF • FLUID CHROMATIC SHIFT",
    creatorTag: "SPATIAL 3D",
    caseStudy: {
      index: "05",
      name: "interactive-portfolio",
      title: "Chiaroscuro Monolith WebGL Spatial Engine",
      url: "https://github.com/ArkanFzi/website-porto2",
      desc: "Editorial spatial experience combining Swiss typographic discipline with real-time GPU shader computation. The canvas is fixed and pointer-events-none, so it never participates in layout.",
      architecture: "One react-three-fiber Canvas running a hand-written GLSL vertex/fragment pair whose uniforms (uTime, uMouse, uVelocity, uScroll, uPersona) are driven by Lenis scroll refs, plus edge APIs for telemetry, journey and contact.",
      databaseSchema: ["/api/telemetry (measured, no invented numbers)", "/api/journey + /api/certificates (PostgreSQL)", "/api/visit + /api/visits (counter, privacy-preserving)"],
      latencyP99: "16.7 ms median frame",
      concurrencyRps: "60.0 FPS (GPU) • 23.5 FPS (software)",
      stack: ["Three.js 0.186", "React Three Fiber 9", "GLSL Shaders", "Tailwind CSS v4", "Next.js 16"],
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
      className="relative w-full min-h-screen bg-[#0A0A0A] xl:bg-transparent text-[#F7F5F0] pt-36 pb-36 px-6 md:px-12 select-none overflow-hidden transition-colors duration-700"
    >
      {/*
        Papan gelap = batas kiri daftar sekaligus penanda posisi kartu WebGL:
        ChiaroscuroMonolith mengukur rect elemen ini lewat ResizeObserver, jadi
        gutter tempat kartu duduk tidak pernah lepas dari lebar daftar yang sebenarnya.
      */}
      <div
        id="ch03-papan"
        aria-hidden="true"
        className="hidden xl:block absolute inset-y-0 left-0 -z-10 w-[calc(3rem+1000px)] bg-[#0A0A0A]"
      />
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

      <div className="w-full max-w-[1600px] mx-auto xl:max-w-[1000px] xl:mx-0">
        
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
