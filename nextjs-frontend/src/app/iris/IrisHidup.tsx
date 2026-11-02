"use client";

/** /iris sisi klien: berpindah bab hanya lewat diafragma.
 *
 *  Tidak ada tombol A / tombol B. Yang ada satu slider (role="slider" asli, panah keyboard
 *  berfungsi) yang memerintahkan seberapa tertutup diafragmanya: sisi kiri sumbu adalah teks A,
 *  tengah adalah titik tertutup penuh, kanan adalah teks B. Kedua teks selalu ada di DOM —
 *  yang bergerak hanyalah opasitasnya, jadi tidak ada paragraf yang hilang karena animasi. */
import React, { useState } from "react";
import PanggungKecil from "@/components/Three/panggung/PanggungKecil";
import KurvaIris from "@/components/Three/panggung/KurvaIris";

/** Sumbu 0..1. Tutup = 1 - |2x - 1|: terbuka di kedua ujung, tertutup tepat di tengah. */
const tutupDari = (x: number) => 1 - Math.abs(2 * x - 1);
const sisiDari = (x: number): "A" | "B" => (x < 0.5 ? "A" : "B");

const TEKS: Record<"A" | "B", { judul: string; bait: string[] }> = {
  A: {
    judul: "HOW A PAGE SHOULD FEEL AT REST",
    bait: [
      "Stillness is a feature. A page that keeps painting while nobody moves is spending a visitor's battery on a conversation that has already ended.",
      "So the frame loop sleeps four seconds after the last thing you did, and wakes on the next one. Nothing about the content changed while you were away, and nothing charges you for pretending it did.",
    ],
  },
  B: {
    judul: "HOW A PAGE SHOULD SPEND ITS FRAMES",
    bait: [
      "A frame should carry a number. Parallax that reports the depth it was computed from, a wipe that reports the aperture it was given, a bar whose height is the quotient printed next to it.",
      "Motion that reports nothing is decoration painted over an empty page. This curtain moves because you moved it, and it tells you how far.",
    ],
  },
};

export default function IrisHidup() {
  const [posisi, setPosisi] = useState(0);
  const tutup = tutupDari(posisi);
  const sisi = sisiDari(posisi);
  const tampak = (s: "A" | "B") => (s === sisi ? 1 - tutup : 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="relative h-[46vh] min-h-[340px] swiss-border overflow-hidden" data-iris-wadah>
        <div className="absolute inset-0 px-6 md:px-10 py-8">
          {(Object.keys(TEKS) as ("A" | "B")[]).map((s) => (
            <article
              key={s}
              data-iris-teks={s}
              className="absolute inset-x-6 md:inset-x-10 top-8 flex flex-col gap-4"
              style={{ opacity: tampak(s) }}
            >
              <h3 className="font-mono text-tag tracking-[0.24em] uppercase text-rosso">
                {s} · {TEKS[s].judul}
              </h3>
              {TEKS[s].bait.map((baris, i) => (
                <p key={i} className="font-serif text-item leading-snug max-w-[58ch]">
                  {baris}
                </p>
              ))}
            </article>
          ))}
        </div>

        {/* Kertas diafragma melukis di atas teks, bukan menggantinya. */}
        <div className="absolute inset-0 pointer-events-none">
          <PanggungKecil className="w-full h-full">
            <KurvaIris tutup={tutup} sisi={sisi} />
          </PanggungKecil>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-mono text-micro tracking-[0.2em] uppercase text-titanium">
            APERTURE
          </span>
          <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-titanium">
            <span data-iris-sisi>{sisi}</span> · tutup{" "}
            <span data-iris-tutup className="tabular-nums text-obsidian font-bold">
              {tutup.toFixed(2)}
            </span>{" "}
            · bukaan{" "}
            <span data-iris-buka className="tabular-nums text-obsidian">
              {(1 - tutup).toFixed(2)}
            </span>
          </span>
        </div>
        <input
          type="range"
          data-iris-slider
          min={0}
          max={1}
          step={0.01}
          value={posisi}
          onChange={(e) => setPosisi(Number(e.target.value))}
          aria-label="Geser diafragma: kiri teks A, tengah tertutup, kanan teks B"
          aria-valuetext={`${(posisi * 100).toFixed(0)} persen sumbu, sisi ${sisi}, diafragma ${(
            (1 - tutup) *
            100
          ).toFixed(0)} persen terbuka`}
          className="w-full accent-rosso cursor-pointer"
        />
        <p className="font-mono text-[9px] leading-relaxed text-titanium max-w-[70ch]">
          Arrow keys move the aperture by one step; Home and End jump to an end of the axis. The
          crossfade happens at the far side of closed, which is why it never shows two exposures at
          once — and why the whole navigation costs one quad.
        </p>
      </div>
    </div>
  );
}
