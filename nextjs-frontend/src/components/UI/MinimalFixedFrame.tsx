"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePortfolioMode } from "@/context/PortfolioModeContext";
import { useBabAktif } from "@/components/SmoothScrollProvider";
import KontrolPutaran from "@/components/UI/KontrolPutaran";
import { ArrowUpRight, Cpu, Sparkles, FileText, Activity, Volume2, VolumeX, Terminal, Layers } from "lucide-react";

interface FrameProps {
  onChapterClick: (ch: number) => void;
}

const CHAPTER_LABELS = [
  "THE PROLOGUE",
  "THE DUALITY & CREDENTIALS",
  "SELECTED ARCHIVES",
  "THE PADDOCK & DISPATCH",
];

// Panggung kedua: lima rute rincian yang berdiri sendiri. Namanya ikut bahasa rute
// (waktu, sangkar, meja, peta, iris) supaya pil dan URL mengatakan hal yang sama.
const PANGGUNG_KEDUA = [
  { href: "/waktu", label: "WAKTU" },
  { href: "/sangkar", label: "SANGKAR" },
  { href: "/meja", label: "MEJA" },
  { href: "/peta", label: "PETA" },
  { href: "/iris", label: "IRIS" },
];

export const MinimalFixedFrame: React.FC<FrameProps> = ({ onChapterClick }) => {
  const currentChapter = useBabAktif();
  const {
    mode,
    setMode,
    wireframe,
    toggleWireframe,
    telemetryOpen,
    setTelemetryOpen,
    terminalOpen,
    setTerminalOpen,
    audioMuted,
    toggleAudio,
  } = usePortfolioMode();
  // Yang dibaca di sini hanya "apakah /api/telemetry menjawab" — angkanya tampil di
  // drawer, bukan di pil, supaya pil tidak melebar menutupi isi halaman.
  const [telemetryHidup, setTelemetryHidup] = useState(false);

  // Tinggi kolom kiri-atas tidak tetap: kolom ini menampung monogram, daftar jalan masuk,
  // dan pil — yang bertambah tiap kali jalan masuk baru dipasang. Bab penutup dulu mengeras
  // padding atasnya (pt-32), dan begitu kolom melebar teks pertama bab tertutup HUD. Jadi
  // kolom mengukur dirinya lewat ResizeObserver dan menerbitkan batas bawahnya sebagai
  // --hud-atas di <html>; yang membacanya cukup menulis pt-[calc(var(--hud-atas)+2rem)].
  // Variabel di <header> tidak akan sampai: section bab adalah tetangga header, bukan
  // keturunannya, dan properti kustom hanya mewarisi ke bawah. Angka datanya ikut ditulis
  // sebagai data-hud-atas supaya verifier bisa membacanya tanpa menghitung ulang.
  const akarRef = useRef<HTMLElement>(null);
  const kolomRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const akar = akarRef.current;
    const kolom = kolomRef.current;
    const bar = barRef.current;
    if (!akar || !kolom || !bar) return;
    const terbitkan = () => {
      const bawah = Math.round(kolom.getBoundingClientRect().bottom);
      // Pita bawah diukur dari puncaknya ke tepi bawah viewport: yang dibutuhkan bab adalah
      // tebal pita, bukan posisi bar, supaya angka itu tetap benar saat tinggi layar berubah.
      const atas = Math.round(innerHeight - bar.getBoundingClientRect().top);
      document.documentElement.style.setProperty("--hud-atas", `${bawah}px`);
      document.documentElement.style.setProperty("--hud-bawah", `${atas}px`);
      akar.setAttribute("data-hud-atas", String(bawah));
      akar.setAttribute("data-hud-bawah", String(atas));
    };
    terbitkan();
    const pengamat = new ResizeObserver(terbitkan);
    pengamat.observe(kolom);
    pengamat.observe(bar);
    // Tinggi viewport tidak mengubah ukuran kedua elemen itu sendiri, jadi ResizeObserver
    // saja tidak cukup: pita bawah dihitung dari innerHeight.
    window.addEventListener("resize", terbitkan);
    return () => {
      pengamat.disconnect();
      window.removeEventListener("resize", terbitkan);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const periksa = async () => {
      try {
        const res = await fetch("/api/telemetry");
        if (isMounted) setTelemetryHidup(res.ok);
      } catch {
        if (isMounted) setTelemetryHidup(false);
      }
    };
    periksa();
    const interval = setInterval(periksa, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const isDarkSection = currentChapter >= 3;
  const isRossoSection = currentChapter === 4;

  const textColor = isRossoSection
    ? "text-white"
    : isDarkSection
    ? "text-[#F7F5F0]"
    : "text-[#0A0A0A]";

  const subColor = isRossoSection
    ? "text-white/80"
    : isDarkSection
    ? "text-[#6E6A64]"
    : "text-[#6E6A64]";

  const borderColor = isRossoSection
    ? "border-white/30"
    : isDarkSection
    ? "border-white/10"
    : "border-[rgba(10,10,10,0.08)]";

  const activePillBg = isRossoSection
    ? "bg-white text-[#D41E12] shadow-[0_0_14px_rgba(255,255,255,0.4)]"
    : "bg-[#D41E12] text-white shadow-[0_0_12px_rgba(212,30,18,0.4)]";

  // Bab 03 punya gutter kertas di kanan: pil HUD harus terbaca di atas kertas maupun
  // di atas papan gelap daftar, jadi chip-nya ikut gelap, bukan transparan.
  const atasKertas = isDarkSection && !isRossoSection;

  // Warna pita legibilitas = warna latar section yang sedang aktif, jadi lapisan ini
  // membaca sebagai kabur kertas/gelap/rosso yang sama, bukan sebagai panel baru.
  const warnaPita = isRossoSection ? "#D41E12" : isDarkSection ? "#0A0A0A" : "#F7F5F0";
  const chipBg = atasKertas
    ? "bg-[#0A0A0A] hover:bg-[#1A1A1A] hover:border-[#D41E12]"
    : "bg-white/5 hover:border-[#D41E12]";
  const chipPlate = atasKertas ? "bg-[#0A0A0A] px-2 py-1 rounded-md" : "";

  const accentColor = isRossoSection ? "text-white" : "text-[#D41E12]";

  return (
    <header ref={akarRef} className="fixed inset-0 pointer-events-none z-50 p-6 md:p-10 flex flex-col justify-between">
      {/* ── PITA LEGIBILITAS ──
          HUD adalah lapisan di atas konten yang berjalan, jadi teks bab suatu saat akan
          lewat di bawahnya — terukur di 1100x620 dan 1536x840, saat bab diparkir mapun di
          ujung halaman. Yang tidak boleh terjadi adalah dua tinta bertumpuk. Kedua pita ini
          melukis ulang warna section di bawah setinggi kolom HUD yang diukur barusan, lalu
          memudarnya ke transparan, sehingga huruf bab tenggelam sebelum menyentuh instrumen.
          pointer-events-none: pita tidak pernah ikut menahan hit-test tautan atau pil.
          z-index -1: di dalam header, anak yang diposisikan bebas melukis DI ATAS konten
          yang mengalir, jadi tanpa angka ini pita justru menutupi monogram dan pilnya
          sendiri — terukur pada 1100x620, kolom HUD hilang dari layar. */}
      <div
        aria-hidden="true"
        data-hud-pita=""
        className="pointer-events-none absolute inset-x-0 top-0 -z-[1] h-[calc(var(--hud-atas,160px)+3rem)]"
        style={{
          background: `linear-gradient(to bottom, ${warnaPita} 0 var(--hud-atas, 160px), ${warnaPita}00 100%)`,
        }}
      />
      <div
        aria-hidden="true"
        data-hud-pita-bawah=""
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-[1] h-[calc(var(--hud-bawah,96px)+3rem)]"
        style={{
          background: `linear-gradient(to top, ${warnaPita} 0 var(--hud-bawah, 96px), ${warnaPita}00 100%)`,
        }}
      />

      {/* ── TOP BAR ── */}
      <div className="w-full flex items-center justify-between pointer-events-auto">
        
        {/* Top-Left: Minimal Monogram AF + jalan masuk dua lorong rincian.
            Kedua tautan ditumpuk VERTIKAL di bawah monogram, bukan di bar bawah: bar itu
            pernah menelan sasaran interaktif halaman (catatan di bagian bawah file ini), dan
            kolom kiri tidak menggeser pil mana pun secara horizontal. */}
        <div ref={kolomRef} data-hud-kolom="" className="flex flex-col gap-1.5">
          <button
            onClick={() => onChapterClick(1)}
            className="group flex items-center gap-3 cursor-pointer text-left"
            data-magnetic
          >
            <div className="flex flex-col">
              <span
                className={`font-serif text-xl font-bold tracking-tight ${textColor} ${
                  isRossoSection ? "group-hover:text-black" : "group-hover:text-[#D41E12]"
                } transition-colors`}
              >
                AF<span className={`${accentColor} font-mono text-sm ml-0.5`}>#16</span>
              </span>
              <span className={`font-mono text-[9px] tracking-[0.24em] uppercase ${subColor}`}>
                M. ARKAN FAUZI
              </span>
            </div>
          </button>

          <nav className="flex items-center gap-2" aria-label="Detail pages">
            <Link
              href="/baca"
              className={`font-mono text-[9px] tracking-[0.2em] uppercase ${subColor} opacity-60 hover:opacity-100 transition-opacity`}
            >
              CODE INDEX
            </Link>
            <span className={`h-2.5 w-[1px] ${isRossoSection ? "bg-white/40" : "bg-[#D41E12]/40"}`} aria-hidden="true" />
            <Link
              href="/arsip"
              className={`font-mono text-[9px] tracking-[0.2em] uppercase ${subColor} opacity-60 hover:opacity-100 transition-opacity`}
            >
              PIT WALL
            </Link>
          </nav>

          {/* Lima pil panggung kedua. Sengaja di kolom kiri yang sama dan memflex-wrap
              dalam max-w-[26ch]: kolom inilah yang sudah lama menerbitkan --hud-atas,
              jadi bab yang membaca variabel itu ikut menyesuaikan tanpa satu angka pun
              ditulis ulang di bab-nya. Bar bawah tidak disentuh — ia pernah menelan
              sasaran interaktif (catatan di pita bawah file ini). */}
          <nav
            className="flex flex-wrap items-center gap-1.5 max-w-[26ch]"
            aria-label="Second stage"
          >
            {PANGGUNG_KEDUA.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`font-mono text-[9px] tracking-[0.2em] uppercase px-2 py-1 rounded-full border ${borderColor} ${subColor} opacity-60 hover:opacity-100 hover:border-[#D41E12] transition-all`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Top-Center: Minimal Dual-Persona Switcher */}
        <div className={`flex items-center p-1 rounded-full border ${borderColor} backdrop-blur-md ${
          isRossoSection ? "bg-black/20" : "bg-white/5"
        }`}>
          <button
            onClick={() => setMode("engineer")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-[0.16em] uppercase transition-all duration-300 cursor-pointer ${
              mode === "engineer"
                ? activePillBg
                : `${subColor} hover:${textColor}`
            }`}
            data-magnetic
          >
            <Cpu className="w-3 h-3" />
            <span>THE ENGINEER</span>
          </button>

          <button
            onClick={() => setMode("creator")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-[0.16em] uppercase transition-all duration-300 cursor-pointer ${
              mode === "creator"
                ? activePillBg
                : `${subColor} hover:${textColor}`
            }`}
            data-magnetic
          >
            <Sparkles className="w-3 h-3" />
            <span>THE CREATOR</span>
          </button>
        </div>

        {/* Top-Right: Action Group (Controls, Curated Dossier PDF + Initiate Contact) */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Padanan keyboard untuk seret-putar kartu: kontrolnya di DOM, sudutnya di
              modul yang sama dengan gesture pointer. */}
          <KontrolPutaran borderColor={borderColor} textColor={textColor} chipBg={chipBg} />

          {/* Shell / CLI Modal Trigger (Cmd+K) */}
          <button
            onClick={() => setTerminalOpen(!terminalOpen)}
            className={`hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-full border ${borderColor} backdrop-blur-md ${
              terminalOpen ? activePillBg : isRossoSection ? "bg-black/20 text-white" : chipBg
            } transition-all duration-300 cursor-pointer text-[9px] font-mono tracking-wider`}
            data-magnetic
            title="Open Interactive Engineer CLI (Press Cmd+K or ~)"
          >
            <Terminal className="w-3 h-3 text-[#D41E12]" />
            <span className={textColor}>CLI</span>
            <kbd className="px-1 py-0.2 bg-black/20 rounded text-[8px] text-[#6E6A64]">⌘K</kbd>
          </button>

          {/* 3D Wireframe / Shader Inspector Toggle */}
          <button
            onClick={toggleWireframe}
            className={`hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-full border ${borderColor} backdrop-blur-md ${
              wireframe ? activePillBg : isRossoSection ? "bg-black/20 text-white" : chipBg
            } transition-all duration-300 cursor-pointer text-[9px] font-mono tracking-wider`}
            data-magnetic
            title="Toggle 3D Monolith GPU Wireframe Overlay"
          >
            <Layers className="w-3 h-3 text-[#D41E12]" />
            <span className={textColor}>{wireframe ? "MESH: WIRE" : "MESH: SOLID"}</span>
          </button>

          {/* Procedural Web Audio Engine Toggle */}
          <button
            onClick={toggleAudio}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full border ${borderColor} backdrop-blur-md ${
              !audioMuted ? activePillBg : isRossoSection ? "bg-black/20 text-white" : chipBg
            } transition-all duration-300 cursor-pointer text-[9px] font-mono tracking-wider`}
            data-magnetic
            title={audioMuted ? "Activate Procedural F1 Web Audio Synthesizer" : "Mute Audio Engine"}
          >
            {!audioMuted ? (
              <Volume2 className="w-3 h-3 text-[#D41E12] animate-pulse" />
            ) : (
              <VolumeX className="w-3 h-3 text-[#6E6A64]" />
            )}
            <span className={textColor}>{!audioMuted ? "SFX: ON" : "SFX: OFF"}</span>
          </button>

          {/* Dossier PDF Trigger via /api/cv */}
          <a
            href="/api/cv"
            target="_blank"
            rel="noopener noreferrer"
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${borderColor} backdrop-blur-md ${
              isRossoSection
                ? "bg-black/20 hover:bg-white hover:text-[#D41E12]"
                : chipBg
            } transition-all duration-300 cursor-pointer group`}
            data-magnetic
            title="Download Headless Chromium Generated Dossier PDF"
          >
            <FileText className={`w-3 h-3 ${accentColor} group-hover:scale-110 transition-transform`} />
            <span className={`font-mono text-[9px] font-bold tracking-[0.18em] uppercase ${textColor} ${
              isRossoSection ? "group-hover:text-[#D41E12]" : "group-hover:text-[#D41E12]"
            } transition-colors`}>
              DOSSIER [PDF]
            </span>
          </a>

          {/* Magnetic Button "INITIATE CONTACT" */}
          <button
            onClick={() => onChapterClick(4)}
            className={`group flex items-center gap-2 px-3.5 py-1.5 rounded-full border ${borderColor} backdrop-blur-md ${
              isRossoSection
                ? "bg-black/20 hover:bg-white hover:text-[#D41E12]"
                : chipBg
            } transition-all duration-300 cursor-pointer`}
            data-magnetic
          >
            <span className={`font-mono text-[10px] font-bold tracking-[0.2em] uppercase ${textColor} ${
              isRossoSection ? "group-hover:text-[#D41E12]" : "group-hover:text-[#D41E12]"
            } transition-colors`}>
              CONTACT
            </span>
            <ArrowUpRight className={`w-3.5 h-3.5 ${accentColor} group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform`} />
          </button>
        </div>
      </div>

      {/* ── BOTTOM BAR ──
          Pita ini tidak lagi `justify-between`: slot tengah menempatkan pil tepat di
          atas kolom konten, dan setiap sasaran interaktif yang lewat di sana ikut
          tertelan (terukur sampai 2.237px² pada tombol SPEC baris arsip). Pil sekarang
          menempel di belakang indeks bab, koordinat didorong ke tepi kanan lewat ml-auto. */}
      <div ref={barRef} className="w-full flex items-end gap-5 pointer-events-auto">
        
        {/* Bottom-Left: Chapter Index — all four chapters reachable */}
        <nav className="flex items-center gap-2.5" aria-label="Chapter index">
          {CHAPTER_LABELS.map((label, i) => {
            const ch = i + 1;
            const isActive = currentChapter === ch;
            return (
              <button
                key={label}
                onClick={() => onChapterClick(ch)}
                aria-current={isActive ? "true" : undefined}
                title={label}
                className={`font-mono text-[10px] tracking-[0.16em] uppercase transition-opacity cursor-pointer ${
                  isActive ? `${accentColor} font-bold` : `${subColor} opacity-50 hover:opacity-100`
                }`}
              >
                CH.0{ch}
              </button>
            );
          })}
          <div className={`h-3 w-[1px] ${isRossoSection ? "bg-white/40" : "bg-[#D41E12]/40"}`} />
          {/* Nama bab panjangnya 178px dan mendorong pil HUD ke tengah kolom konten,
              jadi di layar sempit ia dipensiunkan dulu: CH.04 yang aktif sudah
              menyebutkan hal yang sama. */}
          <span className={`font-mono text-[10px] uppercase tracking-[0.2em] ${subColor} hidden xl:inline`}>
            {CHAPTER_LABELS[currentChapter - 1]}
          </span>
        </nav>

        {/* Pemicu Pit-Wall Telemetry HUD. Dulu pil ini memanjang sampai 831px dan
            mengulang angka yang sama dengan isi drawer; sekarang hanya status
            sambungan dan jalan masuknya. */}
        <button
          onClick={() => setTelemetryOpen(!telemetryOpen)}
          aria-expanded={telemetryOpen}
          aria-label="Pit-Wall Telemetry HUD"
          className={`hidden lg:flex items-center gap-2 px-3 py-1 rounded-full border ${
            telemetryOpen
              ? activePillBg
              : isRossoSection
              ? "border-white/20 bg-black/20 hover:border-white"
              : chipBg
          } backdrop-blur-md transition-all duration-300 cursor-pointer`}
          data-magnetic
          title="Open the Pit-Wall Telemetry HUD"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              telemetryHidup ? "bg-[#D41E12] animate-pulse" : "bg-current opacity-30"
            }`}
            aria-hidden="true"
          />
          <Activity className={`w-3 h-3 ${accentColor}`} />
          <span className={`font-mono text-[9px] tracking-[0.18em] uppercase ${subColor}`}>
            <span className={`${accentColor} font-bold`}>
              {mode === "engineer" ? "TELEMETRY" : "SPATIAL CRAFT"}
            </span>{" "}
            [HUD ⇡]
          </span>
        </button>

        {/* Bottom-Right: Geographic & Telemetry Metadata */}
        <div className={`ml-auto hidden sm:flex flex-col items-end ${chipPlate}`}>
          <span className={`font-mono text-[9px] tracking-[0.2em] uppercase ${subColor}`}>
            COORDINATES // MALANG, ID
          </span>
          <span className={`font-mono text-[9px] tracking-[0.15em] ${textColor}`}>
            43°44&apos;05&quot;N 7°25&apos;14&quot;E • CAR #16
          </span>
        </div>

      </div>
    </header>
  );
};

export default MinimalFixedFrame;
