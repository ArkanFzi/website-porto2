import type { Metadata } from "next";
import PetaHidup from "./PetaHidup";
import { type BatangPeta } from "@/components/Three/panggung/PetaInstans";
import { daftarReposGitHub } from "@/lib/server/github";
import {
  Aturan,
  Bagian,
  Bingkai,
  CatatanPenutup,
  KakiPanggung,
  Prolog,
  SundulPanggung,
} from "@/components/Editorial/PanggungFrame";

export const metadata: Metadata = {
  title: "PROYEK — twenty repositories on one map, one draw call // M. Arkan Fauzi",
  description:
    "Every public non-fork repository the GitHub API returns for this account, drawn as one InstancedMesh whose bar heights are the star counts printed beside them.",
  alternates: { canonical: "/proyek" },
  openGraph: {
    url: "/proyek",
    siteName: "M. Arkan Fauzi",
    type: "website",
    title: "PROYEK — twenty repositories on one map, one draw call // M. Arkan Fauzi",
    description:
      "One GPU instance per repository, one row of text per repository, and the two counts required to be the same number.",
  },
};

// Halaman yang menghitung pecahan, dan hanya mengirim hasilnya ke kanvas. Kalau rumusnya
// pindah ke komponen WebGL, verifier tidak lagi membandingkan dua sumber yang independen.
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
        eyebrow="PROFILE // ONE INSTANCED MESH"
        judul="PROYEK"
        sub={ada ? `${daftar.length} repositories · ${puncak} stars at the peak` : "no repository data"}
        tautan={[
          { href: "/", label: "← Editorial" },
          { href: "/potret", label: "Potret ↗" },
          { href: "/statistik", label: "Statistik ↗" },
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

      {ada && <PetaHidup batang={batang} puncak={puncak} />}

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
          judul="MOTION SPENT ON TWO THINGS"
          isi="The mesh is written once at mount, once as a 700 ms entrance that scales every instance from zero to the height its own row prints, and then once per row the pointer or keyboard actually selects. No idle loop: after the entrance the canvas paints only on a command, and the verifier reads the drawn height, not the planned one."
        />
        <Aturan
          judul="SELECTION IS NOT A SECOND DATA"
          isi="A hovered row paints that instance stone-grey, never rosso, because rosso already means highest star count. The peak keeps its colour while selected, and the debug object carries the selected index so the claim is checkable."
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
