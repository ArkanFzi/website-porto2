import type { Metadata } from "next";
import { daftarReposGitHub, ringkasRepos } from "@/lib/server/github";
import { daftarPerjalanan } from "@/lib/server/journey";
import { daftarSertifikat } from "@/lib/server/certificates";
import { daftarPengalaman } from "@/lib/server/experience";
import { METRIK_KARTU } from "@/data/metrikKartu";
import { bahasaPerBaris, peringkatPerBaris, saringArtefak } from "@/lib/ukurFormat";
import EditorialPageClient from "@/components/Editorial/EditorialPageClient";

export const revalidate = 60;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function Home() {
  const [repos, perjalanan, certificates, experiences] = await Promise.all([
    daftarReposGitHub().then(ringkasRepos).catch(() => []),
    daftarPerjalanan().catch(() => []),
    daftarSertifikat().catch(() => []),
    daftarPengalaman().catch(() => []),
  ]);

  // Satu gerbang umur untuk dua pemakaian: angka di kartu dan bahasa yang memanggil
  // objek 3D di belakang kotak harus gelap pada hari yang sama, jadi keduanya dibaca dari
  // hasil saring yang sama — bukan dua kali memanggil hukum dengan jam yang berbeda.
  const artefak = saringArtefak(METRIK_KARTU);

  return (
    <EditorialPageClient
      repos={repos}
      perjalanan={perjalanan}
      certificates={certificates}
      experiences={experiences}
      metrikKartu={artefak?.kartu ?? null}
      bahasaBaris={bahasaPerBaris(artefak)}
      peringkatBaris={peringkatPerBaris(artefak)}
    />
  );
}
