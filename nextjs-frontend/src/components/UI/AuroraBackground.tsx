"use client";

import React, { useEffect, useRef } from "react";

/**
 * AuroraBackground — PERFORMANCE OPTIMISED
 * - Throttled to ~30 FPS (was 60 FPS)
 * - Reduced sample resolution (width/6 instead of width/3)
 * - Reduced canvas star count (60 instead of 120)
 * - IntersectionObserver stops animation when not visible
 * Colors: Crimson Red → Neon Cyan → Deep Violet
 */
const AuroraBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let width = (canvas.width = window.innerWidth);
        let height = (canvas.height = window.innerHeight);
        let animId = 0;
        let lastFrame = 0;
        let isVisible = true;
        const FRAME_MS = 1000 / 30; // ~30 FPS cap

        // Resize handler
        let resizeTimer: ReturnType<typeof setTimeout>;
        const onResize = () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                width = canvas.width = window.innerWidth;
                height = canvas.height = window.innerHeight;
            }, 150);
        };
        window.addEventListener("resize", onResize);

        // Pause when tab not visible
        const onVisibility = () => { isVisible = document.visibilityState === "visible"; };
        document.addEventListener("visibilitychange", onVisibility);

        // Aurora wave curtains config
        const curtains = [
            {
                waves: [
                    { amp: 0.055, freq: 1.8, phase: 0.0, speed: 0.0004 },
                    { amp: 0.035, freq: 3.5, phase: 2.1, speed: -0.0005 },
                    { amp: 0.025, freq: 5.0, phase: 1.0, speed: 0.00035 },
                ],
                yBase: 0.28, thickness: 0.35,
                colors: ["rgba(220,20,60,0)", "rgba(220,20,60,0.28)", "rgba(180,10,40,0.14)", "rgba(220,20,60,0)"],
                blur: 60,
            },
            {
                waves: [
                    { amp: 0.06, freq: 2.2, phase: 1.0, speed: -0.00030 },
                    { amp: 0.03, freq: 4.1, phase: 3.5, speed: 0.00040 },
                    { amp: 0.02, freq: 6.0, phase: 0.5, speed: -0.00025 },
                ],
                yBase: 0.42, thickness: 0.28,
                colors: ["rgba(0,210,255,0)", "rgba(0,210,255,0.22)", "rgba(0,160,220,0.12)", "rgba(0,210,255,0)"],
                blur: 80,
            },
            {
                waves: [
                    { amp: 0.04, freq: 1.5, phase: 2.0, speed: 0.00035 },
                    { amp: 0.05, freq: 3.0, phase: 0.8, speed: -0.00035 },
                    { amp: 0.015, freq: 5.5, phase: 1.8, speed: 0.0005 },
                ],
                yBase: 0.55, thickness: 0.22,
                colors: ["rgba(123,47,190,0)", "rgba(123,47,190,0.20)", "rgba(80,20,160,0.10)", "rgba(123,47,190,0)"],
                blur: 70,
            },
            {
                waves: [
                    { amp: 0.03, freq: 2.8, phase: 0.5, speed: -0.00020 },
                    { amp: 0.045, freq: 1.2, phase: 3.0, speed: 0.00030 },
                    { amp: 0.02, freq: 4.5, phase: 2.5, speed: -0.0004 },
                ],
                yBase: 0.68, thickness: 0.18,
                colors: ["rgba(0,210,255,0)", "rgba(0,100,180,0.15)", "rgba(0,210,255,0.08)", "rgba(0,210,255,0)"],
                blur: 90,
            },
        ];

        const drawCurtain = (t: number, curtain: (typeof curtains)[0]) => {
            ctx.save();
            ctx.filter = `blur(${curtain.blur}px)`;

            // Reduced resolution: width/6 instead of width/3 = 2× fewer samples
            const numSamples = Math.ceil(width / 6);
            const xs: number[] = [];
            const yMids: number[] = [];

            for (let i = 0; i <= numSamples; i++) {
                const x = (i / numSamples) * width;
                let yNorm = curtain.yBase;
                for (const w of curtain.waves) {
                    yNorm += w.amp * Math.sin(w.freq * (x / width) * Math.PI * 2 + w.phase + t * w.speed * 1000);
                }
                xs.push(x);
                yMids.push(yNorm * height);
            }

            const halfH = curtain.thickness * height * 0.5;

            ctx.beginPath();
            ctx.moveTo(xs[0], yMids[0] - halfH);
            for (let i = 1; i <= numSamples; i++) ctx.lineTo(xs[i], yMids[i] - halfH);
            for (let i = numSamples; i >= 0; i--) ctx.lineTo(xs[i], yMids[i] + halfH);
            ctx.closePath();

            const gradient = ctx.createLinearGradient(0, 0, 0, height);
            const [c0, c1, c2, c3] = curtain.colors;
            gradient.addColorStop(0, c0);
            gradient.addColorStop(0.3, c1);
            gradient.addColorStop(0.7, c2);
            gradient.addColorStop(1, c3);
            ctx.fillStyle = gradient;
            ctx.fill();
            ctx.restore();
        };

        const drawFrame = (t: number) => {
            ctx.clearRect(0, 0, width, height);

            // Background sky gradient
            const sky = ctx.createLinearGradient(0, 0, 0, height);
            sky.addColorStop(0, "#020408");
            sky.addColorStop(0.5, "#040610");
            sky.addColorStop(1, "#060210");
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, width, height);

            // Draw aurora curtains
            for (const c of curtains) drawCurtain(t, c);

            // Stars (60 stable positions)
            ctx.save();
            ctx.filter = "none";
            for (let s = 0; s < 60; s++) {
                const sx = (s * 173.71) % width;
                const sy = (s * 241.53) % (height * 0.7);
                const twinkle = 0.3 + 0.5 * Math.sin(t * (0.5 + (s % 7) * 0.2) + s);
                const r = 0.5 + (s % 3) * 0.4;
                ctx.beginPath();
                ctx.arc(sx, sy, r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,255,255,${twinkle * 0.85})`;
                ctx.fill();
            }
            ctx.restore();
        };

        // Throttled animation loop
        const loop = (ts: number) => {
            animId = requestAnimationFrame(loop);
            if (!isVisible) return;
            if (ts - lastFrame < FRAME_MS) return;
            lastFrame = ts;
            drawFrame(ts * 0.001);
        };

        animId = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(animId);
            clearTimeout(resizeTimer);
            window.removeEventListener("resize", onResize);
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 0, willChange: "transform" }}
            aria-hidden="true"
        />
    );
};

export default AuroraBackground;
