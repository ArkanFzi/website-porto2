import type { Metadata } from "next";
import Link from "next/link";
import { ambilMetrikGitHub, daftarReposGitHub, type MetrikGitHub, type RepoGitHub } from "@/lib/server/github";
import { GITHUB_PROFILE, GITHUB_USERNAME } from "@/data/github";

// Halaman ini sengaja server component: angkanya dibaca dari modul server yang sama dengan
// halaman utama (`lib/server/github`), jadi tidak ada satu pun pemanggilan /api baru dari
// browser dan tidak ada angka yang bisa menyimpang dari respons /api/github-repos.
export const revalidate = 600;

export const metadata: Metadata = {
  title: "THE READING ROOM — full repository index // M. Arkan Fauzi",
  description:
    "Every public repository behind the editorial archive, listed from the same GitHub fields the front page reads: name, description, language, stars, forks. No dates, because the payload does not carry any.",
  alternates: { canonical: "/baca" },
  openGraph: {
    url: "/baca",
    siteName: "M. Arkan Fauzi",
    type: "website",
    title: "THE READING ROOM — full repository index // M. Arkan Fauzi",
    description:
      "Full repository index with measured stars and forks, read straight from the GitHub REST payload the portfolio uses.",
  },
};

const ANGKA = "font-mono text-micro tabular-nums";

function Bintang({ n }: { n: number }) {
  return <span className={`${ANGKA} text-rosso`}>{n}</span>;
}

function Metrik({ label, nilai, keterangan }: { label: string; nilai: string; keterangan: string }) {
  return (
    <div className="flex flex-col gap-1.5 px-4 py-5 swiss-border bg-paper/60">
      <span className="font-mono text-tag uppercase tracking-[0.2em] text-titanium">{label}</span>
      <span className="font-serif text-item leading-none text-obsidian">{nilai}</span>
      <span className="font-mono text-[10px] leading-snug text-titanium">{keterangan}</span>
    </div>
  );
}

function Baris({ repo, indeks }: { repo: RepoGitHub; indeks: number }) {
  return (
    <tr className="swiss-border-b align-top hover:bg-stone/40 transition-colors">
      <th scope="row" className="py-4 pr-3 text-left font-normal whitespace-nowrap">
        <span className="font-mono text-micro text-titanium">
          {String(indeks + 1).padStart(2, "0")}
        </span>
      </th>
      <td className="py-4 pr-4">
        <a
          href={repo.html_url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-serif text-item leading-tight text-obsidian underline decoration-hairline underline-offset-4 hover:text-rosso hover:decoration-rosso transition-colors"
          aria-label={`Open ${repo.name} on GitHub`}
        >
          {repo.name}
        </a>
        <span className="block font-mono text-[10px] tracking-[0.16em] uppercase text-titanium mt-1">
          {repo.language ?? "—"}
        </span>
      </td>
      <td className="py-4 pr-4 w-[42%]">
        {repo.description ? (
          <p className="font-sans text-body leading-snug text-obsidian/80">{repo.description}</p>
        ) : null}
      </td>
      <td className="py-4 pr-4 text-right whitespace-nowrap">
        <Bintang n={repo.stargazers_count} />
      </td>
      <td className="py-4 text-right whitespace-nowrap">
        <span className={ANGKA}>{repo.forks_count}</span>
      </td>
      <td className="py-4 pl-4 text-right whitespace-nowrap hidden lg:table-cell">
        {repo.homepage ? (
          <a
            href={repo.homepage}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[10px] tracking-[0.16em] uppercase text-rosso hover:text-obsidian transition-colors"
          >
            live ↗
          </a>
        ) : null}
      </td>
    </tr>
  );
}

export default async function Baca() {
  const [repos, metrik]: [RepoGitHub[] | null, MetrikGitHub | null] = await Promise.all([
    daftarReposGitHub().catch(() => null),
    ambilMetrikGitHub().catch(() => null),
  ]);

  const gagalGitHub = repos === null;
  const daftar = repos ?? [];

  return (
    <main className="min-h-screen w-full bg-paper text-obsidian font-sans">
      <div className="mx-auto w-full max-w-[1200px] px-6 md:px-10 py-10 md:py-14">
        {/* ── HEADER ── */}
        <header className="flex flex-wrap items-end justify-between gap-4 pb-8 swiss-border-b">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-tag tracking-[0.24em] uppercase text-rosso">
              ARKANFAZI // SOURCE INDEX
            </span>
            <h1 className="font-serif text-subtitle leading-[0.95] tracking-tight">
              THE READING ROOM
            </h1>
            <p className="font-mono text-micro tracking-[0.16em] uppercase text-titanium">
              Detailed index behind CH.03 SELECTED ARCHIVES
            </p>
          </div>
          <nav className="flex items-center gap-3" aria-label="Site navigation">
            <Link
              href="/"
              className="font-mono text-[10px] tracking-[0.2em] uppercase px-3 py-1.5 rounded-full swiss-border hover:border-rosso hover:text-rosso transition-colors"
            >
              ← Editorial
            </Link>
            <Link
              href="/arsip"
              className="font-mono text-[10px] tracking-[0.2em] uppercase px-3 py-1.5 rounded-full swiss-border hover:border-rosso hover:text-rosso transition-colors"
            >
              Telemetry ↗
            </Link>
            <a
              href={GITHUB_PROFILE}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] tracking-[0.2em] uppercase px-3 py-1.5 rounded-full swiss-border hover:border-rosso hover:text-rosso transition-colors"
            >
              @{GITHUB_USERNAME} ↗
            </a>
          </nav>
        </header>

        {/* ── METRIK ── */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 my-10" aria-label="GitHub account metrics">
          {metrik ? (
            <>
              <Metrik
                label="PUBLIC REPOS"
                nilai={metrik.reposCount}
                keterangan="Count reported by /users/ArkanFzi — includes forks and the profile repo."
              />
              <Metrik
                label="TOTAL STARS"
                nilai={metrik.starsCount}
                keterangan="Summed across up to 100 public repos, forks included — a wider window than the list below."
              />
              <Metrik
                label="FOLLOWERS"
                nilai={metrik.followersCount}
                keterangan="user.followers from the GitHub REST profile object."
              />
              <Metrik
                label="TS / JS SHARE"
                nilai={metrik.langShare}
                keterangan="Share of non-fork repos labelled TypeScript or JavaScript."
              />
            </>
          ) : (
            <p className="col-span-full font-mono text-micro text-titanium">
              Account metrics unavailable — the GitHub API did not answer this request.
            </p>
          )}
        </section>

        {/* ── DAFTAR ── */}
        <section aria-labelledby="daftar-judul">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
            <h2 id="daftar-judul" className="font-mono text-tag tracking-[0.24em] uppercase text-obsidian">
              REPOSITORIES — NEWEST FIRST
            </h2>
            <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-titanium">
              forks and the profile repo are filtered out at the source
            </p>
          </div>

          {gagalGitHub ? (
            <div className="px-4 py-8 swiss-border bg-stone/40">
              <p className="font-serif text-item text-obsidian">
                The repository list could not be read from GitHub for this render.
              </p>
              <p className="font-mono text-micro text-titanium mt-2">
                Nothing is cached locally and no number is invented. Retry the same source at{" "}
                <a className="text-rosso underline underline-offset-4" href="/api/github-repos">
                  /api/github-repos
                </a>
                .
              </p>
            </div>
          ) : daftar.length === 0 ? (
            <p className="font-mono text-micro text-titanium">
              GitHub answered, but returned no repository outside the fork filter.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <caption className="sr-only">
                  Public repositories of {GITHUB_USERNAME}: name, primary language, description,
                  stars, forks, and a link to the live deployment when one is declared.
                </caption>
                <thead>
                  <tr className="swiss-border-b text-titanium">
                    <th scope="col" className="py-2 pr-3 font-mono text-[10px] uppercase tracking-[0.18em] font-normal text-left">#</th>
                    <th scope="col" className="py-2 pr-4 font-mono text-[10px] uppercase tracking-[0.18em] font-normal text-left">Repository</th>
                    <th scope="col" className="py-2 pr-4 font-mono text-[10px] uppercase tracking-[0.18em] font-normal text-left">What it does</th>
                    <th scope="col" className="py-2 pr-4 font-mono text-[10px] uppercase tracking-[0.18em] font-normal text-right">Stars</th>
                    <th scope="col" className="py-2 font-mono text-[10px] uppercase tracking-[0.18em] font-normal text-right">Forks</th>
                    <th scope="col" className="py-2 pl-4 font-mono text-[10px] uppercase tracking-[0.18em] font-normal text-right hidden lg:table-cell">Live</th>
                  </tr>
                </thead>
                <tbody>
                  {daftar.map((repo, i) => (
                    <Baris key={repo.id} repo={repo} indeks={i} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── CARA BACA ── */}
        <section className="mt-12 px-5 py-6 swiss-border bg-stone/30" aria-labelledby="cara-baca">
          <h2 id="cara-baca" className="font-mono text-tag tracking-[0.24em] uppercase text-rosso mb-4">
            HOW TO READ THIS INDEX
          </h2>
          <ul className="flex flex-col gap-2.5 font-mono text-micro leading-relaxed text-obsidian/80">
            <li>
              SOURCE — the list comes from GitHub REST{" "}
              <code className="text-obsidian">/users/{GITHUB_USERNAME}/repos?sort=updated&amp;per_page=20&amp;type=public</code>{" "}
              through <code className="text-obsidian">src/lib/server/github.ts</code>, the same call the front page and{" "}
              <a className="text-rosso underline underline-offset-4" href="/api/github-repos">/api/github-repos</a> use.
            </li>
            <li>
              NO DATES — the payload this site reads carries id, name, description, homepage, html_url,
              stargazers_count, forks_count, language, fork. There is no <code className="text-obsidian">updated_at</code>{" "}
              field in it, so this index shows none.
            </li>
            <li>
              EMPTY CELL = FIELD IS NULL — a missing description or a missing homepage is GitHub saying
              nothing, not this page deciding the repo has none worth listing.
            </li>
            <li>
              CACHING — the response is revalidated every 600 seconds, so stars can lag the live counter by
              up to that window.
            </li>
            <li>
              SCOPE — the twenty most recently updated repositories, then forks and the profile repo
              are removed at the source, so this table can hold fewer than twenty rows. The totals
              above are computed over a different window (up to 100 repos), which is why they do not
              add up to this table.
            </li>
          </ul>
        </section>

        <footer className="mt-10 pt-6 swiss-border-t flex flex-wrap items-center justify-between gap-3">
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-titanium">
            M. ARKAN FAUZI // THE READING ROOM
          </span>
          <Link
            href="/"
            className="font-mono text-[10px] tracking-[0.2em] uppercase text-rosso hover:text-obsidian transition-colors"
          >
            ← BACK TO THE EDITORIAL
          </Link>
        </footer>
      </div>
    </main>
  );
}
