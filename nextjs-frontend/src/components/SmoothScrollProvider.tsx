"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Lenis from "lenis";

interface ScrollContextType {
  scrollProgressRef: React.RefObject<number>;
  scrollVelocityRef: React.RefObject<number>;
  subscribeBab: (cb: (bab: number) => void) => () => void;
  bacaBab: () => number;
  scrollToChapter: (ch: number) => void;
}

const ScrollContext = createContext<ScrollContextType>({
  scrollProgressRef: { current: 0 },
  scrollVelocityRef: { current: 0 },
  subscribeBab: () => () => {},
  bacaBab: () => 1,
  scrollToChapter: () => {},
});

export const useScrollData = () => useContext(ScrollContext);

// Bab dibaca dari posisi keempat section sungguhan, bukan pecahan progress.
// Terukur: dengan pecahan progress, mendarat tepat di puncak chapter-02 (scrollY
// 900 dari maks 4331) masih dianggap bab 1, jadi label HUD dan hash URL saling
// membantah. Garis baca = 35% tinggi viewport ke bawah.
const GARIS_BACA = 0.35;
const babDariPosisi = (elemen: (HTMLElement | null)[]): number => {
  const garis = window.innerHeight * GARIS_BACA;
  let bab = 1;
  for (let ch = 1; ch <= 4; ch++) {
    const el = elemen[ch - 1];
    if (el && el.getBoundingClientRect().top <= garis) bab = ch;
  }
  return bab;
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

const idBab = (ch: number) => `chapter-0${ch}`;
const babDariHash = (): number | null => {
  const cocok = /^#chapter-0([1-4])$/.exec(window.location.hash || "");
  return cocok ? Number(cocok[1]) : null;
};
const tulisHash = (ch: number, dorong: boolean) => {
  const id = "#" + idBab(ch);
  if (window.location.hash === id) return;
  if (dorong) window.history.pushState({ bab: ch }, "", id);
  else window.history.replaceState({ bab: ch }, "", id);
};

export const SmoothScrollProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const scrollProgressRef = useRef(0);
  const scrollVelocityRef = useRef(0);
  const lenisRef = useRef<Lenis | null>(null);
  const babRef = useRef(1);
  const elemenBab = useRef<(HTMLElement | null)[]>([]);
  const pendengarBab = useRef<Set<(bab: number) => void>>(new Set());
  const reduceMotion = useSyncExternalStore(
    dengarKurangiGerak,
    bacaKurangiGerak,
    bacaKurangiGerakSaatSSR
  );

  // Bab tidak lagi lewat state provider. Terukur: 7 kali ChapterArchives ter-render
  // ulang tiap lintasan scroll (state provider menyeret seluruh subtree + kanvas);
  // sekarang nol, hanya HUD yang berlangganan dan ikut berganti.
  const terbitkanBab = useCallback((bab: number) => {
    if (bab === babRef.current) return;
    babRef.current = bab;
    tulisHash(bab, false);
    pendengarBab.current.forEach((cb) => cb(bab));
  }, []);

  const subscribeBab = useCallback((cb: (bab: number) => void) => {
    pendengarBab.current.add(cb);
    return () => {
      pendengarBab.current.delete(cb);
    };
  }, []);

  const bacaBab = useCallback(() => babRef.current, []);

  // Elemen bab dicari sekali saat mount; effect ini sengaja di atas effect scroll
  // supaya pembacaan pertama sudah punya pegangan.
  useEffect(() => {
    elemenBab.current = [1, 2, 3, 4].map((ch) => document.getElementById(idBab(ch)));
    terbitkanBab(babDariPosisi(elemenBab.current));
  }, [terbitkanBab]);

  // Preferensi gerakan dibaca langsung dari media query di sini supaya fungsi ini
  // tetap stabil dan bisa dipakai handler popstate tanpa ikut di-daftar-ulang.
  const gulirKe = useCallback((ch: number, animasi: boolean) => {
    const target = document.getElementById(idBab(ch));
    if (!target) return;
    const jalan = animasi && !bacaKurangiGerak();
    if (lenisRef.current) {
      lenisRef.current.scrollTo(target, jalan ? { duration: 1.4 } : { immediate: true });
      return;
    }
    target.scrollIntoView({ behavior: jalan ? "smooth" : "auto" });
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      // Lenis selalu menjalankan rAF sendiri dan menggulirkan halaman setelah
      // event lewat; keduanya tidak boleh terjadi kalau pengunjung minta
      // gerakan dikurangi, jadi scroll native yang dipakai.
      const baca = () => {
        const maks = document.documentElement.scrollHeight - window.innerHeight;
        scrollProgressRef.current = maks > 0 ? Math.min(1, Math.max(0, window.scrollY / maks)) : 0;
        scrollVelocityRef.current = 0;
        terbitkanBab(babDariPosisi(elemenBab.current));
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
      terbitkanBab(babDariPosisi(elemenBab.current));
    };
    lenisInstance.on("scroll", onScroll);

    return () => {
      cancelAnimationFrame(reqId);
      lenisInstance.off("scroll", onScroll);
      lenisInstance.destroy();
      lenisRef.current = null;
    };
  }, [reduceMotion, terbitkanBab]);

  // Deep link /#chapter-03 dipatuhi saat mendarat; tombol back/forward menggulir
  // ke bab yang ada di URL. Gulir biasa hanya replaceState supaya riwayat tidak
  // terisi satu entri per pergantian bab.
  useEffect(() => {
    const padaPopstate = () => {
      const ch = babDariHash();
      if (ch !== null) gulirKe(ch, true);
    };
    const padaMuat = () => {
      const ch = babDariHash();
      if (ch !== null && ch !== 1) gulirKe(ch, false);
    };
    window.addEventListener("popstate", padaPopstate);
    if (document.readyState === "complete") padaMuat();
    else window.addEventListener("load", padaMuat, { once: true });
    return () => {
      window.removeEventListener("popstate", padaPopstate);
      window.removeEventListener("load", padaMuat);
    };
  }, [gulirKe]);

  const scrollToChapter = useCallback(
    (ch: number) => {
      tulisHash(ch, true);
      gulirKe(ch, true);
    },
    [gulirKe]
  );

  const nilai = useMemo<ScrollContextType>(
    () => ({
      scrollProgressRef,
      scrollVelocityRef,
      subscribeBab,
      bacaBab,
      scrollToChapter,
    }),
    // Ref sengaja tidak masuk deps: identity-nya stabil seumur sesi.
    [subscribeBab, bacaBab, scrollToChapter]
  );

  return <ScrollContext.Provider value={nilai}>{children}</ScrollContext.Provider>;
};

export const useBabAktif = () => {
  const { subscribeBab, bacaBab } = useScrollData();
  const [bab, setBab] = useState(bacaBab);
  useEffect(() => subscribeBab(setBab), [subscribeBab, bacaBab]);
  return bab;
};
