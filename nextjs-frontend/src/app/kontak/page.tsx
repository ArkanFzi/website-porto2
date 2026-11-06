import type { Metadata } from "next";
import {
  Bagian,
  Bingkai,
  CatatanPenutup,
  KakiPanggung,
  Prolog,
  SundulPanggung,
} from "@/components/Editorial/PanggungFrame";
import { EMAIL_KONTAK, OG_GAMBAR } from "@/lib/site";
import { LOKASI, NAMA, PERAN, SALURAN } from "@/lib/profil";
import { RUTE_PROFIL } from "@/lib/rute";
import { GerakDokumen } from "@/components/Editorial/GerakRute";

// Daftar saluran tidak diketik ulang di sini: ia sumber yang sama dengan bar sosial di
// bab penutup halaman utama (lib/profil.ts). Nomor dan alamat ditulis apa adanya dari
// daftar itu — perbedaan antara nomor kertas CV dan nomor WhatsApp dilaporkan apa adanya
// di CatatanPenutup, bukan diputuskan sepihak oleh halaman ini.
export const metadata: Metadata = {
  title: `${NAMA.toUpperCase()} — ${PERAN} // Kontak`,
  description:
    "How to reach M. Arkan Fauzi: WhatsApp for the fastest answer, email for documents, GitHub and " +
    "LinkedIn for the work itself, plus a headless-Chromium generated dossier PDF.",
  alternates: { canonical: "/kontak" },
  openGraph: {
    images: [OG_GAMBAR],
    url: "/kontak",
    siteName: NAMA,
    type: "profile",
    title: `${NAMA.toUpperCase()} — ${PERAN} // Kontak`,
    description: `Email ${EMAIL_KONTAK} · WhatsApp +62 813 3231 4854 · ${LOKASI}`,
  },
};

const PIL = RUTE_PROFIL.filter((r) => r.href !== "/kontak").map((r) => ({
  href: r.href,
  label: `${r.label} ↗`,
}));

export default function Kontak() {
  return (
    <Bingkai>
      <div data-gerak="geser">
        <SundulPanggung
          eyebrow="PROFIL // JALAN MENUJU SAYA"
          judul="KONTAK"
          sub={`${LOKASI} · menjawab dalam bahasa Indonesia atau Inggris`}
          tautan={[{ href: "/", label: "← Editorial" }, ...PIL]}
        />
      </div>

      <div data-gerak="terbit">
        <Prolog>
          Semua saluran di bawah adalah saluran yang benar-benar saya baca. Kalau yang ditanyakan
          soal pekerjaan, sebutkan yang ingin dilihat — halaman ini menautkan kode, angka, dan CV
          yang sama, jadi tidak perlu menunggu jawaban untuk mulai memeriksa sendiri.
        </Prolog>
      </div>

      <Bagian id="saluran" judul="SALURAN">
        {SALURAN.map((s, i) => (
          <a
            key={s.nama}
            data-gerak="terbit"
            data-urutan={i}
            href={s.url}
            target={s.url.startsWith("mailto:") ? undefined : "_blank"}
            rel="noopener noreferrer"
            className="flex flex-col gap-1.5 pt-4 swiss-border-b hover:border-rosso transition-colors"
          >
            <span className="font-mono text-tag tracking-[0.2em] uppercase text-rosso">{s.nama}</span>
            <span className="font-sans text-body leading-snug text-obsidian/75">{s.catatan}</span>
            <span className="font-mono text-micro tracking-[0.12em] text-titanium break-words">
              {s.url.replace(/^https?:\/\//, "").replace(/^mailto:/, "")}
            </span>
          </a>
        ))}
      </Bagian>

      <Bagian id="dokumen" judul="DOKUMEN">
        <a
          data-gerak="terbit"
          data-urutan={0}
          href="/api/cv"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col gap-1.5 pt-4 swiss-border-b hover:border-rosso transition-colors"
        >
          <span className="font-mono text-tag tracking-[0.2em] uppercase text-obsidian">CV (PDF)</span>
          <span className="font-sans text-body leading-snug text-obsidian/75">
            Kertas CV yang sama dengan yang tercetak di situs ini, dijalankan lewat headless Chromium
            saat diminta — bukan berkas statis, jadi isinya selalu mengikuti kode yang sedang terpasang.
          </span>
        </a>
        <div
          data-gerak="terbit"
          data-urutan={1}
          className="flex flex-col gap-1.5 pt-4 swiss-border-b"
        >
          <span className="font-mono text-tag tracking-[0.2em] uppercase text-obsidian">KODE</span>
          <span className="font-sans text-body leading-snug text-obsidian/75">
            Repositori yang memuat halaman ini dan perkakas di sekitarnya ada di GitHub, dan setiap
            angka di situs ini bisa ditunjuk sumbernya di /proyek dan /tulisan.
          </span>
        </div>
      </Bagian>

      <div data-gerak="terbit">
        <CatatanPenutup id="catatan-nomor" judul="SATU HAL YANG BELUM KOHEREN">
          Kertas CV mencetak nomor <span className="font-mono text-micro">+62 812 3231 4845</span>,
          sedangkan tautan WhatsApp yang diterbitkan di bab penutup menuju{" "}
          <span className="font-mono text-micro">+62 813 3231 4854</span>. Keduanya ada di situs ini
          hari ini; halaman ini memakai yang kedua karena itulah yang selama ini diklik, dan
          perbedaannya dilaporkan, bukan disembunyikan.
        </CatatanPenutup>
      </div>

      <KakiPanggung
        sumber="SOURCE: lib/profil.ts SALURAN · lib/site.ts EMAIL_KONTAK · /api/cv"
        halaman="KONTAK"
      />

      <GerakDokumen />
    </Bingkai>
  );
}
