"use client";

import React from "react";
import type { Ease } from "@/components/Three/stage/koreografi";

interface MeshPortalProps {
  /** Nomor bab; dipakai sebagai kunci marker dan tidak lagi mengenal jumlah bab. */
  bab: number;
  /** Kotak tempat kartu potret boleh duduk dan terpotong, dinyatakan dalam satuan
   *  viewport (vw/vh) karena kartu jangkarannya di layar, bukan di dokumen. */
  className: string;
  /** Sikap kartu saat bab ini diam. `rot` radian, `z` satuan dunia. */
  rot?: number;
  z?: number;
  /** Kedalaman tempat kartu mengisi portal. Biarkan kosong bila sama dengan `z`;
   *  isi lebih dalam dari `z` hanya bila kartu memang harus menyusut saat bab ini. */
  pas?: number;
  /** Puncak kemiringan di tengah perjalanan MENJU portal ini, radian. */
  miring?: number;
  /** Parallax pointer: geser posisi (satuan dunia) dan geser kemiringan (radian). */
  geyang?: number;
  rotGeyang?: number;
  /** Kurva perpindahan menuju portal ini. */
  ease?: Ease;
  /** Lebar pita perpindahan menuju portal ini, dalam pecahan gulir. */
  pita?: number;
}

/**
 * Penanda kosong yang memberi tahu kanvas WebGL di mana kartu potret bab ini duduk,
 * dan bagaimana kartu itu bersikap di sana.
 *
 * Tanpa penanda, posisi kartu adalah angka fraksi viewport yang disalin di shader dan
 * tidak tahu-menahu soal tata letak; dengan penanda, kartu ikut bergeser begitu kelas
 * Tailwind-nya diubah, tepi portal sekaligus menjadi batas potong (uMask), dan
 * kemiringan/kedalaman bab dibaca dari atribut yang sama. Menambah bab berarti menulis
 * section + marker ini saja — koreografi, shader, dan registry tidak ikut disentuh.
 */
const MeshPortal: React.FC<MeshPortalProps> = ({ bab, className, ...sikap }) => (
  <div
    data-portal={bab}
    data-rot={sikap.rot}
    data-z={sikap.z}
    data-pas={sikap.pas}
    data-miring={sikap.miring}
    data-geyang={sikap.geyang}
    data-rot-geyang={sikap.rotGeyang}
    data-ease={sikap.ease}
    data-pita={sikap.pita}
    aria-hidden="true"
    className={`pointer-events-none fixed ${className}`}
  />
);

export default MeshPortal;
