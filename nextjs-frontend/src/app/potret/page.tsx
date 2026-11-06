import type { Metadata } from "next";
import MejaHidup from "./MejaHidup";
import {
  Aturan,
  Bagian,
  Bingkai,
  CatatanPenutup,
  KakiPanggung,
  Prolog,
  SundulPanggung,
} from "@/components/Editorial/PanggungFrame";
import { OG_GAMBAR } from "@/lib/site";

// Rute ini memakai material panggung utama apa adanya, tapi tidak memakai mesinnya: tidak ada
// registry portal, tidak ada koreografi bab, dan tidak ada holder sapuan yang dibagi.
export const metadata: Metadata = {
  title: "PANEL SHADER POTRET — six knobs into the portrait shader // M. Arkan Fauzi",
  description:
    "The editorial portrait's chiaroscuro material with its chapter machine removed: six controls that each write one uniform, with the commanded value and the uniform value printed side by side.",
  alternates: { canonical: "/potret" },
  openGraph: {
    images: [OG_GAMBAR],
    url: "/potret",
    siteName: "M. Arkan Fauzi",
    type: "website",
    title: "PANEL SHADER POTRET — six knobs into the portrait shader // M. Arkan Fauzi",
    description:
      "Drive uPersona, uReveal, uFokus, uKabur, uWipe and uMask by hand on a page that owns its own uniform holders and never touches the front page's shared ones.",
  },
};

export default function Meja() {
  return (
    <Bingkai>
      <SundulPanggung
        eyebrow="SECOND STAGE // MANUAL UNIFORMS"
        judul="PANEL SHADER POTRET"
        sub="The shader without the choreography"
        tautan={[
          { href: "/", label: "← Editorial" },
          { href: "/interaksi", label: "Interaksi ↗" },
        ]}
      />

      <Prolog>
        On the front page these same uniforms are written every frame by one function that reads
        scroll progress, chapter index, pointer history and the DOM box of whichever portal the card
        is flying through. That function is the product. This page removes it and hands the six
        numbers to you instead, so the material can be inspected as an instrument panel rather than
        as a scene.
      </Prolog>

      <MejaHidup />

      <Bagian id="cara-ukur-meja" judul="HOW THIS PAGE IS BUILT">
        <Aturan
          judul="SAME SHADER, LITERALLY"
          isi="vertexShader, fragmentShader, buatUniformPanggung and the ¼-res blur copy are imported from the front page's material module. Nothing is re-implemented here, so a change to the shading reaches both routes at once."
        />
        <Aturan
          judul="ITS OWN HOLDERS"
          isi="The main stage shares two module-level holders so the iris wipe and the car cross-fade close on the same frame across objects. This route replaces both entries with its own { value: 0 }. Driving the iris knob to 1 leaves the shared holders at 0, and the debug object carries those two numbers so a gate can say so."
        />
        <Aturan
          judul="ONE FRAME PER COMMAND"
          isi="A knob calls invalidate() when its value changes. That is the whole animation system here: the loop stays asleep, and the thing you asked for is painted once."
        />
        <Aturan
          judul="TWO NUMBERS, NOT ONE CLAIM"
          isi="The DOM prints the commanded value; window.__meja prints what the material actually holds after the frame, plus the geometry's vertex count and the crop rectangle in NDC. They are compared by the verifier, not by the page's own prose."
        />
        <Aturan
          judul="FOCUS IS A DISTANCE"
          isi="The focal-plane knob is in world units because uFokus is compared against the view-space depth of each pixel. The card sits five units from the camera, so 5.00 is sharp and 0.5 units away is fully soft — that ceiling is the same constant the chapter cards use."
        />
        <Aturan
          judul="WHAT IS NOT HERE"
          isi="No hover pulse, no pointer trail, no chapter tint, no scroll. uHover, uScroll and the twelve trail samples are left at their initial values, which is why the card does not breathe when nothing is asked of it."
        />
      </Bagian>

      <CatatanPenutup id="yang-tidak-disimpan-meja" judul="WHAT THIS PAGE DOES NOT KEEP">
        Six numbers live in this tab and nowhere else. They are not sent to the server, not written
        to storage, and not carried to the next page: reload and every knob returns to its default,
        which is the state a visitor who never touched the panel is in. What the material holds
        after a frame is printed beside what you commanded, so a disagreement between the two is
        visible rather than assumed.
      </CatatanPenutup>

      <KakiPanggung
        sumber="SOURCE: stage/chiaroscuroMaterial.ts · 6 UNIFORMS · 2 TRIANGLES"
        halaman="MEJA TIPOGRAFI"
      />
    </Bingkai>
  );
}
