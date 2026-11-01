"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowUpRight, Database, Cpu } from "lucide-react";
import audioEngine from "@/lib/audioEngine";

export interface CaseStudyData {
  index: string;
  name: string;
  title: string;
  url: string;
  desc: string;
  architecture: string;
  databaseSchema: string[];
  latencyP99: string;
  concurrencyRps: string;
  stack: string[];
}

interface ModalProps {
  caseStudy: CaseStudyData | null;
  onClose: () => void;
}

export const CaseStudyModal: React.FC<ModalProps> = ({ caseStudy, onClose }) => {
  useEffect(() => {
    if (!caseStudy) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [caseStudy, onClose]);

  if (!caseStudy) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99997] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
        onClick={() => {
          audioEngine.playClick(900, 0.02);
          onClose();
        }}
      >
        <motion.div
          initial={{ scale: 0.94, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.94, y: 30 }}
          transition={{ type: "spring", damping: 25, stiffness: 320 }}
          role="dialog"
          aria-modal="true"
          aria-label={caseStudy.title}
          className="w-full max-w-3xl bg-[#0B0B0A] border border-[#D41E12]/50 rounded-xl shadow-[0_0_50px_rgba(212,30,18,0.3)] overflow-hidden flex flex-col pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold text-[#D41E12]">/{caseStudy.index}</span>
              <span className="font-mono text-xs font-bold text-white tracking-widest uppercase">
                DEEP-DIVE ARCHITECTURE SPEC
              </span>
            </div>
            <button
              aria-label="Close specification"
              onClick={() => {
                audioEngine.playClick(900, 0.02);
                onClose();
              }}
              className="p-1 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
            <div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white mb-2">
                {caseStudy.title}
              </h2>
              <p className="font-sans text-sm text-white/70 leading-relaxed">
                {caseStudy.desc}
              </p>
            </div>

            {/* Metrics Callout */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-[10px]">
              <div className="p-3 rounded bg-white/[0.02] border border-white/10">
                <span className="text-white/40 block">p99 LATENCY</span>
                <span className="text-sm font-bold text-white">{caseStudy.latencyP99}</span>
              </div>
              <div className="p-3 rounded bg-white/[0.02] border border-white/10">
                <span className="text-white/40 block">THROUGHPUT</span>
                <span className="text-sm font-bold text-[#D41E12]">{caseStudy.concurrencyRps}</span>
              </div>
              <div className="p-3 rounded bg-white/[0.02] border border-white/10">
                <span className="text-white/40 block">SECURITY</span>
                <span className="text-sm font-bold text-emerald-400">TLS 1.3 / OWASP</span>
              </div>
              <div className="p-3 rounded bg-white/[0.02] border border-white/10">
                <span className="text-white/40 block">REDUNDANCY</span>
                <span className="text-sm font-bold text-white">Multi-AZ Pool</span>
              </div>
            </div>

            {/* Architecture Decomposition */}
            <div className="space-y-2">
              <span className="font-mono text-[10px] uppercase text-[#D41E12] font-bold tracking-widest flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" /> SYSTEM ARCHITECTURE & TOPOLOGY
              </span>
              <div className="p-3.5 rounded bg-black/50 border border-white/10 font-mono text-xs text-white/80 leading-relaxed">
                {caseStudy.architecture}
              </div>
            </div>

            {/* Database & Schema Tier */}
            <div className="space-y-2">
              <span className="font-mono text-[10px] uppercase text-[#D41E12] font-bold tracking-widest flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" /> DATA CONTRACTS & TABLES
              </span>
              <div className="p-3.5 rounded bg-black/50 border border-white/10 font-mono text-xs text-white/70 space-y-1">
                {caseStudy.databaseSchema.map((line, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[#D41E12]">▸</span>
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stack Tags */}
            <div className="flex flex-wrap gap-2 pt-2">
              {caseStudy.stack.map((s, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded bg-white/5 border border-white/10 font-mono text-[9px] text-white/80 tracking-wider uppercase"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Footer Action */}
          <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
            <span className="font-mono text-[9px] text-white/40">SYSTEM RUNTIME // VERIFIED</span>
            <a
              href={caseStudy.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D41E12] text-white font-mono text-[10px] font-bold tracking-widest uppercase hover:bg-[#FF2800] transition-colors cursor-pointer"
            >
              <span>INSPECT REPO / DEPLOY</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CaseStudyModal;
