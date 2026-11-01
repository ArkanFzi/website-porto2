import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Satu-satunya halaman yang bisa diindeks adalah halaman editorial ini; subtree
// /dossier lama sudah dipensiunkan. lastModified sengaja tidak diisi: nilainya akan
// dicetak ulang setiap build sehingga selalu "hari ini" walau kontennya tidak berubah.
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${SITE_URL}/` }];
}
