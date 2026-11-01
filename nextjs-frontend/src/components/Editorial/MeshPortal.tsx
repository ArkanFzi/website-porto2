"use client";

import React from "react";

interface MeshPortalProps {
  /** Nomor bab; harus sama dengan nilai yang dipakai koreografi kanvas. */
  bab: 1 | 2 | 3 | 4;
  /** Kotak tempat kartu potret boleh duduk dan terpotong, dinyatakan dalam satuan
   *  viewport (vw/vh) karena kartu jangkarannya di layar, bukan di dokumen. */
  className: string;
}

/**
 * Penanda kosong yang memberi tahu kanvas WebGL di mana kartu potret bab ini duduk.
 * Tanpa penanda, posisi kartu adalah angka fraksi viewport yang disalin di shader dan
 * tidak tahu-menahu soal tata letak; dengan penanda, kartu ikut bergeser begitu kelas
 * Tailwind-nya diubah, dan tepi portal sekaligus menjadi batas potong (uMask).
 */
const MeshPortal: React.FC<MeshPortalProps> = ({ bab, className }) => (
  <div
    data-portal={bab}
    aria-hidden="true"
    className={`pointer-events-none fixed ${className}`}
  />
);

export default MeshPortal;
