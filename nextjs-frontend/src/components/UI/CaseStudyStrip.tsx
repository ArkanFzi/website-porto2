"use client";

/** Strip arsitektur bab 03.
 *
 *  Dulu sebuah `CaseStudyModal`: lapisan `fixed inset-0 z-[99997]` yang menutupi seluruh
 *  halaman, plus kartu di tengah layar yang tidak punya hubungan apa pun dengan panggung
 *  WebGL di bawahnya. Sekarang strip yang duduk di kolom baca bab itu sendiri, dan yang
 *  membukanya adalah melebarnya mask portal: satu variabel CSS (`--strip-lebar`)
 *  menentukan lebar kolom baca bab DAN tepi kiri portal bab 3, jadi DOM dan koreografi
 *  tidak bisa bergeser sendiri-sendiri. Split itu berlaku dari `xl` ke atas, sehingga
 *  tidak ada satu pun teks bab yang pernah berada di bawah kartu. Di bawah `xl` kolom
 *  tidak dipersempit dan strip membeli keterbacaannya sendiri: `z-20` di atas kanvas
 *  plus latar papan `#0A0A0A` yang sama dengan papan di belakang daftar.
 *
 *  Konsekuensi yang disengaja: tidak ada `role="dialog"`, tidak ada aria-modal, tidak ada
 *  focus-trap — strip adalah bagian dokumen, Escape hanya menutup dan mengembalikan daftar. */

import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { X, ArrowUpRight, Database, Cpu } from "lucide-react";
import audioEngine from "@/lib/audioEngine";
import { PEGA } from "@/lib/motion";

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

interface StripProps {
  /** Selalu data yang utuh: strip hanya dimount oleh baris yang sedang terbuka. */
  caseStudy: CaseStudyData;
  /** Asal-usul angka: apa yang diukur, berapa sampel, dan apa yang tidak termasuk. Null untuk
   *  kartu yang memang tidak punya alat ukur — paragraf lama tetap tercetak di sana. */
  catatanUkur?: string | null;
  onClose: () => void;
}

export const CaseStudyStrip: React.FC<StripProps> = ({ caseStudy, catatanUkur, onClose }) => {
  const bingkai = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Sekali saat stripMount: strip yang difokus ulang tiap render akan merebut fokus
  // dari tautan di dalamnya begitu baris tetangga mengubah status hover.
  useEffect(() => {
    const el = bingkai.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    // Ekor strip terpotong di bawah layar: kolom baca baru menyempit SETELAH strip ter-mount,
    // jadi tingginya masih berubah setelah effect pertama. ResizeObserver membawa strip ke
    // dalam layar tiap kali ukurannya benar-benar berubah; `block: "nearest"` hanya
    // menggulir saat ada bagian yang keluar, jadi tidak ada lompatan saat strip sudah muat.
    const bawaKeLayar = () => el.scrollIntoView({ block: "nearest", behavior: "auto" });
    bawaKeLayar();
    const pengamat = new ResizeObserver(bawaKeLayar);
    pengamat.observe(el);
    return () => pengamat.disconnect();
  }, []);

  return (
    <motion.div
      ref={bingkai}
      tabIndex={-1}
      role="region"
      aria-label={`Architecture specification — ${caseStudy.title}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={PEGA.modal}
      data-strip={caseStudy.index}
      className="relative z-20 border-y border-white/10 py-8 bg-[#0A0A0A]"
    >
      {/* Baris kepala: indeks yang sama dengan baris daftar, tombol tutup yang nyata. */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <span className="flex items-center gap-3 font-mono text-[10px] font-bold tracking-[0.22em] uppercase text-[#D41E12]">
          <span className="text-[#D41E12]">/{caseStudy.index}</span>
          <span className="text-white/70">Deep-dive architecture spec</span>
        </span>
        <button
          type="button"
          aria-label="Close specification"
          onClick={() => {
            audioEngine.playClick(900, 0.02);
            onClose();
          }}
          className="flex items-center gap-1.5 p-1.5 rounded-full border border-white/20 text-white/60 hover:text-white hover:border-[#D41E12] transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="font-mono text-[9px] tracking-[0.2em] uppercase">Tutup</span>
        </button>
      </div>

      <h3 className="font-serif text-2xl sm:text-3xl font-bold text-white mb-2">
        {caseStudy.title}
      </h3>
      <p className="font-sans text-sm text-white/70 leading-relaxed mb-6">{caseStudy.desc}</p>

      {/* Hanya angka yang punya sumber ukur per proyek yang boleh tampil di sini. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 font-mono text-[10px] mb-3">
        <div className="p-3 rounded bg-white/[0.02] border border-white/10">
          <span className="text-white/40 block">p99 LATENCY</span>
          <span className="text-sm font-bold text-white">{caseStudy.latencyP99}</span>
        </div>
        <div className="p-3 rounded bg-white/[0.02] border border-white/10">
          <span className="text-white/40 block">THROUGHPUT</span>
          <span className="text-sm font-bold text-[#D41E12]">{caseStudy.concurrencyRps}</span>
        </div>
      </div>
      <p className="font-mono text-[10px] leading-relaxed text-white/40 mb-6">
        {catatanUkur ??
          "Both figures are measured on the project itself, sample size written inline. Where there is no measurement there is no number."}
      </p>

      <div className="space-y-2 mb-6">
        <span className="font-mono text-[10px] uppercase text-[#D41E12] font-bold tracking-widest flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5" aria-hidden="true" /> SYSTEM ARCHITECTURE &amp; TOPOLOGY
        </span>
        <div className="p-3.5 rounded bg-white/[0.03] border border-white/10 font-mono text-xs text-white/80 leading-relaxed">
          {caseStudy.architecture}
        </div>
      </div>

      <div className="space-y-2 mb-6">
        <span className="font-mono text-[10px] uppercase text-[#D41E12] font-bold tracking-widest flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5" aria-hidden="true" /> DATA CONTRACTS &amp; TABLES
        </span>
        <div className="p-3.5 rounded bg-white/[0.03] border border-white/10 font-mono text-xs text-white/70 space-y-1">
          {caseStudy.databaseSchema.map((line, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[#D41E12]" aria-hidden="true">
                ▸
              </span>
              <span>{line}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {caseStudy.stack.map((s, i) => (
          <span
            key={i}
            className="px-2.5 py-1 rounded bg-white/5 border border-white/10 font-mono text-[9px] text-white/80 tracking-wider uppercase"
          >
            {s}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10">
        <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-white/40">
          Source // {caseStudy.name}
        </span>
        <a
          href={caseStudy.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D41E12] text-white font-mono text-[10px] font-bold tracking-widest uppercase hover:bg-[#FF2800] transition-colors cursor-pointer"
        >
          <span>Inspect repo / deploy</span>
          <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
        </a>
      </div>
    </motion.div>
  );
};

export default CaseStudyStrip;
