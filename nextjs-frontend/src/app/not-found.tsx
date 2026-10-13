import Link from "next/link";

const links = [
  { label: "HOME", href: "/" },
  { label: "DOSSIER", href: "/dossier" },
  { label: "CONTACT", href: "/#contact" },
];

export default function NotFound() {
  return (
    <main
      className="min-h-[100svh] flex flex-col items-center justify-center px-6 text-center"
      style={{ color: "var(--fg)", backgroundColor: "var(--bg)" }}
    >
      <p className="text-micro uppercase tracking-[0.4em] text-accent-primary" style={{ fontFamily: "var(--f-sans)" }}>
        404
      </p>

      <h1 className="text-title uppercase leading-[1.1] mt-6" style={{ fontFamily: "var(--f-serif)" }}>
        This page doesn&apos;t exist
      </h1>

      <p className="text-body leading-[1.8] text-white/60 mt-6 max-w-md" style={{ fontFamily: "var(--f-sans)" }}>
        The address you followed isn&apos;t part of this portfolio. Everything worth reading lives on the main page
        or in the dossier.
      </p>

      <nav className="flex flex-wrap justify-center gap-x-8 gap-y-3 mt-12" aria-label="Recovery">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="text-label uppercase tracking-[0.25em] text-white/70 hover:text-accent-primary transition-colors"
            style={{ fontFamily: "var(--f-sans)" }}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
