import Link from "next/link";
import type { ReactNode } from "react";

// Rangka shared untuk halaman-halaman editorial non-panggung. Komponen ini sengaja murni
// props dan tanpa "use client": /peta adalah server component yang await data GitHub, dan
// ia harus tetap server-rendered.
//
// Konsekuensi yang harus dijaga: kalau kelas Tailwind hanya ada di file ini, dia tetap
// ter-emits karena pemindai melihat sumber, tapi kalau prop datang dari string yang
// dirakit runtime kelasnya hilang. Semua className di sini literal.

export type TautanHalaman = { href: string; label: string };

const PIL =
  "font-mono text-tag uppercase tracking-[0.2em] px-3 py-1.5 rounded-full swiss-border hover:border-rosso hover:text-rosso transition-colors";

export function Bingkai({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen w-full bg-paper text-obsidian font-sans">
      <div className="mx-auto w-full max-w-[1200px] px-6 md:px-10 py-10 md:py-14">{children}</div>
    </main>
  );
}

export function SundulPanggung({
  eyebrow,
  judul,
  sub,
  tautan,
}: {
  eyebrow: string;
  judul: string;
  sub: string;
  tautan: TautanHalaman[];
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 pb-8 swiss-border-b">
      <div className="flex flex-col gap-2">
        <span className="font-mono text-tag tracking-[0.24em] uppercase text-rosso">{eyebrow}</span>
        <h1 className="font-serif text-subtitle leading-[0.95] tracking-tight">{judul}</h1>
        <p className="font-mono text-micro tracking-[0.16em] uppercase text-titanium">{sub}</p>
      </div>
      <nav className="flex flex-wrap items-center gap-3" aria-label="Site navigation">
        {tautan.map((t) => (
          <Link key={t.href} href={t.href} className={PIL}>
            {t.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function Prolog({ children }: { children: ReactNode }) {
  return <p className="font-serif text-item leading-snug max-w-[70ch] my-10">{children}</p>;
}

export function Bagian({
  id,
  judul,
  children,
}: {
  id: string;
  judul: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-12" aria-labelledby={id}>
      <h2
        id={id}
        className="font-mono text-tag tracking-[0.24em] uppercase text-obsidian mb-5"
      >
        {judul}
      </h2>
      <div className="grid md:grid-cols-2 gap-x-10">{children}</div>
    </section>
  );
}

export function Aturan({ judul, isi }: { judul: string; isi: string }) {
  return (
    <div className="flex flex-col gap-1.5 pt-4 swiss-border-b">
      <span className="font-mono text-tag tracking-[0.2em] uppercase text-obsidian">{judul}</span>
      <span className="font-sans text-body leading-snug text-obsidian/75">{isi}</span>
    </div>
  );
}

export function CatatanPenutup({
  id,
  judul,
  children,
}: {
  id: string;
  judul: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mt-12 px-5 py-6 swiss-border bg-stone/30" aria-labelledby={id}>
      <h2 className="font-mono text-tag tracking-[0.24em] uppercase text-rosso mb-4">{judul}</h2>
      <p className="font-serif text-body leading-relaxed text-obsidian/80">{children}</p>
    </section>
  );
}

export function KakiPanggung({ sumber, halaman }: { sumber: string; halaman: string }) {
  return (
    <footer className="mt-12 pt-6 swiss-border-t flex flex-wrap items-center justify-between gap-3">
      <span className="flex flex-col gap-1">
        <span className="font-mono text-tag tracking-[0.2em] uppercase text-obsidian">
          M. ARKAN FAUZI // {halaman}
        </span>
        <span className="font-mono text-tag tracking-[0.2em] uppercase text-titanium">{sumber}</span>
      </span>
      <Link
        href="/"
        className="font-mono text-tag tracking-[0.2em] uppercase text-rosso hover:text-obsidian transition-colors"
      >
        ← BACK TO THE EDITORIAL
      </Link>
    </footer>
  );
}

export function BingkaiKanvas({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`w-full h-[52vh] min-h-[380px] swiss-border bg-obsidian/5 ${className}`}
    >
      {children}
    </div>
  );
}

export function GridPanggung({ children }: { children: ReactNode }) {
  return (
    <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-8 lg:gap-12 items-start">
      {children}
    </div>
  );
}
