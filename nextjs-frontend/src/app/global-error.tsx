"use client";

import { useEffect } from "react";

// Batas error untuk root layout. error.tsx tidak menangkap kegagalan di luar isi halaman
// (font, metadata, elemen <html>), jadi tanpa file ini Next hanya menampilkan layar kosong.
// Sengaja tanpa kelas Tailwind dan tanpa var(--*): kalau globals.css atau font yang gagal,
// halaman ini tetap harus ter-render.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          backgroundColor: "#F7F5F0",
          color: "#0A0A0A",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <main
          style={{
            minHeight: "100svh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "0 24px",
          }}
        >
          <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.4em", textTransform: "uppercase", color: "#D41E12" }}>
            Fatal error
          </p>
          <h1 style={{ margin: "24px 0 0", fontSize: 30, lineHeight: 1.15, fontWeight: 700, textTransform: "uppercase" }}>
            This page could not be rendered
          </h1>
          <p style={{ margin: "16px 0 0", maxWidth: 420, fontSize: 14, lineHeight: 1.8, color: "#55524E" }}>
            The failure happened outside the page content, so the editorial layout is not available.
          </p>
          {error.digest ? (
            <p style={{ margin: "12px 0 0", fontFamily: "monospace", fontSize: 11, color: "#6E6A64" }}>
              digest {error.digest}
            </p>
          ) : null}
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 24, marginTop: 40 }}>
            <button
              onClick={reset}
              style={{
                border: 0,
                cursor: "pointer",
                backgroundColor: "#D41E12",
                color: "#F7F5F0",
                padding: "12px 32px",
                fontSize: 11,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
              }}
            >
              Try again
            </button>
            {/*
              <a>, bukan <Link>: komponen ini menggantikan root layout saat render-nya
              gagal, dan Link butuh konteks router yang justru bisa jadi sumber errornya.
            */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                color: "#0A0A0A",
                padding: "12px 8px",
                fontSize: 11,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
              }}
            >
              Back to home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
