"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

const Hero: React.FC = () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Boot Logic
    if (sessionStorage.getItem("booted") === "true") {
      setTimeout(() => setIsReady(true), 0);
    } else {
      const handleBoot = () => setIsReady(true);
      window.addEventListener("app-booted", handleBoot);
      return () => {
        window.removeEventListener("app-booted", handleBoot);
      };
    }
  }, []);

  return (
    <section id="hero" className="relative w-full h-[100vh] flex flex-col justify-center items-center overflow-hidden">
      {/* ── Background Image Layer ── */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=2000"
          alt="Dark Geometric Building Corner"
          className="w-full h-full object-cover object-center opacity-[0.7] grayscale"
        />
        {/* Dark overlay to preserve legibility */}
        <div className="absolute inset-0 bg-[#050a07]/60 mix-blend-multiply" />
      </div>
      {/* Bottom fade to match the section transition */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[var(--bg)] to-transparent z-10" />

      {/* ── UI Elements matching reference ── */}

      {/* Right Vertical Text */}
      <div className="absolute right-10 bottom-32 hidden lg:block z-20">
        <p className="side-marker">SCROLL TO EXPLORE</p>
      </div>

      {/* ── Main Content Block ── */}
      <div className="relative z-20 flex flex-col items-center mt-[-10vh] text-center w-full max-w-7xl px-4">

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isReady ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center"
        >
          {/* Top Title: ПОЗНАЙ СЕБЯ -> TEMUKAN DIRIMU */}
          <h1 className="title-font text-[clamp(24px,4vw,42px)] tracking-tight text-white mb-4">
            SOFTWARE ENGINEER
          </h1>

          {/* Subtitle */}

        </motion.div>

        {/* Giant Ghost Text: ИСТОКИ -> ARKAN */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 50 }}
          animate={isReady ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.9, y: 50 }}
          transition={{ duration: 4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full flex justify-center mt-[-2%]"
        >
          <h2 className="hero-ghost-text text-[clamp(80px,25vw,350px)] leading-[0.8] select-none pointer-events-none">
            ARKAN
          </h2>
        </motion.div>

      </div>
    </section>
  );
};

export default Hero;
