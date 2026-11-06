import assert from "node:assert/strict";
import test from "node:test";

import { jsonLd } from "./site.ts";

// Nilai yang mengandung "</script>" adalah satu-satunya cara JSON di dalam <script> bisa
// berhenti jadi data dan mulai jadi markup. Tanpa \u003c peramban menutup tag di tengah
// string dan sisinya ditafsirkan sebagai HTML.
test("jsonLd menutup celah </script> tanpa merusak datanya", () => {
  const jahat = { "@type": "Article", headline: "x</script><script>alert(1)</script>" };
  const { __html } = jsonLd(jahat);

  assert.ok(!__html.includes("</script>"), "masih ada penutup tag telanjang di dalam nilainya");
  assert.ok(__html.includes("\\u003c/script>"), "penutup tag tidak di-escape: " + __html);
  assert.deepEqual(JSON.parse(__html), jahat, "escape mengubah data yang terbaca balik");
});

test("jsonLd tetap JSON yang sah untuk konten biasa", () => {
  const normal = [{ "@type": "Person", name: "M. Arkan Fauzi", sameAs: ["https://github.com/ArkanFzi"] }];
  assert.deepEqual(JSON.parse(jsonLd(normal).__html), normal);
});
