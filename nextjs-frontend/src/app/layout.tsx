import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, Space_Mono } from "next/font/google";
import "./globals.css";
import { PortfolioModeProvider } from "@/context/PortfolioModeContext";
import { jsonLd, OG_GAMBAR, SITE_URL } from "@/lib/site";
import { NAMA, PERAN, SALURAN } from "@/lib/profil";

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
    images: [OG_GAMBAR],
  },
};

// themeColor dan colorScheme hidup di `viewport`, bukan di dalam `metadata`: sejak Next 14
// keduanya di sana deprecated dan tidak menghasilkan apa pun. Dua-duanya nilai literal karena
// <meta> tidak bisa membaca CSS var — #F7F5F0 adalah --bg-paper (globals.css:5) dan halaman ini
// terang oleh background-color itu sendiri (globals.css:46), jadi colorScheme "light" adalah
// laporan apa adanya, bukan selera: browser memakai nilai ini untuk scrollbar, form control,
// dan warna tab baru.
export const viewport: Viewport = {
  themeColor: "#F7F5F0",
  colorScheme: "light",
};

// sameAs tidak diketik ulang: dia disaring dari SALURAN, daftar yang memang diterbitkan
// ChapterPaddock di halaman depan. Saluran yang bukan profil identitas (mailto:, wa.me)
// dibuang — itu jalan masuk, bukan akun.
const PROFIL_IDENTITAS = new Set(["GITHUB", "LINKEDIN", "INSTAGRAM"]);

// Person + WebSite dalam satu script: Google menerima array di application/ld+json, dan dua
// node berarti dua kali parse untuk satu fakta yang sama.
const STRUKTUR_SITUS = [
  {
    "@context": "https://schema.org",
    "@type": "Person",
    name: NAMA,
    url: SITE_URL,
    jobTitle: PERAN,
    sameAs: SALURAN.filter((s) => PROFIL_IDENTITAS.has(s.nama)).map((s) => s.url),
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: NAMA,
    url: SITE_URL,
    inLanguage: "en",
  },
];

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
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={jsonLd(STRUKTUR_SITUS)}
          />
        </PortfolioModeProvider>
      </body>
    </html>
  );
}
