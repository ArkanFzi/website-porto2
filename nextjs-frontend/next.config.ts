import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      { source: "/api/login", destination: `${BACKEND_URL}/api/login` },
      { source: "/api/auth/:path*", destination: `${BACKEND_URL}/api/auth/:path*` },
      { source: "/api/admin/:path*", destination: `${BACKEND_URL}/api/admin/:path*` },
      { source: "/api/certificates", destination: `${BACKEND_URL}/api/certificates` },
      { source: "/api/certificates/:path*", destination: `${BACKEND_URL}/api/certificates/:path*` },
      { source: "/api/experience", destination: `${BACKEND_URL}/api/experience` },
      { source: "/api/experience/:path*", destination: `${BACKEND_URL}/api/experience/:path*` },
    ];
  },
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
