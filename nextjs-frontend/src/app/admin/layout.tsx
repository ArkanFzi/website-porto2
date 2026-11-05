import type { Metadata } from "next";
import type { ReactNode } from "react";
import AdminLayoutClient from "./AdminLayoutClient";

// robots.txt menahan crawler dari MEMBACA /admin, tapi tidak dari MENGINDEKS-nya: selama
// homepage menautkannya, URL itu masuk antrean Google dan yang tercetak di hasil pencarian
// adalah keberadaan panel admin. Tautan itu sudah dihapus (ChapterPaddock); ini sisi
// dokumennya, dan ia berlaku untuk seluruh subtree karena diwarisi tanpa bisa ditimpa halaman
// yang tidak mengekspor metadata sendiri.
//
// Berkas ini harus komponen server: `export const metadata` tidak bisa hidup di modul
// "use client", dan sebelum pemisahan ini seluruh subtree /admin tidak punya robots meta
// sama sekali. Judul sengaja tidak dipasang supaya <title> halaman admin tidak berubah.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
