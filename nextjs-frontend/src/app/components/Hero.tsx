"use client";

import React from "react";
import { motion } from "framer-motion";

const Hero: React.FC = () => {
  return (
    <section id="hero" className="relative w-full h-[100vh] flex flex-col justify-center items-center overflow-hidden">
      {/* ── Background Image Layer ── */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?q=80&w=2500&auto=format&fit=crop')" }}
      />
      {/* Bottom fade to black to match the reference transition */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[var(--bg)] to-transparent z-10" />

      {/* ── UI Elements matching reference ── */}

      {/* Left Vertical Nav Indicators */}
      <div className="absolute left-10 top-1/2 -translate-y-1/2 hidden lg:flex flex-col items-center gap-10 z-20">
        <span className="text-[9px] text-white/40 tracking-[0.2em] transform -rotate-90">04</span>
        <div className="w-[1px] h-12 bg-white/20" />
        <span className="text-[9px] text-white tracking-[0.2em] transform -rotate-90">01</span>
        <div className="w-[1px] h-12 bg-white/20" />
        <span className="text-[9px] text-white/40 tracking-[0.2em] transform -rotate-90">02</span>
      </div>

      {/* Right Vertical Text */}
      <div className="absolute right-10 bottom-32 hidden lg:block z-20">
        <p className="side-marker">SCROLL TO EXPLORE</p>
      </div>

      {/* ── Main Content Block ── */}
      <div className="relative z-20 flex flex-col items-center mt-[-10vh] text-center w-full max-w-7xl px-4">

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center"
        >
          {/* Top Title: ПОЗНАЙ СЕБЯ -> TEMUKAN DIRIMU */}
          <h1 className="title-font text-[clamp(28px,4vw,42px)] tracking-tight text-white mb-4">
            SOFTWARE ENGINEER
          </h1>

          {/* Subtitle */}

        </motion.div>

        {/* Giant Ghost Text: ИСТОКИ -> ARKAN */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full flex justify-center mt-[-2%]"
        >
          <h2 className="hero-ghost-text text-[clamp(120px,25vw,350px)] leading-[0.8] select-none pointer-events-none">
            ARKAN
          </h2>
        </motion.div>

      </div>

      {/* Bottom Icons (Left arrow down, Right social dots) */}
      <div className="absolute bottom-10 left-10 z-20 flex flex-col gap-2">
        <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center bg-black/20 backdrop-blur-sm cursor-pointer hover:bg-white/10 transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5V19M19 12L12 19L5 12" />
          </svg>
        </div>
        <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center bg-black/20 backdrop-blur-sm cursor-pointer hover:bg-white/10 transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 19V5M5 12L12 5L19 12" />
          </svg>
        </div>
      </div>

      <div className="absolute bottom-10 right-10 z-20 flex gap-3">
        {[1, 2, 3].map((i) => (
          <a key={i} href="#" className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center bg-black/20 hover:bg-white/10 transition-colors">
            {/* Using simple dots to replicate reference small icons */}
            <span className="w-1 h-1 bg-white/70 rounded-full" />
          </a>
        ))}
      </div>

    </section>
  );
};

export default Hero;
