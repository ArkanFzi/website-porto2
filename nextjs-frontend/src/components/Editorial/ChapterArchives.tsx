"use client";

import React from "react";
import { ArrowUpRight } from "lucide-react";
import type { RepoBerlian } from "@/lib/server/github";
import { usePortfolioMode } from "@/context/PortfolioModeContext";

interface ArchivesProps {
  repos: RepoBerlian[];
  onHoverProject: (index: number | null) => void;
  hoveredProject: number | null;
}

const FEATURED_ARCHIVES = [
  {
    index: "01",
    name: "ferrari-ubuntu",
    title: "Ferrari Ubuntu Architecture",
    category: "OS & SYSTEM PLATFORM",
    stack: "LINUX SHELL / GTK4 / RESTYLED WEAVE",
    stars: "12+",
    desc: "Precision workstation environment based on Ubuntu 24.04 with restrained Scuderia Ferrari aerodynamics, dark macOS-minimalist desktop architecture, and zero-distraction layout.",
    url: "https://github.com/ArkanFzi/ferrari-ubuntu",
  },
  {
    index: "02",
    name: "pickertime",
    title: "Pickertime Gemini AI Engine",
    category: "GENERATIVE AI & SCHEDULING",
    stack: "NEXT.JS 16 / GOOGLE GEMINI 1.5 / TYPESCRIPT",
    stars: "18+",
    desc: "Intelligent AI-native meeting scheduler and decision matrix powered by Google Gemini LLM API with natural language slot synthesis.",
    url: "https://github.com/ArkanFzi/pickertime",
  },
  {
    index: "03",
    name: "graphify-devkit",
    title: "Graphify AST Knowledge Engine",
    category: "COMPILER TOOLING & AST",
    stack: "TREE-SITTER / AST / PYTHON / NETWORKX",
    stars: "24+",
    desc: "AST-based codebase knowledge graph extractor. Maps cross-file dependencies, god nodes, and architectural call-graphs without network latency.",
    url: "https://github.com/ArkanFzi/graphify-devkit",
  },
  {
    index: "04",
    name: "sekawan-hris",
    title: "Enterprise Microservices HRIS",
    category: "MISSION-CRITICAL BACKEND",
    stack: "GO / POSTGRESQL / DOCKER / REDIS",
    stars: "ENTERPRISE",
    desc: "High-throughput microservices architecture supporting multi-tenant enterprise human resource tracking, attendance telemetry, and payroll logic.",
    url: "https://sekawanmedia.co.id",
  },
  {
    index: "05",
    name: "interactive-portfolio",
    title: "Awwwards Chiaroscuro Portfolio",
    category: "SPATIAL WEBGL CRAFT",
    stack: "R3F / THREE.JS GLSL / LENIS / TAILWIND",
    stars: "SOTY SPEC",
    desc: "Restraint as a flex: single continuous WebGL canvas rendering custom luminance depth displacement shaders inspired by Charles Leclerc official atelier.",
    url: "https://github.com/ArkanFzi",
  },
];

export const ChapterArchives: React.FC<ArchivesProps> = ({
  onHoverProject,
  hoveredProject,
}) => {
  const { mode } = usePortfolioMode();

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
            CHAPTER 03 // SELECTED ARCHIVES
          </span>
        </div>

        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#6E6A64]">
          SWISS EDITORIAL INDEX // HOVER TO DISPLACE
        </span>
      </div>

      <div className="w-full max-w-[1600px] mx-auto">
        
        {/* Section Heading */}
        <div className="mb-16 max-w-2xl">
          <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-4">
            {mode === "engineer" ? "POWER UNIT & CODEBASES" : "SPATIAL CRAFT & INTERFACES"}
          </h2>
          <p className="font-sans text-sm text-[#6E6A64] leading-relaxed">
            Curated selection of open-source architectures and enterprise platforms. Hovering any archive item reflects dynamic displacement onto the central 3D Monolith.
          </p>
        </div>

        {/* ── FULL-WIDTH EDITORIAL INDEX LIST ── */}
        <div className="w-full flex flex-col border-t border-white/10">
          {FEATURED_ARCHIVES.map((item, idx) => {
            const isHovered = hoveredProject === idx;
            return (
              <a
                key={item.index}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                onMouseEnter={() => onHoverProject(idx)}
                onMouseLeave={() => onHoverProject(null)}
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

                  <div>
                    <span className="font-mono text-[9px] tracking-[0.22em] uppercase text-[#6E6A64] block mb-1">
                      {item.category}
                    </span>
                    <h3
                      className={`font-serif text-2xl sm:text-3xl lg:text-4xl font-bold transition-colors duration-300 ${
                        isHovered ? "text-[#D41E12]" : "text-white"
                      }`}
                    >
                      {item.title}
                    </h3>
                  </div>
                </div>

                {/* Right: Stack Tags, Stars & Inspect Action */}
                <div className="flex flex-wrap md:flex-nowrap items-center justify-between md:justify-end gap-6 sm:gap-10">
                  <div className="flex flex-col md:items-end">
                    <span className="font-mono text-[10px] font-bold tracking-[0.16em] uppercase text-[#D41E12]">
                      {item.stack}
                    </span>
                    <span className="font-mono text-[9px] tracking-[0.2em] text-[#6E6A64] mt-0.5">
                      STAR DATA: {item.stars}
                    </span>
                  </div>

                  <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center group-hover:border-[#D41E12] group-hover:bg-[#D41E12] transition-all duration-300">
                    <ArrowUpRight className="w-4 h-4 text-white transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </div>
              </a>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export default ChapterArchives;
