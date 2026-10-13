"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      className="min-h-[100svh] flex flex-col items-center justify-center px-6 text-center"
      style={{ color: "var(--fg)", backgroundColor: "var(--bg)" }}
    >
      <p className="text-micro uppercase tracking-[0.4em] text-accent-secondary" style={{ fontFamily: "var(--f-sans)" }}>
        Error
      </p>

      <h1 className="text-title uppercase leading-[1.1] mt-6" style={{ fontFamily: "var(--f-serif)" }}>
        This page failed to load
      </h1>

      <p className="text-body leading-[1.8] text-white/60 mt-6 max-w-md" style={{ fontFamily: "var(--f-sans)" }}>
        Something went wrong while rendering. Trying again usually fixes it; if it doesn&apos;t, the main page is
        still intact.
      </p>

      <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 mt-12">
        <button
          onClick={reset}
          className="text-label uppercase tracking-[0.25em] text-black bg-accent-primary px-8 py-3 hover:bg-white transition-colors cursor-pointer"
          style={{ fontFamily: "var(--f-sans)" }}
        >
          Try again
        </button>
        <Link
          href="/"
          className="text-label uppercase tracking-[0.25em] text-white/70 hover:text-accent-primary transition-colors px-2 py-3"
          style={{ fontFamily: "var(--f-sans)" }}
        >
          BACK TO HOME
        </Link>
      </div>
    </main>
  );
}
