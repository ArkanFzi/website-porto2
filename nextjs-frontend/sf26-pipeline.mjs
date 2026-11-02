// Pipeline aset SF-26 (Tahap 3, ide 21): ekspor Sketchfab 272.038 triangle →
// nextjs-frontend/public/models/sf26.glb — ±50.000 triangle per frame, 33 material jadi 3
// (sasis/ban/pelek) yang di-render satu material panggung, seluruh atlas warna dibuang
// (logo sponsor ikut hilang), satu normal map 512² dipertahankan, geometri dikuantisasi
// lewat KHR_mesh_quantization.
//
//   node nextjs-frontend/sf26-pipeline.mjs <out.glb> [targetTri=40000] [error=0.002] \
//        [rasioRoda=0.34] [errorRoda=0.012]
//   SUMBER=<dir ekspor sketchfab>   default /tmp/sf26-inspect (berisi scene.gltf + .bin)
//
// Sumber: https://sketchfab.com/3d-models/2026-ferrari-sf-26-e5ca6cecdc42449283f4bed27360f2a7
// oleh Dave Love, lisensi CC-BY-4.0 — kreditnya hidup di halaman, lihat ChapterPaddock.
import fs from "node:fs";
import path from "node:path";
import { Document, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { weld, simplify, simplifyPrimitive, quantize, prune } from "@gltf-transform/functions";
import { MeshoptSimplifier } from "meshoptimizer";

const SUMBER = process.env.SUMBER ?? "/tmp/sf26-inspect";
const TUJUAN = process.argv[2];
const TARGET_TRI = Number(process.argv[3] ?? 40000);
const ERROR = Number(process.argv[4] ?? 0.002);

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const asli = await io.read(path.join(SUMBER, "scene.gltf"));

// Sumbernya ekspor Sketchfab: node akar menyimpan `matrix` yang memutar Z-up
// ke Y-up, jadi posisi mentah di accessor BUKAN koordinat dunia. Semua angka
// di bawah dihitung dari koordinat dunia supaya aset yang lahir berdiri benar
// di panggung three.js (Y naik, panjang sepanjang Z).
const rantai = [];
(function kumpulkan(node, m) {
  const lokal = node.getMatrix();
  const gabung = m ? kali(m, lokal) : lokal;
  if (node.getMesh()) rantai.push({ node, m: gabung });
  node.listChildren().forEach((c) => kumpulkan(c, gabung));
})(asli.getRoot().listScenes()[0].listChildren()[0], null);

function kali(a, b) {
  const o = new Float64Array(16);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++)
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  return o;
}
function titik(m, p) {
  return [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
  ];
}
function arah(m, p) {
  return [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2],
  ];
}

// Roda = mesh 3 (discs) + 4 (tyre_sides) + 5 (wheel_hub) + 6 (tyre_tread);
// tiap mesh terbagi rata ke empat sudut. Sumbu roda = X dunia.
const MERES = { 3: "pelek", 4: "ban", 5: "pelek", 6: "ban" };

function kantongBaru() {
  return { pos: [], nor: [], uv: [], idx: [], dasar: 0 };
}
function isiPrimitive(k, prim, m, saring, geser) {
  const P = prim.getAttribute("POSITION");
  const N = prim.getAttribute("NORMAL");
  const T = prim.getAttribute("TEXCOORD_0");
  const I = prim.getIndices();
  if (!P || !N || !T || !I) throw new Error(`atribut tidak seragam: ${prim.getName()}`);
  const ia = I.getArray();
  const peta = new Map();
  const pakai = (v) => {
    let j = peta.get(v);
    if (j === undefined) {
      j = k.dasar++;
      const p = titik(m, P.getElement(v, [0, 0, 0]));
      const n = arah(m, N.getElement(v, [0, 0, 0]));
      const t = T.getElement(v, [0, 0]);
      k.pos.push(p[0] + (geser?.[0] ?? 0), p[1] + (geser?.[1] ?? 0), p[2] + (geser?.[2] ?? 0));
      k.nor.push(n[0], n[1], n[2]);
      k.uv.push(t[0], t[1]);
    }
    return j;
  };
  for (let t = 0; t < ia.length; t += 3) {
    const a = ia[t], b = ia[t + 1], c = ia[t + 2];
    if (saring) {
      const pa = titik(m, P.getElement(a, [0, 0, 0]));
      const pb = titik(m, P.getElement(b, [0, 0, 0]));
      const pc = titik(m, P.getElement(c, [0, 0, 0]));
      const x = (pa[0] + pb[0] + pc[0]) / 3;
      const z = (pa[2] + pb[2] + pc[2]) / 3;
      if (!saring(x, z)) continue;
    }
    k.idx.push(pakai(a), pakai(b), pakai(c));
  }
}

// Ukur tiap sudut roda dunia: pusat poros + lebar, untuk transform node.
const sudut = {};
for (const { node, m } of rantai) {
  const idx = asli.getRoot().listMeshes().indexOf(node.getMesh());
  const grup = MERES[idx];
  if (!grup) continue;
  const P = node.getMesh().listPrimitives()[0].getAttribute("POSITION");
  const I = node.getMesh().listPrimitives()[0].getIndices().getArray();
  for (let t = 0; t < I.length; t += 3) {
    for (const v of [I[t], I[t + 1], I[t + 2]]) {
      const p = titik(m, P.getElement(v, [0, 0, 0]));
      const key = (p[0] < 0 ? "L" : "R") + (p[2] > 0 ? "depan" : "belakang");
      const s = (sudut[key] ||= { x: [1e9, -1e9], y: [1e9, -1e9], z: [1e9, -1e9] });
      for (const j of [0, 1, 2]) {
        const nama = ["x", "y", "z"][j];
        s[nama][0] = Math.min(s[nama][0], p[j]);
        s[nama][1] = Math.max(s[nama][1], p[j]);
      }
    }
  }
}
const tengah = (k) => [(k.x[0] + k.x[1]) / 2, (k.y[0] + k.y[1]) / 2, (k.z[0] + k.z[1]) / 2];
const lebar = (k) => k.x[1] - k.x[0];
const porosDepan = tengah(sudut.Ldepan);
const rasioBelakang = lebar(sudut.Lbelakang) / lebar(sudut.Ldepan);
const poros = {
  LF: porosDepan,
  RF: [-porosDepan[0], porosDepan[1], porosDepan[2]],
  LR: tengah(sudut.Lbelakang),
  RR: [-tengah(sudut.Lbelakang)[0], tengah(sudut.Lbelakang)[1], tengah(sudut.Lbelakang)[2]],
};
console.log("poros dunia", JSON.stringify(Object.fromEntries(Object.entries(poros).map(([k, v]) => [k, v.map((n) => +n.toFixed(3))]))), "rasio lebar belakang", rasioBelakang.toFixed(3));

const kantung = { sasis: kantongBaru(), ban: kantongBaru(), pelek: kantongBaru() };
for (const { node, m } of rantai) {
  const idx = asli.getRoot().listMeshes().indexOf(node.getMesh());
  const prim = node.getMesh().listPrimitives()[0];
  const grup = MERES[idx];
  if (!grup) {
    isiPrimitive(kantung.sasis, prim, m, null, null);
    continue;
  }
  // Hanya sudut kiri yang jadi geometry; kanan dan belakang lahir dari node.
  isiPrimitive(kantung[grup], prim, m, (x, z) => x < 0 && z > 0, porosDepan.map((v) => -v));
}

const triSebelum = Object.entries(kantung).reduce((a, [k, v]) => {
  console.log("tri", k, v.idx.length / 3, "vertex", v.dasar);
  return a + v.idx.length / 3;
}, 0);
console.log("TOTAL tri sebelum simplify:", triSebelum);

const doc = new Document();
const root = doc.getRoot();
doc.createBuffer();

// Satu-satunya peta normal yang mengandung detail: sf25_carbon2_normal.png
// (512²). sf25_carbon1_normal.png — yang dirujuk 11 dari 15 slot normal —
// ternyata 32², placeholder. Atlas warna dibuang semua; material panggung yang
// melukis grafit + rosso.
const byteNormal = fs.readFileSync(path.join(SUMBER, "textures/sf25_carbon2_normal.png"));
const sumberNormal = asli.getRoot().listTextures().find(
  (t) => t.getImage().byteLength === byteNormal.byteLength && Buffer.from(t.getImage()).equals(byteNormal),
);
if (!sumberNormal) throw new Error("normal carbon2 tidak ketemu");
const normal = doc.createTexture("normal-karbon").setImage(new Uint8Array(byteNormal)).setMimeType("image/png");

const matSasis = doc.createMaterial("sasis").setMetallicFactor(0.35).setRoughnessFactor(0.55).setNormalTexture(normal);
const matPelek = doc.createMaterial("pelek").setMetallicFactor(0.8).setRoughnessFactor(0.35).setNormalTexture(normal);
const matBan = doc.createMaterial("ban").setMetallicFactor(0.02).setRoughnessFactor(0.95);

function primitif(k, mat) {
  const p = doc.createPrimitive();
  p.setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(new Float32Array(k.pos)));
  p.setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(new Float32Array(k.nor)));
  p.setAttribute("TEXCOORD_0", doc.createAccessor().setType("VEC2").setArray(new Float32Array(k.uv)));
  p.setIndices(doc.createAccessor().setType("SCALAR").setArray(new Uint32Array(k.idx)));
  p.setMaterial(mat);
  return p;
}
const meshSasis = doc.createMesh("sasis").addPrimitive(primitif(kantung.sasis, matSasis));
const meshRoda = doc
  .createMesh("roda")
  .addPrimitive(primitif(kantung.ban, matBan))
  .addPrimitive(primitif(kantung.pelek, matPelek));

// Rotasi pi terhadap Y dunia = cermin kiri→kanan yang tetap handedness benar
// (knuckle tetap menghadap dalam) tanpa skala negatif.
const CERMIN = [0, Math.sin(Math.PI / 2), 0, Math.cos(Math.PI / 2)];
const satu = [1, 1, 1];
const TANPA_ROT = [0, 0, 0, 1];
const nodeSasis = doc.createNode("sasis").setMesh(meshSasis);
const rodaList = [
  doc.createNode("roda-LF").setMesh(meshRoda).setTranslation(poros.LF).setRotation(TANPA_ROT).setScale(satu),
  doc.createNode("roda-RF").setMesh(meshRoda).setTranslation(poros.RF).setRotation(CERMIN).setScale(satu),
  doc.createNode("roda-LR").setMesh(meshRoda).setTranslation(poros.LR).setRotation(TANPA_ROT).setScale([rasioBelakang, 1, 1]),
  doc.createNode("roda-RR").setMesh(meshRoda).setTranslation(poros.RR).setRotation(CERMIN).setScale([rasioBelakang, 1, 1]),
];
const nodeInduk = doc.createNode("SF26").addChild(nodeSasis);
rodaList.forEach((n) => nodeInduk.addChild(n));
doc.createScene("SF26").addChild(nodeInduk);
const aset = root.getAsset();
aset.generator = "pipeline-sf26 website-porto2 (glTF-Transform v4.5.1)";

await doc.transform(weld());
const rasio = Math.min(1, TARGET_TRI / (triSebelum || TARGET_TRI));
await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio: rasio, error: ERROR }), prune());
// Roda dipakai bersama oleh empat node, jadi biaya render-nya dikali empat.
// Disederhanakan sendiri supaya anggaran triangle dihitung per frame, bukan
// per geometry.
const RODA_RASIO = Number(process.argv[5] ?? 0.34);
const RODA_ERROR = Number(process.argv[6] ?? 0.012);
for (const prim of meshRoda.listPrimitives()) {
  await simplifyPrimitive(prim, { simplifier: MeshoptSimplifier, ratio: RODA_RASIO, error: RODA_ERROR });
}
await doc.transform(weld({ overwrite: false }), prune());
await doc.transform(
  // KHR_mesh_quantization, bukan Draco: three.js membacanya tanpa decoder WASM
  // dan anggaran transfer/VRAM sudah terpenuhi.
  quantize({ quantizePositionBits: 14, quantizeNormalBits: 10, quantizeTexcoordBits: 12 }),
  prune(),
);

let triUnik = 0;
for (const m of root.listMeshes()) for (const p of m.listPrimitives()) triUnik += p.getIndices().getCount() / 3;
let triRender = 0;
for (const n of root.listNodes()) if (n.getMesh()) for (const p of n.getMesh().listPrimitives()) triRender += p.getIndices().getCount() / 3;
console.log("rasio simplify", rasio.toFixed(3), "→ tri unik:", Math.round(triUnik), "| tri per frame (roda ×4):", Math.round(triRender));
console.log("material:", root.listMaterials().map((m) => m.getName()).join(","), "| tekstur:", root.listTextures().map((t) => t.getName()).join(","));

fs.mkdirSync(path.dirname(TUJUAN), { recursive: true });
await io.write(TUJUAN, doc);
console.log("tertulis", TUJUAN, (fs.statSync(TUJUAN).size / 1024).toFixed(0), "KB");
