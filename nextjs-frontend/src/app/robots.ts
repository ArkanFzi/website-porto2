import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// /admin dan /cv-layout bukan konsumsi crawler: yang pertama butuh sesi, yang kedua adalah
// sumber render PDF. /api dikecualikan karena responsnya bukan halaman HTML.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/cv-layout"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
