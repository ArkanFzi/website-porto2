"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, type Easing } from "framer-motion";
import { ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import Cursor from "@/components/UI/Cursor";
import { staticProjects, type StaticProject } from "@/data/projects";

// ─────────────────────────────────────────
//  TYPES
// ─────────────────────────────────────────
interface GitHubRepo {
    id: number;
    name: string;
    description: string | null;
    html_url: string;
    homepage: string | null;
    stargazers_count: number;
    language: string | null;
    updated_at: string;
}

type ArchiveItem = {
    id: string;
    no: string;
    year: string;
    category: "Experience" | "Project" | "Certificate";
    title: string;
    subtitle: string;
    description: string;
    link?: string;
};

// ─────────────────────────────────────────
//  STATIC PLACEHOLDER DATA
//  (User: fill in your real Experience & Certificates here)
// ─────────────────────────────────────────
const experienceData: ArchiveItem[] = [
    {
        id: "exp-1",
        no: "EXP.01",
        year: "2024",
        category: "Experience",
        title: "Software Engineer",
        subtitle: "Company Name · Full-time",
        description: "Describe your role, tech stack, and key impact here.",
    },
];

const certificateData: ArchiveItem[] = [
    {
        id: "cert-1",
        no: "CERT.01",
        year: "2024",
        category: "Certificate",
        title: "Certificate Name",
        subtitle: "Issuing Organization",
        description: "Describe what this certification covers and its relevance.",
        link: "#",
    },
];

// ─────────────────────────────────────────
//  HELPER: Convert data sources → ArchiveItem
// ─────────────────────────────────────────
function staticToArchive(p: StaticProject, idx: number): ArchiveItem {
    const year = "2024"; // fallback year, update per project if needed
    return {
        id: p.id,
        no: `PRJ.${String(idx + 1).padStart(2, "0")}`,
        year,
        category: "Project",
        title: p.title,
        subtitle: p.technologies,
        description: p.description,
        link: p.projectUrl || p.githubUrl || undefined,
    };
}

function repoToArchive(repo: GitHubRepo, idx: number, offset: number): ArchiveItem {
    const year = new Date(repo.updated_at).getFullYear().toString();
    return {
        id: `gh-${repo.id}`,
        no: `GH.${String(idx + offset + 1).padStart(2, "0")}`,
        year,
        category: "Project",
        title: repo.name.replace(/[-_]/g, " "),
        subtitle: repo.language ?? "Open Source",
        description: repo.description ?? "No description provided.",
        link: repo.homepage || repo.html_url,
    };
}

// ─────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────
const categories = ["All", "Experience", "Project", "Certificate"] as const;
const EASE: Easing = [0.16, 1, 0.3, 1] as [number, number, number, number];

const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.25 } },
};

// ─────────────────────────────────────────
//  PAGE
// ─────────────────────────────────────────
export default function ArchivePage() {
    const [activeCategory, setActiveCategory] = useState<string>("All");
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [ghRepos, setGhRepos] = useState<GitHubRepo[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch live GitHub repos via the existing API proxy
    useEffect(() => {
        fetch("/api/github-repos")
            .then((r) => (r.ok ? r.json() : []))
            .then((repos: GitHubRepo[]) => setGhRepos(repos))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    // Build merged project list: static first, then live repos (no duplicates)
    const staticProjecItems = staticProjects.map((p, i) => staticToArchive(p, i));
    const staticGhUrls = new Set(staticProjects.map((p) => p.githubUrl));
    const liveRepoItems = ghRepos
        .filter((r) => !staticGhUrls.has(r.html_url))
        .map((r, i) => repoToArchive(r, i, staticProjects.length));

    const allData: ArchiveItem[] = [
        ...experienceData,
        ...staticProjecItems,
        ...liveRepoItems,
        ...certificateData,
    ];

    const filtered = allData.filter(
        (d) => activeCategory === "All" || d.category === activeCategory
    );

    return (
        <main className="min-h-screen bg-[#0c1410] text-white overflow-x-hidden">
            <Cursor />

            {/* ── Fixed Back + Vol. Label ── */}
            <div className="fixed top-0 left-0 right-0 z-50 px-6 md:px-12 xl:px-20 py-8 flex justify-between items-center pointer-events-none">
                <Link
                    href="/"
                    className="pointer-events-auto group flex items-center gap-3 text-white/60 hover:text-white transition-colors"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-[10px] tracking-[0.25em] uppercase" style={{ fontFamily: "var(--f-sans)" }}>
                        Home
                    </span>
                </Link>
                <span className="pointer-events-none text-[10px] tracking-[0.3em] text-white/30 uppercase" style={{ fontFamily: "var(--f-sans)" }}>
                    Vol. I — M. Arkan Fauzi
                </span>
            </div>

            {/* ── Masthead ── */}
            <header className="relative px-6 md:px-12 xl:px-20 pt-36 pb-16 border-b border-white/5 overflow-hidden">
                <div
                    className="absolute right-[-2vw] bottom-[-4vw] text-[30vw] leading-none font-black text-white/[0.025] select-none pointer-events-none"
                    style={{ fontFamily: "var(--f-sans)" }}
                    aria-hidden
                >
                    01
                </div>

                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, ease: EASE }}>
                    <div className="flex items-center gap-6 mb-10">
                        <span className="text-[10px] tracking-[0.35em] text-[#c49a56] uppercase" style={{ fontFamily: "var(--f-sans)" }}>
                            The Archive
                        </span>
                        <div className="flex-1 h-[1px] bg-white/10" />
                        <span className="text-[10px] tracking-[0.3em] text-white/30 uppercase" style={{ fontFamily: "var(--f-sans)" }}>
                            {new Date().getFullYear()}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
                        <h1
                            className="md:col-span-8 text-[clamp(52px,9vw,136px)] leading-[0.88] font-black uppercase tracking-tighter text-[#e8e9e4]"
                            style={{ fontFamily: "var(--f-sans)" }}
                        >
                            Dossier<br />
                            <span className="italic text-white/30 font-normal" style={{ fontFamily: "var(--f-serif)" }}>
                                &amp; Record
                            </span>
                        </h1>

                        <div className="md:col-span-4 flex flex-col gap-6 pb-2">
                            <p className="text-sm text-white/50 leading-relaxed" style={{ fontFamily: "var(--f-sans)", fontWeight: 300 }}>
                                A curated editorial of professional milestones, engineering
                                projects, and earned credentials — organised by impact.
                            </p>
                            <a
                                href="/cv.pdf"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group inline-flex items-center gap-3 self-start border border-[#c49a56]/40 hover:border-[#c49a56] px-5 py-3 text-[11px] tracking-[0.2em] uppercase text-[#c49a56] hover:bg-[#c49a56]/10 transition-all"
                                style={{ fontFamily: "var(--f-sans)" }}
                            >
                                <Download size={14} className="group-hover:translate-y-[2px] transition-transform" />
                                Download PDF CV
                            </a>
                        </div>
                    </div>
                </motion.div>
            </header>

            {/* ── Sticky Filter Bar ── */}
            <div className="sticky top-0 z-40 bg-[#0c1410]/95 backdrop-blur-sm border-b border-white/5 px-6 md:px-12 xl:px-20">
                <div className="flex gap-6 md:gap-10 overflow-x-auto py-5">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`relative text-[10px] uppercase tracking-[0.25em] transition-colors shrink-0 pb-1
                ${activeCategory === cat ? "text-white" : "text-white/40 hover:text-white/80"}`}
                            style={{ fontFamily: "var(--f-sans)" }}
                        >
                            {cat}
                            {activeCategory === cat && (
                                <motion.div layoutId="pill" className="absolute bottom-0 left-0 right-0 h-[1px] bg-[#c49a56]" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Editorial Entries ── */}
            <section className="px-6 md:px-12 xl:px-20 py-16 pb-32">
                {loading && activeCategory !== "Experience" && activeCategory !== "Certificate" ? (
                    <div className="flex items-center justify-center py-40">
                        <span className="text-[#c49a56]/60 text-[11px] tracking-[0.3em] uppercase animate-pulse" style={{ fontFamily: "var(--f-sans)" }}>
                            Loading repositories from GitHub…
                        </span>
                    </div>
                ) : (
                    <motion.div
                        key={activeCategory}
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="flex flex-col"
                    >
                        <AnimatePresence mode="popLayout">
                            {filtered.map((item) => (
                                <motion.article
                                    key={item.id}
                                    variants={itemVariants}
                                    layout
                                    onMouseEnter={() => setHoveredId(item.id)}
                                    onMouseLeave={() => setHoveredId(null)}
                                    className={`grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 py-10 border-b border-white/5 transition-opacity duration-300
                    ${hoveredId && hoveredId !== item.id ? "opacity-20" : "opacity-100"}`}
                                >
                                    {/* No + Year */}
                                    <div className="md:col-span-2 flex md:flex-col gap-4 md:gap-2 items-baseline md:items-start">
                                        <span className="text-[10px] text-[#c49a56]/70 tracking-[0.3em]" style={{ fontFamily: "var(--f-mono)" }}>
                                            {item.no}
                                        </span>
                                        <span className="text-[10px] text-white/30 tracking-[0.2em]" style={{ fontFamily: "var(--f-sans)" }}>
                                            {item.year}
                                        </span>
                                    </div>

                                    {/* Title block */}
                                    <div className="md:col-span-5">
                                        <span className="text-[9px] uppercase tracking-[0.3em] text-white/40 block mb-3" style={{ fontFamily: "var(--f-sans)" }}>
                                            {item.category}
                                        </span>
                                        <h2
                                            className={`text-[clamp(24px,3vw,48px)] leading-[1.05] font-normal italic mb-2 transition-colors duration-300
                        ${hoveredId === item.id ? "text-[#e8c97f]" : "text-[#e8e9e4]"}`}
                                            style={{ fontFamily: "var(--f-serif)" }}
                                        >
                                            {item.title}
                                        </h2>
                                        <p className="text-[11px] tracking-[0.15em] text-[#c49a56]/80 uppercase" style={{ fontFamily: "var(--f-sans)", fontWeight: 500 }}>
                                            {item.subtitle}
                                        </p>
                                    </div>

                                    {/* Description + link */}
                                    <div className="md:col-span-5 flex flex-col justify-between gap-6">
                                        <p className="text-sm text-white/55 leading-relaxed" style={{ fontFamily: "var(--f-sans)", fontWeight: 300 }}>
                                            {item.description}
                                        </p>
                                        {item.link && item.link !== "#" && (
                                            <a
                                                href={item.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="self-start text-[10px] uppercase tracking-[0.25em] text-white/40 hover:text-[#c49a56] transition-colors border-b border-white/10 hover:border-[#c49a56] pb-1"
                                                style={{ fontFamily: "var(--f-sans)" }}
                                            >
                                                View →
                                            </a>
                                        )}
                                    </div>
                                </motion.article>
                            ))}
                        </AnimatePresence>

                        {filtered.length === 0 && (
                            <p className="py-24 text-center text-white/30 italic text-lg" style={{ fontFamily: "var(--f-serif)" }}>
                                No records in this category.
                            </p>
                        )}
                    </motion.div>
                )}
            </section>
        </main>
    );
}
