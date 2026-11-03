import { daftarReposGitHub, ringkasRepos } from "@/lib/server/github";
import { daftarPerjalanan } from "@/lib/server/journey";
import { daftarSertifikat } from "@/lib/server/certificates";
import { daftarPengalaman } from "@/lib/server/experience";
import { METRIK_KARTU } from "@/data/metrikKartu";
import { saringMetrik } from "@/lib/ukurFormat";
import EditorialPageClient from "@/components/Editorial/EditorialPageClient";

export const revalidate = 60;

export default async function Home() {
  const [repos, perjalanan, certificates, experiences] = await Promise.all([
    daftarReposGitHub().then(ringkasRepos).catch(() => []),
    daftarPerjalanan().catch(() => []),
    daftarSertifikat().catch(() => []),
    daftarPengalaman().catch(() => []),
  ]);

  return (
    <EditorialPageClient
      repos={repos}
      perjalanan={perjalanan}
      certificates={certificates}
      experiences={experiences}
      metrikKartu={saringMetrik(METRIK_KARTU)}
    />
  );
}
