import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased" style={{ fontFamily: "var(--font-body)" }}>
        {children}
      </body>
    </html>
  );
}
