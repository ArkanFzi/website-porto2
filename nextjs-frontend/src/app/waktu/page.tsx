import type { Metadata } from "next";
import Link from "next/link";
import WaktuHidup from "./WaktuHidup";

// Satu angka, dua lukisan. Halaman ini tidak memanggil /api/telemetry sendiri dan tidak
// mengirim laporan ritme frame: ia membaca store yang sama dengan HUD dan panggung utama,
// dan satu-satunya bentuk yang lahir di kanvas kedua adalah bentuk dari angka itu.
export const metadata: Metadata = {
  title: "JENDELA WAKTU — one measured number, painted twice // M. Arkan Fauzi",
  description:
    "A second WebGL stage with nothing but the p95 frame time visitors report: the same figure painted as a DOM square and as a line geometry, from the same height function, with no shape at all when there is no number.",
  alternates: { canonical: "/waktu" },
  openGraph: {
    url: "/waktu",
    siteName: "M. Arkan Fauzi",
    type: "website",
    title: "JENDELA WAKTU — one measured number, painted twice // M. Arkan Fauzi",
    description:
      "The measured p95 frame time drives one aperture: same number, same height law, painted once in the DOM and once in WebGL, and nothing drawn when the reading is missing.",
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

export default function Waktu() {
  return (
    <main className="min-h-screen w-full bg-paper text-obsidian font-sans">
      <div className="mx-auto w-full max-w-[1200px] px-6 md:px-10 py-10 md:py-14">
        <header className="flex flex-wrap items-end justify-between gap-4 pb-8 swiss-border-b">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-tag tracking-[0.24em] uppercase text-rosso">
              SECOND STAGE // ONE OBJECT, NO CHOREOGRAPHY
            </span>
            <h1 className="font-serif text-subtitle leading-[0.95] tracking-tight">JENDELA WAKTU</h1>
            <p className="font-mono text-micro tracking-[0.16em] uppercase text-titanium">
              A window whose side is a measured number
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
              href="/arsip"
              className="font-mono text-[10px] tracking-[0.2em] uppercase px-3 py-1.5 rounded-full swiss-border hover:border-rosso hover:text-rosso transition-colors"
            >
              Pit wall ↗
            </Link>
          </nav>
        </header>

        <p className="font-serif text-item leading-snug max-w-[70ch] my-10">
          The editorial page carries nine objects and a choreography of four chapters. This page
          carries one object and no choreography at all: it exists to test whether a WebGL shape can
          be justified by a single number, and to show that number with its ruler beside it.
        </p>

        <WaktuHidup />

        <section className="mt-14" aria-labelledby="cara-ukur-waktu">
          <h2 id="cara-ukur-waktu" className="font-mono text-tag tracking-[0.24em] uppercase text-rosso mb-2">
            HOW THIS PAGE IS BUILT
          </h2>
          <div className="grid md:grid-cols-2 gap-x-10">
            <Aturan
              judul="ONE CANVAS, PER ROUTE"
              isi="A second stage gets its own canvas: no chapter registry, no portal boxes, no scroll choreography, no adaptive DPR. It borrows only the idle law from lib/diamKanvas, the same module the editorial canvas uses, so the two cannot disagree about when to stop painting."
            />
            <Aturan
              judul="ZERO FRAMES WHEN STILL"
              isi="After four seconds without scroll, pointer, key or focus the frameloop drops to demand and the canvas paints nothing. New telemetry does not wake it: a reading arriving every twenty seconds would burn a frame nobody is watching and erase the invariant the probes measure."
            />
            <Aturan
              judul="NO SHAPE WITHOUT A NUMBER"
              isi="When no browser has reported a frame time to this process, the geometry is not mounted at all — not shrunk to a stub. The figure becomes an em-dash, which is the site's mark for 'this was not measured'."
            />
            <Aturan
              judul="ONE DRAW CALL"
              isi="Three squares — frame, aperture, threshold — live in a single line-segments buffer with per-vertex colour, so the whole scene is one draw call no matter how many times the reading changes."
            />
            <Aturan
              judul="THE SAME LAW TWICE"
              isi="The DOM square and the WebGL aperture are both width = fraksiTinggi(p95 / 33 ms) from lib/buketMenit, the function the front-page bars and the pit-wall page already use. A verifier compares the two painted values, so a private constant on either side fails a gate instead of quietly diverging."
            />
            <Aturan
              judul="WHAT IS NOT HERE"
              isi="No history, no stored series, no per-visitor identity. The figure dies with the Node process that computed it, exactly like every other number on this site."
            />
          </div>
        </section>

        <footer className="mt-10 pt-6 swiss-border-t flex flex-wrap items-center justify-between gap-3">
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-titanium">
            SOURCE: GET /api/telemetry · clientFrames.p95Ms · 33 MS THRESHOLD
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
