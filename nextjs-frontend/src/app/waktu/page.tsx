import type { Metadata } from "next";
import WaktuHidup from "./WaktuHidup";
import {
  Aturan,
  Bagian,
  Bingkai,
  KakiPanggung,
  Prolog,
  SundulPanggung,
  CatatanPenutup,
} from "@/components/Editorial/PanggungFrame";

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

export default function Waktu() {
  return (
    <Bingkai>
      <SundulPanggung
        eyebrow="SECOND STAGE // ONE OBJECT, NO CHOREOGRAPHY"
        judul="JENDELA WAKTU"
        sub="A window whose side is a measured number"
        tautan={[
          { href: "/", label: "← Editorial" },
          { href: "/arsip", label: "Pit wall ↗" },
        ]}
      />

      <Prolog>
        The editorial page carries nine objects and a choreography of four chapters. This page
        carries one object and no choreography at all: it exists to test whether a WebGL shape can
        be justified by a single number, and to show that number with its ruler beside it.
      </Prolog>

      <WaktuHidup />

      <Bagian id="cara-ukur-waktu" judul="HOW THIS PAGE IS BUILT">
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
      </Bagian>

      <CatatanPenutup id="yang-tidak-disimpan-waktu" judul="WHAT THIS PAGE DOES NOT KEEP">
        Nothing here survives the process that printed it. The window side is the p95 frame time of
        reports held in a rolling in-memory window of the last six minutes: no database behind it,
        no overnight average, no figure carried over from a previous run. When the window is empty
        the aperture is absent rather than zero, and the em-dash is the only number offered.
      </CatatanPenutup>

      <KakiPanggung
        sumber="SOURCE: GET /api/telemetry · clientFrames.p95Ms · 33 MS THRESHOLD"
        halaman="JENDELA WAKTU"
      />
    </Bingkai>
  );
}
