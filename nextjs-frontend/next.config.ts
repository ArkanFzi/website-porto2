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

const produksi = process.env.NODE_ENV === "production";

// Isinya hasil ukur, bukan daftar keinginan: setiap request browser di 16 rute (document, script,
// stylesheet, font, image, fetch, other) berasal dari origin ini sendiri, ditambah satu
// `data:image/svg+xml` untuk ikon inline. Tidak ada host ketiga — font dilayani next/font dari
// origin sendiri, tidak ada analytics, dan backend dijangkau lewat rewrite same-origin `/api/*`.
// Karena itu `default-src 'self'` bisa ditegakkan tanpa daftar domain.
//
// Kompromi ditulis apa adanya, tidak disamarkan jadi "situs sudah pakai CSP ketat":
//  • `'unsafe-inline'` pada script dan style. Nonce per-request adalah alternatifnya, tapi Next
//    hanya bisa memakainya pada halaman dynamic — seluruh rute situs ini di-prerender (`○ Static`
//    di output build), dan nonce memaksa semuanya render per request: tanpa cache CDN, dan
//    bertabrakan dengan PPR. Di sisi style, framer-motion menulis atribut `style` yang berubah
//    tiap frame, jadi hash (`'unsafe-hashes'`) juga tidak stabil.
//  • Yang tetap tertutup meskipun inline diizinkan: sumber lintas origin (connect/img/script),
//    `object`, `frame`, `base-uri`, `form-action`, dan framing. Script yang disuntik lewat XSS
//    masih bisa berlari, tetapi tidak bisa memanggil server lain — dan curi kredensial sudah
//    ditutup lebih hulu: cookie HttpOnly + SameSite, `Secure` ditakar dari Host, revokasi sesi
//    di backend, serta diagnostik infra yang tidak lagi dikirim ke pengunjung.
//  • `'unsafe-eval'` hanya di development (React memakai eval untuk merangkai stack error server
//    di browser). Produksi tidak memakainya — dibuktikan oleh pemindaian pelanggaran pada build
//    produksi yang bersih tanpanya.
//  • `upgrade-insecure-requests` hanya di production: direktif ini juga menaikkan `ws://` menjadi
//    `wss://`, dan HMR `next dev` memakai websocket polos di localhost.
//
// `blob:` pada connect-src dan `wasm-unsafe-eval` pada script-src bukan tebakan: model 3D di
// halaman utama (public/models/sf26.glb) dibuka DRACOLoader, yang membuat worker dari URL blob
// dan mengompilasi wasm-nya. Tanpa keduanya pemindaian pelanggaran mencatat `connect-src blob`
// dan `script-src wasm-eval` dari chunk three.js, dan mobilnya tidak muncul. `wasm-unsafe-eval`
// adalah varian sempitnya — dia hanya mengizinkan kompilasi WebAssembly, bukan `eval` string.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${produksi ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self' blob:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(produksi ? ["upgrade-insecure-requests"] : []),
].join("; ");

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
  // dibuktikan lewat curl. CSP-nya sendiri dijelaskan di atas (konstanta `csp`); yang dipasang
  // di sini adalah enforcement, bukan report-only — report-only tanpa collector selalu "hijau"
  // tanpa pernah melaporkan apa pun, dan itu hiasan, bukan kendali.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
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
