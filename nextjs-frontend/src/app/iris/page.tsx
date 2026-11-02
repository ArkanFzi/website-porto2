import type { Metadata } from "next";
import IrisHidup from "./IrisHidup";
import {
  Aturan,
  Bagian,
  Bingkai,
  CatatanPenutup,
  KakiPanggung,
  Prolog,
  SundulPanggung,
} from "@/components/Editorial/PanggungFrame";

// Rute ini punya shader diafragmanya sendiri. Material panggung utama dan dua holder
// module-levelnya sengaja tidak diimpor sama sekali — halaman-probe menjaganya lewat gerbang
// sumber, bukan lewat ingatan.
export const metadata: Metadata = {
  title: "IRIS — berpindah bab lewat diafragma // M. Arkan Fauzi",
  description:
    "A two-text passage whose only navigation is an aperture: one slider with a real slider role, one quad of paper closing over the page, and both paragraphs present in the DOM at every value.",
  alternates: { canonical: "/iris" },
  openGraph: {
    url: "/iris",
    siteName: "M. Arkan Fauzi",
    type: "website",
    title: "IRIS — berpindah bab lewat diafragma // M. Arkan Fauzi",
    description:
      "Close the iris to cross the cut: the crossfade happens only at full closure, the commanded aperture is printed, and the buttons do not exist.",
  },
};

export default function Iris() {
  return (
    <Bingkai>
      <SundulPanggung
        eyebrow="SECOND STAGE // NAVIGATION AS A WIPE"
        judul="IRIS"
        sub="One slider, one quad, no buttons"
        tautan={[
          { href: "/", label: "← Editorial" },
          { href: "/peta", label: "Project map ↗" },
          { href: "/waktu", label: "Time window ↗" },
        ]}
      />

      <Prolog>
        The front page already uses an iris wipe, but as a consequence: the chapter machine closes
        the aperture because the scroll crossed a boundary, and the same number is shared with the
        car so both objects cut on one frame. Here the wipe is the control itself. You are not told
        which chapter is next; you are handed the aperture and asked to close it.
      </Prolog>

      <IrisHidup />

      <Bagian id="cara-ukur-iris" judul="HOW THIS PAGE IS BUILT">
        <Aturan
          judul="THE CUT ONLY HAPPENS CLOSED"
          isi="tutup = 1 - |2x - 1|: open at both ends of the axis, fully shut at the midpoint. The text changes sides where the screen is already paper, so two exposures are never blended on top of each other."
        />
        <Aturan
          judul="A SLIDER, NOT A BUTTON PAIR"
          isi="The control is a native range input, which is a real role=slider for assistive technology: arrow keys step it, Home and End jump it, and its value is announced. Nothing here is a click handler wearing a div."
        />
        <Aturan
          judul="BOTH TEXTS ALWAYS EXIST"
          isi="Both paragraphs are in the DOM at every position of the axis; only their opacity is commanded. The navigation can hide a passage from sight but never from a reader, a search, or a browser without WebGL."
        />
        <Aturan
          judul="ONE QUAD"
          isi="The curtain is a single plane carrying two uniforms — a radius and an aspect — and a four-line fragment: distance from centre tested against that radius, feathered by one pixel of derivative. The feather is fwidth, so it stays one device pixel at any resolution."
        />
        <Aturan
          judul="NOT THE STAGE'S SHADER"
          isi="The front page's wipe shares two module-level holders between objects on purpose. This route does not import that material at all — it has its own shader, and a source-level gate in the verifier fails if the import ever appears."
        />
        <Aturan
          judul="NO EASING, NO LOOP"
          isi="The commanded number is the printed number. There is no animation between values because the slider is the animation; the canvas wakes for one frame per command and goes back to sleep."
        />
      </Bagian>

      <CatatanPenutup id="yang-tidak-disimpan-iris" judul="WHAT THIS PAGE DOES NOT KEEP">
        The slider position belongs to this page load only. It is not posted anywhere, not stored,
        and not used to decide which chapter you are allowed to read — both passages are in the DOM
        the whole time, so hiding one is a display choice, never an access one. Nothing on this
        route is counted: there is no visitor figure, no telemetry read, and no number that claims
        to describe anybody but the aperture you set.
      </CatatanPenutup>

      <KakiPanggung
        sumber="SOURCE: 1 QUAD · role=slider · 2 TEXTS IN DOM"
        halaman="IRIS"
      />
    </Bingkai>
  );
}
