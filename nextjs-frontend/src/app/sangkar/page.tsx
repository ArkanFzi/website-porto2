import type { Metadata } from "next";
import SangkarHidup from "./SangkarHidup";
import {
  Aturan,
  Bagian,
  Bingkai,
  CatatanPenutup,
  KakiPanggung,
  Prolog,
  SundulPanggung,
} from "@/components/Editorial/PanggungFrame";

// Panggung kedua yang satu ini tidak membaca telemetri: satu-satunya angkanya adalah sudut
// yang diperintahkan pengunjung sendiri, dan itu datang dari lib/putaran.ts — modul yang sama
// dengan kontrol rotasi di HUD halaman utama.
export const metadata: Metadata = {
  title: "SANGKAR TERBUKA — a roll cage you command, ±12 degrees // M. Arkan Fauzi",
  description:
    "The front page's hover cage taken out of its choreography and given its own route: one wireframe box, one draw call, and the same rotation module the editorial HUD uses, with the commanded angle printed beside it.",
  alternates: { canonical: "/sangkar" },
  openGraph: {
    url: "/sangkar",
    siteName: "M. Arkan Fauzi",
    type: "website",
    title: "SANGKAR TERBUKA — a roll cage you command, ±12 degrees // M. Arkan Fauzi",
    description:
      "Drag or arrow-key a wireframe roll cage within the ±12 degree limit the portrait uses, with the commanded angle printed from the same store the canvas reads.",
  },
};

export default function Sangkar() {
  return (
    <Bingkai>
      <SundulPanggung
        eyebrow="SECOND STAGE // NO SCROLL CHOREOGRAPHY"
        judul="SANGKAR TERBUKA"
        sub="The hover cage, out of the chapter machine"
        tautan={[
          { href: "/", label: "← Editorial" },
          { href: "/waktu", label: "Time window ↗" },
        ]}
      />

      <Prolog>
        On the editorial page this cage appears when a pointer rests on the first row of the
        archive, sized by whichever portal the scroll choreography happens to be flying through.
        Here it has no portal, no chapter and no hover to serve: it is the object alone, and the
        only force acting on it is yours.
      </Prolog>

      <SangkarHidup />

      <Bagian id="cara-ukur-sangkar" judul="HOW THIS PAGE IS BUILT">
        <Aturan
          judul="SAME MODULE, NOT A COPY"
          isi="The angle comes from lib/putaran.ts: the ±12 degree clamp, the 200 px drag reach, the four-degree arrow step and the return-to-zero on release are the same code the front page's portrait obeys. This route only adds the region that accepts the drag and its keyboard equivalent."
        />
        <Aturan
          judul="ONE DRAW CALL"
          isi="Twelve edges of one box, built once from an EdgesGeometry and scaled per frame. Nothing is regenerated when the angle changes, and the buffers are disposed when the route unmounts."
        />
        <Aturan
          judul="COMMAND, NOT PRESENCE"
          isi="Rotation only exists while it is commanded. Release the pointer or move focus away and the value returns to zero — the page would otherwise be holding a state that no visitor asked for, and paying frames to keep it."
        />
        <Aturan
          judul="NO EASING"
          isi="An eased return is a series of frames burned while nobody is moving. The idle law that keeps the editorial canvas at zero painted frames when still is borrowed unchanged, so the cage snaps instead of floating."
        />
        <Aturan
          judul="WHAT IS NOT HERE"
          isi="No telemetry, no visitor data, no stored orientation between visits. The only number on the page is the one you produced, and it is printed from the same store the canvas reads, not from a second copy of it."
        />
        <Aturan
          judul="REDUCED MOTION"
          isi="With prefers-reduced-motion the command path is switched off at the module level: drag and arrow keys do nothing and the cage holds its parked yaw. The content of the page never depended on the movement."
        />
      </Bagian>

      <CatatanPenutup id="yang-tidak-disimpan-sangkar" judul="WHAT THIS PAGE DOES NOT KEEP">
        The cage does not remember you. Its angle lives in one browser tab for as long as that tab
        holds the pointer or the focus, and releasing either writes zero back. Nothing is posted to
        the server, nothing is stored in local storage, and no telemetry is read: the only figure on
        the panel is the one your own hand produced, and it leaves when the page does.
      </CatatanPenutup>

      <KakiPanggung
        sumber="SOURCE: lib/putaran.ts · ±12° · EDGES OF ONE BOX"
        halaman="SANGKAR TERBUKA"
      />
    </Bingkai>
  );
}
