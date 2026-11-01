"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePortfolioMode } from "@/context/PortfolioModeContext";
import { X, Activity, Globe, ShieldCheck, Music, Server } from "lucide-react";
import audioEngine from "@/lib/audioEngine";

export const TelemetryDrawer: React.FC = () => {
  const { telemetryOpen, setTelemetryOpen } = usePortfolioMode();
  const [latencyHistory, setLatencyHistory] = useState<number[]>([18, 22, 19, 24, 21, 17, 23, 20, 16, 22, 19, 15]);
  const [activeEdge] = useState("MONACO-SCUDERIA-01");
  const [visitorCount] = useState(142);
  const globeCanvasRef = useRef<HTMLCanvasElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && telemetryOpen) {
        setTelemetryOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [telemetryOpen, setTelemetryOpen]);

  // Periodic telemetry polling & sparkline updates
  useEffect(() => {
    if (!telemetryOpen) return;
    const interval = setInterval(() => {
      const nextLat = Math.floor(14 + Math.random() * 12);
      setLatencyHistory((prev) => [...prev.slice(1), nextLat]);
    }, 2000);
    return () => clearInterval(interval);
  }, [telemetryOpen]);

  // Procedural 3D Wireframe Globe on 2D Canvas (Lightweight, zero three.js overhead)
  useEffect(() => {
    if (!telemetryOpen) return;
    const canvas = globeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let rotation = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const radius = 64;

      // Draw latitude circles
      ctx.strokeStyle = "rgba(212, 30, 18, 0.25)";
      ctx.lineWidth = 1;

      for (let lat = -60; lat <= 60; lat += 30) {
        const rLat = radius * Math.cos((lat * Math.PI) / 180);
        const yLat = cy + radius * Math.sin((lat * Math.PI) / 180);
        ctx.beginPath();
        ctx.ellipse(cx, yLat, rLat, rLat * 0.28, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw rotating longitude meridians
      for (let lon = 0; lon < 180; lon += 30) {
        const rad = ((lon + rotation) * Math.PI) / 180;
        const xOffset = Math.sin(rad) * radius;
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.abs(xOffset), radius, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw outer globe rim
      ctx.strokeStyle = "#D41E12";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Draw active visitor pings
      const pings = [
        { lat: 0.1, lon: 0.4 }, // Malang / Indo
        { lat: -0.3, lon: -0.2 }, // Singapore
        { lat: 0.6, lon: -0.8 }, // Monaco / EU
      ];

      pings.forEach((p, idx) => {
        const px = cx + Math.sin(rotation * 0.03 + p.lon * 3) * (radius * 0.8);
        const py = cy + p.lat * (radius * 0.7);
        ctx.fillStyle = "#FF2800";
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "rgba(255, 40, 0, 0.4)";
        ctx.beginPath();
        ctx.arc(px, py, 6 + (Math.sin(rotation * 0.1 + idx) * 3), 0, Math.PI * 2);
        ctx.stroke();
      });

      rotation += 0.4;
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [telemetryOpen]);

  return (
    <AnimatePresence>
      {telemetryOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[99995] bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-6"
          onClick={() => {
            audioEngine.playClick(900, 0.02);
            setTelemetryOpen(false);
          }}
        >
          <motion.div
            initial={{ y: 50, scale: 0.96 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 50, scale: 0.96 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            className="w-full max-w-4xl bg-[#0C0B0A] border border-[#D41E12]/40 rounded-xl shadow-[0_0_40px_rgba(212,30,18,0.25)] overflow-hidden flex flex-col pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D41E12] animate-ping" />
                <span className="font-mono text-xs font-bold tracking-[0.2em] text-white uppercase">
                  PIT-WALL TELEMETRY HUD // SCUDERIA DIAGNOSTICS
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-[#D41E12]/20 border border-[#D41E12]/40 text-[#D41E12] font-mono text-[9px]">
                  LIVE v4.2
                </span>
              </div>
              <button
                onClick={() => {
                  audioEngine.playClick(900, 0.02);
                  setTelemetryOpen(false);
                }}
                className="p-1 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Main Content Grid */}
            <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* Col 1: Live Wireframe Globe & Edge Coordinates */}
              <div className="p-4 rounded-lg border border-white/10 bg-white/[0.01] flex flex-col items-center justify-between text-center">
                <div className="w-full flex items-center justify-between text-left mb-2">
                  <span className="font-mono text-[10px] text-white/50 tracking-wider uppercase flex items-center gap-1.5">
                    <Globe className="w-3 h-3 text-[#D41E12]" /> GLOBAL MESH
                  </span>
                  <span className="font-mono text-[10px] text-[#D41E12] font-bold">100% HEALTH</span>
                </div>
                <canvas
                  ref={globeCanvasRef}
                  width={150}
                  height={150}
                  className="my-1"
                />
                <div className="w-full font-mono text-[10px] text-white/70 space-y-1 text-left bg-black/40 p-2.5 rounded border border-white/5">
                  <div className="flex justify-between">
                    <span className="text-white/40">NODE:</span>
                    <span className="text-[#D41E12] font-bold">{activeEdge}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">ORIGIN:</span>
                    <span>43°44′N 7°25′E</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">PINGS:</span>
                    <span className="text-emerald-400">~{visitorCount} active sessions</span>
                  </div>
                </div>
              </div>

              {/* Col 2: p99 Latency & V8 Runtime Sparkline */}
              <div className="p-4 rounded-lg border border-white/10 bg-white/[0.01] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-[10px] text-white/50 tracking-wider uppercase flex items-center gap-1.5">
                      <Activity className="w-3 h-3 text-[#D41E12]" /> p99 LATENCY METRIC
                    </span>
                    <span className="font-mono text-xs font-bold text-white">
                      {latencyHistory[latencyHistory.length - 1]}ms
                    </span>
                  </div>

                  {/* SVG Sparkline */}
                  <div className="h-24 w-full bg-black/40 rounded border border-white/5 p-2 flex items-end">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 120 40">
                      <polyline
                        fill="none"
                        stroke="#D41E12"
                        strokeWidth="2"
                        points={latencyHistory
                          .map((val, idx) => `${idx * 10},${40 - (val - 10) * 1.8}`)
                          .join(" ")}
                      />
                      {latencyHistory.map((val, idx) => (
                        <circle
                          key={idx}
                          cx={idx * 10}
                          cy={40 - (val - 10) * 1.8}
                          r={idx === latencyHistory.length - 1 ? 2.5 : 1}
                          fill={idx === latencyHistory.length - 1 ? "#FF2800" : "#D41E12"}
                        />
                      ))}
                    </svg>
                  </div>
                </div>

                <div className="mt-3 font-mono text-[10px] text-white/70 space-y-1 bg-black/40 p-2.5 rounded border border-white/5">
                  <div className="flex justify-between">
                    <span className="text-white/40">HEAP ALLOC:</span>
                    <span>188.4 MB / 512 MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">CACHE HIT:</span>
                    <span className="text-emerald-400 font-bold">98.9% (Next.js Data Cache)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">SLA GUARANTEE:</span>
                    <span>99.98% High-Throughput</span>
                  </div>
                </div>
              </div>

              {/* Col 3: Microservice Tracing Flow & Audio Waveform */}
              <div className="p-4 rounded-lg border border-white/10 bg-white/[0.01] flex flex-col justify-between">
                <div>
                  <span className="font-mono text-[10px] text-white/50 tracking-wider uppercase flex items-center gap-1.5 mb-2.5">
                    <Server className="w-3 h-3 text-[#D41E12]" /> ARCHITECTURE TRACE
                  </span>
                  
                  {/* Visual flowchart step */}
                  <div className="space-y-1.5 font-mono text-[9px]">
                    <div className="flex items-center gap-2 p-1.5 rounded bg-white/[0.03] border border-white/5 text-white/80">
                      <span className="text-[#D41E12] font-bold">01.</span>
                      <span>Client Browser [HTTP/3 + WebGL]</span>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 rounded bg-white/[0.03] border border-white/5 text-white/80">
                      <span className="text-[#D41E12] font-bold">02.</span>
                      <span>Vercel Edge Middlewares (Auth / CORS)</span>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 rounded bg-white/[0.03] border border-white/5 text-white/80">
                      <span className="text-[#D41E12] font-bold">03.</span>
                      <span>Neon PostgreSQL (SSL Connection Pool)</span>
                    </div>
                  </div>
                </div>

                {/* Spotify / Audio Stream Indicator */}
                <div className="mt-3 bg-black/40 p-2.5 rounded border border-white/5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-[9px] text-white/40 uppercase flex items-center gap-1">
                      <Music className="w-2.5 h-2.5 text-[#D41E12]" /> CURRENT COGNITIVE AUDIO
                    </span>
                    <span className="font-mono text-[8px] text-emerald-400">PLAYING</span>
                  </div>
                  <div className="font-mono text-[10px] text-white truncate font-bold">
                    Max Cooper - Repetition (Synthwave Mix)
                  </div>
                  <div className="flex items-end gap-0.5 h-3 mt-1.5">
                    {[12, 24, 18, 28, 14, 26, 32, 16, 20, 30, 22, 14, 28, 18].map((h, i) => (
                      <span
                        key={i}
                        className="flex-1 bg-[#D41E12] rounded-t"
                        style={{
                          height: `${(h / 32) * 100}%`,
                          animation: `pulse 0.8s ease-in-out infinite alternate ${i * 0.08}s`
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* Footer Status Bar */}
            <div className="px-5 py-3 border-t border-white/10 bg-white/[0.02] flex items-center justify-between font-mono text-[9px] text-white/50">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                SECURITY: TOKEN BUCKET ACTIVE • 0 ANOMALIES DETECTED
              </span>
              <span className="text-white/30 hidden sm:inline">PRESS ESC TO CLOSE</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TelemetryDrawer;
