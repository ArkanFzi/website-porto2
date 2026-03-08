"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import Navigation from "@/app/components/Navigation";

export interface CarouselItem {
  id: string | number;
  title: string;
  subtitle: string;
  imageUrl: string;
  metrics?: React.ReactNode;
}

interface TimedCarouselProps {
  items: CarouselItem[];
  backHref: string;
  categoryName: string;
  autoPlayInterval?: number;
}

export default function TimedCarousel({ 
  items, 
  backHref, 
  categoryName,
  autoPlayInterval = 5000 
}: TimedCarouselProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleNext = React.useCallback(() => {
  if (items.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % items.length);
  }, [items.length]);

  const startProgress = React.useCallback(() => {
    setProgress(0);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    
    const intervalTime = 50; // Update every 50ms
    const step = (intervalTime / autoPlayInterval) * 100;
    
    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0; // reset visually for a split second before unmounting/remounting
        }
        return prev + step;
      });
    }, intervalTime);
  }, [autoPlayInterval, handleNext]);

  const stopProgress = React.useCallback(() => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
  }, []);

  useEffect(() => {
    if (items.length > 0) {
        startProgress();
    }
    return stopProgress;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, items, startProgress, stopProgress]); // Restart timer when slide changes

  const handlePrev = () => {
  if (items.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const handleThumbnailClick = (index: number) => {
    setCurrentIndex(index);
  };

  if (items.length === 0) {
    return (
        <section className="h-[100svh] w-full bg-black text-white flex items-center justify-center font-sans shrink-0">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
        </section>
    );
  }

  const currentItem = items[currentIndex];

  // Calculate the thumbnail array (excluding the current one, showing up to 3 next items)
  const thumbnails = [];
  for (let i = 1; i <= Math.min(3, items.length - 1); i++) {
      thumbnails.push(items[(currentIndex + i) % items.length]);
  }

  return (
    <section className="relative w-full h-[100svh] overflow-hidden bg-black font-sans text-white shrink-0">
      {/* Absolute Background Layer */}
      <AnimatePresence mode="wait">
        <motion.div
           key={currentIndex}
           initial={{ opacity: 0, scale: 1.05 }}
           animate={{ opacity: 1, scale: 1 }}
           exit={{ opacity: 0 }}
           transition={{ duration: 0.8, ease: "easeInOut" }}
           className="absolute inset-0 z-0 bg-cover bg-center"
           style={{ backgroundImage: `url(${currentItem.imageUrl})` }}
        />
      </AnimatePresence>
      
      {/* Overlay Gradient (Left to Right and Bottom Up) */}
      <div className="absolute inset-0 z-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent pointer-events-none" />
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

      {/* Header Overlay */}
      <div className="absolute top-0 w-full z-50">
        <Navigation />
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 w-full h-full flex flex-col justify-between pt-32 pb-12 px-8 md:px-16 lg:px-24">
        
        {/* Top Breadcrumb */}
        <div className="flex items-center gap-6">
            <button 
                onClick={() => router.push(backHref)}
                className="flex items-center gap-2 text-white/70 hover:text-white transition-colors group uppercase font-mono text-xs tracking-widest"
            >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Back
            </button>
            <span className="text-white/30 uppercase font-mono text-xs tracking-widest">/</span>
            <span className="text-[#c49a56] uppercase font-mono text-xs tracking-widest">{categoryName}</span>
        </div>

        {/* Center/Left Content: Huge Typography */}
        <div className="flex-1 flex flex-col justify-center max-w-4xl mt-12">
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -30 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                >
                    <span className="inline-block px-3 py-1 bg-white/10 backdrop-blur-md rounded-sm text-sm font-mono tracking-widest uppercase mb-6 text-white/80 border border-white/20">
                        {currentItem.subtitle}
                    </span>
                    <h1 className="text-6xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter leading-[0.9] text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 drop-shadow-2xl">
                        {currentItem.title}
                    </h1>
                    
                    {currentItem.metrics && (
                        <div className="mt-8 flex gap-6 text-white/80">
                            {currentItem.metrics}
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>

        {/* Bottom Section: Thumbnails & Controls */}
        <div className="mt-auto pt-8 border-t border-white/10 flex flex-col md:flex-row items-end md:items-center justify-between gap-8">
            
            {/* Left Controls/Progress */}
            <div className="flex items-center gap-8 w-full md:w-auto">
                <div className="flex gap-4">
                    <button 
                        onClick={() => { stopProgress(); handlePrev(); }}
                        className="w-12 h-12 flex items-center justify-center rounded-full border border-white/20 hover:bg-white/10 hover:border-white/50 transition-all backdrop-blur-md"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => { stopProgress(); handleNext(); }}
                        className="w-12 h-12 flex items-center justify-center rounded-full border border-white/20 hover:bg-white/10 hover:border-white/50 transition-all backdrop-blur-md"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 md:w-64">
                    <div className="flex justify-between text-xs font-mono text-white/50 mb-2 font-bold tracking-widest">
                        <span>{(currentIndex + 1).toString().padStart(2, '0')}</span>
                        <span>{items.length.toString().padStart(2, '0')}</span>
                    </div>
                    <div className="h-1 bg-white/10 w-full overflow-hidden relative">
                        <motion.div 
                            className="absolute left-0 top-0 bottom-0 bg-white"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Right Thumbnails */}
            <div className="flex items-center gap-4 overflow-x-auto pb-4 md:pb-0 w-full md:w-auto hide-scrollbar">
                {thumbnails.map((thumb, idx) => {
                    const originalIndex = items.findIndex(i => i.id === thumb.id);
                    return (
                        <motion.div
                            key={thumb.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            onClick={() => { stopProgress(); handleThumbnailClick(originalIndex); }}
                            className="relative w-32 h-44 rounded-xl overflow-hidden cursor-pointer group shrink-0 shadow-xl border border-white/20 hover:border-white/60 transition-colors"
                        >
                            <div 
                                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                                style={{ backgroundImage: `url(${thumb.imageUrl})` }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                            <div className="absolute bottom-3 left-3 right-3 text-left">
                                <p className="text-[10px] font-mono uppercase text-white/60 mb-1 tracking-wider">{thumb.subtitle}</p>
                                <h4 className="text-white font-bold leading-tight text-xs line-clamp-2">{thumb.title}</h4>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

        </div>
      </div>
      
      {/* Inject custom CSS for scrollbar hiding temporarily */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
            display: none;
        }
        .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}} />
    </section>
  );
}
