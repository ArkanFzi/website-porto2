"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Sparkle } from "lucide-react";

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
    <footer ref={containerRef} className="relative w-full bg-[#0c1410] text-white py-20 lg:py-32 flex flex-col items-center justify-between overflow-hidden z-20 border-t border-white/5">

      {/* Container split into Left and Right */}
      <div className="w-full max-w-[1400px] mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-8 items-center">

        {/* Left Side: Elegant Branding & Copyright */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left order-2 md:order-1">
          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-[clamp(32px,5vw,64px)] italic text-[#e8e9e4] leading-[1.1] mb-6"
            style={{ fontFamily: "var(--f-serif)" }}
          >
            M. Arkan<br />Fauzi.
          </motion.h3>

          <div className="h-[1px] w-16 bg-[#c49a56] mb-8" />

          <p className="text-[10px] md:text-[11px] text-white/50 tracking-[0.4em] uppercase font-medium" style={{ fontFamily: "var(--f-sans)" }}>
            © {new Date().getFullYear()} ALL RIGHTS RESERVED
          </p>
          <p className="text-[10px] md:text-[11px] text-[#c49a56] tracking-[0.3em] uppercase mt-2 opacity-80" style={{ fontFamily: "var(--f-sans)" }}>
            JAKARTA, INDONESIA
          </p>
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
                  <text className="text-[13px] uppercase" style={{ fontFamily: "var(--f-sans)", fill: "currentColor" }}>
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
              <Sparkle size={32} className="text-[#c49a56] opacity-90 fill-[#c49a56]/20" />
            </div>

          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
