"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ExternalLink, ShieldCheck, CheckCircle2 } from "lucide-react";
import type { Perjalanan } from "@/lib/server/journey";
import { Certificate, FALLBACK_CERTIFICATES } from "@/lib/server/certificates";
import type { Experience } from "@/lib/server/experience";
import type { RepoBerlian } from "@/lib/server/github";
import { daftarFase } from "@/lib/profilFase";
import { usePortfolioMode } from "@/context/PortfolioModeContext";
import { DURASI, EASE } from "@/lib/motion";
import MeshPortal from "./MeshPortal";

interface DualityProps {
  perjalanan?: Perjalanan[];
  certificates?: Certificate[];
  experiences?: Experience[];
  /** Payload `daftarReposGitHub()` yang sudah diambil halaman depan — phase GitHub hanya
   *  ada kalau repo-nya memang ada di daftar ini. */
  repos?: RepoBerlian[];
}

export const ChapterDuality: React.FC<DualityProps> = ({
  perjalanan,
  certificates,
  experiences,
  repos,
}) => {
  const { mode } = usePortfolioMode();
  const [activePhase, setActivePhase] = useState<string>("01");
  const certList = certificates && certificates.length > 0 ? certificates : FALLBACK_CERTIFICATES;

  const currentPhases = daftarFase(experiences, perjalanan, repos ?? []);
  // "DB LIVE" hanya boleh menyala kalau barisnya memang datang dari Postgres. Selama ini
  // label itu ikut tercetak saat backend mati dan yang tampil adalah rekaman kertas CV,
  // jadi ia mengklaim koneksi yang tidak pernah ada.
  const phasesDariDb = (experiences ?? []).length > 0 || (perjalanan ?? []).length >= 3;

  return (
    <section
      id="chapter-02"
      className="relative w-full min-h-screen pt-[calc(var(--hud-atas,196px)+2rem)] pb-48 px-6 md:px-12 select-none"
    >
      <MeshPortal
        bab={2}
        className="left-[16.5vw] top-[20vh] h-[60vh] w-[23vw]"
        miring={0.22}
        geyang={0.12}
        rotGeyang={0.06}
      />
      <div className="w-full max-w-[1600px] mx-auto">
        
        {/* ── Top Header Tags ── */}
        <div data-jejak-papan className="flex items-center justify-between pb-6 swiss-border-b mb-16">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#D41E12]" />
            <span className="font-mono text-[11px] font-bold tracking-[0.25em] uppercase text-[#D41E12]">
              CHAPTER 02 // THE DUALITY & RACING LINE
            </span>
          </div>

          <div className="flex items-center gap-3">
            {phasesDariDb && (
              <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-[#D41E12]">
                ● DB LIVE
              </span>
            )}
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#6E6A64]">
              {mode === "engineer" ? "SYSTEMS DISCIPLINE // SECTOR TIMING" : "CREATIVE VISION // SPATIAL TIMING"}
            </span>
          </div>
        </div>

        {/* ── 2-Column Grid (Reserved space on left md:col-span-5 for 3D Monolith) ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 lg:gap-16 items-start">
          
          {/* Left Column: Reserved clean space for 3D Monolith */}
          <div className="hidden md:block md:col-span-5 min-h-[400px] lg:min-h-[550px] pointer-events-none" />

          {/* Right Column: Editorial Headline & Swiss Line List */}
          <div className="col-span-1 md:col-span-7 flex flex-col md:pl-10 lg:pl-16">
            
            {/* Elegant Editorial Headline with Persona Motion */}
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: DURASI.ganti, ease: EASE.keluar }}
                className="mb-14"
              >
                {/* Judul bab ini bergerak sendiri (data-paralaks) sampai ±22px, tetangganya
                    tidak. Celah di atas dan di bawah harus lebih besar dari perjalanan itu —
                    sama seperti bab 03, diambil dari angka yang diukur gerbang 5e. */}
                <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-[#D41E12] block mb-6">
                  {mode === "engineer" ? "THE DISCIPLINE // ENGINEERING" : "THE PHILOSOPHY // CREATIVE CRAFT"}
                </span>
                <h2
                  className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#0A0A0A] leading-[1.08] mb-8"
                  data-paralaks="-0.5"
                  style={{ translate: "var(--tipografi-x, 0px) var(--tipografi-y, 0px)" }}
                >
                  {mode === "engineer" ? (
                    <>
                      ARCHITECTING SYSTEMS,<br />
                      ENGINEERING RELIABILITY.
                    </>
                  ) : (
                    <>
                      SCULPTING SPATIAL WEB,<br />
                      ELEVATING THE ESSENTIAL.
                    </>
                  )}
                </h2>
                <p className="font-sans text-sm sm:text-base text-[#6E6A64] leading-relaxed max-w-2xl">
                  {mode === "engineer"
                    ? "Formed in Malang and sharpened through enterprise production at Sekawan Media. Engineering microservices with Go and PostgreSQL, constructing AST knowledge graphs, and maintaining high-availability SLAs. Zero bloat, maximum velocity."
                    : "Merging haute-couture editorial typography with real-time WebGL shader physics. Every pixel, displacement vector, and optical rim light is placed with intentional poise. Restraint as the ultimate flex."}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Swiss Editorial Line List (Transparent, Separated by Hairline Borders) */}
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: DURASI.cepat }}
                className="w-full flex flex-col border-t border-[rgba(10,10,10,0.12)]"
              >
                {currentPhases.map((item) => {
                  const isOpen = activePhase === item.id;
                  return (
                    <div
                      key={item.id}
                      className="group border-b border-[rgba(10,10,10,0.12)] hover:border-[#D41E12] transition-colors duration-300 py-6 sm:py-8"
                    >
                      <h3 className="font-serif text-xl sm:text-2xl font-bold">
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={`phase-panel-${item.id}`}
                        onClick={() => setActivePhase(isOpen ? "" : item.id)}
                        className="w-full flex items-start sm:items-center justify-between gap-4 text-left cursor-pointer"
                      >
                        
                        <span className="flex items-start sm:items-center gap-4 sm:gap-6">
                          <span className="font-mono text-xs sm:text-sm font-bold text-[#D41E12] pt-0.5 sm:pt-0">
                            /{item.id}
                          </span>
                          
                          <span className="flex flex-col items-start">
                            <span className="font-mono text-[9px] tracking-[0.22em] uppercase text-[#6E6A64] block mb-1">
                              {item.phase} • {item.org}
                            </span>
                            <span
                              className={`transition-colors duration-300 ${
                                isOpen ? "text-[#D41E12]" : "text-[#0A0A0A] group-hover:text-[#D41E12]"
                              }`}
                            >
                              {item.title}
                            </span>
                          </span>
                        </span>

                        <span className="flex items-center gap-4 shrink-0 pt-1 sm:pt-0">
                          <span className="font-mono text-xs font-bold text-[#0A0A0A]/70">
                            {item.year}
                          </span>
                          <ChevronDown
                            className={`w-4 h-4 text-[#D41E12] transition-transform duration-300 ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          />
                        </span>
                      </button>
                      </h3>

                      {/* Accordion Content */}
                      {isOpen && (
                        <motion.div
                          id={`phase-panel-${item.id}`}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          transition={{ duration: DURASI.cepat }}
                          className="pt-4 mt-4 pl-8 sm:pl-12"
                        >
                          {item.summary && (
                            <p className="font-sans text-xs sm:text-sm text-[#6E6A64] leading-relaxed mb-4 max-w-2xl">
                              {item.summary}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                            <div className="flex flex-wrap gap-2">
                              {item.specs.map((spec, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="font-mono text-[9px] font-bold px-2 py-0.5 rounded-sm bg-[#0A0A0A]/5 text-[#0A0A0A] uppercase tracking-wider"
                                >
                                  {spec}
                                </span>
                              ))}
                            </div>

                            {item.link && (
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold text-[#D41E12] hover:underline uppercase tracking-wider"
                              >
                                <span>INSPECT RECORD</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>

                          {item.karya && item.karya.length > 0 && (
                            <ul className="mt-6 pt-4 border-t border-[rgba(10,10,10,0.12)]">
                              <li className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#6E6A64] mb-3">
                                {`Karya yang bisa ditunjuk · ${item.karya.length} repo publik`}
                              </li>
                              {item.karya.map((karya) => (
                                <li key={karya.nama} className="py-2">
                                  <a
                                    href={karya.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex flex-wrap items-baseline gap-x-3 gap-y-1 group/karya"
                                  >
                                    <span className="font-mono text-xs sm:text-sm font-bold text-[#0A0A0A] group-hover/karya:text-[#D41E12] transition-colors duration-300">
                                      {karya.nama}
                                    </span>
                                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#6E6A64]">
                                      {`${karya.bahasa ? karya.bahasa.toUpperCase() : "BAHASA TIDAK DILABEI GITHUB"} · ${karya.bintang} ★`}
                                    </span>
                                    <ExternalLink className="w-3 h-3 text-[#D41E12]" />
                                  </a>
                                  {karya.deskripsi && (
                                    <p className="font-sans text-[11px] sm:text-xs text-[#6E6A64] leading-relaxed mt-1 max-w-2xl">
                                      {karya.deskripsi}
                                    </p>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </motion.div>
            </AnimatePresence>

          </div>

        </div>

        {/* ── PART 2: VALIDATED CREDENTIALS & CERTIFICATIONS (POSTGRESQL SYNCED) ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 lg:gap-16 items-start mt-24 pt-16 border-t border-[rgba(10,10,10,0.12)]">
          
          {/* Left Column: Reserved clean space for 3D Monolith (NO TEXT OVERLAP) */}
          <div className="hidden md:block md:col-span-5 pointer-events-none" />

          {/* Right Column: Editorial Heading & Certificates List */}
          <div className="col-span-1 md:col-span-7 flex flex-col md:pl-10 lg:pl-16">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-[#D41E12]" />
              <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-[#D41E12] font-bold">
                VALIDATION // POSTGRESQL CRUD CONTRACT
              </span>
            </div>
            
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#0A0A0A] mb-3">
              OFFICIAL CERTIFICATIONS &amp; CREDENTIALS.
            </h2>
            
            <p className="font-sans text-sm text-[#6E6A64] leading-relaxed mb-6">
              Verified certifications, institutional accreditations, and engineering honors recorded in the PostgreSQL relational schema and managed via Go backend CRUD endpoints.
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/5 border border-black/10 font-mono text-[9px] text-[#0A0A0A] w-fit mb-8">
              <ShieldCheck className="w-3.5 h-3.5 text-[#D41E12]" />
              <span>DYNAMIC TABLE: certificates ({certList.length} RECORDS)</span>
            </div>

            {/* High-Craft Certificates List */}
            <div className="w-full flex flex-col divide-y divide-[rgba(10,10,10,0.1)] border-t border-[rgba(10,10,10,0.12)]">
              {certList.map((cert, idx) => (
                <div
                  key={cert.id || idx}
                  className="py-5 sm:py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:pl-2 transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                    <span className="font-mono text-xs font-bold text-[#D41E12] pt-1">
                      0{idx + 1}
                    </span>
                    <div>
                      <h3 className="font-serif text-lg sm:text-xl font-bold text-[#0A0A0A] group-hover:text-[#D41E12] transition-colors">
                        {cert.title}
                      </h3>
                      <span className="font-mono text-[10px] tracking-wider uppercase text-[#6E6A64] block mt-0.5">
                        {cert.issuer}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-center shrink-0">
                    <span className="font-mono text-xs font-semibold text-[#0A0A0A]/70">
                      {cert.date}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 font-mono text-[9px] font-bold">
                      <CheckCircle2 className="w-2.5 h-2.5" /> VERIFIED
                    </span>
                  </div>
                </div>
              ))}
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};

export default ChapterDuality;
