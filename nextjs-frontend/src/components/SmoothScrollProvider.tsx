"use client";

import React, { useEffect, useRef, useState, useSyncExternalStore, createContext, useContext } from "react";
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

const chapterDari = (progress: number) => {
  if (progress < 0.25) return 1;
  if (progress < 0.55) return 2;
  if (progress < 0.85) return 3;
  return 4;
};

// MediaQueryList dibuat sekali; dibaca lewat store supaya preferensi yang sudah
// berubah saat render tidak perlu menunggu effect.
let mqKurangiGerak: MediaQueryList | undefined;
const mediaKurangiGerak = () =>
  (mqKurangiGerak ??= window.matchMedia("(prefers-reduced-motion: reduce)"));
const dengarKurangiGerak = (ubah: () => void) => {
  const mq = mediaKurangiGerak();
  mq.addEventListener("change", ubah);
  return () => mq.removeEventListener("change", ubah);
};
const bacaKurangiGerak = () => mediaKurangiGerak().matches;
const bacaKurangiGerakSaatSSR = () => false;

export const SmoothScrollProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const scrollProgressRef = useRef(0);
  const scrollVelocityRef = useRef(0);
  const lenisRef = useRef<Lenis | null>(null);
  const [currentChapter, setCurrentChapter] = useState(1);
  const reduceMotion = useSyncExternalStore(
    dengarKurangiGerak,
    bacaKurangiGerak,
    bacaKurangiGerakSaatSSR
  );

  useEffect(() => {
    if (reduceMotion) {
      // Lenis selalu menjalankan rAF sendiri dan menggulirkan halaman setelah
      // event lewat; keduanya tidak boleh terjadi kalau pengunjung minta
      // gerakan dikurangi, jadi scroll native yang dipakai.
      const baca = () => {
        const maks = document.documentElement.scrollHeight - window.innerHeight;
        scrollProgressRef.current = maks > 0 ? Math.min(1, Math.max(0, window.scrollY / maks)) : 0;
        scrollVelocityRef.current = 0;
        setCurrentChapter(chapterDari(scrollProgressRef.current));
      };
      baca();
      window.addEventListener("scroll", baca, { passive: true });
      window.addEventListener("resize", baca);
      return () => {
        window.removeEventListener("scroll", baca);
        window.removeEventListener("resize", baca);
      };
    }

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
      setCurrentChapter(chapterDari(e.progress));
    };
    lenisInstance.on("scroll", onScroll);

    return () => {
      cancelAnimationFrame(reqId);
      lenisInstance.off("scroll", onScroll);
      lenisInstance.destroy();
      lenisRef.current = null;
    };
  }, [reduceMotion]);

  const scrollToChapter = (ch: number) => {
    const target = document.getElementById(`chapter-0${ch}`);
    if (!target) return;
    if (lenisRef.current) {
      lenisRef.current.scrollTo(target, { duration: reduceMotion ? 0 : 1.4 });
      return;
    }
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
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
