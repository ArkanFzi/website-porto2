import type { Metadata } from "next";
import PanggungKecil from "@/components/Three/panggung/PanggungKecil";
import PetaInstans, { type BatangPeta } from "@/components/Three/panggung/PetaInstans";
import { daftarReposGitHub } from "@/lib/server/github";
import {
  Aturan,
  Bagian,
  Bingkai,
  BingkaiKanvas,
  CatatanPenutup,
  GridPanggung,
  KakiPanggung,
  Prolog,
  SundulPanggung,
} from "@/components/Editorial/PanggungFrame";

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
    <Bingkai>
      <SundulPanggung
        eyebrow="SECOND STAGE // ONE INSTANCED MESH"
        judul="PETA PROYEK"
        sub={ada ? `${daftar.length} repositories · ${puncak} stars at the peak` : "no repository data"}
        tautan={[
          { href: "/", label: "← Editorial" },
          { href: "/meja", label: "Type desk ↗" },
          { href: "/arsip", label: "Pit wall ↗" },
        ]}
      />

      <Prolog>
        The front page draws its project bars with a single instanced mesh too, sized by whichever
        chapter the scroll happens to be in. Here the same trick is shown without choreography: one
        instance per repository, a bar height that is nothing but the star count divided by the peak,
        and a text row beside every bar so the number is readable without a GPU.
      </Prolog>

      {!ada && (
        <div
          data-peta-kosong
          className="px-4 py-8 swiss-border bg-stone/40 font-serif text-item leading-snug text-obsidian/75"
        >
          GitHub tidak menjawab — tidak ada batang, tidak ada angka, tidak ada daftar.
        </div>
      )}

      {ada && (
        <GridPanggung>
          <BingkaiKanvas>
            <PanggungKecil className="w-full h-full" kamera={[0, 0, 3.4]} fov={42}>
              <PetaInstans bars={batang} />
            </PanggungKecil>
          </BingkaiKanvas>

          <ol className="flex flex-col max-h-[52vh] min-h-[380px] overflow-y-auto" data-peta-daftar>
            {batang.map((b) => (
              <li
                key={b.nama}
                data-peta-baris=""
                data-peta-tertinggi={b.tertinggi ? "true" : undefined}
                className={`flex items-baseline gap-3 py-1.5 swiss-border-b ${
                  b.tertinggi ? "border-l-2 border-rosso pl-3" : ""
                }`}
              >
                <a
                  href={b.tautan}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-tag uppercase tracking-[0.2em] truncate text-obsidian hover:text-rosso transition-colors"
                >
                  {b.nama}
                </a>
                <span
                  data-peta-bintang
                  className="ml-auto font-mono text-tag tabular-nums text-titanium"
                >
                  {b.bintang}★
                </span>
                <span
                  data-peta-tinggi
                  className="font-mono text-tag tabular-nums text-obsidian w-[42px] text-right"
                >
                  {(b.tinggi * TINGGI_BINGKAI_PUBLIK).toFixed(2)}
                </span>
              </li>
            ))}
          </ol>
        </GridPanggung>
      )}

      {ada && (
        <p className="mt-6 font-mono text-micro leading-relaxed text-titanium max-w-[70ch]">
          The last column is the bar height in world units: star count divided by the peak ({puncak}
          ), times the {TINGGI_BINGKAI_PUBLIK}-unit frame. A repository with zero stars gets a height
          of zero and is still listed as a row — an invisible bar with a printed number is honest, a
          stub that looks like a minimum is not.
        </p>
      )}

      <Bagian id="cara-ukur-peta" judul="HOW THIS PAGE IS BUILT">
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
      </Bagian>

      <CatatanPenutup id="yang-tidak-disimpan-peta" judul="WHAT THIS PAGE DOES NOT KEEP">
        Nothing is counted that the GitHub listing did not answer for. No commit totals, no lines of
        code, no language share, no visibility or fork status beyond the non-fork public set the API
        returned for this account. If the API stops answering, the page prints an empty state instead
        of a zero: no bars, no rows, no peak — a missing figure is never rendered as a small one.
      </CatatanPenutup>

      <KakiPanggung
        sumber="SOURCE: GET /users/repos · stargazers_count · 1 DRAW CALL"
        halaman="PETA PROYEK"
      />
    </Bingkai>
  );
}
