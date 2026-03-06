"use client";

import React, { useEffect, useState } from "react";
import { Github, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { staticProjects } from "@/data/projects";
import Diamond3D from "@/components/UI/Diamond3D";

interface GitHubRepo {
  id: number;
  name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  stargazers_count: number;
  language: string | null;
  fork: boolean;
}

const Projects: React.FC = () => {
  const [ghRepos, setGhRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetch("/api/github-repos")
      .then((r) => r.ok ? r.json() : [])
      .then((repos: GitHubRepo[]) => {
        // Store all original non-fork repos
        setGhRepos(repos.filter((r) => !r.fork));
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  // Pagination Logic
  const itemsPerPage = 3;
  const totalPages = Math.ceil(ghRepos.length / itemsPerPage);
  const currentRepos = ghRepos.slice(page * itemsPerPage, (page + 1) * itemsPerPage);

  const nextPage = () => setPage((p) => (p + 1) % totalPages);
  const prevPage = () => setPage((p) => (p - 1 + totalPages) % totalPages);

  return (
    <section id="projects" className="relative w-full min-h-[120vh] bg-[#0c1410] pt-32 pb-40 overflow-hidden text-white flex flex-col items-center">

      {/* Animated Gradient Mesh Background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Blob 1: Golden Amber (top-left, drifts right) */}
        <div
          className="absolute w-[600px] h-[600px] rounded-full opacity-[0.07] blur-[120px]"
          style={{
            background: "radial-gradient(circle, #c49a56 0%, transparent 70%)",
            top: "-10%",
            left: "-5%",
            animation: "meshDrift1 18s ease-in-out infinite alternate",
            willChange: "transform",
          }}
        />
        {/* Blob 2: Deep Emerald (center, drifts up) */}
        <div
          className="absolute w-[700px] h-[700px] rounded-full opacity-[0.06] blur-[140px]"
          style={{
            background: "radial-gradient(circle, #1a5c3a 0%, transparent 70%)",
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
        {/* Blob 4: Subtle Teal accent (center-left) */}
        <div
          className="absolute w-[400px] h-[400px] rounded-full opacity-[0.04] blur-[100px]"
          style={{
            background: "radial-gradient(circle, #2a8a6a 0%, transparent 70%)",
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
          <span className="text-[11px] uppercase tracking-[0.3em] font-bold text-[#c49a56] mb-4" style={{ fontFamily: "var(--f-sans)" }}>
            PORTFOLIO HIGHLIGHTS
          </span>
          <h2 className="title-font text-[clamp(40px,5vw,60px)] tracking-wide uppercase leading-[1.1] mb-8 text-[#e8e9e4]">
            PENGALAMAN &<br />REKAM JEJAK
          </h2>
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#c49a56] mb-8" style={{ fontFamily: "var(--f-sans)" }}>
            OPEN SOURCE REPOSITORIES
          </span>
          <p className="text-white/60 text-[13px] leading-[2] font-medium tracking-wide text-center" style={{ fontFamily: "var(--f-serif)" }}>
            Berlokasi di ekosistem pengembangan sumber terbuka, repositori ini dibangun sejak awal untuk memajukan fondasi teknologi perangkat lunak.
            Masing-masing memiliki filosofi arsitektur dan kegunaan nyata yang terus dikembangkan seiring waktu.
          </p>
        </div>

        {/* ── DIAMOND GRID ── */}
        <div className="relative w-full md:aspect-[2/1] max-w-[900px] mx-auto mt-10 md:mt-4 flex flex-col md:block items-center gap-16 md:gap-0">

          {loading ? (
            <div className="md:absolute inset-0 flex items-center justify-center min-h-[300px]">
              <span className="text-[#c49a56] tracking-[0.2em] text-xs uppercase animate-pulse">Menghubungkan ke GitHub...</span>
            </div>
          ) : (
            currentRepos.map((repo, idx) => {
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
                      <span className="flex items-center gap-1 text-[10px] font-bold text-[#c49a56] tracking-widest uppercase bg-black/80 px-2 py-1 rounded backdrop-blur-md shadow-[0_0_15px_rgba(196,154,86,0.3)] border border-[#c49a56]/30">
                        {repo.stargazers_count} ★
                      </span>
                    </div>
                  </a>

                  {/* Text Info */}
                  <div className="mt-6 md:mt-14 text-center lg:opacity-70 group-hover:opacity-100 group-hover:-translate-y-1 transition-all duration-500">
                    <h3 className="text-[12px] sm:text-[14px] font-bold uppercase tracking-[0.2em] text-[#e8e9e4] mb-2 leading-tight max-w-[200px] mx-auto">
                      {repo.name.replace(/[-_]/g, " ")}
                    </h3>
                    {repo.language && (
                      <span className="text-[8px] uppercase tracking-[0.3em] font-bold text-[#c49a56]">
                        {repo.language}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── PAGINATION CONTROLS ── */}
        {!loading && ghRepos.length > itemsPerPage && (
          <div className="mt-20 lg:mt-32 flex items-center gap-8">
            <button
              onClick={prevPage}
              className="w-10 h-10 rounded-full border border-[#c49a56]/30 flex items-center justify-center text-[#c49a56]/60 hover:text-[#c49a56] hover:border-[#c49a56] transition-all bg-black/40 backdrop-blur-sm"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-3 text-[10px] tracking-[0.3em] font-bold" style={{ fontFamily: "var(--f-mono)" }}>
              <span className="text-white">{page + 1}</span>
              <span className="text-white/30">/</span>
              <span className="text-white/50">{totalPages}</span>
            </div>

            <button
              onClick={nextPage}
              className="w-10 h-10 rounded-full border border-[#c49a56]/30 flex items-center justify-center text-[#c49a56]/60 hover:text-[#c49a56] hover:border-[#c49a56] transition-all bg-black/40 backdrop-blur-sm"
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
