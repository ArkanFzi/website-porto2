"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { MotionConfig } from "framer-motion";
import { SmoothScrollProvider, useScrollData } from "@/components/SmoothScrollProvider";
import EditorialPreloader from "@/components/UI/EditorialPreloader";
import RingDotCursor from "@/components/UI/RingDotCursor";
import MinimalFixedFrame from "@/components/UI/MinimalFixedFrame";
import TelemetryDrawer from "@/components/UI/TelemetryDrawer";
import TerminalModal from "@/components/UI/TerminalModal";
import ChapterPrologue from "./ChapterPrologue";
import ChapterDuality from "./ChapterDuality";
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
  const { scrollProgressRef, scrollVelocityRef, currentChapter, scrollToChapter } = useScrollData();
  const [hoveredProject, setHoveredProject] = useState<number | null>(null);

  return (
    <div className="relative min-h-screen w-full transition-colors duration-700">
      {/* ── Single Continuous Global 3D Canvas (Midground) ── */}
      <GlobalEditorialCanvas
        scrollProgressRef={scrollProgressRef}
        hoveredProject={hoveredProject}
        scrollVelocityRef={scrollVelocityRef}
      />

      {/* ── Fixed Frame (Monogram, Switcher, Indeks, Contact) ── */}
      <MinimalFixedFrame
        currentChapter={currentChapter}
        onChapterClick={scrollToChapter}
      />

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
