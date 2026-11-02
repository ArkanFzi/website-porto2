import type { Metadata } from "next";
import Link from "next/link";
import SangkarHidup from "./SangkarHidup";

// Panggung kedua yang satu ini tidak membaca telemetri: satu-satunya angkanya adalah sudut
// yang diperintahkan pengunjung sendiri, dan itu datang dari lib/putaran.ts — modul yang sama
// dengan kontrol rotasi di HUD halaman utama.
export const metadata: Metadata = {
  title: "SANGKAR TERBUKA — a roll cage you command, ±12 degrees // M. Arkan Fauzi",
  description:
    "The front page's hover cage taken out of its choreography and given its own route: one wireframe box, one draw call, and the same rotation module the editorial HUD uses, with the commanded angle printed beside it.",
  alternates: { canonical: "/sangkar" },
  openGraph: {
    url: "/sangkar",
    siteName: "M. Arkan Fauzi",
    type: "website",
    title: "SANGKAR TERBUKA — a roll cage you command, ±12 degrees // M. Arkan Fauzi",
    description:
      "Drag or arrow-key a wireframe roll cage within the ±12 degree limit the portrait uses, with the commanded angle printed from the same store the canvas reads.",
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

export default function Sangkar() {
  return (
    <main className="min-h-screen w-full bg-paper text-obsidian font-sans">
      <div className="mx-auto w-full max-w-[1200px] px-6 md:px-10 py-10 md:py-14">
        <header className="flex flex-wrap items-end justify-between gap-4 pb-8 swiss-border-b">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-tag tracking-[0.24em] uppercase text-rosso">
              SECOND STAGE // NO SCROLL CHOREOGRAPHY
            </span>
            <h1 className="font-serif text-subtitle leading-[0.95] tracking-tight">
              SANGKAR TERBUKA
            </h1>
            <p className="font-mono text-micro tracking-[0.16em] uppercase text-titanium">
              The hover cage, out of the chapter machine
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
              href="/waktu"
              className="font-mono text-[10px] tracking-[0.2em] uppercase px-3 py-1.5 rounded-full swiss-border hover:border-rosso hover:text-rosso transition-colors"
            >
              Time window ↗
            </Link>
          </nav>
        </header>

        <p className="font-serif text-item leading-snug max-w-[70ch] my-10">
          On the editorial page this cage appears when a pointer rests on the first row of the
          archive, sized by whichever portal the scroll choreography happens to be flying through.
          Here it has no portal, no chapter and no hover to serve: it is the object alone, and the
          only force acting on it is yours.
        </p>

        <SangkarHidup />

        <section className="mt-14" aria-labelledby="cara-ukur-sangkar">
          <h2
            id="cara-ukur-sangkar"
            className="font-mono text-tag tracking-[0.24em] uppercase text-rosso mb-2"
          >
            HOW THIS PAGE IS BUILT
          </h2>
          <div className="grid md:grid-cols-2 gap-x-10">
            <Aturan
              judul="SAME MODULE, NOT A COPY"
              isi="The angle comes from lib/putaran.ts: the ±12 degree clamp, the 200 px drag reach, the four-degree arrow step and the return-to-zero on release are the same code the front page's portrait obeys. This route only adds the region that accepts the drag and its keyboard equivalent."
            />
            <Aturan
              judul="ONE DRAW CALL"
              isi="Twelve edges of one box, built once from an EdgesGeometry and scaled per frame. Nothing is regenerated when the angle changes, and the buffers are disposed when the route unmounts."
            />
            <Aturan
              judul="COMMAND, NOT PRESENCE"
              isi="Rotation only exists while it is commanded. Release the pointer or move focus away and the value returns to zero — the page would otherwise be holding a state that no visitor asked for, and paying frames to keep it."
            />
            <Aturan
              judul="NO EASING"
              isi="An eased return is a series of frames burned while nobody is moving. The idle law that keeps the editorial canvas at zero painted frames when still is borrowed unchanged, so the cage snaps instead of floating."
            />
            <Aturan
              judul="WHAT IS NOT HERE"
              isi="No telemetry, no visitor data, no stored orientation between visits. The only number on the page is the one you produced, and it is printed from the same store the canvas reads, not from a second copy of it."
            />
            <Aturan
              judul="REDUCED MOTION"
              isi="With prefers-reduced-motion the command path is switched off at the module level: drag and arrow keys do nothing and the cage holds its parked yaw. The content of the page never depended on the movement."
            />
          </div>
        </section>

        <footer className="mt-10 pt-6 swiss-border-t flex flex-wrap items-center justify-between gap-3">
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-titanium">
            SOURCE: lib/putaran.ts · ±12° · EDGES OF ONE BOX
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
