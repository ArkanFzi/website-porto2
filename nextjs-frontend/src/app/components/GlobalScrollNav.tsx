"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

const SECTIONS = [
  { id: "hero", label: "01" },
  { id: "about", label: "02" },
  { id: "projects", label: "03" },
  { id: "contact", label: "04" },
];

export default function GlobalScrollNav() {
  const [activeSection, setActiveSection] = useState("hero");
  const isManualScroll = React.useRef(false);
  const scrollTimeout = React.useRef<NodeJS.Timeout | null>(null);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    isManualScroll.current = true;
    
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });

    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      isManualScroll.current = false;
    }, 1000); // Lock scroll listener during the smooth scroll animation
  };

  useEffect(() => {
    const handleScroll = () => {
      if (isManualScroll.current) return;
      
      const triggerLine = window.innerHeight / 3;
      let newActiveSection = "hero";
      
      for (let i = SECTIONS.length - 1; i >= 0; i--) {
        const section = document.getElementById(SECTIONS[i].id);
        if (section) {
          const rect = section.getBoundingClientRect();
          // If the top of the section has crossed our trigger line
          if (rect.top <= triggerLine) {
            newActiveSection = SECTIONS[i].id;
            break;
          }
        }
      }
      setActiveSection(newActiveSection);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial check
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* Minimalist Left Vertical Nav Indicators */}
      <div className="fixed left-6 md:left-10 top-1/2 -translate-y-1/2 hidden md:flex flex-col items-center gap-6 z-[100] pointer-events-auto mix-blend-difference text-white">
        {SECTIONS.map((section, idx, arr) => {
          return (
            <React.Fragment key={section.id}>
              <button
                onClick={() => scrollToSection(section.id)}
                className={`flex flex-col items-center justify-center transition-all duration-300 group`}
              >
                <div 
                  className={`relative flex items-center justify-center w-8 h-8 transition-all duration-500`}
                >
                  <span 
                    className={`text-[9px] md:text-[10px] font-mono tracking-[0.2em] transform -rotate-90 origin-center transition-all duration-300
                      ${activeSection === section.id ? "text-white font-bold opacity-100" : "text-white/40 group-hover:text-white pb-1"}
                    `}
                  >
                    {section.label}
                  </span>
                </div>
              </button>
              
              {/* Connecting Line */}
              {idx < arr.length - 1 && (
                <div className="w-[1px] h-12 bg-white/5 relative overflow-hidden">
                  <motion.div
                    initial={{ height: "0%" }}
                    animate={{ 
                      height: activeSection === arr[idx + 1].id || 
                              arr.findIndex(s => s.id === activeSection) > idx 
                              ? "100%" : "0%" 
                    }}
                    transition={{ duration: 0.5 }}
                    className="absolute top-0 left-0 w-full bg-white/40"
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Bottom Icons (Left arrow down/up) */}
      <div className="fixed bottom-10 left-6 md:left-10 z-[100] flex flex-col gap-2 pointer-events-auto">
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          title="Scroll to Top"
          className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center bg-black/50 backdrop-blur-sm cursor-pointer hover:bg-white/10 hover:border-white/50 transition-all mix-blend-difference"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
            <path d="M12 19V5M5 12L12 5L19 12" />
          </svg>
        </button>
        <button 
          onClick={() => window.scrollBy({ top: typeof window !== 'undefined' ? window.innerHeight : 800, behavior: "smooth" })}
          title="Scroll Down"
          className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center bg-black/50 backdrop-blur-sm cursor-pointer hover:bg-white/10 hover:border-white/50 transition-all mix-blend-difference"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
            <path d="M12 5V19M19 12L12 19L5 12" />
          </svg>
        </button>
      </div>

      {/* Right pagination dots */}
      <div className="fixed bottom-10 right-6 md:right-10 z-[100] flex gap-3 pointer-events-auto mix-blend-difference">
        {SECTIONS.map((section, idx) => {
          const isActive = activeSection === section.id;
          return (
            <button 
              key={idx} 
              onClick={() => scrollToSection(section.id)}
              title={`Scroll to ${section.label}`}
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-all group ${
                isActive ? "border-white/80 bg-white/10" : "border-white/20 bg-black/50 hover:bg-white/20 hover:border-white/50"
              } border backdrop-blur-sm`}
            >
              <span className={`w-1 h-1 rounded-full transition-all duration-300 ${
                isActive ? "bg-white scale-150" : "bg-white/50 group-hover:bg-white group-hover:scale-150"
              }`} />
            </button>
          );
        })}
      </div>
    </>
  );
}
