"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePortfolioMode } from "@/context/PortfolioModeContext";
import { X, Activity, Globe, Music, Server } from "lucide-react";
import audioEngine from "@/lib/audioEngine";

// Kontrak /api/telemetry (lihat src/app/api/telemetry/route.ts). Field yang bisa null berarti
// tidak ada pengukuran, dan yang tampil di panel adalah "—" — bukan angka pengganti.
interface TelemetryPayload {
  status: string;
  latencyMs: number;
  latencySamples: number[];
  heapMb: number | null;
  backend: { reachable: boolean; db: "ok" | "error" | null; rttMs: number | null };
  runtime: { node: string | null; next: string | null };
  gitCommit: string | null;
  timestamp: string;
}

// Kontrak GET /api/visits di go-backend: {"total":int,"today":int,"uniqueLast24h":int}.
interface VisitsPayload {
  total: number;
  today: number;
  uniqueLast24h: number;
}

const DASH = "—";
const POLL_MS = 5000;
const VISIT_KEY = "af-visit-counted";

function nilai(v: string | number | null | undefined, satuan = ""): string {
  if (v === null || v === undefined || v === "") return DASH;
  if (typeof v === "number" && !Number.isFinite(v)) return DASH;
  return `${v}${satuan}`;
}

function ringkasLatency(samples: number[]) {
  if (samples.length === 0) return null;
  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const avg = Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
  return { min, max, avg, latest: samples[samples.length - 1] };
}

// Sumbu Y sparkline diskalakan dari rentang sampel yang benar-benar ada. Versi sebelumnya memakai
// `(val - 10) * 1.8` yang hanya masuk akal untuk latency 10-30 ms; begitu pengukuran nyata melewati
// rentang itu, titiknya keluar viewBox dan grafiknya jadi hiasan yang mengaku data.
function koordinatSparkline(samples: number[]) {
  if (samples.length === 0) return [] as { x: number; y: number }[];
  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const rentang = max - min || 1;
  const langkahX = samples.length > 1 ? 120 / (samples.length - 1) : 0;
  return samples.map((v, i) => ({
    x: i * langkahX,
    y: 37 - ((v - min) / rentang) * 31,
  }));
}

export const TelemetryDrawer: React.FC = () => {
  const { telemetryOpen, setTelemetryOpen, audioMuted } = usePortfolioMode();
  const [telemetry, setTelemetry] = useState<TelemetryPayload | null>(null);
  const [visits, setVisits] = useState<VisitsPayload | null>(null);
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

  // Penghitung kunjungan: POST /api/visit sekali per page-load, dideduplikasi lewat sessionStorage
  // supaya render ulang di sesi yang sama tidak menghitung orang yang sama dua kali. Komponen ini
  // terpasang sejak halaman dimount, jadi pencatatan tidak perlu menunggu drawer dibuka.
  useEffect(() => {
    let sudahDihitung = false;
    try {
      sudahDihitung = sessionStorage.getItem(VISIT_KEY) !== null;
    } catch {
      // sessionStorage bisa melempar di mode privat atau iframe tanpa izin: anggap belum terhitung,
      // jangan sampai pencatatannya tidak jalan sama sekali.
      sudahDihitung = false;
    }
    if (sudahDihitung) return;

    fetch("/api/visit", { method: "POST", keepalive: true })
      .then((res) => {
        // 204 tanpa body adalah kontrak sukses backend; tidak ada json yang perlu ditunggu.
        if (res.ok) {
          try {
            sessionStorage.setItem(VISIT_KEY, "1");
          } catch {
            // Penanda sesi gagal ditulis; pencatatan di server tetap terjadi satu kali.
          }
        }
      })
      .catch(() => {
        // Backend mati: tidak ada yang bisa dilaporkan, total kunjungan tampil "—" di panel.
      });
  }, []);

  // Polling hanya selama drawer terbuka. Ditutup = interval dibersihkan dan request yang masih
  // berjalan dibatalkan lewat AbortController, jadi tidak ada fetch yang masih menulis state panel
  // yang sedang tidak dilihat siapa pun.
  useEffect(() => {
    if (!telemetryOpen) return;

    const controller = new AbortController();
    let aktif = true;

    const ambilTelemetry = async () => {
      try {
        const res = await fetch("/api/telemetry", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!res.ok) {
          if (aktif) setTelemetry(null);
          return;
        }
        const data = (await res.json()) as TelemetryPayload;
        if (aktif) setTelemetry(data);
      } catch {
        // Jaringan gagal atau diabort: state dikosongkan supaya panel tidak terus menampilkan
        // angka lama yang terlihat seperti pengukuran terbaru.
        if (aktif) setTelemetry(null);
      }
    };

    const ambilVisits = async () => {
      try {
        const res = await fetch("/api/visits", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!res.ok) {
          if (aktif) setVisits(null);
          return;
        }
        const data = (await res.json()) as VisitsPayload;
        if (aktif) setVisits(data);
      } catch {
        if (aktif) setVisits(null);
      }
    };

    void ambilTelemetry();
    void ambilVisits();
    const interval = setInterval(() => {
      void ambilTelemetry();
      void ambilVisits();
    }, POLL_MS);

    return () => {
      aktif = false;
      controller.abort();
      clearInterval(interval);
    };
  }, [telemetryOpen]);

  // Procedural 3D Wireframe Globe on 2D Canvas (Lightweight, zero three.js overhead).
  // Ini hiasan belaka: titik ping di bawah diputar oleh matematika, bukan lokasi pengunjung, jadi
  // ia tidak dihitung sebagai data dan tidak ikut di-poll.
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

      // Draw decorative pings (bukan lokasi pengunjung, hanya bentuk yang diputar)
      const pings = [
        { lat: 0.1, lon: 0.4 },
        { lat: -0.3, lon: -0.2 },
        { lat: 0.6, lon: -0.8 },
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

  const samples = telemetry?.latencySamples ?? [];
  const statistik = ringkasLatency(samples);
  const titik = koordinatSparkline(samples);
  const garis = titik.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const dbLabel = !telemetry
    ? DASH
    : telemetry.backend.db === "ok"
      ? "SEHAT"
      : telemetry.backend.db === "error"
        ? "ERROR"
        : DASH;
  const commit = telemetry?.gitCommit ? telemetry.gitCommit.slice(0, 7) : DASH;
  const jam = telemetry?.timestamp ? telemetry.timestamp.slice(11, 19) : DASH;

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
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    telemetry ? "bg-[#D41E12] animate-ping" : "bg-white/30"
                  }`}
                />
                <span className="font-mono text-xs font-bold tracking-[0.2em] text-white uppercase">
                  PIT-WALL TELEMETRY HUD // SCUDERIA DIAGNOSTICS
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-[#D41E12]/20 border border-[#D41E12]/40 text-[#D41E12] font-mono text-[9px]">
                  {telemetry ? telemetry.status : "TANPA DATA"}
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
              
              {/* Col 1: Globe prosedural (hiasan) + hasil probe backend + penghitung kunjungan */}
              <div className="p-4 rounded-lg border border-white/10 bg-white/[0.01] flex flex-col items-center justify-between text-center">
                <div className="w-full flex items-center justify-between text-left mb-2">
                  <span className="font-mono text-[10px] text-white/50 tracking-wider uppercase flex items-center gap-1.5">
                    <Globe className="w-3 h-3 text-[#D41E12]" /> GLOBAL MESH
                  </span>
                  <span className="font-mono text-[10px] text-white/40">HIASAN PROSEDURAL</span>
                </div>
                <canvas
                  ref={globeCanvasRef}
                  width={150}
                  height={150}
                  className="my-1"
                />
                <div className="w-full font-mono text-[10px] text-white/70 space-y-1 text-left bg-black/40 p-2.5 rounded border border-white/5">
                  <div className="flex justify-between">
                    <span className="text-white/40">BACKEND:</span>
                    <span
                      className={
                        telemetry?.backend.reachable ? "text-[#D41E12] font-bold" : "text-white/70"
                      }
                    >
                      {telemetry
                        ? telemetry.backend.reachable
                          ? "TERJANGKAU"
                          : "TIDAK TERJANGKAU"
                        : DASH}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">POSTGRESQL:</span>
                    <span>{dbLabel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">KUNJUNGAN HARI INI:</span>
                    <span>{nilai(visits?.today)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">UNIK 24J:</span>
                    <span>{nilai(visits?.uniqueLast24h)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">TOTAL KUNJUNGAN:</span>
                    <span className="text-emerald-400">{nilai(visits?.total)}</span>
                  </div>
                </div>
              </div>

              {/* Col 2: Latency yang benar-benar diukur + heap proses Node */}
              <div className="p-4 rounded-lg border border-white/10 bg-white/[0.01] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-[10px] text-white/50 tracking-wider uppercase flex items-center gap-1.5">
                      <Activity className="w-3 h-3 text-[#D41E12]" /> LATENCY TERUKUR
                    </span>
                    <span className="font-mono text-xs font-bold text-white">
                      {statistik ? `${statistik.latest}ms` : DASH}
                    </span>
                  </div>

                  {/* SVG Sparkline — titiknya isi latencySamples yang dikembalikan API */}
                  <div className="h-24 w-full bg-black/40 rounded border border-white/5 p-2 flex items-end">
                    {titik.length > 0 ? (
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 120 40">
                        <polyline fill="none" stroke="#D41E12" strokeWidth="2" points={garis} />
                        {titik.map((p, idx) => (
                          <circle
                            key={idx}
                            cx={p.x}
                            cy={p.y}
                            r={idx === titik.length - 1 ? 2.5 : 1}
                            fill={idx === titik.length - 1 ? "#FF2800" : "#D41E12"}
                          />
                        ))}
                      </svg>
                    ) : (
                      <span className="font-mono text-[10px] text-white/40">
                        {DASH} belum ada sampel
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 font-mono text-[10px] text-white/70 space-y-1 bg-black/40 p-2.5 rounded border border-white/5">
                  <div className="flex justify-between">
                    <span className="text-white/40">SAMPEL:</span>
                    <span>{nilai(samples.length)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">MIN / AVG / MAX:</span>
                    <span>
                      {statistik
                        ? `${statistik.min} / ${statistik.avg} / ${statistik.max} ms`
                        : DASH}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">BACKEND RTT:</span>
                    <span>{nilai(telemetry?.backend.rttMs, " ms")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">HEAP NODE:</span>
                    <span>{nilai(telemetry?.heapMb, " MB")}</span>
                  </div>
                </div>
              </div>

              {/* Col 3: Alur request yang diukur rute + status engine audio prosedural */}
              <div className="p-4 rounded-lg border border-white/10 bg-white/[0.01] flex flex-col justify-between">
                <div>
                  <span className="font-mono text-[10px] text-white/50 tracking-wider uppercase flex items-center gap-1.5 mb-2.5">
                    <Server className="w-3 h-3 text-[#D41E12]" /> ARCHITECTURE TRACE
                  </span>
                  
                  {/* Setiap baris adalah satu lompatan yang benar-benar diukur rute /api/telemetry */}
                  <div className="space-y-1.5 font-mono text-[9px]">
                    <div className="flex items-center gap-2 p-1.5 rounded bg-white/[0.03] border border-white/5 text-white/80">
                      <span className="text-[#D41E12] font-bold">01.</span>
                      <span>
                        Next.js {nilai(telemetry?.runtime.next)} / Node{" "}
                        {nilai(telemetry?.runtime.node)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 rounded bg-white/[0.03] border border-white/5 text-white/80">
                      <span className="text-[#D41E12] font-bold">02.</span>
                      <span>
                        Go backend /api/health — {telemetry ? `${telemetry.latencyMs}ms` : DASH}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 rounded bg-white/[0.03] border border-white/5 text-white/80">
                      <span className="text-[#D41E12] font-bold">03.</span>
                      <span>PostgreSQL ping — {dbLabel}</span>
                    </div>
                  </div>
                </div>

                {/* Status engine audio nyata dari context; trek tidak punya sumber data */}
                <div className="mt-3 bg-black/40 p-2.5 rounded border border-white/5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-[9px] text-white/40 uppercase flex items-center gap-1">
                      <Music className="w-2.5 h-2.5 text-[#D41E12]" /> WEB AUDIO ENGINE
                    </span>
                    <span className="font-mono text-[8px] text-emerald-400">
                      {audioMuted ? "OFF" : "ON"}
                    </span>
                  </div>
                  <div className="font-mono text-[10px] text-white/60 truncate">
                    SFX prosedural • trek: {DASH}
                  </div>
                </div>
              </div>

            </div>

            {/* Footer Status Bar */}
            <div className="px-5 py-3 border-t border-white/10 bg-white/[0.02] flex items-center justify-between font-mono text-[9px] text-white/50">
              <span className="flex items-center gap-2">
                <span>BUILD {commit}</span>
                <span className="text-white/20">|</span>
                <span>DIUKUR {jam} UTC</span>
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
