"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Sparkle } from "lucide-react";
import { MENU_SECTIONS, hrefSection } from "@/lib/sections";

const pageLinks = [
  { label: "HOME", href: "/" },
  ...MENU_SECTIONS.map((s) => ({ label: s.menuLabel, href: hrefSection(s.id) })),
  { label: "DOSSIER", href: "/dossier" },
  { label: "CV (PDF)", href: "/api/cv" },
];

const externalLinks = [
  { label: "EMAIL", href: "mailto:muhammadarkanfauzi9@gmail.com" },
  { label: "LINKEDIN", href: "https://www.linkedin.com/in/muhamad-arkan-fauzi-5a6799380/" },
  { label: "GITHUB", href: "https://github.com/ArkanFzi" },
  { label: "INSTAGRAM", href: "https://instagram.com/arkan_fzi" },
  { label: "WHATSAPP", href: "https://wa.me/6281332314854" },
];

const Footer: React.FC = () => {
  const containerRef = useRef<HTMLElement>(null);

  // Parallax subtle rotation linked to scroll
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end end"]
  });

  // Rotate the SVG based on scroll, layered with the infinite spin
  const scrollRotate = useTransform(scrollYProgress, [0, 1], [0, 180]);

  return (
    <footer ref={containerRef} className="relative w-full bg-surface text-white py-20 lg:py-32 flex flex-col items-center justify-between overflow-hidden z-20 border-t border-white/5">

      {/* Container split into Left and Right */}
      <div className="w-full max-w-[1400px] mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-8 items-center">

        {/* Left Side: Elegant Branding & Copyright */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left order-2 md:order-1">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-statement italic text-ink leading-[1.1] mb-6"
            style={{ fontFamily: "var(--f-serif)" }}
          >
            M. Arkan<br />Fauzi.
          </motion.p>

          <div className="h-[1px] w-16 bg-accent-primary mb-8" />

          <p className="text-tag md:text-micro text-white/50 tracking-[0.4em] uppercase font-medium" style={{ fontFamily: "var(--f-sans)" }}>
            © {new Date().getFullYear()} ALL RIGHTS RESERVED
          </p>
          <p className="text-tag md:text-micro text-accent-primary tracking-[0.3em] uppercase mt-2 opacity-80" style={{ fontFamily: "var(--f-sans)" }}>
            MALANG, INDONESIA
          </p>

          <nav className="flex flex-wrap justify-center md:justify-start gap-x-7 gap-y-2 mt-10" aria-label="Footer">
            {pageLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-tag md:text-micro tracking-[0.25em] uppercase text-white/60 hover:text-accent-primary transition-colors"
                style={{ fontFamily: "var(--f-sans)" }}
              >
                {l.label}
              </a>
            ))}
          </nav>

          <nav className="flex flex-wrap justify-center md:justify-start gap-x-7 gap-y-2 mt-4" aria-label="Elsewhere">
            {externalLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                {...(l.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="text-tag md:text-micro tracking-[0.25em] uppercase text-accent-primary/70 hover:text-accent-primary transition-colors"
                style={{ fontFamily: "var(--f-sans)" }}
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>

        {/* Right Side: Rotating Stamp */}
        <div className="flex justify-center md:justify-end order-1 md:order-2">

          <div className="relative w-[180px] h-[180px] md:w-[240px] md:h-[240px] flex items-center justify-center">

            {/* The infinite rotating text ring */}
            <motion.div
              style={{ rotate: scrollRotate }} // Apply scroll rotation
              className="absolute inset-0 w-full h-full"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
                className="w-full h-full text-white/40"
              >
                <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
                  <path
                    id="circlePath"
                    fill="none"
                    d="M 100, 100
                       m -90, 0
                       a 90,90 0 1,1 180,0
                       a 90,90 0 1,1 -180,0"
                  />
                  <text className="text-body uppercase" style={{ fontFamily: "var(--f-sans)", fill: "currentColor" }}>
                    {/* 565.48 is the circumference of a circle with r=90 (2 * pi * 90) */}
                    <textPath href="#circlePath" startOffset="0" textLength="565" lengthAdjust="spacing">
                      TERIMA KASIH ATAS PERHATIANNYA • TERIMA KASIH ATAS PERHATIANNYA •
                    </textPath>
                  </text>
                </svg>
              </motion.div>
            </motion.div>

            {/* Elegant Center Icon (Sparkle/Star instead of Heart) */}
            <div className="absolute z-10 flex items-center justify-center">
              <Sparkle size={32} className="text-accent-primary opacity-90 fill-accent-primary/20" />
            </div>

          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
