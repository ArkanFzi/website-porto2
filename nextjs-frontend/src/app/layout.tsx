import type { Metadata } from "next";
import { Inter, Playfair_Display, Space_Mono } from "next/font/google";
import "./globals.css";
import { PortfolioModeProvider } from "@/context/PortfolioModeContext";
import { SITE_URL } from "@/lib/site";

const inter = Inter({
  subsets: ["latin"],
  variable: "--f-sans",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--f-serif",
  display: "swap",
});

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--f-mono",
  display: "swap",
});

export const metadata: Metadata = {
  // Tanpa metadataBase, open graph & canonical keluar sebagai URL relatif dan crawler
  // membacanya dari host apa pun halaman itu jatuh (termasuk *.run.app).
  metadataBase: new URL(SITE_URL),
  title: "M. Arkan Fauzi — Systems Architect & Creative Technologist // #16",
  description: "Interactive editorial portfolio of M. Arkan Fauzi (@ArkanFzi): a Swiss-grid editorial page carried by one real-time WebGL chiaroscuro shader, with telemetry measured live from the running services.",
  keywords: ["Arkan Fauzi", "Full Stack Engineer", "WebGL", "Three.js", "Scuderia Ferrari", "Creative Technologist"],
  // Canonical sengaja TIDAK ada di sini. Metadata layout diwarisi semua rute yang tidak
  // menyetel sendiri, dan pada build terukur itu berarti lima halaman memancarkan
  // href="https://<domain>" sebagai halaman aslinya: admin.html, admin/dashboard.html,
  // admin/login.html, cv-layout.html dan _not-found.html. Yang terakhir paling parah —
  // halaman 404 mengklaim bahwa homepage-lah bentuk kanoniknya. Pemilik canonical "/"
  // sekarang src/app/page.tsx; rute lain sudah memilikinya sendiri.
  openGraph: {
    url: "/",
    siteName: "M. Arkan Fauzi",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${playfair.variable} ${spaceMono.variable}`}>
      <body className="antialiased font-sans selection:bg-[#D41E12] selection:text-white">
        <PortfolioModeProvider>
          {/* Film Grain Texture Overlay */}
          <div className="film-grain" aria-hidden="true" />
          {children}
        </PortfolioModeProvider>
      </body>
    </html>
  );
}
