// ─────────────────────────────────────────────────────────────────────────────
// Teks statis untuk lorong rincian paling dalam (/tulisan/esai/[slug]).
//
// Tidak ada MDX atau markdown loader di proyek ini, dan menambah satu dependensi hanya
// untuk tiga tulisan bukan trade-off yang mau diambil sekarang. Bentuknya array objek
// biasa: setiap butir menyebut berkas yang bisa dibuka pembaca untuk membantahnya, jadi
// yang diuji di verifier bukan hanya "tulisannya ada" tapi "klaim di dalamnya masih benar".
// ─────────────────────────────────────────────────────────────────────────────

export interface Esai {
  slug: string;
  judul: string;
  /** Satu kalimat di daftar; bukan klaim, hanya isi paragraf pertama. */
  ringkas: string;
  /** Tanggal tulisan ini ditulis. Bukan pengukuran, jadi tidak ikut hukum "—" — ini tanggal
   *  naskah, dan naskahnya memang punya tanggal. */
  ditulis: string;
  /** Paragraf, berurutan. */
  tubuh: string[];
  /** Jalur berkas atau hash commit yang meneguhkan klaim di atas. */
  bukti: string[];
}

export const ESAI: Esai[] = [
  {
    slug: "zero-frames-when-idle",
    judul: "Zero frames when idle",
    ringkas:
      "A WebGL portfolio page is usually a machine that never stops painting. This one has to stop, and there is a gate that proves it did.",
    ditulis: "2026-11-02",
    tubuh: [
      "The page runs one WebGL canvas for its whole body. Not one per section, not a stack of hero canvases: a single renderer that the scroll position steers. That choice is cheap to describe and expensive to keep, because the moment the scene is animated by a loop that runs on its own, the page becomes a machine that paints forever — including while you are reading a paragraph, including with the tab in the background, including on a laptop that has other work to do.",
      "So the canvas has a deadline. Four seconds after the last scroll it switches its frameloop to demand mode (IDLE_MS in src/components/Three/GlobalEditorialCanvas.tsx). In demand mode nothing is painted until something invalidates the scene, and while the page is standing still nothing is supposed to.",
      "Measuring that honestly turned out to be the harder half. The first attempt was a requestAnimationFrame loop of our own counting frames, which is a self-fulfilling instrument: the loop wakes the page every frame and destroys the very behaviour being tested. The meter that replaced it is a priority-1 subscriber inside the canvas, so React Three Fiber hands over the automatic render and the counter reads gl.info immediately after the frame it belongs to. It only exists when NODE_ENV is not production, and it writes to a window object the verifier reads.",
      "The verifier then does something deliberately unfriendly. It scrolls to a chapter, samples that window fifteen times over 1.5 seconds to catch the busiest frame, waits 5.5 seconds so the idle deadline has passed, blanks the object to null, and waits 1.5 seconds more. If the object is still null, no frame was written after the page went quiet. That is the gate: not a lower bound on draw calls, but a proof of silence.",
      "The cost is architectural rather than numeric. Once the loop is allowed to stop, every animation on screen has to be a function of scroll progress plus a parked state — a card that lands in its box has to park its final pose in state, because there is no live loop left to remember it. That constraint is what makes the transitions verifiable at all: a stopped page can be compared against a recorded pose.",
      "The last recorded snapshot sits in docs/verify/anggaran.json: five draw calls at peak, 18,460 triangles, five live geometries, two textures, and zero frames while idle in every chapter. It also records the renderer as SwiftShader, which is the honest caveat — those numbers compare runs on the same machine, they are not a promise about a sixty hertz display.",
    ],
    bukti: [
      "nextjs-frontend/src/components/Three/GlobalEditorialCanvas.tsx",
      "nextjs-frontend/src/components/Three/stage/PengukurRender.tsx",
      "docs/verify/drawcall-probe.mjs",
      "docs/verify/anggaran.json",
    ],
  },
  {
    slug: "the-dash-is-not-a-zero",
    judul: "The dash is not a zero",
    ringkas:
      "Every empty measurement on this site prints an em-dash instead of a number, because a zero would be a claim nobody measured.",
    ditulis: "2026-11-02",
    tubuh: [
      "There is one rule the whole site is built under: no shape without a number, and no number where the source gave none. The two halves pull against each other, which is why most dashboards get it wrong in one direction or the other.",
      "The clearest case is the database hop. The architecture trace on /arsip draws the path a request takes — browser to Next handler, handler to the Go backend, backend to Postgres — and the third segment has no length. The health endpoint answers without a duration field, so hopsDari() returns database.ms as null by construction, and the page prints the hop's name with an em-dash and draws no segment for it at all. A zero there would say: we measured it, and it was instant. Nobody measured it.",
      "The same rule decides what happens when a poll fails. The telemetry store erases the reading instead of keeping the last good one. A stale number wearing a live colour is worse than an empty field, so the HUD marks the process silent and the pit wall prints dashes across every measurement cell. The verifier mocks a dead endpoint and fails the page if any of those cells manages to show a digit.",
      "Where there is a number, the shape has to follow it and not the other way around. The frame-rhythm bars are six minute buckets drawn from one law: a bucket with no reports has no bar, an overshoot past the 33 ms budget is compressed rather than clipped, and the ceiling is a ratio of 2.2 so that one terrible minute stays visible without flattening the five neighbours. The same function computes the HUD bar and the page below it, which is why the two can be checked against each other.",
      "The repository index obeys the same discipline in the negative. The GitHub payload this site reads carries id, name, description, homepage, url, stars, forks, language and a fork flag — no timestamp of any kind — so the index prints no dates at all, and an empty description cell means GitHub said nothing, not that this repo has nothing to say. Sorting by update time happens upstream; the page just refuses to invent the field.",
      "None of this is modesty for its own sake. A dash is a cheaper interface than an apology: it tells the reader where the boundary of the measurement is, in the same place the number would have been.",
    ],
    bukti: [
      "nextjs-frontend/src/lib/jejakArsitektur.ts",
      "nextjs-frontend/src/lib/bacaTelemetri.ts",
      "nextjs-frontend/src/lib/buketMenit.ts",
      "docs/verify/halaman-probe.mjs",
    ],
  },
  {
    slug: "the-encryption-checkbox",
    judul: "The encryption checkbox",
    ringkas:
      "A control on the contact form claimed to encrypt the message. It encoded it in base64, named a library that was never installed, and sent plaintext anyway.",
    ditulis: "2026-11-02",
    tubuh: [
      "The closing chapter of this site has a one-line dispatch console: you type an address and a message, it posts to /api/contact, and the message lands in an inbox backed by Postgres. For a while it also had a checkbox that said the message would be encrypted.",
      "What the checkbox actually did was wrap the text in a header that imitated the shape of an encrypted payload and paste a btoa() call inside it. That is three separate claims failing at once. Base64 is an encoding, not an encryption — anyone who sees the string can undo it. The key library named in the label was never added to package.json, so there was no key to speak of. And the endpoint received the body as plaintext regardless, which means the last hop of the story the label told was simply false.",
      "It was removed rather than reworded. Commit 8d5819b dropped the fake PGP claim, and the comment that replaced it in ChapterPaddock.tsx says the claim must not come back before there are keys and real encryption on both ends of the wire.",
      "The general rule is narrower than it looks: a control is a statement about the system. A checkbox, a badge, a lock icon, a rate-limit note — each one asserts something a reader will not test before trusting. The bar is not that the claim be defensible in a legal sense; it is that every hop the claim describes is actually doing what the label says.",
      "That is also why the rest of this site measures itself in public. The telemetry page names its window, its polling interval and its rate limit; the repository index names the API call its numbers came from; the verifier suite fails a build when a printed figure has no source response behind it. Not because visitors ask for it, but because the alternative is a page full of controls that describe a system that does not exist.",
      "Real encryption at both ends is still not here. It is a decision with a cost — a key management story, an inbox that has to decrypt, a rate limit worth defending — and this page would rather leave the box uninstalled than install it again as decoration.",
    ],
    bukti: [
      "nextjs-frontend/src/components/Editorial/ChapterPaddock.tsx",
      "nextjs-frontend/next.config.ts",
      "go-backend/main.go",
      "8d5819b",
    ],
  },
];

export const cariEsai = (slug: string): Esai | null =>
  ESAI.find((e) => e.slug === slug) ?? null;

/** Perkiraan waktu baca dari jumlah kata, bukan angka yang diketik tangan: 200 kata per menit,
 *  dibulatkan, minimal satu menit. */
export const menitBaca = (esai: Esai): number => {
  const kata = esai.tubuh.join(" ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(kata / 200));
};
