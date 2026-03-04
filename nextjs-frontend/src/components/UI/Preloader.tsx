"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProgress } from "@react-three/drei";

const bootSequence = [
  "Initializing System Core...",
  "Loading 3D Modules...",
  "Mounting React Components...",
  "Connecting to Neural Network...",
  "System Ready."
];

export default function Preloader() {
  const [complete, setComplete] = useState(false);
  const [textIndex, setTextIndex] = useState(0);
  const { progress, active, loaded, total } = useProgress();
  const [displayProgress, setDisplayProgress] = useState(0);

  // Initialize and check session
  useEffect(() => {
    const hasBooted = sessionStorage.getItem("booted");
    if (hasBooted) {
      setComplete(true);
      return;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  // Track real 3D progress
  useEffect(() => {
    setDisplayProgress((prev) => Math.max(prev, progress));

    // Map text sequence to real progress
    const newTextIndex = Math.min(
      Math.floor((progress / 100) * (bootSequence.length - 1)),
      bootSequence.length - 1
    );
    setTextIndex(newTextIndex);

    // Complete loading when fully loaded or no longer active
    if (progress === 100 || (!active && loaded > 0 && loaded === total)) {
      const timeout = setTimeout(() => {
        setComplete(true);
        document.body.style.overflow = "unset";
        sessionStorage.setItem("booted", "true");
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [progress, active, loaded, total]);

  // Robust Failsafe (force finish after 8 seconds no matter what)
  useEffect(() => {
    if (complete) return;
    const failsafe = setTimeout(() => {
      setComplete(true);
      document.body.style.overflow = "unset";
      sessionStorage.setItem("booted", "true");
    }, 8000);
    return () => clearTimeout(failsafe);
  }, [complete]);

  if (complete) return null;

  return (
    <AnimatePresence>
      {!complete && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] bg-[#050000] flex flex-col items-center justify-center font-mono text-center"
        >
          {/* Pulse Circle */}
          <div className="relative w-24 h-24 mb-8">
            <div className="absolute inset-0 border-t-2 border-accent-primary rounded-full animate-spin" />
            <div className="absolute inset-2 border-r-2 border-red-800 rounded-full animate-spin-slow" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold text-accent-primary animate-pulse">
                {Math.round(displayProgress)}%
              </span>
            </div>
          </div>

          {/* Text Sequence */}
          <div className="h-8 overflow-hidden">
            <motion.p
              key={textIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-red-500/80 text-sm md:text-base tracking-widest"
            >
              {`> ${bootSequence[textIndex]}`}
            </motion.p>
          </div>

          {/* Progress Bar */}
          <div className="w-64 h-1 bg-red-900/20 mt-8 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-accent-primary"
              initial={{ width: "0%" }}
              animate={{ width: `${displayProgress}%` }}
              transition={{ duration: 0.3, ease: "linear" }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
