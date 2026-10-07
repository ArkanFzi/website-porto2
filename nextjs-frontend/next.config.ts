import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  output: "standalone",
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
      { source: "/api/health", destination: `${BACKEND_URL}/api/health` },
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
};

export default nextConfig;
