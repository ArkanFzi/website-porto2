import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { ESAI } from "@/data/esai";

// Halaman editorial adalah titik masuknya; /baca, /arsip dan /waktu berdiri sendiri tanpa state
// halaman utama. /waktu memang punya kanvas, tapi kanvas per-rute (PanggungKecil) yang tidak
// menyentuh holder apa pun milik panggung utama. lastModified sengaja tidak diisi: nilainya akan
// dicetak ulang setiap build sehingga selalu "hari ini" walau kontennya tidak berubah.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/` },
    { url: `${SITE_URL}/baca` },
    { url: `${SITE_URL}/arsip` },
    { url: `${SITE_URL}/waktu` },
    { url: `${SITE_URL}/sangkar` },
    { url: `${SITE_URL}/meja` },
    { url: `${SITE_URL}/peta` },
    { url: `${SITE_URL}/iris` },
    ...ESAI.map((e) => ({ url: `${SITE_URL}/baca/esai/${e.slug}` })),
  ];
}
