"use client";

import React from "react";
import { ArrowUpRight } from "lucide-react";

const SOCIAL_CHANNELS = [
  { name: "GITHUB", url: "https://github.com/ArkanFzi" },
  { name: "LINKEDIN", url: "https://www.linkedin.com/in/muhamad-arkan-fauzi-5a6799380/" },
  { name: "INSTAGRAM", url: "https://instagram.com/arkan_fzi" },
  { name: "WHATSAPP", url: "https://wa.me/6281332314854" },
  { name: "EMAIL", url: "mailto:muhammadarkanfauzi9@gmail.com" },
];

export const ChapterPaddock: React.FC = () => {
  return (
    <section
      id="chapter-04"
      className="relative w-full min-h-screen bg-[#D41E12] text-[#F7F5F0] pt-36 pb-16 px-6 md:px-12 select-none overflow-hidden transition-colors duration-700 flex flex-col justify-between"
    >
      <div className="w-full max-w-[1600px] mx-auto z-20">
        
        {/* ── Top Header Tags ── */}
        <div className="w-full flex items-center justify-between pb-6 border-b border-white/20 mb-16 sm:mb-24">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="font-mono text-[11px] font-bold tracking-[0.25em] uppercase text-white">
              CHAPTER 04 // THE PADDOCK & FINALE
            </span>
          </div>

          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-white/70">
            DIRECT TRANSMISSION // PIT-TO-CAR LINK
          </span>
        </div>

        {/* ── GIANT FULL-WIDTH DISPLAY MAGNETIC CTA ── */}
        <div className="my-auto py-12 sm:py-20">
          <span className="font-mono text-[10px] sm:text-xs tracking-[0.3em] uppercase text-white/70 block mb-4">
            NEXT STEPS // OPEN FOR COLLABORATION
          </span>

          <a
            href="mailto:muhammadarkanfauzi9@gmail.com"
            className="group block"
            data-magnetic
          >
            <h2 className="font-serif text-[clamp(46px,8.5vw,140px)] font-bold tracking-tighter uppercase leading-[0.88] text-white group-hover:text-[#0A0A0A] transition-colors duration-500">
              LET&apos;S BUILD THE
              <br />
              <span className="inline-flex items-center gap-4 sm:gap-8">
                EXTRAORDINARY
                <ArrowUpRight className="inline-block w-[clamp(44px,8vw,130px)] h-[clamp(44px,8vw,130px)] transition-transform duration-500 group-hover:translate-x-4 group-hover:-translate-y-4" />
              </span>
            </h2>
          </a>
        </div>

      </div>

      {/* ── MINIMALIST SOCIAL LINKS & SIGNATURE STRIP ── */}
      <div className="w-full max-w-[1600px] mx-auto z-20 pt-8 border-t border-white/20 flex flex-col sm:flex-row items-center justify-between gap-6">
        
        {/* Left: Copyright */}
        <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
          <span className="font-serif text-lg font-bold text-white tracking-tight">
            M. Arkan Fauzi.
          </span>
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-white/60">
            © {new Date().getFullYear()} ALL RIGHTS RESERVED // CAR #16
          </span>
        </div>

        {/* Right: Minimalist Social Channels */}
        <nav className="flex flex-wrap items-center justify-center gap-6 sm:gap-8" aria-label="Social Links">
          {SOCIAL_CHANNELS.map((ch) => (
            <a
              key={ch.name}
              href={ch.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] font-bold tracking-[0.2em] uppercase text-white hover:text-[#0A0A0A] transition-colors"
              data-magnetic
            >
              {ch.name}
            </a>
          ))}
        </nav>

      </div>
    </section>
  );
};

export default ChapterPaddock;
