import { daftarReposGitHub, ringkasRepos } from "@/lib/server/github";
import { daftarPerjalanan } from "@/lib/server/journey";
import EditorialPageClient from "@/components/Editorial/EditorialPageClient";

export const revalidate = 60;

export default async function Home() {
  const [repos, perjalanan] = await Promise.all([
    daftarReposGitHub().then(ringkasRepos).catch(() => []),
    daftarPerjalanan().catch(() => []),
  ]);

  return <EditorialPageClient repos={repos} perjalanan={perjalanan} />;
}
