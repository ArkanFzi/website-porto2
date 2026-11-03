import type { Metadata } from "next";
import {
  Bagian,
  Bingkai,
  CatatanPenutup,
  KakiPanggung,
  Prolog,
  SundulPanggung,
} from "@/components/Editorial/PanggungFrame";
import { LOKASI, NAMA, PENDIDIKAN, PERAN, REKAMAN, RINGKAS, STACK } from "@/lib/profil";
import { RUTE_PROFIL } from "@/lib/rute";

// Isi halaman ini tidak diketik ulang di dua tempat: nama, peran, rekaman, pendidikan,
// dan stack dibaca dari lib/profil.ts, sumber yang sama yang dipakai bab penutup halaman
// utama. Angka yang diukur (bukan diklaim) sengaja tidak ditiru di sini — ia tinggal di
// /statistik, tempat pengunjungnya bisa melihat alat yang menghasilkan angka itu.
export const metadata: Metadata = {
  title: `${NAMA.toUpperCase()} — ${PERAN} // Profil`,
  description:
    "Who writes this portfolio: an apprenticeship in full-stack engineering at Sekawan Media on two " +
    "microservice applications, a software engineering programme at SMKN 6 Malang, and the projects " +
    "published on GitHub.",
  alternates: { canonical: "/tentang" },
  openGraph: {
    url: "/tentang",
    siteName: NAMA,
    type: "profile",
    title: `${NAMA.toUpperCase()} — ${PERAN} // Profil`,
    description: RINGKAS,
  },
};

const PIL = RUTE_PROFIL.filter((r) => r.href !== "/tentang").map((r) => ({
  href: r.href,
  label: `${r.label} ↗`,
}));

export default function Tentang() {
  return (
    <Bingkai>
      <SundulPanggung
        eyebrow="PROFIL // SIAPA YANG MENULIS HALAMAN INI"
        judul="TENTANG"
        sub={`${NAMA} · ${PERAN} · ${LOKASI}`}
        tautan={[{ href: "/", label: "← Editorial" }, ...PIL]}
      />

      <Prolog>{RINGKAS}</Prolog>

      <Bagian id="rekaman-kerja" judul="YANG SEDANG DAN PERNAH SAYA KERJAKAN">
        {REKAMAN.map((r) => (
          <div key={r.jabatan} className="flex flex-col gap-1.5 pt-4 swiss-border-b">
            <span className="font-mono text-tag tracking-[0.2em] uppercase text-obsidian">
              {r.jabatan}
            </span>
            <span className="font-mono text-micro tracking-[0.16em] uppercase text-titanium">
              {r.tempat} · {r.sejak}
            </span>
            <span className="font-sans text-body leading-snug text-obsidian/75">{r.keterangan}</span>
          </div>
        ))}
      </Bagian>

      <Bagian id="latar-dan-perkakas" judul="LATAR DAN PERKAKAS">
        <div className="flex flex-col gap-1.5 pt-4 swiss-border-b">
          <span className="font-mono text-tag tracking-[0.2em] uppercase text-obsidian">
            {PENDIDIKAN.sekolah}
          </span>
          <span className="font-mono text-micro tracking-[0.16em] uppercase text-titanium">
            {PENDIDIKAN.jurusan} · {PENDIDIKAN.sejak}
          </span>
        </div>
        {STACK.map((g) => (
          <div key={g.kelompok} className="flex flex-col gap-1.5 pt-4 swiss-border-b">
            <span className="font-mono text-tag tracking-[0.2em] uppercase text-obsidian">
              {g.kelompok}
            </span>
            <span className="font-sans text-body leading-snug text-obsidian/75">{g.isi.join(" · ")}</span>
          </div>
        ))}
      </Bagian>

      <CatatanPenutup id="yang-tidak-klaim" judul="YANG TIDAK SAYA CETAK DI HALAMAN INI">
        Tidak ada angka yang dibulatkan menjadi kesan di sini. Yang berbentuk angka — ritme frame,
        latency handler, hop ke basis data, bintang repositori — hidup di halaman lain beserta alat
        yang mengukurnya: <span className="font-mono text-micro uppercase">/statistik</span> untuk
        yang terukur langsung, <span className="font-mono text-micro uppercase">/proyek</span> dan{" "}
        <span className="font-mono text-micro uppercase">/tulisan</span> untuk yang dikerjakan.
      </CatatanPenutup>

      <KakiPanggung
        sumber="SOURCE: lib/profil.ts · kertas render /cv-layout yang mencetak PDF /api/cv"
        halaman="TENTANG"
      />
    </Bingkai>
  );
}
