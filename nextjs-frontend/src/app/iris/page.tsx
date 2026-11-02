import type { Metadata } from "next";
import Link from "next/link";
import IrisHidup from "./IrisHidup";

// Rute ini punya shader diafragmanya sendiri. Material panggung utama dan dua holder
// module-levelnya sengaja tidak diimpor sama sekali — halaman-probe menjaganya lewat gerbang
// sumber, bukan lewat ingatan.
export const metadata: Metadata = {
  title: "IRIS — berpindah bab lewat diafragma // M. Arkan Fauzi",
  description:
    "A two-text passage whose only navigation is an aperture: one slider with a real slider role, one quad of paper closing over the page, and both paragraphs present in the DOM at every value.",
  alternates: { canonical: "/iris" },
  openGraph: {
    url: "/iris",
    siteName: "M. Arkan Fauzi",
    type: "website",
    title: "IRIS — berpindah bab lewat diafragma // M. Arkan Fauzi",
    description:
      "Close the iris to cross the cut: the crossfade happens only at full closure, the commanded aperture is printed, and the buttons do not exist.",
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

export default function Iris() {
  return (
    <main className="min-h-screen w-full bg-paper text-obsidian font-sans">
      <div className="mx-auto w-full max-w-[1200px] px-6 md:px-10 py-10 md:py-14">
        <header className="flex flex-wrap items-end justify-between gap-4 pb-8 swiss-border-b">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-tag tracking-[0.24em] uppercase text-rosso">
              SECOND STAGE // NAVIGATION AS A WIPE
            </span>
            <h1 className="font-serif text-subtitle leading-[0.95] tracking-tight">IRIS</h1>
            <p className="font-mono text-micro tracking-[0.16em] uppercase text-titanium">
              One slider, one quad, no buttons
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
              href="/peta"
              className="font-mono text-[10px] tracking-[0.2em] uppercase px-3 py-1.5 rounded-full swiss-border hover:border-rosso hover:text-rosso transition-colors"
            >
              Project map ↗
            </Link>
          </nav>
        </header>

        <p className="font-serif text-item leading-snug max-w-[70ch] my-10">
          The front page already uses an iris wipe, but as a consequence: the chapter machine closes
          the aperture because the scroll crossed a boundary, and the same number is shared with the
          car so both objects cut on one frame. Here the wipe is the control itself. You are not
          told which chapter is next; you are handed the aperture and asked to close it.
        </p>

        <IrisHidup />

        <section className="mt-14" aria-labelledby="cara-ukur-iris">
          <h2
            id="cara-ukur-iris"
            className="font-mono text-tag tracking-[0.24em] uppercase text-rosso mb-2"
          >
            HOW THIS PAGE IS BUILT
          </h2>
          <div className="grid md:grid-cols-2 gap-x-10">
            <Aturan
              judul="THE CUT ONLY HAPPENS CLOSED"
              isi="tutup = 1 - |2x - 1|: open at both ends of the axis, fully shut at the midpoint. The text changes sides where the screen is already paper, so two exposures are never blended on top of each other."
            />
            <Aturan
              judul="A SLIDER, NOT A BUTTON PAIR"
              isi="The control is a native range input, which is a real role=slider for assistive technology: arrow keys step it, Home and End jump it, and its value is announced. Nothing here is a click handler wearing a div."
            />
            <Aturan
              judul="BOTH TEXTS ALWAYS EXIST"
              isi="Both paragraphs are in the DOM at every position of the axis; only their opacity is commanded. The navigation can hide a passage from sight but never from a reader, a search, or a browser without WebGL."
            />
            <Aturan
              judul="ONE QUAD"
              isi="The curtain is a single plane carrying two uniforms — a radius and an aspect — and a four-line fragment: distance from centre tested against that radius, feathered by one pixel of derivative. The feather is fwidth, so it stays one device pixel at any resolution."
            />
            <Aturan
              judul="NOT THE STAGE'S SHADER"
              isi="The front page's wipe shares two module-level holders between objects on purpose. This route does not import that material at all — it has its own shader, and a source-level gate in the verifier fails if the import ever appears."
            />
            <Aturan
              judul="NO EASING, NO LOOP"
              isi="The commanded number is the printed number. There is no animation between values because the slider is the animation; the canvas wakes for one frame per command and goes back to sleep."
            />
          </div>
        </section>

        <footer className="mt-10 pt-6 swiss-border-t flex flex-wrap items-center justify-between gap-3">
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-titanium">
            SOURCE: 1 QUAD · role=slider · 2 TEXTS IN DOM
          </span>
          <Link
            href="/waktu"
            className="font-mono text-[10px] tracking-[0.2em] uppercase text-rosso hover:text-obsidian transition-colors"
          >
            Time window ↗
          </Link>
        </footer>
      </div>
    </main>
  );
}
