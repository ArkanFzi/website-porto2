"use client";

import React from "react";
import { motion } from "framer-motion";
import { usePortfolioMode } from "@/context/PortfolioModeContext";
import { ArrowDown, Flame, Sparkles } from "lucide-react";

export const ChapterPrologue: React.FC = () => {
  const { mode } = usePortfolioMode();

  return (
    <section
      id="chapter-01"
      className="relative w-full min-h-screen flex flex-col justify-between pt-28 pb-16 px-6 md:px-12 select-none"
    >
      {/* ── Top Header Tags ── */}
      <div className="w-full max-w-[1600px] mx-auto flex items-center justify-between z-10">
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

      {/* ── Massive Display Typography (Behind and Framing Monolith) ── */}
      <div className="w-full max-w-[1680px] mx-auto my-auto flex flex-col items-center justify-center text-center relative pointer-events-none">
        
        {/* Row 1: M. ARKAN */}
        <div className="overflow-hidden w-full">
          <motion.h1
            initial={{ y: "105%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            className="font-serif text-[clamp(52px,13vw,210px)] font-bold tracking-[-0.03em] uppercase leading-[0.88] text-[#0A0A0A]"
          >
            M. ARKAN
          </motion.h1>
        </div>

        {/* Row 2: FAUZI */}
        <div className="overflow-hidden w-full">
          <motion.h1
            initial={{ y: "105%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
            className="font-serif text-[clamp(52px,13vw,210px)] font-bold tracking-[-0.03em] uppercase leading-[0.88] text-[#0A0A0A]"
          >
            FAUZI
          </motion.h1>
        </div>

        {/* Subtitle Statement */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.0, ease: "easeOut", delay: 0.5 }}
          className="mt-8 flex flex-col items-center max-w-xl mx-auto"
        >
          <div className="flex items-center gap-2 mb-2 font-mono text-[10px] font-bold tracking-[0.22em] uppercase text-[#D41E12]">
            {mode === "engineer" ? (
              <>
                <Flame className="w-3.5 h-3.5 text-[#D41E12]" />
                <span>LEAD SYSTEMS ARCHITECT • MICROSERVICES ENGINE</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-[#D41E12]" />
                <span>CREATIVE TECHNOLOGIST • SHADER CRAFT</span>
              </>
            )}
          </div>

          <p className="font-sans text-sm md:text-base text-[#6E6A64] leading-relaxed tracking-normal">
            {mode === "engineer"
              ? "Architecting mission-critical microservices, compiler AST engines, and high-velocity backend pipelines with the relentless discipline of Formula 1 powertrain engineering."
              : "Designing sensorial WebGL spatial interfaces, generative AI agents, and couture digital aesthetics inspired by Monaco Grand Prix minimalism."}
          </p>
        </motion.div>

      </div>

      {/* ── Bottom Section Edge & Scroll Indicator ── */}
      <div className="w-full max-w-[1600px] mx-auto flex items-end justify-between z-10 pt-6 swiss-border-t">
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
