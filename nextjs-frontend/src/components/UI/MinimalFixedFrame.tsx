"use client";

import React from "react";
import { usePortfolioMode } from "@/context/PortfolioModeContext";
import { ArrowUpRight, Cpu, Sparkles } from "lucide-react";

interface FrameProps {
  currentChapter: number; // 1 to 4
  onChapterClick: (ch: number) => void;
}

const CHAPTER_LABELS = [
  "THE PROLOGUE",
  "THE DUALITY & RACING LINE",
  "SELECTED ARCHIVES",
  "THE PADDOCK & DISPATCH",
];

export const MinimalFixedFrame: React.FC<FrameProps> = ({ currentChapter, onChapterClick }) => {
  const { mode, setMode } = usePortfolioMode();

  const isDarkSection = currentChapter >= 3;
  const isRossoSection = currentChapter === 4;

  const textColor = isRossoSection
    ? "text-[#F7F5F0]"
    : isDarkSection
    ? "text-[#F7F5F0]"
    : "text-[#0A0A0A]";

  const subColor = isRossoSection
    ? "text-[#F7F5F0]/70"
    : isDarkSection
    ? "text-[#6E6A64]"
    : "text-[#6E6A64]";

  const borderColor = isRossoSection
    ? "border-white/20"
    : isDarkSection
    ? "border-white/10"
    : "border-[rgba(10,10,10,0.08)]";

  return (
    <header className="fixed inset-0 pointer-events-none z-50 p-6 md:p-10 flex flex-col justify-between">
      {/* ── TOP BAR ── */}
      <div className="w-full flex items-center justify-between pointer-events-auto">
        
        {/* Top-Left: Minimal Monogram AF */}
        <button
          onClick={() => onChapterClick(1)}
          className="group flex items-center gap-3 cursor-pointer text-left"
          data-magnetic
        >
          <div className="flex flex-col">
            <span
              className={`font-serif text-xl font-bold tracking-tight ${textColor} group-hover:text-[#D41E12] transition-colors`}
            >
              AF<span className="text-[#D41E12] font-mono text-sm ml-0.5">#16</span>
            </span>
            <span className={`font-mono text-[9px] tracking-[0.24em] uppercase ${subColor}`}>
              M. ARKAN FAUZI
            </span>
          </div>
        </button>

        {/* Top-Center: Minimal Dual-Persona Switcher */}
        <div className={`flex items-center p-1 rounded-full border ${borderColor} backdrop-blur-md bg-white/5`}>
          <button
            onClick={() => setMode("engineer")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-[0.16em] uppercase transition-all duration-300 cursor-pointer ${
              mode === "engineer"
                ? "bg-[#D41E12] text-white shadow-[0_0_12px_rgba(212,30,18,0.4)]"
                : `${subColor} hover:${textColor}`
            }`}
            data-magnetic
          >
            <Cpu className="w-3 h-3" />
            <span>THE ENGINEER</span>
          </button>

          <button
            onClick={() => setMode("creator")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-[0.16em] uppercase transition-all duration-300 cursor-pointer ${
              mode === "creator"
                ? "bg-[#D41E12] text-white shadow-[0_0_12px_rgba(212,30,18,0.4)]"
                : `${subColor} hover:${textColor}`
            }`}
            data-magnetic
          >
            <Sparkles className="w-3 h-3" />
            <span>THE CREATOR</span>
          </button>
        </div>

        {/* Top-Right: Magnetic Button "INITIATE CONTACT" */}
        <button
          onClick={() => onChapterClick(4)}
          className={`group flex items-center gap-2 px-4 py-2 rounded-full border ${borderColor} backdrop-blur-md bg-white/5 hover:border-[#D41E12] transition-all duration-300 cursor-pointer`}
          data-magnetic
        >
          <span className={`font-mono text-[10px] font-bold tracking-[0.2em] uppercase ${textColor} group-hover:text-[#D41E12] transition-colors`}>
            INITIATE CONTACT
          </span>
          <ArrowUpRight className="w-3.5 h-3.5 text-[#D41E12] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      </div>

      {/* ── BOTTOM BAR ── */}
      <div className="w-full flex items-end justify-between pointer-events-auto">
        
        {/* Bottom-Left: Active Chapter Index */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-bold text-[#D41E12] tracking-wider">
            CH. 0{currentChapter}
          </span>
          <div className="h-3 w-[1px] bg-[#D41E12]/40" />
          <span className={`font-mono text-[10px] uppercase tracking-[0.2em] ${subColor}`}>
            {CHAPTER_LABELS[currentChapter - 1]}
          </span>
        </div>

        {/* Bottom-Right: Geographic & Telemetry Metadata */}
        <div className="hidden sm:flex flex-col items-end">
          <span className={`font-mono text-[9px] tracking-[0.2em] uppercase ${subColor}`}>
            COORDINATES // MALANG, ID
          </span>
          <span className={`font-mono text-[9px] tracking-[0.15em] ${textColor}`}>
            43°44&apos;05&quot;N 7°25&apos;14&quot;E • CAR #16
          </span>
        </div>

      </div>
    </header>
  );
};

export default MinimalFixedFrame;
