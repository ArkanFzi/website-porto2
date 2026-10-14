"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Diamond3D from "@/components/UI/Diamond3D";
import type { RepoBerlian } from "@/lib/server/github";

// Repo datang dari render server (lihat app/page.tsx). Fork dan README profil sudah
// dibuang di sana, jadi tidak ada lagi state "loading" yang menunggu browser.
const Projects: React.FC<{ repos: RepoBerlian[] }> = ({ repos }) => {
  const [page, setPage] = useState(0);

  // Pagination Logic
  const itemsPerPage = 3;
  const totalPages = Math.ceil(repos.length / itemsPerPage);
  const currentRepos = repos.slice(page * itemsPerPage, (page + 1) * itemsPerPage);

  const nextPage = () => setPage((p) => (p + 1) % totalPages);
  const prevPage = () => setPage((p) => (p - 1 + totalPages) % totalPages);

  return (
    <section id="projects" className="relative w-full bg-surface pt-32 pb-40 overflow-hidden text-white flex flex-col items-center">

      {/* Animated Gradient Mesh Background */}
      <div className="absolute inset-0 z-0 overflow-hidden hidden md:block">
        {/* Blob 1: Golden Amber (top-left, drifts right) */}
        <div
          className="absolute w-[600px] h-[600px] rounded-full opacity-[0.07] blur-[120px]"
          style={{
            background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)",
            top: "-10%",
            left: "-5%",
            animation: "meshDrift1 18s ease-in-out infinite alternate",
            willChange: "transform",
          }}
        />
        {/* Blob 2: Deep Orange (center, drifts up) */}
        <div
          className="absolute w-[700px] h-[700px] rounded-full opacity-[0.06] blur-[140px]"
          style={{
            background: "radial-gradient(circle, var(--flame) 0%, transparent 70%)",
            top: "30%",
            left: "40%",
            animation: "meshDrift2 22s ease-in-out infinite alternate",
            willChange: "transform",
          }}
        />
        {/* Blob 3: Warm Gold (bottom-right, drifts left) */}
        <div
          className="absolute w-[500px] h-[500px] rounded-full opacity-[0.05] blur-[100px]"
          style={{
            background: "radial-gradient(circle, #d4a853 0%, transparent 70%)",
            bottom: "5%",
            right: "-5%",
            animation: "meshDrift3 20s ease-in-out infinite alternate",
            willChange: "transform",
          }}
        />
        {/* Blob 4: Subtle Red accent (center-left) */}
        <div
          className="absolute w-[400px] h-[400px] rounded-full opacity-[0.04] blur-[100px]"
          style={{
            background: "radial-gradient(circle, #cc4400 0%, transparent 70%)",
            top: "60%",
            left: "10%",
            animation: "meshDrift1 25s ease-in-out infinite alternate-reverse",
            willChange: "transform",
          }}
        />
      </div>
      {/* Vignette overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f0c] via-transparent to-[#0a0f0c] z-[1]" />

      <div className="relative z-10 w-full max-w-[1200px] mx-auto px-6 flex flex-col items-center">

        {/* ── HEADER ── */}
        <div className="text-center flex flex-col items-center mb-20 max-w-2xl mx-auto">
          <span className="text-micro uppercase tracking-[0.3em] font-bold text-accent-primary mb-4" style={{ fontFamily: "var(--f-sans)" }}>
            PORTFOLIO HIGHLIGHTS
          </span>
          <h2 className="title-font text-title tracking-wide uppercase leading-[1.1] mb-8 text-ink">
            BUILT IN<br />PUBLIC
          </h2>
          <span className="text-micro uppercase tracking-[0.2em] font-bold text-accent-primary mb-8" style={{ fontFamily: "var(--f-sans)" }}>
            OPEN SOURCE REPOSITORIES
          </span>
          <p className="text-white/60 text-body leading-[2] font-medium tracking-wide text-center" style={{ fontFamily: "var(--f-serif)" }}>
            These repositories live in the open, built from the ground up to push a software foundation forward rather than to
            look good in a portfolio. Each one carries its own architectural reasoning and keeps being refined over time.
          </p>
        </div>

        {/* ── DIAMOND GRID ── */}
        <div className="relative w-full md:aspect-[2/1] max-w-[900px] mx-auto mt-10 md:mt-4 flex flex-col md:block items-center gap-16 md:gap-0">

          {currentRepos.map((repo, idx) => {
            // Calculate positioning for the triangle arrangement
            const positions = [
              { top: "10%", left: "15%", delay: 0 },
              { top: "50%", left: "50%", delay: 0.2 },
              { top: "20%", left: "85%", delay: 0.4 }
            ];
            // Ensure fallback if less than 3 items on last page
            const pos = positions[idx] || positions[0];

            return (
              <div
                key={repo.id}
                /* On mobile, 'static' forces the browser to ignore 'top' and 'left' inline styles, stacking normally via flex.
                   On 'md:' and above, 'absolute' re-enables them for the triangle grid layout. */
                className="static md:absolute flex flex-col items-center group w-[220px] sm:w-[280px] md:-translate-x-1/2 md:-translate-y-1/2"
                style={{ top: pos.top, left: pos.left }}
              >
                {/* Diamond Shape Wrapper */}
                <a
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative w-48 h-48 md:w-60 md:h-60 z-10 group/diamond md:hover:scale-110 transition-all duration-700 block"
                >
                  <Diamond3D language={repo.language} />
                  <div className="absolute top-4 right-4 p-2 opacity-0 group-hover/diamond:opacity-100 transition-opacity duration-500 z-20 pointer-events-none">
                    <span className="flex items-center gap-1 text-tag font-bold text-accent-primary tracking-widest uppercase bg-black/80 px-2 py-1 rounded backdrop-blur-md shadow-[0_0_15px_rgba(196,154,86,0.3)] border border-accent-primary/30">
                      {repo.stargazers_count} ★
                    </span>
                  </div>
                </a>

                {/* Text Info */}
                <div className="mt-6 md:mt-14 text-center lg:opacity-70 group-hover:opacity-100 group-hover:-translate-y-1 transition-all duration-500">
                  <h3 className="text-item font-bold uppercase tracking-[0.14em] text-ink mb-2 leading-tight max-w-[200px] mx-auto">
                    {repo.name.replace(/[-_]/g, " ")}
                  </h3>
                  {repo.language && (
                    <span className="text-tag uppercase tracking-[0.3em] font-bold text-accent-secondary">
                      {repo.language}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── PAGINATION CONTROLS ── */}
        {repos.length > itemsPerPage && (
          <div className="mt-20 lg:mt-32 flex items-center gap-8">
            <button
              onClick={prevPage}
              className="w-10 h-10 rounded-full border border-accent-primary/30 flex items-center justify-center text-accent-primary/60 hover:text-accent-primary hover:border-accent-primary transition-all bg-black/40 backdrop-blur-sm"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-3 text-micro tracking-[0.3em] font-bold font-mono">
              <span className="text-white">{page + 1}</span>
              <span className="text-white/30">/</span>
              <span className="text-white/50">{totalPages}</span>
            </div>

            <button
              onClick={nextPage}
              className="w-10 h-10 rounded-full border border-accent-primary/30 flex items-center justify-center text-accent-primary/60 hover:text-accent-primary hover:border-accent-primary transition-all bg-black/40 backdrop-blur-sm"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

      </div>
    </section>
  );
};

export default Projects;
