import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Halaman editorial adalah titik masuknya; /baca dan /arsip adalah lorong rincian yang berdiri
// sendiri (tanpa canvas, tanpa state halaman utama). lastModified sengaja tidak diisi: nilainya
// akan dicetak ulang setiap build sehingga selalu "hari ini" walau kontennya tidak berubah.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/` },
    { url: `${SITE_URL}/baca` },
    { url: `${SITE_URL}/arsip` },
  ];
}
