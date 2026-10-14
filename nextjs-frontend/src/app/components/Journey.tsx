"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import type { Perjalanan } from "@/lib/server/journey";

// Entri datang dari render server (lihat app/page.tsx), bukan dari fetch di browser,
// supaya timeline ini ikut ter-serialisasi ke HTML pertama.
const Journey: React.FC<{ entries: Perjalanan[] }> = ({ entries }) => {
  // Nothing is invented here: if the API is unreachable or the table is still
  // empty, the section is absent rather than showing a timeline from memory.
  if (entries.length === 0) return null;

  return (
    <section id="journey" className="relative w-full bg-[var(--bg)] pt-24 pb-24 lg:pt-32 lg:pb-40 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 md:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 lg:ml-20 mb-16 lg:mb-24">
          <div className="flex flex-col gap-6">
            <span className="text-micro uppercase tracking-[0.2em] font-bold text-accent-primary" style={{ fontFamily: "var(--f-sans)" }}>
              2024 — PRESENT
            </span>
            <motion.h2
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              className="title-font text-title uppercase leading-[1.1] text-white"
            >
              {[
                { text: "STEP BY", delay: 0.1 },
                { text: "STEP", delay: 0.2 },
              ].map((line, i) => (
                <span key={i} className="block overflow-hidden">
                  <motion.span
                    className="block"
                    variants={{
                      hidden: { y: "100%", opacity: 0 },
                      visible: { y: 0, opacity: 1 },
                    }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: line.delay }}
                  >
                    {line.text}
                  </motion.span>
                </span>
              ))}
            </motion.h2>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
            className="text-body leading-[1.9] text-white/50 lg:self-end lg:max-w-lg"
            style={{ fontFamily: "var(--f-serif)" }}
          >
            Vocational school, an industry class, a competition, an apprenticeship, and the enterprise systems that came
            after — kept in the order they actually happened.
          </motion.p>
        </div>

        <div className="relative lg:ml-20">
          {/* Rail sits exactly on the boundary between the year column and the text column. */}
          <div aria-hidden className="hidden md:block absolute top-3 bottom-3 left-[150px] lg:left-[180px] w-[1px] bg-white/10" />

          <ol>
            {entries.map((entry, i) => (
              <motion.li
                key={entry.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: i * 0.05 }}
                className="grid grid-cols-1 md:grid-cols-[150px_1fr] lg:grid-cols-[180px_1fr] py-7 md:py-9 first:pt-0 last:pb-0"
              >
                <div className="md:pr-9 flex items-baseline gap-3">
                  <span
                    className="text-subtitle leading-none text-accent-primary"
                    style={{ fontFamily: "var(--f-serif)", fontWeight: 500 }}
                  >
                    {entry.year}
                  </span>
                  <span className="md:hidden text-tag uppercase tracking-[0.25em] text-white/30">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>

                <div className="relative md:pl-9 mt-2 md:mt-0">
                  <span aria-hidden className="hidden md:block absolute -left-[3px] top-[11px] w-[7px] h-[7px] rounded-full bg-accent-primary" />
                  <h3 className="text-item font-semibold text-white mb-2" style={{ fontFamily: "var(--f-sans)" }}>
                    {entry.title}
                  </h3>
                  <p className="text-body leading-[1.8] text-white/55 max-w-[62ch]" style={{ fontFamily: "var(--f-sans)", fontWeight: 500 }}>
                    {entry.body}
                  </p>
                  {entry.linkHref && (
                    <a
                      href={entry.linkHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 mt-4 text-label uppercase tracking-[0.15em] font-semibold text-accent-primary hover:text-accent-secondary transition-colors"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      {entry.linkLabel}
                    </a>
                  )}
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>

      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
        className="absolute top-0 w-full h-[1px] bg-white opacity-20 origin-left"
      />
    </section>
  );
};

export default Journey;
