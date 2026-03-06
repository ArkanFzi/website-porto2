"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Github, Grid2X2, X } from "lucide-react";

const links = [
  { label: "PROFIL", href: "/#about" },
  { label: "REKAM", href: "/#projects" },
  { label: "KONTAK", href: "/#contact" },
  { label: "DOSSIER", href: "/archive" },
];

const Navigation = () => {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("hero");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Prevent scrolling when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [isMobileMenuOpen]);

  return (
    <>
      <header
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-700 ${scrolled ? "bg-black/80 backdrop-blur-md py-4" : "bg-gradient-to-b from-black/60 to-transparent py-6 md:py-8"
          }`}
      >
        <div className="max-w-[1400px] mx-auto px-6 md:px-8 flex items-center justify-between">
          {/* Brand */}
          <a href="#hero" className="flex items-center gap-2 group z-50 relative">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 3L21 20H3L12 3Z" className="group-hover:fill-white/20 transition-all" />
              <circle cx="12" cy="14" r="2" fill="currentColor" />
            </svg>
            <span className="font-semibold tracking-[0.1em] text-sm">Fz.</span>
          </a>

          {/* Center Links (Desktop) */}
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

          {/* Right Area */}
          <div className="flex items-center gap-4 md:gap-6 z-50 relative">
            <a href="https://github.com/ArkanFzi" target="_blank" rel="noopener noreferrer"
              className="hidden md:flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-white/80 hover:text-white transition-opacity">
              <span>| GitHub</span>
              <Github size={14} />
            </a>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-sm transition-colors border border-white/10 md:hidden"
            >
              {isMobileMenuOpen ? <X size={16} strokeWidth={1} /> : <Grid2X2 size={16} strokeWidth={1} />}
            </button>
            <button className="hidden md:flex w-10 h-10 items-center justify-center bg-white/5 hover:bg-white/10 rounded-sm transition-colors border border-white/10">
              <Grid2X2 size={16} strokeWidth={1} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-40 bg-black/95 flex flex-col justify-center items-center md:hidden"
          >
            <nav className="flex flex-col items-center gap-8">
              {links.map((l, i) => (
                <motion.a
                  key={l.href}
                  href={l.href}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  onClick={() => {
                    setActive(l.href.substring(1));
                    setIsMobileMenuOpen(false);
                  }}
                  className="text-2xl tracking-[0.2em] font-medium uppercase text-white/80 hover:text-white transition-colors"
                >
                  {l.label}
                </motion.a>
              ))}
              <motion.a
                href="https://github.com/ArkanFzi"
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="mt-8 flex items-center gap-3 text-sm tracking-[0.2em] uppercase text-white/60 hover:text-white transition-colors"
              >
                <Github size={20} />
                <span>GitHub</span>
              </motion.a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navigation;
