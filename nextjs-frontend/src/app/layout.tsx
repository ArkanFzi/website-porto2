import type { Metadata } from "next";
import { Inter, Playfair_Display, Space_Mono } from "next/font/google";
import "./globals.css";
import { PortfolioModeProvider } from "@/context/PortfolioModeContext";

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
  title: "M. Arkan Fauzi — Systems Architect & Creative Technologist // #16",
  description: "Awwwards-grade interactive editorial portfolio of M. Arkan Fauzi (@ArkanFzi). Haute-couture minimalism meets real-time WebGL Chiaroscuro shader sculpture.",
  keywords: ["Arkan Fauzi", "Full Stack Engineer", "WebGL", "Three.js", "Scuderia Ferrari", "Creative Technologist"],
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
