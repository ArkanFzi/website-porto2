"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export const EditorialPreloader: React.FC<{ onComplete?: () => void }> = ({ onComplete }) => {
  const [count, setCount] = useState(0);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    // 00 to 16 counter (representing car #16)
    const interval = setInterval(() => {
      setCount((prev) => {
        if (prev >= 16) {
          clearInterval(interval);
          setTimeout(() => {
            setIsDone(true);
            onComplete?.();
          }, 350);
          return 16;
        }
        return prev + 1;
      });
    }, 55);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {!isDone && (
        <motion.div
          className="fixed inset-0 z-[99999] pointer-events-auto flex flex-col justify-between"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }}
        >
          {/* Top Curtain Half */}
          <motion.div
            className="absolute top-0 left-0 right-0 h-1/2 bg-[#0A0A0A] border-b border-white/5"
            exit={{ y: "-100%", transition: { duration: 1.1, ease: [0.77, 0, 0.175, 1] } }}
          />

          {/* Bottom Curtain Half */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-1/2 bg-[#0A0A0A] border-t border-white/5"
            exit={{ y: "100%", transition: { duration: 1.1, ease: [0.77, 0, 0.175, 1] } }}
          />

          {/* Centered Counter */}
          <div className="relative z-10 w-full h-full flex flex-col items-center justify-center select-none">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-xs tracking-[0.3em] uppercase text-[#6E6A64]">
                CAR NO.
              </span>
              <motion.span
                key={count}
                initial={{ opacity: 0.6, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-mono text-6xl md:text-8xl font-bold tracking-tight text-[#D41E12]"
              >
                {String(count).padStart(2, "0")}
              </motion.span>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D41E12] animate-ping" />
              <p className="font-mono text-[10px] tracking-[0.28em] uppercase text-[#6E6A64]">
                CALIBRATING CHIAROSCURO MONOLITH // SOTY
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EditorialPreloader;
