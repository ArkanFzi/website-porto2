import type { Metadata } from "next";
import Link from "next/link";
import MejaHidup from "./MejaHidup";

// Rute ini memakai material panggung utama apa adanya, tapi tidak memakai mesinnya: tidak ada
// registry portal, tidak ada koreografi bab, dan tidak ada holder sapuan yang dibagi.
export const metadata: Metadata = {
  title: "MEJA TIPOGRAFI — six knobs into the portrait shader // M. Arkan Fauzi",
  description:
    "The editorial portrait's chiaroscuro material with its chapter machine removed: six controls that each write one uniform, with the commanded value and the uniform value printed side by side.",
  alternates: { canonical: "/meja" },
  openGraph: {
    url: "/meja",
    siteName: "M. Arkan Fauzi",
    type: "website",
    title: "MEJA TIPOGRAFI — six knobs into the portrait shader // M. Arkan Fauzi",
    description:
      "Drive uPersona, uReveal, uFokus, uKabur, uWipe and uMask by hand on a page that owns its own uniform holders and never touches the front page's shared ones.",
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

export default function Meja() {
  return (
    <main className="min-h-screen w-full bg-paper text-obsidian font-sans">
      <div className="mx-auto w-full max-w-[1200px] px-6 md:px-10 py-10 md:py-14">
        <header className="flex flex-wrap items-end justify-between gap-4 pb-8 swiss-border-b">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-tag tracking-[0.24em] uppercase text-rosso">
              SECOND STAGE // MANUAL UNIFORMS
            </span>
            <h1 className="font-serif text-subtitle leading-[0.95] tracking-tight">
              MEJA TIPOGRAFI
            </h1>
            <p className="font-mono text-micro tracking-[0.16em] uppercase text-titanium">
              The shader without the choreography
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
              href="/sangkar"
              className="font-mono text-[10px] tracking-[0.2em] uppercase px-3 py-1.5 rounded-full swiss-border hover:border-rosso hover:text-rosso transition-colors"
            >
              Roll cage ↗
            </Link>
          </nav>
        </header>

        <p className="font-serif text-item leading-snug max-w-[70ch] my-10">
          On the front page these same uniforms are written every frame by one function that reads
          scroll progress, chapter index, pointer history and the DOM box of whichever portal the
          card is flying through. That function is the product. This page removes it and hands the
          six numbers to you instead, so the material can be inspected as an instrument panel rather
          than as a scene.
        </p>

        <MejaHidup />

        <section className="mt-14" aria-labelledby="cara-ukur-meja">
          <h2
            id="cara-ukur-meja"
            className="font-mono text-tag tracking-[0.24em] uppercase text-rosso mb-2"
          >
            HOW THIS PAGE IS BUILT
          </h2>
          <div className="grid md:grid-cols-2 gap-x-10">
            <Aturan
              judul="SAME SHADER, LITERALLY"
              isi="vertexShader, fragmentShader, buatUniformPanggung and the ¼-res blur copy are imported from the front page's material module. Nothing is re-implemented here, so a change to the shading reaches both routes at once."
            />
            <Aturan
              judul="ITS OWN HOLDERS"
              isi="The main stage shares two module-level holders so the iris wipe and the car cross-fade close on the same frame across objects. This route replaces both entries with its own { value: 0 }. Driving the iris knob to 1 leaves the shared holders at 0, and the debug object carries those two numbers so a gate can say so."
            />
            <Aturan
              judul="ONE FRAME PER COMMAND"
              isi="A knob calls invalidate() when its value changes. That is the whole animation system here: the loop stays asleep, and the thing you asked for is painted once."
            />
            <Aturan
              judul="TWO NUMBERS, NOT ONE CLAIM"
              isi="The DOM prints the commanded value; window.__meja prints what the material actually holds after the frame, plus the geometry's vertex count and the crop rectangle in NDC. They are compared by the verifier, not by the page's own prose."
            />
            <Aturan
              judul="FOCUS IS A DISTANCE"
              isi="The focal-plane knob is in world units because uFokus is compared against the view-space depth of each pixel. The card sits five units from the camera, so 5.00 is sharp and 0.5 units away is fully soft — that ceiling is the same constant the chapter cards use."
            />
            <Aturan
              judul="WHAT IS NOT HERE"
              isi="No hover pulse, no pointer trail, no chapter tint, no scroll. uHover, uScroll and the twelve trail samples are left at their initial values, which is why the card does not breathe when nothing is asked of it."
            />
          </div>
        </section>

        <footer className="mt-10 pt-6 swiss-border-t flex flex-wrap items-center justify-between gap-3">
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-titanium">
            SOURCE: stage/chiaroscuroMaterial.ts · 6 UNIFORMS · 2 TRIANGLES
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
