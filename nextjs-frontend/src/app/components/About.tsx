"use client";

import React, { useState, useEffect } from "react";
import { motion, motionValue, useSpring } from "framer-motion";
import { GITHUB_USERNAME } from "@/data/github";

// --- GitHub Metrics State ---
interface GitHubMetrics {
  reposCount: string;
  starsCount: string;
  followersCount: string;
}

const About: React.FC = () => {
  const [metrics, setMetrics] = useState<GitHubMetrics>({
    reposCount: "—",
    starsCount: "—",
    followersCount: "—",
  });

  useEffect(() => {
    async function loadMetrics() {
      try {
        const userRes = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}`);
        if (!userRes.ok) throw new Error("Failed to fetch GitHub profile");
        const user = await userRes.json();

        const reposRes = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100`);
        if (!reposRes.ok) throw new Error("Failed to fetch repos");
        const repos = await reposRes.json();

        const totalStars = repos.reduce((acc: number, r: any) => acc + (r.stargazers_count || 0), 0);

        setMetrics({
          reposCount: user.public_repos?.toString() || "10+",
          starsCount: totalStars > 0 ? totalStars.toString() : "0",
          followersCount: user.followers?.toString() || "0",
        });
      } catch (err) {
        console.error("GitHub metrics fetch failed", err);
        // Keep the "—" fallback on error
      }
    }

    loadMetrics();
  }, []);

  const { reposCount, starsCount, followersCount } = metrics;
  return (
    <section id="about" className="relative w-full min-h-screen bg-[var(--bg)] pt-20 pb-32 overflow-hidden">

      {/* Container max-width matching the reference */}
      <div className="max-w-[1400px] mx-auto px-8 relative z-10">

        {/* Left Vertical Side Marker */}
        <div className="absolute left-8 top-40 hidden lg:flex flex-col items-center gap-10">
          <span className="text-[9px] text-white/40 tracking-[0.2em] transform -rotate-90">02</span>
          <div className="w-[1px] h-12 bg-white/20" />
          <span className="side-marker">PROFIL</span>
          <div className="w-[1px] h-12 bg-white/20" />
          <span className="text-[9px] text-white/40 tracking-[0.2em] transform -rotate-90">03</span>
        </div>

        {/* Top Header Block */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:ml-20 mt-16 lg:mt-32">

          {/* LEFT COLUMN: Title & Image */}
          <div className="flex flex-col gap-10">
            {/* Majestic Text Reveal */}
            <motion.h2
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              className="title-font text-[clamp(40px,5vw,56px)] leading-[1.1] text-white"
            >
              {[
                { text: "KISAH", delay: 0.1 },
                { text: "DIMULAI", delay: 0.2 },
                { text: "DI SINI", delay: 0.3 }
              ].map((line, i) => (
                <span key={i} className="block overflow-hidden">
                  <motion.span
                    className="block"
                    variants={{
                      hidden: { y: "100%", opacity: 0, rotateZ: 2 },
                      visible: { y: 0, opacity: 1, rotateZ: 0 }
                    }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: line.delay }}
                  >
                    {line.text}
                  </motion.span>
                </span>
              ))}
            </motion.h2>

            {/* Parallax Image Reveal */}
            <motion.div
              initial={{ clipPath: "inset(100% 0% 0% 0%)" }}
              whileInView={{ clipPath: "inset(0% 0% 0% 0%)" }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full aspect-[16/9] relative overflow-hidden group"
            >
              <motion.div
                initial={{ scale: 1.2 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-105"
                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?q=80&w=2000&auto=format&fit=crop')" }}
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-1000" />
            </motion.div>
          </div>

          {/* RIGHT COLUMN: Text & Link */}
          <div className="flex flex-col justify-center max-w-lg lg:ml-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
            >
              <h3 className="font-semibold text-white tracking-[0.1em] text-[13px] uppercase mb-6" style={{ fontFamily: "var(--f-sans)" }}>
                Rekayasa Perangkat Lunak & Antarmuka
              </h3>

              <p className="text-[12px] leading-[1.8] text-white/60 mb-6 text-justify" style={{ fontFamily: "var(--f-sans)", fontWeight: 500 }}>
                Berawal dari ketertarikan pada bagaimana sebuah sistem digital beroperasi, perjalanan ini berubah menjadi dedikasi untuk membangun arsitektur perangkat lunak yang tidak hanya berfungsi dengan baik, namun juga menyajikan pengalaman visual yang estetis.<br /><br />
                Setiap baris kode adalah fondasi; setiap antarmuka adalah kanvas. Pengalaman lebih dari 2 tahun dalam merancang solusi Full-stack telah membentuk perspektif unik saya—mengutamakan performa mesin sekaligus mempertahankan empati mendalam terhadap pengguna akhir. Fokus utama selalu bermuara pada kesempurnaan detail, clean code, dan fungsionalitas murni yang dibalut desain sinematik yang kuat.
              </p>

              {/* Animated Tech Stack Stats (Statistik Garis) */}
              <div className="flex flex-col gap-6 mb-10 w-full mt-2">
                {[
                  { label: "TypeScript / JavaScript", percent: 90 },
                  { label: "React / Next.js", percent: 85 },
                  { label: "Backend (Node & Go)", percent: 75 },
                  { label: "System Architecture", percent: 80 },
                ].map((stat, i) => (
                  <div key={i} className="flex flex-col gap-3">
                    <div className="flex justify-between text-[9px] tracking-[0.15em] text-white/50 uppercase font-semibold" style={{ fontFamily: "var(--f-sans)" }}>
                      <span>{stat.label}</span>
                      <span>{stat.percent}%</span>
                    </div>
                    <div className="w-full h-[1px] bg-white/10 relative overflow-hidden">
                      <motion.div
                        initial={{ scaleX: 0 }}
                        whileInView={{ scaleX: 1 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 1.5, delay: 0.4 + (i * 0.15), ease: [0.16, 1, 0.3, 1] }}
                        className="absolute inset-y-0 left-0 bg-white origin-left"
                        style={{ width: `${stat.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <a href="#contact" className="inline-flex items-center gap-2 text-[12px] tracking-[0.1em] text-white font-medium hover:text-white/70 transition-colors uppercase">
                <span className="relative overflow-hidden group/link flex items-center gap-2">
                  <span className="transform transition-transform duration-300 group-hover/link:translate-x-1">+</span>
                  <span className="relative">
                    HUBUNGI SAYA
                    <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-white transition-all duration-300 group-hover/link:w-full"></span>
                  </span>
                </span>
              </a>
            </motion.div>
          </div>

        </div>

        {/* BOTTOM ROW: Live Dev Metrics (Magnetic Panel) */}
        <div className="mt-24 lg:ml-20 flex gap-4 overflow-x-auto pb-12 snap-x scrollbar-hide items-center">
          <div className="shrink-0 text-[10px] text-white/30 tracking-[0.2em] transform -rotate-90 uppercasemr-4 lg:hidden">
            Metrics
          </div>
          {[
            { value: reposCount, label: "REPOSITORIES", sub: "Public & Private" },
            { value: "90%", label: "TYPESCRIPT", sub: "Primary Lang" },
            { value: followersCount, label: "FOLLOWERS", sub: "Dev Network" },
            { value: starsCount, label: "STARGAZERS", sub: "Repo Approvals" },
            { value: "5+", label: "DEPLOYMENTS", sub: "Production" },
            { value: "∞", label: "COFFEE", sub: "Consumed" },
          ].map((metric, i) => (
            <MagneticMetricBox key={i} {...metric} index={i} />
          ))}
        </div>

        {/* Right Extreme Edge Hidden Text (Matches the vertical text on the right) */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden xl:block">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 2, delay: 1 }}
            className="side-marker text-white/30 text-[8px] tracking-[0.4em]"
          >
            M. ARKAN FAUZI • SOFTWARE ARCHITECT
          </motion.span>
        </div>

      </div>

      {/* Bottom separating line */}
      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
        className="absolute bottom-0 w-full h-[1px] bg-white opacity-30 origin-left"
      />
    </section>
  );
};

// --- Custom Magnetic Metric Box Component ---
function MagneticMetricBox({ value, label, sub, index }: { value: string, label: string, sub: string, index: number }) {
  const ref = React.useRef<HTMLDivElement>(null);

  // Spring physics for smooth magnetic attraction
  const x = motionValue(0);
  const y = motionValue(0);

  const springConfig = { damping: 15, stiffness: 150, mass: 0.1 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;

    // Get element bounds
    const rect = ref.current.getBoundingClientRect();

    // Calculate distance from center of element to mouse
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Limit the maximum magnetic pull distance
    const distanceX = e.clientX - centerX;
    const distanceY = e.clientY - centerY;

    x.set(distanceX * 0.2); // 20% pull strength
    y.set(distanceY * 0.2);
  };

  const handleMouseLeave = () => {
    // Snap back to original position
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: 0.1 * index, ease: "easeOut" }}
      className="shrink-0"
    >
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ x: springX, y: springY }}
        className="w-28 h-28 lg:w-36 lg:h-36 bg-[#0c1410] snap-start relative group cursor-pointer border border-white/5 transition-transform duration-300 hover:scale-110 hover:z-10 hover:border-white/20 flex flex-col items-center justify-center text-center p-2 isolate"
      >
        {/* Subtle glass reflection overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />

        <h4 className="text-white text-3xl lg:text-4xl font-light mb-2 lg:mb-3" style={{ fontFamily: "var(--f-sans)", letterSpacing: "-0.05em" }}>
          {value}
        </h4>
        <div className="flex flex-col gap-0.5">
          <span className="text-[8px] lg:text-[9px] text-white/50 tracking-[0.2em] uppercase font-semibold">
            {label}
          </span>
          <span className="text-[7px] text-white/30 tracking-[0.15em] uppercase">
            {sub}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default About;
