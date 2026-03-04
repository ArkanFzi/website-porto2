"use client";

import React from "react";
import { Heart } from "lucide-react";

const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-[var(--bg)] text-white py-16 flex flex-col items-center justify-center relative z-20">

      {/* "Terima kasih atas perhatiannya" matching "Спасибо за внимание" */}
      <h3 className="title-font text-[18px] md:text-[22px] tracking-wide mb-4 uppercase">
        TERIMA KASIH ATAS PERHATIANNYA
      </h3>

      <Heart size={14} fill="white" className="text-white mt-1 opacity-90" />

      {/* Tiny bottom rights text */}
      <p className="absolute bottom-6 text-[8px] text-white/30 tracking-widest uppercase" style={{ fontFamily: "var(--f-mono)" }}>
        © 2025 M. Arkan Fauzi
      </p>

    </footer>
  );
};

export default Footer;
