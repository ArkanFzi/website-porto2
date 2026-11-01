"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePortfolioMode } from "@/context/PortfolioModeContext";
import { Cpu, Sparkles } from "lucide-react";

export const ChapterPrologue: React.FC = () => {
  const { mode } = usePortfolioMode();

  return (
    <section
      id="chapter-01"
      className="relative w-full min-h-screen flex flex-col justify-between pt-24 sm:pt-28 pb-20 px-6 md:px-12 select-none overflow-hidden"
    >
      {/* ── Top Header Tags (z-20) ── */}
      <div className="w-full max-w-[1600px] mx-auto flex items-center justify-between pb-6 swiss-border-b z-20">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#D41E12] animate-pulse" />
          <span className="font-mono text-[11px] font-bold tracking-[0.25em] uppercase text-[#D41E12]">
            CHAPTER 01 // THE PROLOGUE
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#6E6A64]">
            HIGH-THROUGHPUT TELEMETRY
          </span>
        </div>
      </div>

      {/* ── SANDWICH LAYER 1: BACK LAYER (z-0, BEHIND 3D CANVAS z-10) ── */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 flex flex-col items-center justify-center text-center pointer-events-none select-none overflow-hidden"
      >
        <div className="w-full max-w-[1750px] mx-auto px-4 opacity-[0.92]">
          <span className="font-serif text-[11vw] font-black tracking-tighter uppercase leading-[0.85] text-[#0A0A0A] block whitespace-nowrap">
            M. ARKAN
          </span>
          <span className="font-serif text-[11vw] font-black tracking-tighter uppercase leading-[0.85] text-[#0A0A0A] block whitespace-nowrap">
            FAUZI
          </span>
        </div>
      </div>

      {/* ── SANDWICH LAYER 2: FRONT LAYER (z-20, IN FRONT OF 3D CANVAS z-10) ── */}
      <div
        className="relative z-20 w-full max-w-[1750px] mx-auto my-auto flex flex-col items-center justify-center text-center pointer-events-none"
      >
        {/* Massive Typography with mix-blend-difference & sharp white stroke */}
        <div className="mix-blend-difference select-none w-full">
          <span
            className="font-serif text-[11vw] font-black tracking-tighter uppercase leading-[0.85] text-[#F7F5F0] block whitespace-nowrap opacity-90"
            style={{
              WebkitTextStroke: "1px rgba(247, 245, 240, 0.6)",
            }}
          >
            M. ARKAN
          </span>
          <span
            className="font-serif text-[11vw] font-black tracking-tighter uppercase leading-[0.85] text-[#F7F5F0] block whitespace-nowrap opacity-90"
            style={{
              WebkitTextStroke: "1px rgba(247, 245, 240, 0.6)",
            }}
          >
            FAUZI
          </span>
        </div>
      </div>

      {/* ── Subtitle positioned cleanly below the photo area with safe clearance ── */}
      <div className="w-full max-w-[1600px] mx-auto z-20 flex flex-col items-center text-center pt-2 pb-6">
        <AnimatePresence mode="wait">
          {mode === "engineer" ? (
            <motion.div
              key="engineer-sub"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center"
            >
              <div className="flex items-center gap-2 mb-1.5 font-mono text-[10px] font-bold tracking-[0.22em] uppercase text-[#D41E12]">
                <Cpu className="w-3.5 h-3.5 text-[#D41E12]" />
                <span>MODE: THE ENGINEER // CORE RUNTIME</span>
              </div>
              <p className="font-mono text-xs sm:text-sm text-[#0A0A0A] font-bold tracking-[0.08em] uppercase text-center max-w-xl">
                SYSTEMS ARCHITECT — GO / TYPESCRIPT / LINUX &amp; MICROSERVICES
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="creator-sub"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center"
            >
              <div className="flex items-center gap-2 mb-1.5 font-mono text-[10px] font-bold tracking-[0.22em] uppercase text-[#D41E12]">
                <Sparkles className="w-3.5 h-3.5 text-[#D41E12]" />
                <span>MODE: THE CREATOR // SPATIAL ATELIER</span>
              </div>
              <p className="font-mono text-xs sm:text-sm text-[#0A0A0A] font-bold tracking-[0.08em] uppercase text-center max-w-xl">
                CREATIVE TECHNOLOGIST — WEBGL / GLSL / GENERATIVE AI &amp; SPATIAL DESIGN
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-[#D41E12] mt-3 animate-pulse">
          SCROLL TO TRAVERSE ↓
        </span>
      </div>
    </section>
  );
};

export default ChapterPrologue;
