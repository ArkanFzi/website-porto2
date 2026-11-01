"use client";

import React, { useEffect, useState } from "react";
import { usePortfolioMode } from "@/context/PortfolioModeContext";
import { ArrowUpRight, Cpu, Sparkles, FileText, Activity } from "lucide-react";

interface FrameProps {
  currentChapter: number; // 1 to 4
  onChapterClick: (ch: number) => void;
}

interface TelemetryData {
  status: string;
  edgeNode: string;
  runtime: string;
  latencyMs: number;
  heapMb: number;
  sla: string;
}

const CHAPTER_LABELS = [
  "THE PROLOGUE",
  "THE DUALITY & RACING LINE",
  "SELECTED ARCHIVES",
  "THE PADDOCK & DISPATCH",
];

export const MinimalFixedFrame: React.FC<FrameProps> = ({ currentChapter, onChapterClick }) => {
  const { mode, setMode } = usePortfolioMode();
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchTelemetry = async () => {
      try {
        const res = await fetch("/api/telemetry");
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setTelemetry(data);
        }
      } catch {
        // Fallback default
      }
    };
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const isDarkSection = currentChapter >= 3;
  const isRossoSection = currentChapter === 4;

  const textColor = isRossoSection
    ? "text-white"
    : isDarkSection
    ? "text-[#F7F5F0]"
    : "text-[#0A0A0A]";

  const subColor = isRossoSection
    ? "text-white/80"
    : isDarkSection
    ? "text-[#6E6A64]"
    : "text-[#6E6A64]";

  const borderColor = isRossoSection
    ? "border-white/30"
    : isDarkSection
    ? "border-white/10"
    : "border-[rgba(10,10,10,0.08)]";

  const activePillBg = isRossoSection
    ? "bg-white text-[#D41E12] shadow-[0_0_14px_rgba(255,255,255,0.4)]"
    : "bg-[#D41E12] text-white shadow-[0_0_12px_rgba(212,30,18,0.4)]";

  const accentColor = isRossoSection ? "text-white" : "text-[#D41E12]";

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
              className={`font-serif text-xl font-bold tracking-tight ${textColor} ${
                isRossoSection ? "group-hover:text-black" : "group-hover:text-[#D41E12]"
              } transition-colors`}
            >
              AF<span className={`${accentColor} font-mono text-sm ml-0.5`}>#16</span>
            </span>
            <span className={`font-mono text-[9px] tracking-[0.24em] uppercase ${subColor}`}>
              M. ARKAN FAUZI
            </span>
          </div>
        </button>

        {/* Top-Center: Minimal Dual-Persona Switcher */}
        <div className={`flex items-center p-1 rounded-full border ${borderColor} backdrop-blur-md ${
          isRossoSection ? "bg-black/20" : "bg-white/5"
        }`}>
          <button
            onClick={() => setMode("engineer")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-[0.16em] uppercase transition-all duration-300 cursor-pointer ${
              mode === "engineer"
                ? activePillBg
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
                ? activePillBg
                : `${subColor} hover:${textColor}`
            }`}
            data-magnetic
          >
            <Sparkles className="w-3 h-3" />
            <span>THE CREATOR</span>
          </button>
        </div>

        {/* Top-Right: Action Group (Curated Dossier PDF + Initiate Contact) */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Dossier PDF Trigger via /api/cv */}
          <a
            href="/api/cv"
            target="_blank"
            rel="noopener noreferrer"
            className={`hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-full border ${borderColor} backdrop-blur-md ${
              isRossoSection
                ? "bg-black/20 hover:bg-white hover:text-[#D41E12]"
                : "bg-white/5 hover:border-[#D41E12]"
            } transition-all duration-300 cursor-pointer group`}
            data-magnetic
            title="Download Headless Chromium Generated Dossier PDF"
          >
            <FileText className={`w-3 h-3 ${accentColor} group-hover:scale-110 transition-transform`} />
            <span className={`font-mono text-[9px] font-bold tracking-[0.18em] uppercase ${textColor} ${
              isRossoSection ? "group-hover:text-[#D41E12]" : "group-hover:text-[#D41E12]"
            } transition-colors`}>
              DOSSIER SPEC [PDF]
            </span>
          </a>

          {/* Magnetic Button "INITIATE CONTACT" */}
          <button
            onClick={() => onChapterClick(4)}
            className={`group flex items-center gap-2 px-4 py-2 rounded-full border ${borderColor} backdrop-blur-md ${
              isRossoSection
                ? "bg-black/20 hover:bg-white hover:text-[#D41E12]"
                : "bg-white/5 hover:border-[#D41E12]"
            } transition-all duration-300 cursor-pointer`}
            data-magnetic
          >
            <span className={`font-mono text-[10px] font-bold tracking-[0.2em] uppercase ${textColor} ${
              isRossoSection ? "group-hover:text-[#D41E12]" : "group-hover:text-[#D41E12]"
            } transition-colors`}>
              INITIATE CONTACT
            </span>
            <ArrowUpRight className={`w-3.5 h-3.5 ${accentColor} group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform`} />
          </button>
        </div>
      </div>

      {/* ── BOTTOM BAR ── */}
      <div className="w-full flex items-end justify-between pointer-events-auto">
        
        {/* Bottom-Left: Active Chapter Index */}
        <div className="flex items-center gap-3">
          <span className={`font-mono text-xs font-bold ${accentColor} tracking-wider`}>
            CH. 0{currentChapter}
          </span>
          <div className={`h-3 w-[1px] ${isRossoSection ? "bg-white/40" : "bg-[#D41E12]/40"}`} />
          <span className={`font-mono text-[10px] uppercase tracking-[0.2em] ${subColor}`}>
            {CHAPTER_LABELS[currentChapter - 1]}
          </span>
        </div>

        {/* Bottom-Center: Live F1 Pit-Wall Telemetry Bar */}
        <div className={`hidden lg:flex items-center gap-2 px-3 py-1 rounded-full border ${
          isRossoSection ? "border-white/20 bg-black/20" : "border-current/10 bg-white/[0.02]"
        } backdrop-blur-md`}>
          <Activity className={`w-3 h-3 ${accentColor} animate-pulse`} />
          {mode === "engineer" ? (
            <span className={`font-mono text-[9px] tracking-[0.18em] uppercase ${subColor}`}>
              <span className={`${accentColor} font-bold`}>● LIVE TELEMETRY:</span>{" "}
              {telemetry ? `${telemetry.edgeNode} • ${telemetry.latencyMs}ms • ${telemetry.heapMb}MB HEAP • ${telemetry.sla}` : "MONACO-01 • <15ms • 99.98% SLA"}
            </span>
          ) : (
            <span className={`font-mono text-[9px] tracking-[0.18em] uppercase ${subColor}`}>
              <span className={`${accentColor} font-bold`}>✦ SPATIAL CRAFT:</span> GLSL LUMINANCE DISPLACEMENT • 60FPS ATELIER
            </span>
          )}
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
