import type { Metadata } from "next";
import Link from "next/link";
import ArsipHidup from "./ArsipHidup";

// Semua angka di halaman ini datang dari satu sumber: GET /api/telemetry pada proses Node yang
// menjawab request itu. Halaman ini tidak menambah polling sendiri (lihat ArsipHidup), dan tidak
// punya angka hiasan: yang tidak terukur tercetak "—".
export const metadata: Metadata = {
  title: "THE PIT WALL — live process telemetry // M. Arkan Fauzi",
  description:
    "Every number the front-page HUD paints, printed with its measuring rule: handler duration, backend probe, browser frame rhythm, runtime, and the scope each figure is valid for.",
  alternates: { canonical: "/arsip" },
  openGraph: {
    url: "/arsip",
    siteName: "M. Arkan Fauzi",
    type: "website",
    title: "THE PIT WALL — live process telemetry // M. Arkan Fauzi",
    description:
      "Server round trip, architecture trace and browser frame rhythm, read from the same telemetry store the WebGL HUD uses, with the measuring rule stated next to each figure.",
  },
};

function Aturan({ judul, isi }: { judul: string; isi: string }) {
  return (
    <div className="flex flex-col gap-1.5 pt-4 swiss-border-b">
      <span className="font-mono text-tag tracking-[0.2em] uppercase text-obsidian">{judul}</span>
      <span className="font-sans text-body leading-snug text-obsidian/75">{isi}</span>
    </div>
  );
}

export default function Arsip() {
  return (
    <main className="min-h-screen w-full bg-paper text-obsidian font-sans">
      <div className="mx-auto w-full max-w-[1200px] px-6 md:px-10 py-10 md:py-14">
        <header className="flex flex-wrap items-end justify-between gap-4 pb-8 swiss-border-b">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-tag tracking-[0.24em] uppercase text-rosso">
              LIVE INSTRUMENTATION // NO STORED HISTORY
            </span>
            <h1 className="font-serif text-subtitle leading-[0.95] tracking-tight">THE PIT WALL</h1>
            <p className="font-mono text-micro tracking-[0.16em] uppercase text-titanium">
              The HUD numbers, with the ruler beside them
            </p>
          </div>
          <nav className="flex items-center gap-3" aria-label="Site navigation">
            <Link
              href="/"
              className="font-mono text-[10px] tracking-[0.2em] uppercase px-3 py-1.5 rounded-full swiss-border hover:border-rosso hover:text-rosso transition-colors"
            >
              ← Editorial
            </Link>
            <Link
              href="/baca"
              className="font-mono text-[10px] tracking-[0.2em] uppercase px-3 py-1.5 rounded-full swiss-border hover:border-rosso hover:text-rosso transition-colors"
            >
              Code index ↗
            </Link>
          </nav>
        </header>

        <p className="font-serif text-item leading-snug max-w-[70ch] my-10">
          This page reads the same instrument the portfolio HUD paints on its WebGL panel: the
          telemetry endpoint of the process that is serving you right now. Nothing here is stored,
          averaged overnight, or rounded into a nicer shape.
        </p>

        <ArsipHidup />

        <section className="mt-14" aria-labelledby="cara-ukur">
          <h2 id="cara-ukur" className="font-mono text-tag tracking-[0.24em] uppercase text-rosso mb-2">
            HOW EACH FIGURE IS MEASURED
          </h2>
          <div className="grid md:grid-cols-2 gap-x-10">
            <Aturan
              judul="HANDLER DURATION"
              isi="performance.now() around the whole GET handler of /api/telemetry, including the backend probe inside it. The last 24 durations are kept, in memory, per Node process."
            />
            <Aturan
              judul="BACKEND PROBE"
              isi="One fetch to the go-backend /api/health, aborted after 800 ms. Reachable means it answered at all; the health payload's db field decides OK vs DATABASE ERROR, not the HTTP code."
            />
            <Aturan
              judul="POSTGRES HOP"
              isi="Never drawn and never numbered. The health endpoint replies ok or error and returns no millisecond figure, so this hop stays empty here and on the WebGL timeline."
            />
            <Aturan
              judul="FRAME RHYTHM"
              isi="Reported by visiting browsers through POST /api/telemetry: fps, median and p95 frame time, frames over 33 ms, and viewport size. The last 120 reports and the last 6 minute buckets are kept; the bucket bars read p95 mean per minute divided by the 33 ms threshold."
            />
            <Aturan
              judul="RATE LIMIT"
              isi="Six reports per minute per IP address, counted in memory. A seventh returns 429 and is not stored."
            />
            <Aturan
              judul="REFRESH"
              isi="This page reads the store every 20 seconds and stops while the tab is hidden. A reading that failed erases the previous one instead of staying on screen pretending to be current."
            />
          </div>
        </section>

        <section className="mt-10 px-5 py-6 swiss-border bg-stone/30" aria-labelledby="privasi">
          <h2 id="privasi" className="font-mono text-tag tracking-[0.24em] uppercase text-rosso mb-3">
            WHAT IS NOT KEPT
          </h2>
          <p className="font-mono text-micro leading-relaxed text-obsidian/80">
            The frame window holds numbers only: fps, median, p95, slow-frame count, frame count,
            and the viewport size they were measured on. No name, no session, no page history and no
            identity field is accepted — a body carrying anything outside that list is rejected with
            400. The IP address is read only as a rate-limit bucket key and is never part of the
            reported data. Everything above dies with the process.
          </p>
        </section>

        <footer className="mt-10 pt-6 swiss-border-t flex flex-wrap items-center justify-between gap-3">
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-titanium">
            SOURCE: GET /api/telemetry · ONE PROCESS · PER-PROCESS WINDOWS
          </span>
          <Link
            href="/"
            className="font-mono text-[10px] tracking-[0.2em] uppercase text-rosso hover:text-obsidian transition-colors"
          >
            ← BACK TO THE EDITORIAL
          </Link>
        </footer>
      </div>
    </main>
  );
}
