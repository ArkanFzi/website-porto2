import type { Metadata } from "next";
import ArsipHidup from "./ArsipHidup";
import {
  Aturan,
  Bagian,
  Bingkai,
  CatatanPenutup,
  KakiPanggung,
  Prolog,
  SundulPanggung,
} from "@/components/Editorial/PanggungFrame";

// Semua angka di halaman ini datang dari satu sumber: GET /api/telemetry pada proses Node yang
// menjawab request itu. Halaman ini tidak menambah polling sendiri (lihat ArsipHidup), dan tidak
// punya angka hiasan: yang tidak terukur tercetak "—".
export const metadata: Metadata = {
  title: "THE PIT WALL — live process telemetry // M. Arkan Fauzi",
  description:
    "Every number the front-page HUD paints, printed with its measuring rule: handler duration, backend probe, browser frame rhythm, runtime, and the scope each figure is valid for.",
  alternates: { canonical: "/arsip" },
  openGraph: {
    url: "/arsip",
    siteName: "M. Arkan Fauzi",
    type: "website",
    title: "THE PIT WALL — live process telemetry // M. Arkan Fauzi",
    description:
      "Server round trip, architecture trace and browser frame rhythm, read from the same telemetry store the WebGL HUD uses, with the measuring rule stated next to each figure.",
  },
};

export default function Arsip() {
  return (
    <Bingkai>
      <SundulPanggung
        eyebrow="LIVE INSTRUMENTATION // NO STORED HISTORY"
        judul="THE PIT WALL"
        sub="The HUD numbers, with the ruler beside them"
        tautan={[
          { href: "/", label: "← Editorial" },
          { href: "/baca", label: "Code index ↗" },
        ]}
      />

      <Prolog>
        This page reads the same instrument the portfolio HUD paints on its WebGL panel: the
        telemetry endpoint of the process that is serving you right now. Nothing here is stored,
        averaged overnight, or rounded into a nicer shape.
      </Prolog>

      <ArsipHidup />

      <Bagian id="cara-ukur" judul="HOW EACH FIGURE IS MEASURED">
        <Aturan
          judul="HANDLER DURATION"
          isi="performance.now() around the whole GET handler of /api/telemetry, including the backend probe inside it. The last 24 durations are kept, in memory, per Node process."
        />
        <Aturan
          judul="BACKEND PROBE"
          isi="One fetch to the go-backend /api/health, aborted after 800 ms. Reachable means it answered at all; the health payload's db field decides OK vs DATABASE ERROR, not the HTTP code."
        />
        <Aturan
          judul="POSTGRES HOP"
          isi="Never drawn and never numbered. The health endpoint replies ok or error and returns no millisecond figure, so this hop stays empty here and on the WebGL timeline."
        />
        <Aturan
          judul="FRAME RHYTHM"
          isi="Reported by visiting browsers through POST /api/telemetry: fps, median and p95 frame time, frames over 33 ms, and viewport size. The last 120 reports and the last 6 minute buckets are kept; the bucket bars read p95 mean per minute divided by the 33 ms threshold."
        />
        <Aturan
          judul="RATE LIMIT"
          isi="Six reports per minute per IP address, counted in memory. A seventh returns 429 and is not stored."
        />
        <Aturan
          judul="REFRESH"
          isi="This page reads the store every 20 seconds and stops while the tab is hidden. A reading that failed erases the previous one instead of staying on screen pretending to be current."
        />
      </Bagian>

      <CatatanPenutup id="privasi" judul="WHAT IS NOT KEPT">
        The frame window holds numbers only: fps, median, p95, slow-frame count, frames counted and
        the viewport size they were measured on. No name, no session, no page history and no identity
        field is accepted — a body carrying anything outside that list is rejected with 400. The IP
        address is read only as a rate-limit bucket key and is never part of the reported data.
        Everything above dies with the process.
      </CatatanPenutup>

      <KakiPanggung
        sumber="SOURCE: GET /api/telemetry · ONE PROCESS · PER-PROCESS WINDOWS"
        halaman="THE PIT WALL"
      />
    </Bingkai>
  );
}
