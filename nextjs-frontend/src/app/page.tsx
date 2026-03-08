"use client";

import { ScrollProgress } from "@/components/UI/ScrollProgress";
import Cursor from "@/components/UI/Cursor";
import Preloader from "@/components/UI/Preloader";
import Navigation from "./components/Navigation";
import Hero from "./components/Hero";
import About from "./components/About";
import Projects from "./components/Projects";
import Contact from "./components/Contact";
import Footer from "./components/Footer";
import GlobalScrollNav from "./components/GlobalScrollNav";

export default function Home() {
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
        <About />
        <Projects />
        <Contact />
        <Footer />
      </div>

      {/* Global Sticky Overlays */}
      <GlobalScrollNav />
    </main>
  );
}
