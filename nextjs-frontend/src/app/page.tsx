import { ScrollProgress } from "@/components/UI/ScrollProgress";
import Cursor from "@/components/UI/Cursor";
import Preloader from "@/components/UI/Preloader";
import Navigation from "./components/Navigation";
import Hero from "./components/Hero";
import About from "./components/About";
import Journey from "./components/Journey";
import Projects from "./components/Projects";
import Contact from "./components/Contact";
import Footer from "./components/Footer";
import GlobalScrollNav from "./components/GlobalScrollNav";
import { ambilMetrikGitHub, daftarReposGitHub, ringkasRepos } from "@/lib/server/github";
import { daftarPerjalanan } from "@/lib/server/journey";

// Halaman ini dirender di server lalu disimpan, jadi angka GitHub dan entri
// perjalanan ada di HTML pertama. 60 detik dipilih karena entri perjalanan
// dikarang lewat admin dan tidak boleh menguap terlalu lama; fetch GitHub di
// bawahnya punya revalidate sendiri (3600 / 600) jadi tidak ikut dikepung dua
// menit sekali.
export const revalidate = 60;

export default async function Home() {
  // Satu sumber yang gagal tidak menyeret seluruh halaman: fallback-nya kosong,
  // sama seperti yang dulu terjadi di browser ketika fetch client gagal.
  const [metrik, repos, perjalanan] = await Promise.all([
    ambilMetrikGitHub().catch(() => null),
    daftarReposGitHub().then(ringkasRepos).catch(() => []),
    daftarPerjalanan().catch(() => []),
  ]);

  return (
    <main className="min-h-screen relative" style={{ color: "var(--fg)", backgroundColor: "var(--bg)" }}>
      <Preloader />
      <ScrollProgress />
      <Cursor />

      <Navigation />

      {/* Hero must sit under everything to be full bleed */}
      <Hero />

      {/* Rest of the content */}
      <div className="relative z-10">
        <About metrics={metrik} />
        <Journey entries={perjalanan} />
        <Projects repos={repos} />
        <Contact />
        <Footer />
      </div>

      {/* Global Sticky Overlays */}
      <GlobalScrollNav />
    </main>
  );
}
