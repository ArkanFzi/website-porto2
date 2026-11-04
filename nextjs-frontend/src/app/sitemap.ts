import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { ESAI } from "@/data/esai";

// Empat jalan masuk profil duluan, lalu lima pameran teknis. Tidak ada rute yang berdiri
// sendiri tanpa state halaman utama lagi: /kinerja punya kanvas, tapi kanvas per-rute
// (PanggungKecil) yang tidak menyentuh holder apa pun milik panggung utama.
// lastModified sengaja tidak diisi: nilainya akan dicetak ulang setiap build sehingga
// selalu "hari ini" walau kontennya tidak berubah.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/` },
    { url: `${SITE_URL}/tentang` },
    { url: `${SITE_URL}/proyek` },
    { url: `${SITE_URL}/tulisan` },
    { url: `${SITE_URL}/kontak` },
    { url: `${SITE_URL}/kinerja` },
    { url: `${SITE_URL}/interaksi` },
    { url: `${SITE_URL}/potret` },
    { url: `${SITE_URL}/transisi` },
    { url: `${SITE_URL}/statistik` },
    ...ESAI.map((e) => ({ url: `${SITE_URL}/tulisan/esai/${e.slug}` })),
  ];
}
