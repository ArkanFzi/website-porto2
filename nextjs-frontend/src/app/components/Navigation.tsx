"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Github, Grid2X2, X, Instagram, Linkedin, MessageCircle } from "lucide-react";

const socialLinks = [
  { icon: <Linkedin size={16} />, href: "https://www.linkedin.com/in/muhamad-arkan-fauzi-5a6799380/", label: "LinkedIn", hoverClass: "hover:text-[#0A66C2]" },
  { icon: <Instagram size={16} />, href: "https://instagram.com/arkan_fzi", label: "Instagram", hoverClass: "hover:text-[#E1306C]" },
  { icon: <MessageCircle size={16} />, href: "https://wa.me/6281332314854", label: "WhatsApp", hoverClass: "hover:text-[#25D366]" },
  { icon: <Github size={16} />, href: "https://github.com/ArkanFzi", label: "GitHub", hoverClass: "hover:text-white" },
];

const links = [
  { label: "HOME", href: "/" },
  { label: "REKAM", href: "/#projects" },
  { label: "KONTAK", href: "/#contact" },
  { label: "DOSSIER", href: "/dossier" },
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
          <a href="#hero" className="flex items-center gap-3 group z-50 relative">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 3L21 20H3L12 3Z" className="group-hover:fill-white/20 transition-all" />
              <circle cx="12" cy="14" r="2" fill="currentColor" />
            </svg>
            <span className="font-semibold tracking-[0.1em] text-base">Fz.</span>
          </a>

          {/* Center Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-14">
            {links.map((l) => {
              const isActive = active === l.href.substring(1);
              return (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setActive(l.href.substring(1))}
                  className={`text-xs tracking-[0.25em] font-medium uppercase transition-colors relative ${isActive ? "text-white" : "text-white/60 hover:text-white"
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
            <div className="hidden lg:flex items-center gap-7 mr-6 border-r border-white/20 pr-8">
              {socialLinks.map((social, idx) => (
                <a 
                  key={idx} 
                  href={social.href} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`text-white/50 transition-colors hover:scale-110 transform p-2 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 ${social.hoverClass}`}
                  title={social.label}
                >
                  {React.cloneElement(social.icon, { size: 22 })}
                </a>
              ))}
            </div>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden w-10 h-10 flex shrink-0 items-center justify-center bg-white/5 hover:bg-white/10 rounded-sm transition-colors border border-white/10 cursor-pointer"
              aria-label="Toggle Menu"
            >
              {isMobileMenuOpen ? <X size={16} strokeWidth={1} /> : <Grid2X2 size={16} strokeWidth={1} />}
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
            className="fixed inset-0 z-40 bg-black/95 flex flex-col justify-center items-center"
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
              
              <div className="mt-8 flex gap-6 pt-5 border-t border-white/10 text-white/60 w-full justify-center">
                {socialLinks.map((social, idx) => (
                  <motion.a
                    key={idx}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: 0.3 + (idx * 0.1), duration: 0.4 }}
                    className={`transition-colors p-3 bg-white/5 rounded-full border border-white/10 hover:border-white/50 ${social.hoverClass}`}
                  >
                    {React.cloneElement(social.icon, { size: 20 })}
                  </motion.a>
                ))}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navigation;
