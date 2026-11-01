"use client";

import React, { useEffect, useState, createContext, useContext } from "react";
import Lenis from "lenis";

interface ScrollContextType {
  scrollProgress: number;
  scrollVelocity: number;
  currentChapter: number;
  lenis: Lenis | null;
  scrollToChapter: (ch: number) => void;
}

const ScrollContext = createContext<ScrollContextType>({
  scrollProgress: 0,
  scrollVelocity: 0,
  currentChapter: 1,
  lenis: null,
  scrollToChapter: () => {},
});

export const useScrollData = () => useContext(ScrollContext);

export const SmoothScrollProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [scrollVelocity, setScrollVelocity] = useState(0);
  const [currentChapter, setCurrentChapter] = useState(1);
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    const lenisInstance = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1.0,
    });

    setLenis(lenisInstance);

    const raf = (time: number) => {
      lenisInstance.raf(time);
      requestAnimationFrame(raf);
    };
    const reqId = requestAnimationFrame(raf);

    lenisInstance.on("scroll", (e: { progress: number; velocity: number }) => {
      setScrollProgress(e.progress);
      setScrollVelocity(e.velocity);

      // Determine active chapter (1 to 4)
      if (e.progress < 0.25) {
        setCurrentChapter(1);
      } else if (e.progress < 0.55) {
        setCurrentChapter(2);
      } else if (e.progress < 0.85) {
        setCurrentChapter(3);
      } else {
        setCurrentChapter(4);
      }
    });

    return () => {
      cancelAnimationFrame(reqId);
      lenisInstance.destroy();
    };
  }, []);

  const scrollToChapter = (ch: number) => {
    const target = document.getElementById(`chapter-0${ch}`);
    if (target && lenis) {
      lenis.scrollTo(target, { duration: 1.4 });
    }
  };

  return (
    <ScrollContext.Provider
      value={{
        scrollProgress,
        scrollVelocity,
        currentChapter,
        lenis,
        scrollToChapter,
      }}
    >
      {children}
    </ScrollContext.Provider>
  );
};
