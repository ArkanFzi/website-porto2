import type { Metadata } from "next";
import type { ReactNode } from "react";

// /cv-layout bukan halaman untuk crawler: ia kertas render yang dipakai /api/cv untuk
// mencetak PDF, dan robots.txt sudah men-disallow jalurnya. Metadata di sini menutup celah
// yang sama dari sisi dokumen — tautan masuk dari luar tidak akan membuatnya terindeks —
// dan memberi judul yang benar pada berkas PDF yang dihasilkan puppeteer.
export const metadata: Metadata = {
  title: "CV render sheet // M. Arkan Fauzi",
  description:
    "Print-oriented layout consumed by /api/cv. It is not part of the editorial site and it is not indexed.",
  robots: { index: false, follow: false },
};

export default function CVLayoutSegment({ children }: { children: ReactNode }) {
  return children;
}
