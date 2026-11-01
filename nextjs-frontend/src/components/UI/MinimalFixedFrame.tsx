"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import { usePortfolioMode } from "@/context/PortfolioModeContext";
import { useBabAktif } from "@/components/SmoothScrollProvider";
import { bacaCuplik, dengarCuplik, type CuplikanFrame } from "@/lib/perfStats";
import { ArrowUpRight, Cpu, Sparkles, FileText, Activity, Volume2, VolumeX, Terminal, Layers } from "lucide-react";

interface FrameProps {
  onChapterClick: (ch: number) => void;
}

// Hanya field yang benar-benar dikembalikan /api/telemetry yang dibaca di sini. edgeNode dan sla
// pernah ada di interface ini dan tidak pernah ada sumber datanya, jadi keduanya keluar.
interface TelemetryData {
  status: string;
  latencyMs: number;
  heapMb: number | null;
  backend: { reachable: boolean; db: string | null; rttMs: number | null };
}

const DASH = "—";

const CHAPTER_LABELS = [
  "THE PROLOGUE",
  "THE DUALITY & CREDENTIALS",
  "SELECTED ARCHIVES",
  "THE PADDOCK & DISPATCH",
];

// Komponen kecil yang berdiri sendiri supaya pembaruan 1 Hz dari pengukur frame hanya
// menyentuh teks ini, bukan seluruh frame HUD.
const KinerjaKanvas: React.FC = () => {
  const cuplik = useSyncExternalStore<CuplikanFrame | null>(
    dengarCuplik,
    bacaCuplik,
    () => null
  );
  if (!cuplik) return null;
  return (
    <>
      {" "}
      • {cuplik.fps} FPS • p95 {cuplik.p95Ms}ms • DPR {cuplik.dpr} • {cuplik.frames}f
    </>
  );
};

export const MinimalFixedFrame: React.FC<FrameProps> = ({ onChapterClick }) => {
  const currentChapter = useBabAktif();
  const {
    mode,
    setMode,
    wireframe,
    toggleWireframe,
    telemetryOpen,
    setTelemetryOpen,
    terminalOpen,
    setTerminalOpen,
    audioMuted,
    toggleAudio,
  } = usePortfolioMode();
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

  // Bab 03 punya gutter kertas di kanan: pil HUD harus terbaca di atas kertas maupun
  // di atas papan gelap daftar, jadi chip-nya ikut gelap, bukan transparan.
  const atasKertas = isDarkSection && !isRossoSection;
  const chipBg = atasKertas
    ? "bg-[#0A0A0A] hover:bg-[#1A1A1A] hover:border-[#D41E12]"
    : "bg-white/5 hover:border-[#D41E12]";
  const chipPlate = atasKertas ? "bg-[#0A0A0A] px-2 py-1 rounded-md" : "";

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

        {/* Top-Right: Action Group (Controls, Curated Dossier PDF + Initiate Contact) */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Shell / CLI Modal Trigger (Cmd+K) */}
          <button
            onClick={() => setTerminalOpen(!terminalOpen)}
            className={`hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-full border ${borderColor} backdrop-blur-md ${
              terminalOpen ? activePillBg : isRossoSection ? "bg-black/20 text-white" : chipBg
            } transition-all duration-300 cursor-pointer text-[9px] font-mono tracking-wider`}
            data-magnetic
            title="Open Interactive Engineer CLI (Press Cmd+K or ~)"
          >
            <Terminal className="w-3 h-3 text-[#D41E12]" />
            <span className={textColor}>CLI</span>
            <kbd className="px-1 py-0.2 bg-black/20 rounded text-[8px] text-[#6E6A64]">⌘K</kbd>
          </button>

          {/* 3D Wireframe / Shader Inspector Toggle */}
          <button
            onClick={toggleWireframe}
            className={`hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-full border ${borderColor} backdrop-blur-md ${
              wireframe ? activePillBg : isRossoSection ? "bg-black/20 text-white" : chipBg
            } transition-all duration-300 cursor-pointer text-[9px] font-mono tracking-wider`}
            data-magnetic
            title="Toggle 3D Monolith GPU Wireframe Overlay"
          >
            <Layers className="w-3 h-3 text-[#D41E12]" />
            <span className={textColor}>{wireframe ? "MESH: WIRE" : "MESH: SOLID"}</span>
          </button>

          {/* Procedural Web Audio Engine Toggle */}
          <button
            onClick={toggleAudio}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full border ${borderColor} backdrop-blur-md ${
              !audioMuted ? activePillBg : isRossoSection ? "bg-black/20 text-white" : chipBg
            } transition-all duration-300 cursor-pointer text-[9px] font-mono tracking-wider`}
            data-magnetic
            title={audioMuted ? "Activate Procedural F1 Web Audio Synthesizer" : "Mute Audio Engine"}
          >
            {!audioMuted ? (
              <Volume2 className="w-3 h-3 text-[#D41E12] animate-pulse" />
            ) : (
              <VolumeX className="w-3 h-3 text-[#6E6A64]" />
            )}
            <span className={textColor}>{!audioMuted ? "SFX: ON" : "SFX: OFF"}</span>
          </button>

          {/* Dossier PDF Trigger via /api/cv */}
          <a
            href="/api/cv"
            target="_blank"
            rel="noopener noreferrer"
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${borderColor} backdrop-blur-md ${
              isRossoSection
                ? "bg-black/20 hover:bg-white hover:text-[#D41E12]"
                : chipBg
            } transition-all duration-300 cursor-pointer group`}
            data-magnetic
            title="Download Headless Chromium Generated Dossier PDF"
          >
            <FileText className={`w-3 h-3 ${accentColor} group-hover:scale-110 transition-transform`} />
            <span className={`font-mono text-[9px] font-bold tracking-[0.18em] uppercase ${textColor} ${
              isRossoSection ? "group-hover:text-[#D41E12]" : "group-hover:text-[#D41E12]"
            } transition-colors`}>
              DOSSIER [PDF]
            </span>
          </a>

          {/* Magnetic Button "INITIATE CONTACT" */}
          <button
            onClick={() => onChapterClick(4)}
            className={`group flex items-center gap-2 px-3.5 py-1.5 rounded-full border ${borderColor} backdrop-blur-md ${
              isRossoSection
                ? "bg-black/20 hover:bg-white hover:text-[#D41E12]"
                : chipBg
            } transition-all duration-300 cursor-pointer`}
            data-magnetic
          >
            <span className={`font-mono text-[10px] font-bold tracking-[0.2em] uppercase ${textColor} ${
              isRossoSection ? "group-hover:text-[#D41E12]" : "group-hover:text-[#D41E12]"
            } transition-colors`}>
              CONTACT
            </span>
            <ArrowUpRight className={`w-3.5 h-3.5 ${accentColor} group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform`} />
          </button>
        </div>
      </div>

      {/* ── BOTTOM BAR ── */}
      <div className="w-full flex items-end justify-between pointer-events-auto">
        
        {/* Bottom-Left: Chapter Index — all four chapters reachable */}
        <nav className="flex items-center gap-2.5" aria-label="Chapter index">
          {CHAPTER_LABELS.map((label, i) => {
            const ch = i + 1;
            const isActive = currentChapter === ch;
            return (
              <button
                key={label}
                onClick={() => onChapterClick(ch)}
                aria-current={isActive ? "true" : undefined}
                title={label}
                className={`font-mono text-[10px] tracking-[0.16em] uppercase transition-opacity cursor-pointer ${
                  isActive ? `${accentColor} font-bold` : `${subColor} opacity-50 hover:opacity-100`
                }`}
              >
                CH.0{ch}
              </button>
            );
          })}
          <div className={`h-3 w-[1px] ${isRossoSection ? "bg-white/40" : "bg-[#D41E12]/40"}`} />
          <span className={`font-mono text-[10px] uppercase tracking-[0.2em] ${subColor} hidden sm:inline`}>
            {CHAPTER_LABELS[currentChapter - 1]}
          </span>
        </nav>

        {/* Bottom-Center: Live F1 Pit-Wall Telemetry Bar (Clickable Trigger for Telemetry HUD) */}
        <button
          onClick={() => setTelemetryOpen(!telemetryOpen)}
          className={`hidden lg:flex items-center gap-2 px-3 py-1 rounded-full border ${
            telemetryOpen
              ? activePillBg
              : isRossoSection
              ? "border-white/20 bg-black/20 hover:border-white"
              : "border-current/10 bg-white/[0.02] hover:border-[#D41E12]"
          } backdrop-blur-md transition-all duration-300 cursor-pointer`}
          data-magnetic
          title="Click to open Pit-Wall Telemetry HUD"
        >
          <Activity className={`w-3 h-3 ${accentColor} animate-pulse`} />
          {mode === "engineer" ? (
            <span className={`font-mono text-[9px] tracking-[0.18em] uppercase ${subColor}`}>
              <span className={`${accentColor} font-bold`}>● LIVE TELEMETRY:</span>{" "}
              {telemetry
                ? `${telemetry.latencyMs}ms • ${
                    telemetry.heapMb === null ? DASH : `${telemetry.heapMb}MB HEAP`
                  } • ${
                    telemetry.backend.db === "ok"
                      ? "POSTGRESQL HEALTHY"
                      : telemetry.backend.db === "error"
                      ? "POSTGRESQL DOWN"
                      : telemetry.backend.reachable
                      ? "HEALTH FIELD ABSEN"
                      : "BACKEND UNREACHABLE"
                  }`
                : DASH}
              <KinerjaKanvas />{" "}
              <span className="text-[#D41E12] font-mono text-[8px] ml-1">[HUD ⇡]</span>
            </span>
          ) : (
            <span className={`font-mono text-[9px] tracking-[0.18em] uppercase ${subColor}`}>
              <span className={`${accentColor} font-bold`}>✦ SPATIAL CRAFT:</span> GLSL LUMINANCE DISPLACEMENT • 60FPS ATELIER{" "}
              <span className="text-[#D41E12] font-mono text-[8px] ml-1">[HUD ⇡]</span>
            </span>
          )}
        </button>

        {/* Bottom-Right: Geographic & Telemetry Metadata */}
        <div className={`hidden sm:flex flex-col items-end ${chipPlate}`}>
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
