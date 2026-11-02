import type { Metadata } from "next";
import Link from "next/link";
import PanggungKecil from "@/components/Three/panggung/PanggungKecil";
import PetaInstans, { type BatangPeta } from "@/components/Three/panggung/PetaInstans";
import { daftarReposGitHub } from "@/lib/server/github";

export const metadata: Metadata = {
  title: "PETA PROYEK — twenty repositories, one draw call // M. Arkan Fauzi",
  description:
    "Every public non-fork repository the GitHub API returns for this account, drawn as one InstancedMesh whose bar heights are the star counts printed beside them.",
  alternates: { canonical: "/peta" },
  openGraph: {
    url: "/peta",
    siteName: "M. Arkan Fauzi",
    type: "website",
    title: "PETA PROYEK — twenty repositories, one draw call // M. Arkan Fauzi",
    description:
      "One GPU instance per repository, one row of text per repository, and the two counts required to be the same number.",
  },
};

// Halaman yang menghitung pecahan, dan hanya mengirim hasilnya ke kanvas. Kalau rumusnya
// pindah ke komponen WebGL, verifier tidak lagi membandingkan dua sumber yang independen.
const TINGGI_BINGKAI_PUBLIK = 2;

function Aturan({ judul, isi }: { judul: string; isi: string }) {
  return (
    <div className="flex flex-col gap-1.5 pt-4 swiss-border-b">
      <span className="font-mono text-tag tracking-[0.2em] uppercase text-obsidian">{judul}</span>
      <span className="font-sans text-body leading-snug text-obsidian/75">{isi}</span>
    </div>
  );
}

export default async function Peta() {
  const repos = await daftarReposGitHub().catch(() => null);
  const daftar = repos ?? [];
  const ada = daftar.length > 0;
  const puncak = ada ? Math.max(...daftar.map((r) => r.stargazers_count)) : 0;
  // Pembaginya minimal satu: tanpa itu, akun yang semua repo-nya nol bintang akan membagi
  // dengan nol dan mencetak NaN sebagai angka.
  const penbagi = Math.max(1, puncak);
  const batang: BatangPeta[] = daftar.map((r) => ({
    nama: r.name,
    tautan: r.html_url,
    bintang: r.stargazers_count,
    tinggi: r.stargazers_count / penbagi,
    tertinggi: r.stargazers_count === puncak,
  }));

  return (
    <main className="min-h-screen w-full bg-paper text-obsidian font-sans">
      <div className="mx-auto w-full max-w-[1200px] px-6 md:px-10 py-10 md:py-14">
        <header className="flex flex-wrap items-end justify-between gap-4 pb-8 swiss-border-b">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-tag tracking-[0.24em] uppercase text-rosso">
              SECOND STAGE // ONE INSTANCED MESH
            </span>
            <h1 className="font-serif text-subtitle leading-[0.95] tracking-tight">PETA PROYEK</h1>
            <p className="font-mono text-micro tracking-[0.16em] uppercase text-titanium">
              {ada ? `${daftar.length} repositories · ${puncak} stars at the peak` : "no repository data"}
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
              href="/meja"
              className="font-mono text-[10px] tracking-[0.2em] uppercase px-3 py-1.5 rounded-full swiss-border hover:border-rosso hover:text-rosso transition-colors"
            >
              Type desk ↗
            </Link>
          </nav>
        </header>

        <p className="font-serif text-item leading-snug max-w-[70ch] my-10">
          The front page draws its project bars with a single instanced mesh too, sized by whichever
          chapter the scroll happens to be in. Here the same trick is shown without choreography:
          one instance per repository, a bar height that is nothing but the star count divided by the
          peak, and a text row beside every bar so the number is readable without a GPU.
        </p>

        {!ada && (
          <div data-peta-kosong className="px-4 py-6 swiss-border font-mono text-[10px] tracking-[0.2em] uppercase text-titanium">
            GitHub tidak menjawab — tidak ada batang, tidak ada angka.
          </div>
        )}

        {ada && (
          <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-8 lg:gap-12 items-start">
            <div className="w-full h-[46vh] min-h-[320px] swiss-border bg-obsidian/5">
              <PanggungKecil className="w-full h-full" kamera={[0, 0, 3.4]} fov={42}>
                <PetaInstans bars={batang} />
              </PanggungKecil>
            </div>

            <ol className="flex flex-col max-h-[46vh] min-h-[320px] overflow-y-auto" data-peta-daftar>
              {batang.map((b) => (
                <li
                  key={b.nama}
                  data-peta-baris=""
                  data-peta-tertinggi={b.tertinggi ? "true" : undefined}
                  className="flex items-baseline gap-3 py-1.5 swiss-border-b"
                >
                  <a
                    href={b.tautan}
                    target="_blank"
                    rel="noreferrer"
                    className={`font-mono text-[10px] tracking-[0.12em] uppercase truncate hover:text-rosso ${
                      b.tertinggi ? "text-rosso" : "text-obsidian"
                    }`}
                  >
                    {b.nama}
                  </a>
                  <span data-peta-bintang className="ml-auto font-mono text-[10px] tabular-nums text-titanium">
                    {b.bintang}★
                  </span>
                  <span data-peta-tinggi className="font-mono text-[10px] tabular-nums text-obsidian w-[42px] text-right">
                    {(b.tinggi * TINGGI_BINGKAI_PUBLIK).toFixed(2)}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {ada && (
          <p className="mt-6 font-mono text-[10px] leading-relaxed text-titanium max-w-[86ch]">
            The last column is the bar height in world units: star count divided by the peak ({puncak}
            ), times the {TINGGI_BINGKAI_PUBLIK}-unit frame. A repository with zero stars gets a height
            of zero and is still listed as a row — an invisible bar with a printed number is honest,
            a stub that looks like a minimum is not.
          </p>
        )}

        <section className="mt-14" aria-labelledby="cara-ukur-peta">
          <h2
            id="cara-ukur-peta"
            className="font-mono text-tag tracking-[0.24em] uppercase text-rosso mb-2"
          >
            HOW THIS PAGE IS BUILT
          </h2>
          <div className="grid md:grid-cols-2 gap-x-10">
            <Aturan
              judul="ONE MESH, ONE CALL"
              isi={`Every bar is an instance of one box geometry inside one InstancedMesh: ${daftar.length || 0} matrices, one draw call. The verifier reads the instance count and the number of rows in the list and fails when they differ.`}
            />
            <Aturan
              judul="HEIGHT IS A QUOTIENT"
              isi="Nothing is normalised, smoothed or floored. tinggi = bintang / puncak, and the same product printed next to each name is what the matrix scale carries."
            />
            <Aturan
              judul="ZERO STAYS INVISIBLE"
              isi="A zero-star repository collapses to height zero instead of being given a visible stub, because a floor invented by the renderer is a claim the data never made."
            />
            <Aturan
              judul="TEXT CARRIES THE SAME FACT"
              isi="The list beside the canvas is not a caption: it is the same measurement in a form that survives no-WebGL, screen readers and a printed page. Nothing is only visible as geometry."
            />
            <Aturan
              judul="NO MOTION AT ALL"
              isi="The mesh is written once when the data arrives. There is no useFrame here, so the idle law has nothing to switch off: the canvas paints a single frame and stops."
            />
            <Aturan
              judul="WHAT IS NOT HERE"
              isi="No commits, no lines of code, no language share. Only the two figures the repository listing actually answers for: name and stars."
            />
          </div>
        </section>

        <footer className="mt-10 pt-6 swiss-border-t flex flex-wrap items-center justify-between gap-3">
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-titanium">
            SOURCE: GET /users/repos · stargazers_count · 1 DRAW CALL
          </span>
          <Link
            href="/arsip"
            className="font-mono text-[10px] tracking-[0.2em] uppercase text-rosso hover:text-obsidian transition-colors"
          >
            ← Pit wall
          </Link>
        </footer>
      </div>
    </main>
  );
}
