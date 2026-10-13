import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "M. Arkan Fauzi — Full-Stack Developer Portfolio",
  description: "Portfolio of M. Arkan Fauzi, a Software Engineering student and apprentice Full Stack Engineer at Sekawan Media, building with Next.js, Go and Laravel.",
  keywords: ["Full-Stack Developer", "Portfolio", "Next.js", "Go", "Laravel", "Arkan Fauzi"],
  openGraph: {
    title: "M. Arkan Fauzi — Full-Stack Developer",
    description: "Immersive 3D portfolio of a fullstack software engineer.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${playfair.variable}`}>
      <head>
      </head>
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
