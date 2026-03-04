"use client";

import React from "react";


/**
 * CinematicBackground
 * Replicates the dark editorial photography style from the reference image.
 * Uses multiple full-bleed Unsplash images stacked with different scroll-speeds
 * and opacity to create depth — overlaid with red/blue color grades.
 *
 * NO Three.js, NO canvas aurora — pure CSS + HTML.
 */

const IMAGES = [
    // Hero zone — dark misty forest path (evoking a journey)
    "https://images.unsplash.com/photo-1448375240586-882707db888b?q=85&w=2000&auto=format&fit=crop",
    // Mid zone — dark moody mountain landscape
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=85&w=2000&auto=format&fit=crop",
    // Lower zone — night forest silhouette
    "https://images.unsplash.com/photo-1542621334-a254cf47733d?q=85&w=2000&auto=format&fit=crop",
];

const CinematicBackground: React.FC = () => (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">

        {/* ── Layer 1: Base dark color ─────────────────────── */}
        <div className="absolute inset-0" style={{ background: "#020307" }} />

        {/* ── Layer 2: Hero photo (top third) ─────────────── */}
        <div
            className="absolute inset-0"
            style={{
                backgroundImage: `url("${IMAGES[0]}")`,
                backgroundSize: "cover",
                backgroundPosition: "center 30%",
                backgroundAttachment: "fixed",
                opacity: 0.18,
            }}
        />

        {/* ── Layer 3: Mid photo (shifted down) ───────────── */}
        <div
            className="absolute inset-0"
            style={{
                backgroundImage: `url("${IMAGES[1]}")`,
                backgroundSize: "cover",
                backgroundPosition: "center 60%",
                backgroundAttachment: "fixed",
                opacity: 0.11,
                transform: "scale(1.05)",
            }}
        />

        {/* ── Layer 4: Lower photo (bottom area) ──────────── */}
        <div
            className="absolute inset-0"
            style={{
                backgroundImage: `url("${IMAGES[2]}")`,
                backgroundSize: "cover",
                backgroundPosition: "center 85%",
                backgroundAttachment: "fixed",
                opacity: 0.09,
            }}
        />

        {/* ── Layer 5: Red vignette top-left ──────────────── */}
        <div
            className="absolute inset-0"
            style={{
                background: "radial-gradient(ellipse 70% 50% at 0% 0%, rgba(180,10,40,0.18) 0%, transparent 70%)",
            }}
        />

        {/* ── Layer 6: Blue vignette bottom-right ─────────── */}
        <div
            className="absolute inset-0"
            style={{
                background: "radial-gradient(ellipse 60% 45% at 100% 100%, rgba(0,180,220,0.13) 0%, transparent 70%)",
            }}
        />

        {/* ── Layer 7: Centre dark vignette (keeps text readable) */}
        <div
            className="absolute inset-0"
            style={{
                background: "radial-gradient(ellipse 80% 80% at 50% 40%, transparent 0%, rgba(2,3,7,0.55) 100%)",
            }}
        />

        {/* ── Layer 8: Heavy top & bottom gradient fades ──── */}
        <div className="absolute top-0 left-0 right-0 h-40"
            style={{ background: "linear-gradient(to bottom, #020307 0%, transparent 100%)" }} />
        <div className="absolute bottom-0 left-0 right-0 h-48"
            style={{ background: "linear-gradient(to top, #020307 0%, transparent 100%)" }} />

        {/* ── Layer 9: Subtle scanline / film grain via SVG ── */}
        <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E")`,
                backgroundRepeat: "repeat",
                backgroundSize: "180px",
            }}
        />
    </div>
);

export default CinematicBackground;
