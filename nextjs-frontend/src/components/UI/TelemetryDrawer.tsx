"use client";

import React, { useEffect, useRef, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePortfolioMode } from "@/context/PortfolioModeContext";
import { X, Activity, Globe, Music, Server } from "lucide-react";
import audioEngine from "@/lib/audioEngine";
import { bacaCuplik, dengarCuplik, type CuplikanFrame } from "@/lib/perfStats";
import {
  bacaTelemetri,
  bacaTelemetriSaatSSR,
  dengarTelemetri,
} from "@/lib/bacaTelemetri";
import {
  bacaKunjungan,
  bacaKunjunganSaatSSR,
  dengarKunjungan,
  mulaiBacaKunjungan,
} from "@/lib/bacaKunjungan";
import {
  isiSlot,
  pecahanTinggi,
  rasioAmbang,
  type BuketMenit,
} from "@/lib/buketMenit";
import {
  MIN_TOTAL_MS,
  hopsDari,
  pecahanJejak,
  totalMs,
  type HopId,
} from "@/lib/jejakArsitektur";
import { PEGA } from "@/lib/motion";

const DASH = "—";
const VISIT_KEY = "af-visit-counted";

/** Nama manusia tiap lompatan pada ARCHITECTURE TRACE. Yang boleh disebut di sini hanya
 *  lompatan yang durasinya benar-benar diukur rute /api/telemetry — lihat lib/jejakArsitektur. */
const JEJAK_LABEL: Record<HopId, string> = {
  node: "Next.js / Node di luar probe",
  backend: "Go backend /api/health",
  database: "PostgreSQL ping",
};

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

/** Enam bilah gumpalan per menit, sisi DOM dari angka yang sama dengan bilah instancedMesh
 *  di panggung WebGL. Aturan "tidak ada bentuk tanpa angka" ditegakkan di sini: slot tanpa
 *  laporan tidak menghasilkan elemen apa pun, dan tinggi yang ada hanya boleh datang dari
 *  `pecahanTinggi()` — tidak ada kelas atau angka tinggi yang di-hardcode di file ini,
 *  karena konstanta yang disisipkan satu sisi membuat dua lukisan berhenti cocok. */
const DeretBuketMenit: React.FC<{ buket: BuketMenit[]; kini: string }> = ({ buket, kini }) => (
  <div data-bilah-dom="" className="flex items-end gap-[3px] h-8">
    {isiSlot(buket, kini).map((b, i) => (
      <div key={b?.menit ?? `slot-${i}`} className="flex-1 h-full flex items-end">
        {b ? (
          <div
            data-bilah-menit={i}
            className={`w-full ${
              rasioAmbang(b.p95RerataMs) > 1 ? "bg-[#D41E12]" : "bg-white/60"
            }`}
            style={{ height: `${pecahanTinggi(rasioAmbang(b.p95RerataMs)) * 100}%` }}
            title={`${b.menit} · p95 rerata ${b.p95RerataMs} ms · ${b.laporan} laporan · fps terendah ${b.fpsTerendah}`}
          />
        ) : null}
      </div>
    ))}
  </div>
);

export const TelemetryDrawer: React.FC = () => {
  const { telemetryOpen, setTelemetryOpen, audioMuted } = usePortfolioMode();
  // Panel tidak lagi memanggil /api/telemetry sendiri: satu-satunya pembaca rute itu adalah
  // store lib/bacaTelemetri, yang juga menyuapi bilah 3D di panggung. Jadi bilah DOM di bawah
  // dan bilah instans di kanvas pasti menggambar angka yang sama pada saat yang sama.
  const telemetry = useSyncExternalStore(dengarTelemetri, bacaTelemetri, bacaTelemetriSaatSSR);
  // Kunjungan juga datang dari store, bukan dari polling milik panel: bab penutup membaca
  // objek yang sama, jadi angka di panel dan angka di bab tidak mungkin beda karena dua
  // pihak membaca pada waktu yang berbeda.
  const visits = useSyncExternalStore(dengarKunjungan, bacaKunjungan, bacaKunjunganSaatSSR);
  const globeCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    mulaiBacaKunjungan();
  }, []);

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

  const cuplikLokal = useSyncExternalStore<CuplikanFrame | null>(dengarCuplik, bacaCuplik, () => null);
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
  // Garis waktu arsitektur: hukum dan angkanya sama dengan yang dilukis instancedMesh di
  // panggung, jadi rasio kedua lukisan tidak bisa berpisah (lib/jejakArsitektur).
  const hops = hopsDari(telemetry?.latencyMs, telemetry?.backend?.rttMs);
  const jejakTotal = totalMs(hops);
  const commit = telemetry?.gitCommit ? telemetry.gitCommit.slice(0, 7) : DASH;
  const jam = telemetry?.timestamp ? telemetry.timestamp.slice(11, 19) : DASH;
  // Gumpalan menit dibaca dari bacaan store yang sama; `kini` ikut cap waktu server supaya
  // deret tidak bergeser saat jam pengunjung melenceng.
  const buket = telemetry?.clientFrames?.buket ?? [];
  const slotBuket = telemetry ? isiSlot(buket, telemetry.timestamp) : [];
  // Menit ini biasanya masih kosong (laporan baru mendarat di tengah menit), jadi label yang
  // dipakai adalah slot TERAKHIR YANG BERISI — bukan slot paling kanan.
  const menitTerbaru = [...slotBuket].reverse().find((s) => s !== null) ?? null;

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
            transition={PEGA.laci}
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
                  {/* Ritme frame hasil ukur browser — yang lokal untuk mesin ini, yang
                      dikumpulkan server sebagai bukti angka FPS bisa dikutip dari pengunjung. */}
                  <div className="flex justify-between">
                    <span className="text-white/40">MESIN INI (fps / p95 / dpr):</span>
                    <span>
                      {cuplikLokal
                        ? `${cuplikLokal.fps} / ${cuplikLokal.p95Ms}ms / ${cuplikLokal.dpr}`
                        : DASH}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">PENGUNJUNG (p95 / lambat):</span>
                    <span>
                      {telemetry?.clientFrames
                        ? `${telemetry.clientFrames.p95Ms}ms / ${telemetry.clientFrames.shareLambatPct}%`
                        : DASH}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">LAPORAN / FRAME:</span>
                    <span>
                      {telemetry?.clientFrames
                        ? `${telemetry.clientFrames.laporan} / ${telemetry.clientFrames.frame}`
                        : DASH}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">RESOLUSI TERATAS:</span>
                    <span className="truncate pl-3">
                      {telemetry?.clientFrames?.resolusiTeratas?.length
                        ? telemetry.clientFrames.resolusiTeratas[0].resolusi
                        : DASH}
                    </span>
                  </div>
                  <div className="text-white/30 pt-1 pb-1">
                    Diukur hanya selama tab terlihat; jendela agregat = sejak instance ini
                    hidup{telemetry?.clientFrames ? ` (${telemetry.clientFrames.sejak.slice(0, 16).replace("T", " ")})` : ""}.
                  </div>
                  {/* Satu angka, dua lukisan: baris di bawah dan bilah instancedMesh di panggung
                      WebGL sama-sama mengambil gumpalan menit dari store dan sama-sama memanggil
                      fungsi tinggi di lib/buketMenit. Menit tanpa laporan tidak berbentuk di
                      kedua sisi. */}
                  {telemetry && menitTerbaru ? (
                    <div className="pt-1">
                      <div className="flex justify-between text-white/40">
                        <span>ENAM MENIT TERAKHIR · p95 RERATA:</span>
                        <span>{menitTerbaru.menit}</span>
                      </div>
                      <DeretBuketMenit buket={buket} kini={telemetry.timestamp} />
                    </div>
                  ) : (
                    <div className="flex justify-between pt-1">
                      <span className="text-white/40">ENAM MENIT TERAKHIR · p95 RERATA:</span>
                      <span>{DASH}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-white/40">PROBE HARIAN (WATCH):</span>
                    <span>
                      {telemetry?.watch ? (
                        <a
                          href={telemetry.watch.tautan}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#D41E12] hover:underline"
                          title={`Dibaca dari ${telemetry.watch.jendelaRun} run terakhir di GitHub Actions`}
                        >
                          {telemetry.watch.hijau}/{telemetry.watch.total} hijau · run #
                          {telemetry.watch.terakhir?.nomor ?? "?"}
                          {telemetry.watch.terakhir?.selesaiPada
                            ? ` · ${telemetry.watch.terakhir.selesaiPada.slice(0, 10)}`
                            : ""}
                        </a>
                      ) : (
                        DASH
                      )}
                    </span>
                  </div>
                  <div className="text-white/30 pt-1">
                    {telemetry?.watch
                      ? `Hanya run terjadwal yang sudah selesai dari ${telemetry.watch.jendelaRun} run terakhir di workflow Watch.`
                      : "Belum ada bacaan workflow pada instance ini."}
                  </div>
                </div>
              </div>

              {/* Col 3: Alur request yang diukur rute + status engine audio prosedural */}
              <div className="p-4 rounded-lg border border-white/10 bg-white/[0.01] flex flex-col justify-between">
                <div>
                  <span className="font-mono text-[10px] text-white/50 tracking-wider uppercase flex items-center gap-1.5 mb-2.5">
                    <Server className="w-3 h-3 text-[#D41E12]" /> ARCHITECTURE TRACE
                  </span>
                  
                  {/* Satu baris per lompatan yang durasinya benar-benar diukur rute
                      /api/telemetry. Aturan "tidak ada angka, tidak ada bentuk" ditegakkan di
                      sini: hop tanpa pengukuran tidak dapat kotak maupun bilah, hanya keterangan
                      bahwa memang tidak ada angkanya. */}
                  <div className="space-y-1.5 font-mono text-[9px]">
                    {hops.length === 0 ? (
                      <div className="text-white/35">
                        Belum ada request terukur — tidak ada yang boleh dilukis.
                      </div>
                    ) : (
                      hops.map((h, i) => {
                        const pecahan = pecahanJejak(h.ms, jejakTotal);
                        const angka =
                          h.ms === null
                            ? h.id === "database"
                              ? `durasi tidak diukur · status ${dbLabel}`
                              : "durasi tidak diukur"
                            : `${h.ms}ms`;
                        return (
                          <div
                            key={h.id}
                            data-jejak-hop={h.id}
                            className={
                              h.ms === null
                                ? "p-1.5 text-white/35"
                                : "p-1.5 rounded bg-white/[0.03] border border-white/5 text-white/80"
                            }
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-[#D41E12] font-bold">
                                {String(i + 1).padStart(2, "0")}.
                              </span>
                              <span>
                                {JEJAK_LABEL[h.id]} — {angka}
                              </span>
                            </div>
                            {h.id === "node" && (telemetry?.runtime.next || telemetry?.runtime.node) ? (
                              <div className="pl-5 text-white/35">
                                Next.js {nilai(telemetry?.runtime.next)} / Node{" "}
                                {nilai(telemetry?.runtime.node)}
                              </div>
                            ) : null}
                            {pecahan > 0 ? (
                              <div className="mt-1.5 h-[3px]">
                                <div
                                  data-jejak-bar={h.id}
                                  className="h-full bg-white/60"
                                  style={{ width: `${pecahan * 100}%` }}
                                  title={`${JEJAK_LABEL[h.id]}: ${angka} dari ${jejakTotal} ms total terukur`}
                                />
                              </div>
                            ) : null}
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="mt-1.5 text-white/30 font-mono text-[8px]">
                    {telemetry
                      ? `Panjang bilah = ms terukur ÷ ${Math.max(
                          jejakTotal,
                          MIN_TOTAL_MS
                        )} ms. PostgreSQL hanya menjawab ok/error, jadi tidak pernah punya durasi.`
                      : "Durasi lompatan datang dari GET /api/telemetry yang sama dengan yang dipakai panggung."}
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
