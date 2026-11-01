"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
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
  const { scrollProgress, scrollVelocity, currentChapter, scrollToChapter } = useScrollData();
  const [hoveredProject, setHoveredProject] = useState<number | null>(null);

  return (
    <div className="relative min-h-screen w-full transition-colors duration-700">
      {/* ── Single Continuous Global 3D Canvas (Midground) ── */}
      <GlobalEditorialCanvas
        scrollProgress={scrollProgress}
        hoveredProject={hoveredProject}
        scrollVelocity={scrollVelocity}
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
      <main className="relative z-10 w-full flex flex-col">
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
    <>
      <EditorialPreloader />
      <SmoothScrollProvider>
        <EditorialInner {...props} />
      </SmoothScrollProvider>
    </>
  );
};

export default EditorialPageClient;
