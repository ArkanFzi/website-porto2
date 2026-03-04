"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Github, Grid2X2 } from "lucide-react";

const links = [
  { label: "PROFIL", href: "#about" },
  { label: "REKAM", href: "#projects" },
  { label: "KONTAK", href: "#contact" },
];

const Navigation = () => {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("hero");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Desktop header from reference */}
      <header
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-700 ${scrolled ? "bg-black/80 backdrop-blur-md py-4" : "bg-gradient-to-b from-black/60 to-transparent py-8"
          }`}
      >
        <div className="max-w-[1400px] mx-auto px-8 flex items-center justify-between">
          {/* Brand */}
          <a href="#hero" className="flex items-center gap-2 group">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 3L21 20H3L12 3Z" className="group-hover:fill-white/20 transition-all" />
              <circle cx="12" cy="14" r="2" fill="currentColor" />
            </svg>
            <span className="font-semibold tracking-[0.1em] text-sm">Fz.</span>
          </a>

          {/* Center Links (Reference specific active state: line through / line below) */}
          <nav className="hidden md:flex items-center gap-12">
            {links.map((l) => {
              const isActive = active === l.href.substring(1);
              return (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setActive(l.href.substring(1))}
                  className={`text-[10px] tracking-[0.2em] font-medium uppercase transition-colors relative ${isActive ? "text-white" : "text-white/60 hover:text-white"
                    }`}
                >
                  {l.label}
                  {isActive && (
                    <span className="absolute -bottom-2 left-0 w-full h-[1px] bg-white opacity-40" />
                  )}
                </a>
              );
            })}
          </nav>

          {/* Right Area (Hubungi CTA + Menu Icon) */}
          <div className="flex items-center gap-6">
            <a href="https://github.com/ArkanFzi" target="_blank" rel="noopener noreferrer"
              className="hidden md:flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-white/80 hover:text-white transition-opacity">
              <span>| GitHub</span>
              <Github size={14} />
            </a>

            <button className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-sm transition-colors border border-white/10">
              <Grid2X2 size={16} strokeWidth={1} />
            </button>
          </div>
        </div>
      </header>
    </>
  );
};

export default Navigation;
