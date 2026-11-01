"use client";

import React, { useState } from "react";
import { ArrowUpRight, Send, Radio, CheckCircle2 } from "lucide-react";
import { readApiError } from "@/lib/apiError";

const SOCIAL_CHANNELS = [
  { name: "GITHUB", url: "https://github.com/ArkanFzi" },
  { name: "LINKEDIN", url: "https://www.linkedin.com/in/muhamad-arkan-fauzi-5a6799380/" },
  { name: "EMAIL", url: "mailto:muhammadarkanfauzi9@gmail.com" },
  { name: "WHATSAPP", url: "https://wa.me/6281332314854" },
];

export const ChapterPaddock: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);

    const payload = {
      name,
      email,
      subject: `Editorial Portfolio Dispatch: ${name}`,
      body: message,
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error((await readApiError(res)) ?? "Transmission failed.");
      }

      setStatusMessage("TRANSMISSION SUCCESSFUL // PIT-WALL RECEIVED");
      setName("");
      setEmail("");
      setMessage("");
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "TRANSMISSION ERROR");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      id="chapter-04"
      className="relative w-full min-h-screen bg-[#D41E12] text-[#F7F5F0] pt-36 pb-24 px-6 md:px-12 select-none overflow-hidden transition-colors duration-700 flex flex-col justify-between"
    >
      <div className="w-full max-w-[1600px] mx-auto z-10">
        
        {/* ── Top Header Tags ── */}
        <div className="w-full flex items-center justify-between pb-6 border-b border-white/20 mb-16">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="font-mono text-[11px] font-bold tracking-[0.25em] uppercase text-white">
              CHAPTER 04 // THE PADDOCK & DISPATCH
            </span>
          </div>

          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-white/70">
            INITIATE COLLABORATION // PIT-TO-CAR LINK
          </span>
        </div>

        {/* ── GIANT MAGNETIC CALL TO ACTION ── */}
        <div className="my-8 md:my-16">
          <span className="font-mono text-[10px] md:text-xs tracking-[0.3em] uppercase text-white/70 block mb-3">
            NEXT STEPS // READY FOR TAKEOFF
          </span>

          <a
            href="mailto:muhammadarkanfauzi9@gmail.com"
            className="group block"
            data-magnetic
          >
            <h2 className="font-serif text-[clamp(44px,8.5vw,135px)] font-bold tracking-tight uppercase leading-[0.92] text-white group-hover:text-[#0A0A0A] transition-colors duration-500">
              LET&apos;S BUILD THE
              <br />
              <span className="inline-flex items-center gap-4">
                EXTRAORDINARY
                <ArrowUpRight className="inline-block w-[clamp(40px,7vw,110px)] h-[clamp(40px,7vw,110px)] transition-transform duration-500 group-hover:translate-x-3 group-hover:-translate-y-3" />
              </span>
            </h2>
          </a>
        </div>

        {/* ── Conversational Pit-Wall Dispatch Form ── */}
        <div className="mt-12 pt-12 border-t border-white/20 max-w-3xl">
          <div className="flex items-center gap-2 mb-6 font-mono text-[10px] tracking-[0.25em] uppercase text-white/80">
            <Radio className="w-3.5 h-3.5 text-white animate-pulse" />
            <span>DIRECT PIT-WALL TRANSMITTER</span>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/60 block mb-1">
                  CALLSIGN // NAME
                </label>
                <input
                  type="text"
                  required
                  maxLength={200}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Charles Leclerc"
                  className="w-full bg-black/20 border-b border-white/40 focus:border-white focus:outline-none py-2 text-white font-mono text-sm placeholder:text-white/30"
                />
              </div>

              <div>
                <label className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/60 block mb-1">
                  COMM CHANNEL // EMAIL
                </label>
                <input
                  type="email"
                  required
                  maxLength={320}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="charles@ferrari.com"
                  className="w-full bg-black/20 border-b border-white/40 focus:border-white focus:outline-none py-2 text-white font-mono text-sm placeholder:text-white/30"
                />
              </div>
            </div>

            <div>
              <label className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/60 block mb-1">
                TRANSMISSION BRIEF // PROJECT SCOPE
              </label>
              <textarea
                required
                rows={2}
                maxLength={20000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enterprise microservices, spatial 3D experience, or Formula 1 telemetry..."
                className="w-full bg-black/20 border-b border-white/40 focus:border-white focus:outline-none py-2 text-white font-mono text-sm placeholder:text-white/30 resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="group flex items-center gap-3 px-6 py-3 rounded-full bg-white text-[#D41E12] font-mono text-xs font-bold tracking-[0.2em] uppercase hover:bg-[#0A0A0A] hover:text-white transition-all duration-300 cursor-pointer disabled:opacity-50"
                data-magnetic
              >
                <span>{isSubmitting ? "TRANSMITTING..." : "TRANSMIT DISPATCH"}</span>
                <Send className="w-3.5 h-3.5" />
              </button>

              {statusMessage && (
                <span className="font-mono text-[10px] tracking-wider text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {statusMessage}
                </span>
              )}
            </div>
          </form>
        </div>

      </div>

      {/* ── FOOTER SIGNATURE & CHANNELS ── */}
      <div className="w-full max-w-[1600px] mx-auto z-10 pt-16 mt-16 border-t border-white/20 flex flex-col sm:flex-row items-center justify-between gap-6">
        
        {/* Left: Copyright */}
        <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
          <span className="font-serif text-lg font-bold text-white tracking-tight">
            M. Arkan Fauzi.
          </span>
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-white/60">
            © {new Date().getFullYear()} ALL RIGHTS RESERVED // CAR #16
          </span>
        </div>

        {/* Right: Minimalist Social Channels */}
        <nav className="flex flex-wrap items-center justify-center gap-6" aria-label="Social Links">
          {SOCIAL_CHANNELS.map((ch) => (
            <a
              key={ch.name}
              href={ch.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] tracking-[0.2em] uppercase text-white hover:text-[#0A0A0A] transition-colors"
              data-magnetic
            >
              {ch.name}
            </a>
          ))}
        </nav>

      </div>
    </section>
  );
};

export default ChapterPaddock;
