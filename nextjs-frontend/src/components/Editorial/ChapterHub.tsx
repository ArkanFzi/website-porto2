"use client";

/** ChapterHub: section akses cepat antara bab 02 dan 03 — lima rute teknis dipasang
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
import { RUTE_TEKNIS } from "@/lib/rute";

const HubPanggung = dynamic(() => import("@/components/Three/panggung/HubFerrari"), {
  ssr: false,
});

/** Sumber: RUTE_TEKNIS di lib/rute.ts — daftar yang sama yang dibaca verifier lewat
 *  kunciHref. Lima node, bukan tujuh lagi: /proyek dan /tulisan sudah naik ke menu profil. */
const RUTE = RUTE_TEKNIS;

/** Sudut layar tiap node, radian, berlawanan arah jarum jam dari titik jam 12.
 *  Sama persis dengan yang dibaca cincin 3D dan haluan mobil. */
const SUDUT = RUTE.map((_, i) => Math.PI / 2 - (i * Math.PI * 2) / RUTE.length);

/** Elips penempatan label dalam persen kotak panggung. Ry kecil karena cincin dilihat
 *  miring: proyeksi layar cincin dunia memang pipih.
 *
 *  Angkanya diturunkan dari proyeksi cincin yang sebenarnya, bukan dikira: kamera
 *  [0, 2,15, 5,3] fov 42 pada kotak 1180x558 memproyeksi lingkaran JARI 1,9 menjadi elips
 *  rx 254 px / ry 100 px yang pusatnya duduk di y 324 px (58,1%), dan node dipasang 15% di
 *  luar elips itu supaya titik kursor tidak menutupi bodi. Selama kotak hitam masih ada,
 *  simpangan ini tidak kelihatan karena semuanya tenggelam di latar yang sama gelapnya;
 *  di atas kertas, label yang melayang 2x radius cincin terbaca sebagai daftar yang kebetulan
 *  dilingkarkan, bukan sebagai peta. */
const RX = 25;
const RY = 21;
const PUSAT_Y = 58;

const posisiNode = (i: number) => ({
  left: `${50 + RX * Math.cos(SUDUT[i])}%`,
  top: `${PUSAT_Y - RY * Math.sin(SUDUT[i])}%`,
});

/** Sudut bingkai viewport — empat tanda plus, di luar SUDUT node yang sudah lebih dulu
 *  memakai nama itu. Class string, bukan objek style, supaya Tailwind tetap melihatnya. */
const SUDUT_BINGKAI = ["top-2 left-2", "top-2 right-2", "bottom-2 left-2", "bottom-2 right-2"];

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
      <div className="w-full max-w-[1180px] mx-auto flex flex-col items-center text-center">
        <div className="w-full flex items-center justify-between pb-6 swiss-border-b mb-10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#D41E12]" />
            <span className="font-mono text-[11px] font-bold tracking-[0.25em] uppercase text-[#D41E12]">
              PIT WALL // SECTOR ACCESS
            </span>
          </div>
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#6E6A64] hidden sm:block">
            {node === null ? "PARKED // SELECT A SECTOR" : `TRACKING // ${RUTE[node].label}`}
          </span>
        </div>

        {/* Kepala section duduk DI ATAS panggung, bukan di kolom kanan: yang dibaca lebih
            dulu adalah "ini peta lima sektor", baru lingkarannya. */}
        <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-[#D41E12] mb-4">
          FIVE SECTORS // ONE STEER
        </span>
        <h2 className="font-serif text-4xl sm:text-5xl font-bold tracking-tight text-[#D41E12] mb-4">
          THE PIT WALL
        </h2>
        <p className="font-mono text-[11px] leading-relaxed text-[#6E6A64] max-w-[62ch] mb-10">
          Every experiment on this site is a sector of the same circuit. Point at one and the
          car looks where you are going; the ring is a map, not a menu you have to open.
        </p>

        {/* Panggung: kanvas + node, hanya di layar lebar. Kotaknya dihapus, bukan
            diperindah: kanvas ini alpha:true sejak awal, jadi satu-satunya alasan dulu
            ada kotak hitam adalah supaya sorot panggung punya dinding untuk jatuh.
            Tanpa sorot, dinding itu yang membuat panggung terbaca sebagai video player
            yang ditempel ke kertas — jadi yang dilukis di belakang podium sekarang adalah
            kertas halaman itu sendiri. Tidak ada border, tidak ada gradien, tidak ada
            vignette; PanggungKecil sudah memotong kanvasnya sendiri. */}
        <div
          data-hub-panggung=""
          className="hidden md:block relative w-full h-[62vh] min-h-[460px] max-h-[720px]"
        >
          <div className="absolute inset-0">
            {adaTempat && (
              <HubPanggung sudut={SUDUT} node={node} dekat={dekat} terlihat={terlihat} />
            )}
          </div>
          {/* Tanda daftar di empat sudut: bekas bingkai viewport, sekarang tinta di atas
              kertas, bukan cahaya di atas hitam. `pointer-events-none` menahan lima node di
              bawahnya tetap bisa diklik. */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            {SUDUT_BINGKAI.map((kelas) => (
              <span
                key={kelas}
                className={`absolute font-mono text-[13px] leading-none text-[#12100E]/20 ${kelas}`}
              >
                +
              </span>
            ))}
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
              {/* Titik + cincin berdenyut. Denyut hanya ada selama section ini benar-benar
                  terlihat: animasi CSS yang berjalan terus adalah kompositing yang dibayar
                  bahkan saat tidak ada yang melihat, dan halaman ini punya hukum diam.
                  Tintanya tinta, bukan cahaya: node duduk di atas kertas, dan satu-satunya
                  hal yang boleh menyala di section ini adalah rosso yang dipilih. */}
              <span className="relative flex h-3.5 w-3.5 items-center justify-center">
                {terlihat && (
                  <span className="absolute inset-0 rounded-full border border-[#12100E]/25 animate-ping motion-reduce:hidden" />
                )}
                <span
                  className={`w-3.5 h-3.5 rounded-full border transition-colors duration-200 ${
                    node === i ? "border-[#D41E12] bg-[#D41E12]" : "border-[#12100E]/45 bg-[#F2F0EA]"
                  }`}
                />
              </span>
              <span className="h-px w-3 bg-[#12100E]/25" aria-hidden />
              <span
                className={`rounded-full border px-2.5 py-[3px] font-mono text-[10px] font-bold uppercase tracking-[0.25em] transition-colors duration-200 ${
                  node === i
                    ? "border-[#D41E12] bg-[#D41E12] text-[#FFFDF8]"
                    : "border-[#12100E]/25 bg-[#F2F0EA]/85 text-[#12100E]/75"
                }`}
              >
                {r.label}
              </span>
            </a>
          ))}
        </div>

        {/* Daftar fallback: di bawah md panggung tidak punya tempat, jadi lima tautan inilah
            petanya. Sama seperti node di lingkarannya, status "ditunjuk" dibawa lewat `node`. */}
        <nav
          aria-label="Pit wall access"
          className="grid grid-cols-2 gap-3 w-full max-w-[420px] md:hidden"
        >
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

        {/* Kredit yang ditagih lisensi CC-BY-4.0: judul, penulis, dan lisensinya harus
            terlihat di halaman, bukan hanya di sf26-livery-LICENSE.txt di samping file. */}
        <p className="font-mono text-[9px] tracking-[0.15em] uppercase text-[#6E6A64] mt-8 max-w-[80ch]">
          Model:{" "}
          <a
            href="https://sketchfab.com/3d-models/2026-ferrari-sf-26-e5ca6cecdc42449283f4bed27360f2a7"
            rel="noopener"
            className="underline decoration-[#D9D5CC] hover:text-[#D41E12]"
          >
            2026 Ferrari SF-26
          </a>{" "}
          oleh{" "}
          <a href="https://sketchfab.com/Tyler_Dave" rel="noopener" className="underline decoration-[#D9D5CC] hover:text-[#D41E12]">
            Dave Love
          </a>{" "}
          ·{" "}
          <a href="https://creativecommons.org/licenses/by/4.0/" rel="noopener" className="underline decoration-[#D9D5CC] hover:text-[#D41E12]">
            CC-BY-4.0
          </a>
        </p>
      </div>
    </section>
  );
};

export default ChapterHub;
