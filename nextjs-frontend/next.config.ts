import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

// Versi Next dibaca dari paket yang terpasang, bukan dari string yang diketik tangan. Bedanya
// penting: rute /api/telemetry menampilkan angka ini sebagai fakta runtime, dan "NEXT.JS 16.4"
// yang ditulis tangan tetap tertulis 16.4 setelah paketnya dibump. Gagal baca menghasilkan ""
// yang di sisi hilir tampil sebagai "—".
function versiNext(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "node_modules", "next", "package.json"), "utf8")
    ) as { version?: unknown };
    return typeof pkg.version === "string" ? pkg.version : "";
  } catch {
    return "";
  }
}

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    // Diisi `github.sha` pada langkah Build di job `web` (.github/workflows/ci.yml). Build lokal
    // tanpa variabel ini menghasilkan string kosong, dan HUD menampilkan "—".
    APP_COMMIT: process.env.APP_COMMIT ?? "",
    NEXT_VERSION: versiNext(),
  },
  // Tujuh rute diganti nama pada November 2026 supaya label menu menyebut isinya. URL lama
  // sudah terbit di sitemap, di README repositori, dan di profil GitHub orang lain, jadi dia
  // tidak boleh dibiarkan 404: dipetakan permanen ke slug barunya masing-masing.
  async redirects() {
    return [
      { source: "/waktu", destination: "/kinerja", permanent: true },
      { source: "/sangkar", destination: "/interaksi", permanent: true },
      { source: "/meja", destination: "/potret", permanent: true },
      { source: "/peta", destination: "/proyek", permanent: true },
      { source: "/iris", destination: "/transisi", permanent: true },
      { source: "/arsip", destination: "/statistik", permanent: true },
      { source: "/baca", destination: "/tulisan", permanent: true },
      { source: "/baca/esai/:slug", destination: "/tulisan/esai/:slug", permanent: true },
    ];
  },
  async rewrites() {
    return [
      { source: "/api/login", destination: `${BACKEND_URL}/api/login` },
      { source: "/api/contact", destination: `${BACKEND_URL}/api/contact` },
      { source: "/api/auth/:path*", destination: `${BACKEND_URL}/api/auth/:path*` },
      { source: "/api/admin/:path*", destination: `${BACKEND_URL}/api/admin/:path*` },
      { source: "/api/certificates", destination: `${BACKEND_URL}/api/certificates` },
      { source: "/api/certificates/:path*", destination: `${BACKEND_URL}/api/certificates/:path*` },
      { source: "/api/experience", destination: `${BACKEND_URL}/api/experience` },
      { source: "/api/experience/:path*", destination: `${BACKEND_URL}/api/experience/:path*` },
      { source: "/api/journey", destination: `${BACKEND_URL}/api/journey` },
      { source: "/api/journey/:path*", destination: `${BACKEND_URL}/api/journey/:path*` },
      { source: "/api/health", destination: `${BACKEND_URL}/api/health` },
      { source: "/api/visit", destination: `${BACKEND_URL}/api/visit` },
      { source: "/api/visits", destination: `${BACKEND_URL}/api/visits` },
    ];
  },
  // Header keamanan pernah nol total: respons produksi hanya membawa x-powered-by dan
  // server: Google Frontend. Yang dipasang di sini adalah yang bisa ditegakkan dan bisa
  // dibuktikan lewat curl.
  //
  // CSP sengaja TIDAK dipasang. Situs ini memuat inline script milik Next, framer-motion,
  // dan three.js; policy yang benar butuh nonce per-request. Tanpa itu, satu-satunya CSP
  // yang bisa ditulis adalah report-only yang tidak punya collector — dia akan selalu
  // "hijau" tanpa pernah melaporkan apa pun. Itu hiasan, bukan kendali.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ],
      },
    ];
  },
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "avatars.githubusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "opengraph.githubassets.com", pathname: "/**" },
    ],
  },
  compress: true,
  productionBrowserSourceMaps: false,
  experimental: {
    agentUpgrade: "security",
  },
};

export default nextConfig;
