import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--f-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "M. Arkan Fauzi — Software Engineer Portfolio",
  description: "Portfolio of M. Arkan Fauzi, a Software Engineer specializing in .NET, Next.js, and cloud-native architectures.",
  keywords: ["Software Engineer", "Portfolio", ".NET", "Next.js", "Backend", "Arkan Fauzi"],
  openGraph: {
    title: "M. Arkan Fauzi — Software Engineer",
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
    <html lang="en" suppressHydrationWarning className={`${inter.variable}`}>
      <head>
      </head>
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
