import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ESAI, cariEsai, menitBaca } from "@/data/esai";

// Naskahnya ada di dalam bundel (src/data/esai.ts), bukan di basis data: tidak ada tabel yang
// boleh di-DDL untuk tiga tulisan, dan halaman ini harus tetap ter-prerender tanpa backend.
export function generateStaticParams() {
  return ESAI.map((e) => ({ slug: e.slug }));
}

interface Props {
  params: Promise<{ slug: string }>;
}

const judulBaris = (judul: string) => `${judul} // M. Arkan Fauzi`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const esai = cariEsai(slug);
  if (!esai) return { title: judulBaris("Essay not found") };
  const jalur = `/baca/esai/${esai.slug}`;
  return {
    title: judulBaris(esai.judul),
    description: esai.ringkas,
    alternates: { canonical: jalur },
    openGraph: {
      url: jalur,
      siteName: "M. Arkan Fauzi",
      type: "article",
      title: judulBaris(esai.judul),
      description: esai.ringkas,
    },
  };
}

const ANGKA = "font-mono text-micro tabular-nums";

export default async function EsaiHalaman({ params }: Props) {
  const { slug } = await params;
  const esai = cariEsai(slug);
  if (!esai) notFound();

  return (
    <main className="min-h-screen w-full bg-paper text-obsidian font-sans">
      <div className="mx-auto w-full max-w-[1200px] px-6 md:px-10 py-10 md:py-14">
        <header className="flex flex-wrap items-end justify-between gap-4 pb-8 swiss-border-b">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-tag tracking-[0.24em] uppercase text-rosso">
              ESSAY // THE READING ROOM
            </span>
            <h1 className="font-serif text-subtitle leading-[0.95] tracking-tight">{esai.judul}</h1>
            <p className="font-mono text-micro tracking-[0.16em] uppercase text-titanium">
              written {esai.ditulis} · about {menitBaca(esai)} min read · {esai.tubuh.length} paragraphs
            </p>
          </div>
          <nav className="flex items-center gap-3" aria-label="Site navigation">
            <Link
              href="/baca"
              className="font-mono text-[10px] tracking-[0.2em] uppercase px-3 py-1.5 rounded-full swiss-border hover:border-rosso hover:text-rosso transition-colors"
            >
              ← Reading room
            </Link>
            <Link
              href="/"
              className="font-mono text-[10px] tracking-[0.2em] uppercase px-3 py-1.5 rounded-full swiss-border hover:border-rosso hover:text-rosso transition-colors"
            >
              Editorial ↗
            </Link>
          </nav>
        </header>

        <p className="font-serif text-item leading-snug text-obsidian/90 mt-10 max-w-[70ch]">
          {esai.ringkas}
        </p>

        <article className="mt-8 flex flex-col gap-5 max-w-[70ch]" data-esai-tubuh>
          {esai.tubuh.map((para, i) => (
            <p key={i} className="font-sans text-body leading-relaxed text-obsidian/85">
              {para}
            </p>
          ))}
        </article>

        <section className="mt-12 px-5 py-6 swiss-border bg-stone/30" aria-labelledby="bukti-judul">
          <h2 id="bukti-judul" className="font-mono text-tag tracking-[0.24em] uppercase text-rosso mb-4">
            WHAT THIS TEXT POINTS AT
          </h2>
          <p className="font-mono text-[10px] leading-relaxed text-titanium mb-3">
            Paths are relative to the repository root; a bare hash is a commit in its history. Every
            claim above can be opened and contradicted.
          </p>
          <ul className="flex flex-col gap-1.5">
            {esai.bukti.map((b) => (
              <li key={b} className={`${ANGKA} text-obsidian/80`}>
                {b}
              </li>
            ))}
          </ul>
        </section>

        <footer className="mt-10 pt-6 swiss-border-t flex flex-wrap items-center justify-between gap-3">
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-titanium">
            M. ARKAN FAUZI // {esai.slug.toUpperCase()}
          </span>
          <Link
            href="/baca"
            className="font-mono text-[10px] tracking-[0.2em] uppercase text-rosso hover:text-obsidian transition-colors"
          >
            ← BACK TO THE INDEX
          </Link>
        </footer>
      </div>
    </main>
  );
}
