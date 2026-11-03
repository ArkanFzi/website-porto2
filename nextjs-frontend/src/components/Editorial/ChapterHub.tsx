"use client";

/** ChapterHub: section akses cepat antara bab 02 dan 03 — tujuh rute panggung dipasang
 *  sebagai node pada cincin mengelilingi SF-26. Mobil tidak ikut menavigasi; hover/fokus
 *  hanya memindahkan TATAPAN halunya ke arah node, satu-satunya gerak yang dibayar halaman
 *  ini saat pengunjung menunjuk.
 *
 *  Node adalah <a> sungguhan di DOM, bukan teks dalam WebGL: bisa di-tab, di-hit oleh
 *  kursor magnetik, dan dibaca verifier tanpa menyentuh __scene. Posisi elips dan sudut yaw
 *  3D memakai tabel SUDUT yang sama — satu sumber, dua pemakai — supaya label dan haluan
 *  tidak bisa berbeda arah.
 *
 *  Kanvasnya di-mount lewat dynamic(ssr:false), sama seperti kanvas editorial: three tidak
 *  boleh masuk jalur kritis, dan aset 1,6 MB baru diminta saat section mendekat. */
import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import MeshPortal from "./MeshPortal";

const HubPanggung = dynamic(() => import("@/components/Three/panggung/HubFerrari"), {
  ssr: false,
});

/** Sumber: lima pil di bingkai HUD + dua tautan bar bawah. Angka tujuh ini ditagih
 *  halaman-probe dengan daftar terkunci yang sama. */
const RUTE = [
  { href: "/waktu", label: "WAKTU" },
  { href: "/sangkar", label: "SANGKAR" },
  { href: "/meja", label: "MEJA" },
  { href: "/peta", label: "PETA" },
  { href: "/iris", label: "IRIS" },
  { href: "/arsip", label: "ARSIP" },
  { href: "/baca", label: "BACA" },
];

/** Sudut layar tiap node, radian, berlawanan arah jarum jam dari titik jam 12.
 *  Sama persis dengan yang dibaca cincin 3D dan haluan mobil. */
const SUDUT = RUTE.map((_, i) => Math.PI / 2 - (i * Math.PI * 2) / RUTE.length);

/** Elips penempatan label dalam persen kotak panggung. Ry kecil karena cincin dilihat
 *  miring: proyeksi layar cincin dunia memang pipih. */
const RX = 43;
const RY = 27;
const PUSAT_Y = 52;

const posisiNode = (i: number) => ({
  left: `${50 + RX * Math.cos(SUDUT[i])}%`,
  top: `${PUSAT_Y - RY * Math.sin(SUDUT[i])}%`,
});

export const ChapterHub: React.FC = () => {
  const wadah = useRef<HTMLElement>(null);
  const [node, setNode] = useState<number | null>(null);
  const [dekat, setDekat] = useState(false);
  const [terlihat, setTerlihat] = useState(false);
  // Panggung hanya punya tempat di atas breakpoint md; di bawahnya stage di-display:none.
  // Diukur di 390x844: tanpa gerbang ini ponsel tetap membuka context WebGL, mengunduh
  // sf26.glb (841 KB) dan memasang Mobil ke kotak 300x150 yang tidak akan pernah terlihat.
  const [adaTempat, setAdaTempat] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const tulis = () => setAdaTempat(mq.matches);
    tulis();
    mq.addEventListener("change", tulis);
    return () => mq.removeEventListener("change", tulis);
  }, []);

  useEffect(() => {
    const el = wadah.current;
    if (!el || !adaTempat) return;
    // Gerbang aset: longgar dan lengket. Sekali GLB diminta, Mobil tidak boleh dibongkar-
    // pasang tiap kali section keluar masuk layar (asetnya di-cache, decodernya tidak).
    const ioAset = new IntersectionObserver(
      (daftar) => {
        if (!daftar.some((e) => e.isIntersecting)) return;
        setDekat(true);
        ioAset.disconnect();
      },
      { rootMargin: "60% 0px" }
    );
    // Gerbang bingkai: nyaris ketat. rootMargin 60% dipakai sendirian terbukti salah —
    // diukur di 1440x900, halaman yang parkir di tengah #chapter-03 masih membaca hub
    // "beririsan" (hub -1343..-347 vs akar -540..1440) sehingga kanvas hub melukis 51 draw
    // call selama 3 s di luar layar. 10% cukup untuk menyiapkan frame pertama sebelum
    // panggung muncul, dan mati saat bab lain yang dibaca.
    const ioLayar = new IntersectionObserver(
      (daftar) => setTerlihat(daftar.some((e) => e.isIntersecting)),
      { rootMargin: "10% 0px" }
    );
    ioAset.observe(el);
    ioLayar.observe(el);
    return () => {
      ioAset.disconnect();
      ioLayar.disconnect();
    };
  }, [adaTempat]);

  const tunjuk = (i: number | null) => setNode(i);

  return (
    <section
      id="chapter-hub"
      ref={wadah}
      className="relative w-full min-h-screen pt-[calc(var(--hud-atas,196px)+2rem)] pb-48 px-6 md:px-12 select-none"
    >
      {/* Kartu potret melangkah KELUAR layar selama hub, bukan bersembunyi di belakang
          panggung. Sudah diukur: portal itu jangkar viewport (fixed) sementara stage mengalir
          996 px di rentang parkir dan tingginya cuma 520 px — tidak ada kotak fixed yang bisa
          tetap tertutup panggung di sepanjang rentang itu, dan kotak yang dikira-kira malah
          menyisakan dagu kartu di bawah stage. Kotak di kiri luar viewport membuat kartu
          terpotong habis (tepi portal adalah batas potong uMask) pada semua lebar layar, dan
          ukurannya sama dengan portal bab 02 sehingga perpindahan masuk hub hanya geser
          mendatar, tidak mengubah besar kartu. Nomor bab 5 hanya identitas: urutan
          koreografi dihitung dari posisi section, bukan dari angkanya. */}
      <MeshPortal
        bab={5}
        className="-left-[30vw] top-[20vh] h-[60vh] w-[23vw]"
        ease="halus"
      />
      <div className="w-full max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between pb-6 swiss-border-b mb-12">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#D41E12]" />
            <span className="font-mono text-[11px] font-bold tracking-[0.25em] uppercase text-[#D41E12]">
              PIT WALL // SECTOR ACCESS
            </span>
          </div>
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#6E6A64]">
            {node === null ? "PARKED // SELECT A SECTOR" : `TRACKING // ${RUTE[node].label}`}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-start">
          {/* Panggung: kanvas + node, hanya di layar lebar */}
          <div className="hidden md:block md:col-span-7 relative w-full h-[58vh] min-h-[420px] swiss-border bg-[#0A0A0A] overflow-hidden">
            <div className="absolute inset-0">
              {adaTempat && <HubPanggung sudut={SUDUT} node={node} dekat={dekat} terlihat={terlihat} />}
            </div>
            {RUTE.map((r, i) => (
              <a
                key={r.href}
                href={r.href}
                data-hub-node={i}
                aria-label={`Open ${r.label} sector`}
                onMouseEnter={() => tunjuk(i)}
                onMouseLeave={() => tunjuk(null)}
                onFocus={() => tunjuk(i)}
                onBlur={() => tunjuk(null)}
                style={{ left: posisiNode(i).left, top: posisiNode(i).top }}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-auto"
              >
                <span
                  className={`w-3.5 h-3.5 rounded-full border transition-colors duration-200 ${
                    node === i
                      ? "border-[#D41E12] bg-[#D41E12] shadow-[0_0_12px_rgba(212,30,18,0.6)]"
                      : "border-white/40 bg-white/5"
                  }`}
                />
                <span
                  className={`font-mono text-[10px] font-bold tracking-[0.25em] uppercase transition-colors duration-200 ${
                    node === i ? "text-[#D41E12]" : "text-white/70"
                  }`}
                >
                  {r.label}
                </span>
              </a>
            ))}
          </div>

          {/* Kolom kanan: judul + fallback daftar untuk layar sempit */}
          <div className="col-span-1 md:col-span-5 flex flex-col md:pl-6">
            <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-[#D41E12] block mb-6">
              SEVEN SECTORS // ONE STEER
            </span>
            <h2 className="font-serif text-4xl sm:text-5xl font-bold tracking-tight text-[#D41E12] mb-6">
              THE PIT WALL
            </h2>
            <p className="font-mono text-[11px] leading-relaxed text-[#6E6A64] max-w-[46ch]">
              Every experiment on this site is a sector of the same circuit. Point at one and the
              car looks where you are going; the ring is a map, not a menu you have to open.
            </p>

            <nav aria-label="Pit wall access" className="grid grid-cols-2 gap-3 mt-8 md:hidden">
              {RUTE.map((r, i) => (
                <a
                  key={r.href}
                  href={r.href}
                  data-hub-node={i}
                  onMouseEnter={() => tunjuk(i)}
                  onMouseLeave={() => tunjuk(null)}
                  onFocus={() => tunjuk(i)}
                  onBlur={() => tunjuk(null)}
                  className={`font-mono text-[10px] tracking-[0.25em] uppercase px-4 py-3 rounded-full border transition-colors text-center ${
                    node === i
                      ? "border-[#D41E12] text-[#D41E12]"
                      : "border-[#D9D5CC] text-[#6E6A64] hover:border-[#D41E12] hover:text-[#D41E12] focus-visible:border-[#D41E12] focus-visible:text-[#D41E12]"
                  }`}
                >
                  {r.label}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ChapterHub;
