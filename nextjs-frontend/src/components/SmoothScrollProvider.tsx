"use client";

import React, { useEffect, useRef, useState, createContext, useContext } from "react";
import Lenis from "lenis";

interface ScrollContextType {
  scrollProgressRef: React.RefObject<number>;
  scrollVelocityRef: React.RefObject<number>;
  currentChapter: number;
  scrollToChapter: (ch: number) => void;
}

const ScrollContext = createContext<ScrollContextType>({
  scrollProgressRef: { current: 0 },
  scrollVelocityRef: { current: 0 },
  currentChapter: 1,
  scrollToChapter: () => {},
});

export const useScrollData = () => useContext(ScrollContext);

export const SmoothScrollProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const scrollProgressRef = useRef(0);
  const scrollVelocityRef = useRef(0);
  const lenisRef = useRef<Lenis | null>(null);
  const [currentChapter, setCurrentChapter] = useState(1);

  useEffect(() => {
    const lenisInstance = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1.0,
    });

    lenisRef.current = lenisInstance;

    let reqId = requestAnimationFrame(function raf(time: number) {
      lenisInstance.raf(time);
      reqId = requestAnimationFrame(raf);
    });

    const onScroll = (e: { progress: number; velocity: number }) => {
      scrollProgressRef.current = e.progress;
      scrollVelocityRef.current = e.velocity;

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
    };
    lenisInstance.on("scroll", onScroll);

    return () => {
      cancelAnimationFrame(reqId);
      lenisInstance.off("scroll", onScroll);
      lenisInstance.destroy();
      lenisRef.current = null;
    };
  }, []);

  const scrollToChapter = (ch: number) => {
    const target = document.getElementById(`chapter-0${ch}`);
    if (target && lenisRef.current) {
      lenisRef.current.scrollTo(target, { duration: 1.4 });
    }
  };

  return (
    <ScrollContext.Provider
      value={{
        scrollProgressRef,
        scrollVelocityRef,
        currentChapter,
        scrollToChapter,
      }}
    >
      {children}
    </ScrollContext.Provider>
  );
};
