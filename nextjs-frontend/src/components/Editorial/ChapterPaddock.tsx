"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import { ArrowUpRight, Send, CheckCircle2 } from "lucide-react";
import MeshPortal from "./MeshPortal";
import {
  bacaKunjungan,
  bacaKunjunganSaatSSR,
  dengarKunjungan,
  mulaiBacaKunjungan,
} from "@/lib/bacaKunjungan";
import {
  bacaTelemetri,
  bacaTelemetriSaatSSR,
  dengarTelemetri,
  mulaiBacaTelemetri,
} from "@/lib/bacaTelemetri";

const TANDA = "—";

function BarisSampel({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-white/40">{label}</span>
      <span className="text-white/90 tabular-nums">{nilai}</span>
    </div>
  );
}

const SOCIAL_CHANNELS = [
  { name: "GITHUB", url: "https://github.com/ArkanFzi" },
  { name: "LINKEDIN", url: "https://www.linkedin.com/in/muhamad-arkan-fauzi-5a6799380/" },
  { name: "INSTAGRAM", url: "https://instagram.com/arkan_fzi" },
  { name: "WHATSAPP", url: "https://wa.me/6281332314854" },
  { name: "EMAIL", url: "mailto:muhammadarkanfauzi9@gmail.com" },
];

export const ChapterPaddock: React.FC = () => {
  const [dispatchInput, setDispatchInput] = useState("");
  const [dispatchStatus, setDispatchStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  // Dua angka yang boleh dicetak di bab ini datang dari store yang sama dengan panel HUD:
  // tidak ada polling kedua di sini, jadi tidak ada kemungkinan dua tempat menyebut
  // kunjungan yang berbeda hanya karena waktunya beda.
  const kunjungan = useSyncExternalStore(dengarKunjungan, bacaKunjungan, bacaKunjunganSaatSSR);
  const telemetri = useSyncExternalStore(dengarTelemetri, bacaTelemetri, bacaTelemetriSaatSSR);

  useEffect(() => {
    mulaiBacaKunjungan();
    mulaiBacaTelemetri();
  }, []);

  const handleQuickDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchInput.trim()) return;

    // Detect email
    const emailMatch = dispatchInput.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (!emailMatch) {
      setDispatchStatus("error");
      setStatusMessage("ERR: INCLUDE A VALID EMAIL (e.g. you@domain.com — let's build)");
      return;
    }

    const email = emailMatch[0];
    // Isi pesan dikirim apa adanya. Di tempat ini pernah ada checkbox "encrypt" yang
    // membungkus teks dengan header pesan tersandi palsu lalu menempelkan btoa() di
    // dalamnya: base64 bukan enkripsi, pustaka kuncinya tidak pernah jadi dependensi,
    // dan /api/contact menerima body ini sebagai plaintext. Jangan memasang klaim itu
    // kembali sebelum ada kunci dan enkripsi sungguhan di kedua ujung.
    const message = dispatchInput.replace(email, "").replace(/^[\s—\-:]+/, "").trim() || "Interested in collaborating.";

    setDispatchStatus("loading");
    setStatusMessage("TRANSMITTING TELEMETRY DISPATCH...");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Direct Dispatch Visitor",
          email,
          subject: "Editorial Telemetry Dispatch",
          body: message,
        }),
      });

      if (res.ok) {
        setDispatchStatus("success");
        setStatusMessage("TRANSMISSION CONFIRMED // LOGGED TO SYSTEM INBOX");
        setDispatchInput("");
      } else {
        const data = await res.json().catch(() => null);
        setDispatchStatus("error");
        setStatusMessage(data?.error || "DISPATCH FAILED // RETRY IN A MOMENT");
      }
    } catch {
      setDispatchStatus("error");
      setStatusMessage("SERVER UNREACHABLE // USE DIRECT MAILTO BELOW");
    }
  };

  return (
    <section
      id="chapter-04"
      /* Rosso tidak lagi dilukis di sini: latar section selalu melukis di atas kanvas
         (main z-10 menyusul DOM setelah kanvas z-10) sehingga kartu potret tertutup.
         Warnanya sekarang di LatarPaddock, satu lapis di bawah kanvas. */
      className="relative w-full min-h-screen text-[#F7F5F0] pt-[calc(var(--hud-atas,196px)+2rem)] pb-48 md:pb-56 px-6 md:px-12 select-none overflow-hidden flex flex-col justify-between"
    >
      {/* Kartu mundur jauh di bab penutup: `z` tempat ia berhenti, `pas` kedalaman saat
          ia masih mengisi portal — selisih keduanya yang membuat ia mengecil. */}
      <MeshPortal
        bab={4}
        className="left-1/2 top-[28vh] h-[60vh] w-[23vw] -translate-x-1/2"
        z={-2.5}
        pas={-0.4}
        miring={-0.18}
        geyang={0.1}
        rotGeyang={0.06}
        pita={0.16}
      />
      <div className="w-full max-w-[1600px] mx-auto z-20">
        
        {/* ── Top Header Tags ── */}
        <div className="w-full flex items-center justify-between pb-6 border-b border-white/20 mb-12 sm:mb-16">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="font-mono text-[11px] font-bold tracking-[0.25em] uppercase text-white">
              CHAPTER 04 // THE PADDOCK & FINALE
            </span>
          </div>

          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-white/70">
            DIRECT TRANSMISSION // PIT-TO-CAR LINK
          </span>
        </div>

        {/* ── GIANT FULL-WIDTH DISPLAY MAGNETIC CTA ── */}
        <div className="py-6 sm:py-10">
          <span className="font-mono text-[10px] sm:text-xs tracking-[0.3em] uppercase text-white/70 block mb-4">
            NEXT STEPS // OPEN FOR COLLABORATION
          </span>

          <a
            href="mailto:muhammadarkanfauzi9@gmail.com"
            className="group block"
            data-magnetic
          >
            <h2
              className="font-serif text-[clamp(44px,8vw,130px)] font-bold tracking-tighter uppercase leading-[0.88] text-white group-hover:text-[#0A0A0A] transition-colors duration-500"
              data-paralaks="-0.7"
              style={{ translate: "var(--tipografi-x, 0px) var(--tipografi-y, 0px)" }}
            >
              LET&apos;S BUILD THE
              <br />
              <span className="inline-flex items-center gap-4 sm:gap-8">
                EXTRAORDINARY
                <ArrowUpRight className="inline-block w-[clamp(40px,7.5vw,120px)] h-[clamp(40px,7.5vw,120px)] transition-transform duration-500 group-hover:translate-x-4 group-hover:-translate-y-4" />
              </span>
            </h2>
          </a>
        </div>

        {/* ── HIGH-CRAFT SINGLE-LINE MICRO-DISPATCH CONSOLE (GO BACKEND CONNECTED) ── */}
        <div className="max-w-2xl w-full my-6 pt-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
            <span className="font-mono text-[9px] tracking-[0.22em] uppercase text-white/80">
              PIT-TO-CAR COMMAND DISPATCH // POST /api/contact → contact_messages
            </span>
          </div>

          <form
            onSubmit={handleQuickDispatch}
            className="relative flex items-center border-b border-white/40 focus-within:border-white transition-colors duration-300 pb-1"
          >
            <span className="font-mono text-xs text-white/60 mr-2">&gt;</span>
            <input
              type="text"
              value={dispatchInput}
              onChange={(e) => setDispatchInput(e.target.value)}
              placeholder="you@company.com — let's build something spatial"
              className="w-full bg-transparent py-2 font-mono text-xs text-white placeholder-white/40 focus:outline-none"
              disabled={dispatchStatus === "loading"}
            />
            <button
              type="submit"
              disabled={dispatchStatus === "loading" || !dispatchInput.trim()}
              className="inline-flex items-center gap-1.5 font-mono text-[9px] font-bold tracking-[0.2em] uppercase text-white hover:text-[#0A0A0A] shrink-0 px-3 py-1 cursor-pointer transition-colors disabled:opacity-40"
              data-magnetic
            >
              <span>{dispatchStatus === "loading" ? "TRANSMITTING" : "DISPATCH"}</span>
              <Send className="w-2.5 h-2.5" />
            </button>
          </form>

          {/* Catatan laju pengiriman — tidak ada klaim enkripsi di sini. */}
          <div className="flex items-center justify-end mt-2.5 font-mono text-[9px] text-white/70">
            <span className="text-white/40">RATE LIMIT: 10 BERUNTAS · 1 PEMULIHAN/MENIT · PER PROSES</span>
          </div>

          {statusMessage && (
            <div className="flex items-center gap-1.5 mt-2">
              {dispatchStatus === "success" && <CheckCircle2 className="w-3 h-3 text-white" />}
              <span className={`font-mono text-[9px] tracking-[0.16em] uppercase ${
                dispatchStatus === "error" ? "text-white underline" : "text-white/90"
              }`}>
                {statusMessage}
              </span>
            </div>
          )}

          {/* Sampel nyata, bukan daftar pesan yang dikarang: yang terukur dicetak, yang
              tidak terukur tercetak "—". Nomor pesan masuk tidak pernah ditampilkan ke
              publik karena inbox-nya ada di balik autentikasi admin. */}
          <div
            data-bab04-sampel
            className="mt-4 p-2.5 rounded bg-black/20 border border-white/10 font-mono text-[9px] text-white/80 space-y-1"
          >
            <div className="flex items-center justify-between text-white/50 text-[8px] uppercase">
              <span>DISPATCH SAMPLING</span>
              {kunjungan ? (
                <span className="text-emerald-300">● SAMPLING</span>
              ) : (
                <span className="text-white/40">{TANDA} TIDAK TERBACA</span>
              )}
            </div>
            <BarisSampel
              label="TOTAL KUNJUNGAN"
              nilai={kunjungan ? String(kunjungan.total) : TANDA}
            />
            <BarisSampel label="HARI INI" nilai={kunjungan ? String(kunjungan.today) : TANDA} />
            <BarisSampel
              label="PENGINAP UNIK 24 JAM"
              nilai={kunjungan ? String(kunjungan.uniqueLast24h) : TANDA}
            />
            <BarisSampel
              label="KOMIT YANG MELAYANI"
              nilai={telemetri?.gitCommit ? `#${telemetri.gitCommit.slice(0, 7)}` : TANDA}
            />
            {!kunjungan && (
              <div className="text-white/40">GET /api/visits tidak menjawab — nol bukan angka cadangan.</div>
            )}
          </div>
        </div>

      </div>

      {/* ── MINIMALIST SOCIAL LINKS & SIGNATURE STRIP ── */}
      <div className="w-full max-w-[1600px] mx-auto z-20 pt-8 mb-8 border-t border-white/20 flex flex-col sm:flex-row items-center justify-between gap-6">
        
        {/* Left: Copyright */}
        <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
          <span className="font-serif text-lg font-bold text-white tracking-tight">
            M. Arkan Fauzi.
          </span>
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-white/60">
            © {new Date().getFullYear()} ALL RIGHTS RESERVED // CAR #16
          </span>
        </div>

        {/* Right: Minimalist Social Channels & Admin Portal Link */}
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <nav className="flex flex-wrap items-center justify-center gap-6 sm:gap-8" aria-label="Social Links">
            {SOCIAL_CHANNELS.map((ch) => (
              <a
                key={ch.name}
                href={ch.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[10px] font-bold tracking-[0.2em] uppercase text-white hover:text-[#0A0A0A] transition-colors"
                data-magnetic
              >
                {ch.name}
              </a>
            ))}
          </nav>

          <a
            href="/admin"
            className="px-2.5 py-1 rounded border border-white/20 hover:border-white text-[9px] font-mono tracking-widest text-white/70 hover:text-white uppercase transition-colors"
            title="Manage Certificates, Experiences, and Journey in PostgreSQL"
          >
            ADMIN [CRUD]
          </a>
        </div>

      </div>

      {/* Kredit model: geometri dan tekstur SF-26 di canvas bukan buatan sendiri, dan
          lisensinya (CC-BY-4.0) MENUNTUN nama penulis disebut di halaman yang sama
          dengan karyanya, bukan hanya di berkas. Teks sr-only mengulang atribusi yang
          sama supaya pembaca layar tidak menerima klaim "CAR #16" tanpa sumber. */}
      <p className="w-full max-w-[1600px] mx-auto z-20 mb-6 font-mono text-[9px] tracking-[0.18em] uppercase text-white/40">
        3D model:{" "}
        <a
          href="https://sketchfab.com/3d-models/2026-ferrari-sf-26-e5ca6cecdc42449283f4bed27360f2a7"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/70 hover:text-white underline decoration-white/30 underline-offset-2"
        >
          2026 Ferrari SF-26
        </a>{" "}
        by{" "}
        <a
          href="https://sketchfab.com/Tyler_Dave"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/70 hover:text-white underline decoration-white/30 underline-offset-2"
        >
          Dave Love
        </a>{" "}
        —{" "}
        <a
          href="http://creativecommons.org/licenses/by/4.0/"
          target="_blank"
          rel="license noopener noreferrer"
          className="text-white/70 hover:text-white underline decoration-white/30 underline-offset-2"
        >
          CC-BY-4.0
        </a>
        <span className="sr-only">
          {" "}
          Model mobil balap pada halaman ini adalah karya Dave Love berjudul 2026
          Ferrari SF-26, dipakai ulang dengan lisensi Creative Commons Attribution 4.0.
          Nama dan identitas Ferrari bukan bagian dari lisensi tersebut.
        </span>
      </p>
    </section>
  );
};

export default ChapterPaddock;
