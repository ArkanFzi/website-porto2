"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { MotionConfig } from "framer-motion";
import { SmoothScrollProvider, useScrollData, useBabAktif } from "@/components/SmoothScrollProvider";
import EditorialPreloader from "@/components/UI/EditorialPreloader";
import RingDotCursor from "@/components/UI/RingDotCursor";
import MinimalFixedFrame from "@/components/UI/MinimalFixedFrame";
import TelemetryDrawer from "@/components/UI/TelemetryDrawer";
import TerminalModal from "@/components/UI/TerminalModal";
import ChapterPrologue from "./ChapterPrologue";
import ChapterDuality from "./ChapterDuality";
import ChapterHub from "./ChapterHub";
import ChapterArchives from "./ChapterArchives";
import ChapterPaddock from "./ChapterPaddock";
import type { RepoBerlian } from "@/lib/server/github";
import type { Perjalanan } from "@/lib/server/journey";
import type { Certificate } from "@/lib/server/certificates";
import type { Experience } from "@/lib/server/experience";

const GlobalEditorialCanvas = dynamic(
  () => import("@/components/Three/GlobalEditorialCanvas"),
  { ssr: false }
);

/** Latar rosso bab penutup, dilukis DI BAWAH kanvas.
 *
 * Selama warna ini menempel pada <section id="chapter-04"> ia tidak pernah bisa
 * dibiarkan tembus: `main` memegang z-10 dan datang belakangan di DOM dibanding
 * kanvas yang juga z-10, jadi seluruh subtree-nya — termasuk latar section — melukis
 * di atas kartu potret. Hasil terukurnya: 84-92% isi kotak portal bab 04 adalah rosso
 * rata, kartu tidak ada di layar. Dipindah ke lapisan z-0, kartu boleh muncul dan teks
 * tetap di depannya.
 *
 * Pemicunya sekarang useBabAktif — sinyal yang sama yang mengganti HUD ke gaya rosso,
 * jadi keduanya menyala bersamaan. Sebelumnya lapisan ini mengandalkan
 * IntersectionObserver yang dipasang saat mount: di tab lama yang kena hot-reload dan
 * di pendaratan langsung lewat #chapter-04, observer itu terbukti bisa tinggal
 * opacity-0 sementara seluruh sisa halaman sudah pindah ke bab penutup — teks putih di
 * atas kertas, tidak terbaca. */
const LatarPaddock: React.FC = () => {
  const bab = useBabAktif();
  return (
    <div
      aria-hidden="true"
      data-latar-paddock=""
      className={`fixed inset-0 z-0 pointer-events-none bg-[#D41E12] transition-opacity duration-700 ${
        bab === 4 ? "opacity-100" : "opacity-0"
      }`}
    />
  );
};

interface PageClientProps {
  repos: RepoBerlian[];
  perjalanan: Perjalanan[];
  certificates: Certificate[];
  experiences: Experience[];
}

const EditorialInner: React.FC<PageClientProps> = ({
  repos,
  perjalanan,
  certificates,
  experiences,
}) => {
  const { scrollProgressRef, scrollVelocityRef, scrollToChapter } = useScrollData();
  const [hoveredProject, setHoveredProject] = useState<number | null>(null);

  return (
    <div className="relative min-h-screen w-full transition-colors duration-700">
      {/* ── Latar bab penutup (paling bawah) ── */}
      <LatarPaddock />

      {/* ── Single Continuous Global 3D Canvas (Midground) ── */}
      <GlobalEditorialCanvas
        scrollProgressRef={scrollProgressRef}
        hoveredProject={hoveredProject}
        scrollVelocityRef={scrollVelocityRef}
      />

      {/* ── Fixed Frame (Monogram, Switcher, Indeks, Contact) ── */}
      <MinimalFixedFrame onChapterClick={scrollToChapter} />

      {/* ── Pit-Wall Telemetry HUD Drawer & Interactive CLI Shell ── */}
      <TelemetryDrawer />
      <TerminalModal />

      {/* ── Ring-and-Dot Magnetic Cursor ── */}
      <RingDotCursor />

      {/* ── 4 Streamlined Chapters (Swiss Grid Architecture) ── */}
      <main id="konten" tabIndex={-1} className="relative z-10 w-full flex flex-col">
        <ChapterPrologue />
        <ChapterDuality
          perjalanan={perjalanan}
          certificates={certificates}
          experiences={experiences}
        />
        <ChapterHub />
        <ChapterArchives
          repos={repos}
          hoveredProject={hoveredProject}
          onHoverProject={setHoveredProject}
        />
        <ChapterPaddock />
      </main>
    </div>
  );
};

export const EditorialPageClient: React.FC<PageClientProps> = (props) => {
  return (
    <MotionConfig reducedMotion="user">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[10000] focus:rounded-full focus:bg-[#D41E12] focus:px-4 focus:py-2 focus:font-mono focus:text-[10px] focus:uppercase focus:tracking-[0.18em] focus:text-white"
      >
        Lompat ke konten
      </a>
      <EditorialPreloader />
      <SmoothScrollProvider>
        <EditorialInner {...props} />
      </SmoothScrollProvider>
    </MotionConfig>
  );
};

export default EditorialPageClient;
