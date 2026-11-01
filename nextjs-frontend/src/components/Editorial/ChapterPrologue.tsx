"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePortfolioMode } from "@/context/PortfolioModeContext";
import { ArrowDown, Cpu, Sparkles } from "lucide-react";

export const ChapterPrologue: React.FC = () => {
  const { mode } = usePortfolioMode();

  return (
    <section
      id="chapter-01"
      className="relative w-full min-h-screen flex flex-col justify-between pt-28 pb-10 px-6 md:px-12 select-none overflow-hidden"
    >
      {/* ── Top Header Tags (z-20) ── */}
      <div className="w-full max-w-[1600px] mx-auto flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#D41E12] animate-pulse" />
          <span className="font-mono text-[11px] font-bold tracking-[0.25em] uppercase text-[#D41E12]">
            CHAPTER 01 // THE PROLOGUE
          </span>
        </div>

        <div className="flex items-center gap-4 text-right">
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#6E6A64]">
            {mode === "engineer" ? "HIGH-THROUGHPUT TELEMETRY" : "HAUTE-COUTURE SPATIAL 3D"}
          </span>
        </div>
      </div>

      {/* ── SANDWICH LAYER 1: BACK LAYER (z-0, BEHIND 3D CANVAS z-10) ── */}
      <div
        aria-hidden="true"
        className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none z-0 overflow-hidden"
      >
        <motion.div
          initial={{ y: "15%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[1750px] mx-auto flex flex-col items-center justify-center select-none"
        >
          <span className="font-serif text-[11vw] font-black tracking-tighter uppercase leading-[0.85] text-[#0A0A0A] block whitespace-nowrap">
            M. ARKAN
          </span>
          <span className="font-serif text-[11vw] font-black tracking-tighter uppercase leading-[0.85] text-[#0A0A0A] block whitespace-nowrap">
            FAUZI
          </span>
        </motion.div>
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

        {/* Clean Editorial Subtitle (NO pill/capsule background, pure Swiss typography) */}
        <div className="mt-8 flex flex-col items-center max-w-2xl mx-auto pointer-events-auto h-16 justify-center">
          <AnimatePresence mode="wait">
            {mode === "engineer" ? (
              <motion.div
                key="engineer-sub"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center"
              >
                <div className="flex items-center gap-2 mb-1.5 font-mono text-[10px] font-bold tracking-[0.22em] uppercase text-[#D41E12]">
                  <Cpu className="w-3.5 h-3.5 text-[#D41E12]" />
                  <span>MODE: THE ENGINEER // CORE RUNTIME</span>
                </div>
                <p className="font-mono text-xs sm:text-sm text-[#0A0A0A] font-bold tracking-[0.08em] uppercase text-center">
                  SYSTEMS ARCHITECT — GO / TYPESCRIPT / LINUX &amp; MICROSERVICES
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="creator-sub"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center"
              >
                <div className="flex items-center gap-2 mb-1.5 font-mono text-[10px] font-bold tracking-[0.22em] uppercase text-[#D41E12]">
                  <Sparkles className="w-3.5 h-3.5 text-[#D41E12]" />
                  <span>MODE: THE CREATOR // SPATIAL ATELIER</span>
                </div>
                <p className="font-mono text-xs sm:text-sm text-[#0A0A0A] font-bold tracking-[0.08em] uppercase text-center">
                  CREATIVE TECHNOLOGIST — WEBGL / GLSL / GENERATIVE AI &amp; SPATIAL DESIGN
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Bottom Section Edge (z-20, Clean Swiss Hairline, No floating yellow/orange buttons) ── */}
      <div className="w-full max-w-[1600px] mx-auto flex items-end justify-between z-20 pt-4 swiss-border-t">
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#6E6A64]">
          SCUDERIA PROTOCOL // #16
        </span>

        <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] uppercase text-[#D41E12]">
          <span>SCROLL TO TRAVERSE</span>
          <ArrowDown className="w-3 h-3 animate-bounce" />
        </div>
      </div>
    </section>
  );
};

export default ChapterPrologue;
