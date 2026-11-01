import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Hanya rute yang benar-benar ada di app router. lastModified sengaja tidak diisi:
// nilai itu akan dicetak ulang setiap build, sehingga tanggalnya selalu "hari ini"
// walaupun kontennya tidak pernah berubah.
export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/dossier", "/dossier/repos", "/dossier/certificates", "/dossier/experience"].map(
    (href) => ({ url: `${SITE_URL}${href}` })
  );
}
