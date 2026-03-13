"use client";

import React, { useEffect, useState, useRef, ReactNode } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { Github, Award, Briefcase, ArrowUpRight } from "lucide-react";

interface GitHubRepo {
    id: number;
    name: string;
    description: string | null;
    html_url: string;
    stargazers_count: number;
    language: string | null;
    fork: boolean;
}

// Mock Data for Admin Integration in the future
interface Certificate {
    id: string;
    title: string;
    issuer: string;
    date: string;
}

interface Experience {
    id: string;
    role: string;
    company: string;
    period: string;
}

import { useRouter } from "next/navigation";

// Mock data removed in favor of dynamic API fetching

// ── 3D Trading Card Component ──
interface TradingCardProps {
    color: string;
    colorHex: string;
    title: string;
    subtitle: string;
    bgImage: string;
    verticalText: string;
    icon: ReactNode;
    href: string;         // <-- Target route
    defaultRotateY?: number;
    defaultRotateZ?: number;
    defaultTranslateY?: number;
    defaultTranslateX?: number;
    children: ReactNode;
}

const TradingCard: React.FC<TradingCardProps> = ({
    colorHex, title, subtitle, bgImage, verticalText, icon, href,
    defaultRotateY = 0, defaultRotateZ = 0, defaultTranslateY = 0, defaultTranslateX = 0,
    children
}) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const [isHovered, setIsHovered] = useState(false);

    // Motion values for animations
    const rotateXAnim = useMotionValue(0);
    const rotateYAnim = useMotionValue(defaultRotateY);
    const rotateZAnim = useMotionValue(defaultRotateZ);
    const yAnim = useMotionValue(defaultTranslateY);
    const xAnim = useMotionValue(defaultTranslateX);
    const scaleAnim = useMotionValue(1);

    // Smooth physics
    const springConfig = { stiffness: 200, damping: 20 };
    const rotateX = useSpring(rotateXAnim, springConfig);
    const rotateY = useSpring(rotateYAnim, springConfig);
    const rotateZ = useSpring(rotateZAnim, springConfig);
    const translateY = useSpring(yAnim, springConfig);
    const translateX = useSpring(xAnim, springConfig);
    const scale = useSpring(scaleAnim, springConfig);

    useEffect(() => {
        if (!isHovered) {
            rotateXAnim.set(0);
            rotateYAnim.set(defaultRotateY);
            rotateZAnim.set(defaultRotateZ);
            yAnim.set(defaultTranslateY);
            xAnim.set(defaultTranslateX);
            scaleAnim.set(1);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isHovered, defaultRotateY, defaultRotateZ, defaultTranslateY, defaultTranslateX]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();

        // Calculate center relative position (-0.5 to 0.5)
        const mouseX = (e.clientX - rect.left) / rect.width - 0.5;
        const mouseY = (e.clientY - rect.top) / rect.height - 0.5;

        // Max rotation bounds based on mouse position
        const maxRotateX = 20;
        const maxRotateY = 20;

        rotateYAnim.set(mouseX * maxRotateY * 2);
        rotateXAnim.set(mouseY * -maxRotateX * 2);
    };

    const handleMouseEnter = () => {
        setIsHovered(true);
        // Reset translation/rotation towards user when interacting
        rotateZAnim.set(0);
        yAnim.set(0);
        xAnim.set(0);
        scaleAnim.set(1.05);
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
    };

    return (
        <div
            className="perspective-[1500px] w-full h-[550px] md:h-[600px] flex items-center justify-center p-4 relative"
            style={{ zIndex: isHovered ? 50 : 1 }}
        >
            <motion.div
                ref={cardRef}
                onMouseEnter={handleMouseEnter}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onClick={() => router.push(href)}
                style={{
                    rotateX,
                    rotateY,
                    rotateZ,
                    translateY,
                    translateX,
                    scale,
                    transformStyle: "preserve-3d"
                }}
                className="w-full max-w-[340px] h-full rounded-[1.5rem] relative group cursor-pointer transition-shadow duration-300"
            >
                {/* ── CARD BASE LAYER (Background Image) ── */}
                <div
                    className="absolute inset-0 rounded-[1.5rem] overflow-hidden bg-[#111] shadow-2xl border border-white/10"
                    style={{ transform: "translateZ(0px)" }}
                >
                    <div
                        className="absolute inset-0 bg-cover bg-center brightness-75 transition-transform duration-700 group-hover:scale-110 group-hover:brightness-50"
                        style={{ backgroundImage: `url(${bgImage})` }}
                    />

                    {/* Shadow overlay at bottom */}
                    <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/80 to-transparent" />

                    {/* Glowing Accent based on theme color */}
                    <div
                        className="absolute inset-0 opacity-20 mix-blend-overlay group-hover:opacity-60 transition-opacity duration-700"
                        style={{ background: `linear-gradient(to top right, ${colorHex}, transparent)` }}
                    />
                </div>

                {/* Vertical Right Text Strip (Arcane Style) */}
                <div
                    className="absolute right-0 top-0 bottom-0 w-10 flex flex-col items-center justify-between py-6 z-10 rounded-r-[1.5rem] overflow-hidden border-l border-white/10"
                    style={{ backgroundColor: colorHex, transform: "translateZ(10px)" }}
                >
                    <div className="text-black mb-4">
                        {icon}
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                        <span className="text-black font-extrabold uppercase tracking-[0.2em] transform rotate-90 whitespace-nowrap text-sm mix-blend-color-burn opacity-70">
                            {verticalText}
                        </span>
                    </div>
                    <div className="w-4 h-4 rounded-full border-4 border-black/30 mt-4 mix-blend-color-burn" />
                </div>

                {/* ── FLOATING CONTENT LAYER (Pop out on Z-axis) ── */}
                <div
                    className="absolute inset-0 p-6 pr-14 flex flex-col z-20"
                    style={{ transform: "translateZ(50px)" }}
                >
                    {/* Data List Context */}
                    <div className="flex-1 flex flex-col justify-end gap-3 pb-8">
                        {children}
                    </div>

                    {/* Bottom Title Area */}
                    <div className="mt-auto border-t pt-4" style={{ borderColor: `${colorHex}40` }}>
                        <h2
                            className="text-4xl lg:text-5xl font-extrabold uppercase tracking-tighter text-white mb-1 drop-shadow-lg"
                            style={{
                                textShadow: `0 0 20px ${colorHex}80, 0 0 40px ${colorHex}40`,
                                fontFamily: "var(--f-sans)"
                            }}
                        >
                            {title}
                        </h2>
                        <div className="flex items-center gap-2">
                            <span style={{ color: colorHex }} className="font-mono text-[10px] font-bold uppercase tracking-widest bg-black/50 px-2 py-0.5 rounded backdrop-blur">
                                {subtitle}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── HOLOGRAPHIC REFLECTION LAYER ── */}
                <div
                    className="absolute inset-0 rounded-[1.5rem] bg-gradient-to-tr from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ transform: "translateZ(60px)" }}
                />
            </motion.div>
        </div>
    );
};

// ── MAIN COMPONENT ──
export default function DataCards() {
    const [ghRepos, setGhRepos] = useState<GitHubRepo[]>([]);
    const [certs, setCerts] = useState<Certificate[]>([]);
    const [experiences, setExperiences] = useState<Experience[]>([]);

    const [loadingGh, setLoadingGh] = useState(true);
    const [loadingCerts, setLoadingCerts] = useState(true);
    const [loadingExp, setLoadingExp] = useState(true);

    useEffect(() => {
        // Fetch GitHub Repos
        fetch("/api/github-repos")
            .then((r) => r.ok ? r.json() : [])
            .then((repos: GitHubRepo[]) => {
                const filtered = repos.filter((r) => !r.fork).slice(0, 3);
                setGhRepos(filtered);
            })
            .catch((e) => console.error(e))
            .finally(() => setLoadingGh(false));

        // Fetch Certificates from Go Backend
        fetch(`/api/certificates`)
            .then((r) => r.ok ? r.json() : [])
            .then((data: Certificate[]) => setCerts(data))
            .catch((e) => console.error(e))
            .finally(() => setLoadingCerts(false));

        // Fetch Experiences from Go Backend
        fetch(`/api/experience`)
            .then((r) => r.ok ? r.json() : [])
            .then((data: Experience[]) => setExperiences(data))
            .catch((e) => console.error(e))
            .finally(() => setLoadingExp(false));
    }, []);

    return (
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-4 lg:gap-8 w-full">

            {/* ── CARD 1: REPOS (Emerald/Teal Theme) ── */}
            <TradingCard
                colorHex="#2a8a6a"
                color="teal-500"
                title="Repos"
                subtitle="Open Source"
                bgImage="https://images.unsplash.com/photo-1550439062-609e1531270e?auto=format&fit=crop&q=80&w=800"
                verticalText="Source Code"
                icon={<Github className="w-5 h-5" />}
                href="/dossier/repos"
                defaultRotateY={30}
                defaultRotateZ={-4}
                defaultTranslateX={20}
                defaultTranslateY={15}
            >
                {loadingGh ? (
                    <span className="text-white/50 font-mono text-xs animate-pulse">Loading Repos...</span>
                ) : (
                    ghRepos.map((repo) => (
                        <a
                            key={repo.id}
                            href={repo.html_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex flex-col bg-black/60 hover:bg-black/90 p-3 rounded-lg border border-white/10 hover:border-[#2a8a6a] backdrop-blur-md transition-all group/repo"
                        >
                            <div className="flex justify-between items-center mb-1">
                                <h4 className="text-white font-bold text-sm tracking-wide truncate pr-2 group-hover/repo:text-[#2a8a6a]">{repo.name}</h4>
                                <ArrowUpRight className="w-3 h-3 text-[#2a8a6a]/50 group-hover/repo:text-[#2a8a6a]" />
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-mono font-semibold uppercase">
                                <span className="text-white/60">{repo.language || "TXT"}</span>
                                <span className="text-[#2a8a6a]">{repo.stargazers_count} ★</span>
                            </div>
                        </a>
                    ))
                )}
            </TradingCard>

            {/* ── CARD 2: SERTIFIKAT (Gold Theme) ── */}
            <TradingCard
                colorHex="#c49a56"
                color="yellow-600"
                title="Awards"
                subtitle="Certifications"
                bgImage="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800"
                verticalText="Verified Achvmnts"
                icon={<Award className="w-5 h-5" />}
                href="/dossier/certificates"
                defaultRotateY={0}
                defaultRotateZ={0}
                defaultTranslateX={0}
                defaultTranslateY={-10}
            >
                {loadingCerts ? (
                    <span className="text-white/50 font-mono text-xs animate-pulse">Loading Awards...</span>
                ) : certs.map((cert) => (
                    <div key={cert.id} className="flex flex-col bg-gradient-to-r from-black/80 to-transparent p-3 rounded-lg border-l-2 border-[#c49a56]/50 backdrop-blur-sm">
                        <h4 className="text-white font-bold text-sm leading-tight mb-1">{cert.title}</h4>
                        <div className="flex justify-between items-center text-[10px] font-mono font-semibold uppercase text-white/60">
                            <span>{cert.issuer}</span>
                            <span className="text-[#c49a56]">{cert.date}</span>
                        </div>
                    </div>
                ))}
            </TradingCard>

            {/* ── CARD 3: PENGALAMAN (Orange/Crimson Theme) ── */}
            <TradingCard
                colorHex="#ff5500"
                color="orange-500"
                title="Journey"
                subtitle="Career Path"
                bgImage="https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?auto=format&fit=crop&q=80&w=800"
                verticalText="Work Experience"
                icon={<Briefcase className="w-5 h-5" />}
                href="/dossier/experience"
                defaultRotateY={-30}
                defaultRotateZ={4}
                defaultTranslateX={-20}
                defaultTranslateY={15}
            >
                {loadingExp ? (
                    <span className="text-white/50 font-mono text-xs animate-pulse">Loading Journey...</span>
                ) : experiences.map((exp) => (
                    <div key={exp.id} className="flex flex-col relative pl-4 pb-2 border-l border-white/20 last:border-0 last:pb-0">
                        <div className="absolute left-[-5px] top-1.5 w-2 h-2 rounded-full bg-[#ff5500] shadow-[0_0_10px_#ff5500]" />
                        <h4 className="text-white font-bold text-[15px] mb-0.5">{exp.role}</h4>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-[11px] font-mono text-white/70">
                            <span className="font-semibold text-[#ff5500]/80">{exp.company}</span>
                            <span>{exp.period}</span>
                        </div>
                    </div>
                ))}
            </TradingCard>

        </div>
    );
}
