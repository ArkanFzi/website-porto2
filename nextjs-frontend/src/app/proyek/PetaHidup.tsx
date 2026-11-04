"use client";

/** PetaHidup: daftar baris dan mesh-nya hidup di satu pulau klien karena keduanya harus
 *  menyebut baris yang sama pada saat yang sama.
 *  Server tetap yang menghitung dan mencetak angka (tinggi = bintang / puncak); yang tinggal
 *  di sini hanya keadaan "baris mana sedang ditunjuk" dan gerak masuknya. Tidak ada fetch di
 *  file ini, jadi tidak ada jalur kedua menuju GitHub. */
import React, { useState, useSyncExternalStore } from "react";
import { MotionConfig, motion } from "framer-motion";
import PanggungKecil from "@/components/Three/panggung/PanggungKecil";
import PetaInstans, { type BatangPeta } from "@/components/Three/panggung/PetaInstans";
import {
  BingkaiKanvas,
  GridPanggung,
} from "@/components/Editorial/PanggungFrame";
import {
  bacaKurangiGerak,
  bacaKurangiGerakSaatSSR,
  dengarKurangiGerak,
} from "@/lib/motion";

/** Dunia units; dipakai ulang di caption halaman supaya keduanya tidak bisa berbeda. */
export const TINGGI_BINGKAI_PUBLIK = 2;

interface Props {
  batang: BatangPeta[];
  puncak: number;
}

export default function PetaHidup({ batang, puncak }: Props) {
  const [pilih, setPilih] = useState(-1);
  const kurangiGerak = useSyncExternalStore(
    dengarKurangiGerak,
    bacaKurangiGerak,
    bacaKurangiGerakSaatSSR
  );

  return (
    <MotionConfig reducedMotion="user">
      <GridPanggung>
        <BingkaiKanvas>
          <PanggungKecil className="w-full h-full" kamera={[0, 0, 3.4]} fov={42}>
            <PetaInstans bars={batang} pilih={pilih} gambarMasuk={!kurangiGerak} />
          </PanggungKecil>
        </BingkaiKanvas>

        <ol
          className="flex flex-col max-h-[52vh] min-h-[380px] overflow-y-auto"
          data-peta-daftar
          onMouseLeave={() => setPilih(-1)}
        >
          {batang.map((b, i) => (
            <motion.li
              key={b.nama}
              data-peta-baris=""
              data-peta-tertinggi={b.tertinggi ? "true" : undefined}
              data-peta-pilih={pilih === i ? "true" : undefined}
              initial={kurangiGerak ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.6), duration: 0.28 }}
              onMouseEnter={() => setPilih(i)}
              className={`flex items-baseline gap-3 py-1.5 swiss-border-b ${
                b.tertinggi ? "border-l-2 border-rosso pl-3" : ""
              } ${pilih === i ? "bg-stone/50" : ""}`}
            >
              <a
                href={b.tautan}
                target="_blank"
                rel="noreferrer"
                onFocus={() => setPilih(i)}
                onBlur={() => setPilih(-1)}
                className="font-mono text-tag uppercase tracking-[0.2em] truncate text-obsidian hover:text-rosso transition-colors"
              >
                {b.nama}
              </a>
              <span
                data-peta-bintang
                className="ml-auto font-mono text-tag tabular-nums text-titanium"
              >
                {b.bintang}★
              </span>
              <span
                data-peta-tinggi
                className="font-mono text-tag tabular-nums text-obsidian w-[42px] text-right"
              >
                {(b.tinggi * TINGGI_BINGKAI_PUBLIK).toFixed(2)}
              </span>
            </motion.li>
          ))}
        </ol>
      </GridPanggung>

      <p className="mt-6 font-mono text-micro leading-relaxed text-titanium max-w-[70ch]">
        The last column is the bar height in world units: star count divided by the peak ({puncak}
        ), times the {TINGGI_BINGKAI_PUBLIK}-unit frame. A repository with zero stars gets a height
        of zero and is still listed as a row — an invisible bar with a printed number is honest, a
        stub that looks like a minimum is not. Hovering or focusing a row paints that one instance
        in the stone colour and asks for exactly one frame; the peak stays rosso either way, so
        selection never borrows the vocabulary of the data.
      </p>
    </MotionConfig>
  );
}
