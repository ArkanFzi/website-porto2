#!/usr/bin/env node
// Tripwire kontrak API: memastikan setiap pemanggilan /api/... dari sisi klien benar-benar
// berlabuh ke rute yang ada, memakai pembawa-kredensial yang cocok, dan tidak ada route handler
// yang mengaku sukses tanpa mengerjakan.
//
// Dipakai di job `web` pada workflow ci.yml. Baseline di tools/ci/api-baseline.json harus SAMA
// PERSIS dengan temuan hari ini: temuan baru membuat CI gagal, temuan lama yang sudah diperbaiki
// juga membuat CI gagal sampai baseline dikecilkan. Jadi baseline tidak boleh menua diam-diam.

import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const FE = join(ROOT, "nextjs-frontend");
const BE = join(ROOT, "go-backend");
const BASELINE_PATH = join(ROOT, "tools/ci/api-baseline.json");

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

function walk(dir, filter) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full, filter));
    else if (filter(full)) out.push(full);
  }
  return out;
}

function normalize(pathname) {
  let p = pathname.split("?")[0].split("#")[0];
  p = p.replace(/\/{2,}/g, "/");
  p = p.replace(/\$\{[^}]*\}/g, ":p");
  if (p.length > 1) p = p.replace(/\/+$/, "");
  return p.startsWith("/") ? p : `/${p}`;
}

const segments = (p) => p.split("/").filter((s) => s.length > 0);
const isParam = (s) =>
  s.startsWith(":") || (s.startsWith("[") && s.endsWith("]")) || s === ":p";

// Cocokkan pattern (route/handler) terhadap path pemanggilan.
// Placeholder di sisi pemanggil (hasil ${id} -> ":p") dianggap cocok dengan placeholder
// di sisi rute, karena keduanya memang parameter yang sama-sama belum terisi.
function matches(patternSegs, pathSegs) {
  let pi = 0;
  for (let i = 0; i < patternSegs.length; i++) {
    const seg = patternSegs[i];
    if (seg.endsWith("*")) {
      const head = seg.slice(0, -1);
      const rest = pathSegs.slice(pi);
      if (isParam(head) || head === "") return rest.length >= 1;
      return rest.length >= 1 && rest[0] === head;
    }
    if (pi >= pathSegs.length) return false;
    const actual = pathSegs[pi];
    if (isParam(seg)) {
      // ":p" pemanggil boleh jatuh ke ":id" rute, tapi segmen literal tidak boleh
      // menyamakan dirinya dengan placeholder.
      if (!isParam(actual) && actual !== seg) {
        // tetap cocok: placeholder rute menerima nilai apa pun
      }
      pi++;
      continue;
    }
    if (isParam(actual)) return false;
    if (seg !== actual) return false;
    pi++;
  }
  return pi === pathSegs.length;
}

// -- sumber kebenaran 1: rute gin di main.go --

function backendRoutes() {
  const src = readFileSync(join(BE, "main.go"), "utf8");
  const prefix = new Map();
  const groupRe = /(\w+)\s*:=\s*([.\w]+)\.Group\(\s*"([^"]*)"/g;
  let m;
  while ((m = groupRe.exec(src))) {
    const parent = m[2] === "r" ? "" : prefix.get(m[2]) ?? "";
    prefix.set(m[1], `${parent}${m[3]}`.replace(/\/+$/, ""));
  }
  const needsAuth = new Set();
  const authRe = /(\w+)\.Use\(\s*AuthMiddleware/g;
  while ((m = authRe.exec(src))) needsAuth.add(m[1]);

  const routes = [];
  const routeRe = /(\w+)\.(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\(\s*"([^"]*)"/g;
  while ((m = routeRe.exec(src))) {
    const base = prefix.get(m[1]);
    if (base === undefined) continue;
    routes.push({
      method: m[2],
      path: normalize(`${base}/${m[3]}`),
      group: m[1],
      protected: needsAuth.has(m[1]),
    });
  }
  return routes;
}

// -- sumber kebenaran 2: rewrite di next.config.ts --

function rewrites() {
  const src = readFileSync(join(FE, "next.config.ts"), "utf8");
  const out = [];
  const re = /source:\s*"([^"]+)"\s*,\s*destination:\s*`([^`]+)`/g;
  let m;
  while ((m = re.exec(src))) {
    out.push({ source: normalize(m[1]), destination: normalize(m[2].replace("${BACKEND_URL}", "")) });
  }
  return out;
}

// -- sumber kebenaran 3: route handler lokal Next --

function localHandlers() {
  const dir = join(FE, "src/app/api");
  return walk(dir, (f) => f.endsWith("route.ts")).map((f) => {
    const rel = relative(join(FE, "src/app"), f).replace(/\\/g, "/");
    const dirPart = rel.replace(/^api\//, "").replace(/\/route\.ts$/, "");
    const src = readFileSync(f, "utf8");
    const exported = METHODS.filter(
      (meth) =>
        new RegExp(`export\\s+(?:async\\s+)?function\\s+${meth}\\b`).test(src) ||
        new RegExp(`export\\s+const\\s+${meth}\\b`).test(src)
    );
    return { file: rel, path: normalize(`/api/${dirPart}`), exported, src };
  });
}

// -- pemanggilan dari sisi klien --

function clientCalls() {
  const files = walk(join(FE, "src"), (f) => /\.(ts|tsx)$/.test(f) && !f.includes("/api/"));
  const calls = [];
  for (const file of files) {
    const src = readFileSync(file, "utf8");
    const lines = src.split("\n");
    const re = /(authFetch|fetch)\(\s*[`"']([^`"']*\/api\/[^`"']*)[`"']/g;
    let m;
    while ((m = re.exec(src))) {
      const literal = m[2];
      const idx = src.slice(0, m.index);
      const line = idx.split("\n").length - 1;
      const window = lines.slice(line, line + 10).join("\n");
      const meth = window.match(/method:\s*[`"'](\w+)[`"']/);
      calls.push({
        file: relative(FE, file).replace(/\\/g, "/"),
        line: line + 1,
        fn: m[1],
        method: (meth ? meth[1] : "GET").toUpperCase(),
        absolute: /^https?:\/\//.test(literal),
        origin: (literal.match(/^https?:\/\/[^/]+/) || [""])[0],
        path: normalize(literal.replace(/^https?:\/\/[^/]+/, "")),
      });
    }
  }
  return calls;
}

// -- resolusi --

function resolve(call, { backends, urlRewrites, handlers }) {
  const psegs = segments(call.path);

  if (call.absolute) {
    return {
      ok: false,
      why: `URL absolut hardcoded ke ${call.origin}; di Cloud Run origin itu tidak ada, dan fetch ini berjalan di dalam browser headless milik /api/cv`,
    };
  }

  const local = handlers.find((h) => matches(segments(h.path), psegs));
  if (local && local.exported.includes(call.method)) {
    return { ok: true, via: `handler ${local.file}` };
  }

  const hit = backends.find((b) => b.method === call.method && matches(segments(b.path), psegs));
  const rw = urlRewrites.find((r) => matches(segments(r.source), psegs));

  if (hit && rw) {
    if (hit.protected && call.fn !== "authFetch") {
      return {
        ok: false,
        why: `${hit.method} ${hit.path} ada di group "${hit.group}" yang menuntut Bearer token, tapi dipanggil pakai ${call.fn}() tanpa header Authorization`,
      };
    }
    return { ok: true, via: `rewrite ${rw.source} -> ${hit.method} ${hit.path}` };
  }
  if (hit && !rw) {
    return { ok: false, why: `rute backend ${hit.method} ${hit.path} ada, tapi tidak ada rewrite untuk meneruskannya` };
  }
  if (rw && !hit) {
    return {
      ok: false,
      why: `rewrite ${rw.source} ada, tapi backend tidak punya ${call.method} ${call.path}`,
    };
  }
  if (local) {
    return { ok: false, why: `handler lokal ${local.file} hanya export ${local.exported.join(",") || "(kosong)"}` };
  }
  return { ok: false, why: "tidak ada handler lokal, tidak ada rewrite, tidak ada rute backend" };
}

function main() {
  const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
  const ctx = {
    backends: backendRoutes(),
    urlRewrites: rewrites(),
    handlers: localHandlers(),
  };
  const calls = clientCalls();

  const rows = calls.map((c) => ({ ...c, ...resolve(c, ctx) }));
  const unique = new Map();
  for (const r of rows) {
    const key = `${r.method} ${r.absolute ? `${r.origin}${r.path}` : r.path}`;
    if (!unique.has(key)) unique.set(key, r);
  }

  const deadNow = new Set(
    [...unique.values()].filter((r) => !r.ok).map((r) => `${r.method} ${r.absolute ? `${r.origin}${r.path}` : r.path}`)
  );
  const baselineDead = new Set(baseline.dead_paths);
  const added = [...deadNow].filter((d) => !baselineDead.has(d));
  const fixed = [...baselineDead].filter((d) => !deadNow.has(d));

  const stubPatterns = [
    [/simulat/i, "menyimulasikan"],
    [/in a real application/i, "belum diimplementasi"],
    [/not\s+implemented/i, "belum diimplementasi"],
  ];
  const stubsNow = ctx.handlers.filter((h) => stubPatterns.some(([re]) => re.test(h.src))).map((h) => h.file);
  const baselineStubs = new Set(baseline.stub_handlers);
  const stubAdded = stubsNow.filter((s) => !baselineStubs.has(s));
  const stubFixed = [...baselineStubs].filter((s) => !stubsNow.includes(s));

  console.log(`rute backend   : ${ctx.backends.length} (protected: ${ctx.backends.filter((b) => b.protected).length})`);
  console.log(`rewrite        : ${ctx.urlRewrites.length}`);
  console.log(`handler lokal  : ${ctx.handlers.length}`);
  console.log(`pemanggilan UI : ${calls.length} (${unique.size} unik)\n`);

  for (const r of [...unique.values()].sort((a, b) =>
    `${a.method} ${a.path}`.localeCompare(`${b.method} ${b.path}`)
  )) {
    console.log(`  [${r.ok ? "hidup" : "MATI "}] ${r.file}:${r.line}  ${r.method} ${r.absolute ? `${r.origin}${r.path}` : r.path}`);
    if (!r.ok) console.log(`          ${r.why}`);
  }

  console.log("");
  for (const h of ctx.handlers) {
    const why = stubPatterns.find(([re]) => re.test(h.src));
    console.log(`  handler ${h.file} export=${h.exported.join(",") || "-"}${why ? `  <-- STUB (${why[1]})` : ""}`);
  }

  let gagal = false;
  if (process.argv.includes("--emit-baseline")) {
    const payload = {
      _catatan:
        "Daftar hutang yang diketahui. Isinya harus SAMA PERSIS dengan temuan hari ini: bertambah memicu kegagalan, berkurang juga memicu kegagalan sampai baseline dikecilkan. Regenerasi sadar: node tools/ci/api-contract-check.mjs --emit-baseline",
      dead_paths: [...deadNow].sort(),
      stub_handlers: stubsNow.sort(),
    };
    writeFileSync(BASELINE_PATH, `${JSON.stringify(payload, null, 2)}\n`);
    console.log(
      `\nBaseline ditulis ulang: ${deadNow.size} path mati, ${stubsNow.length} stub.`
    );
    return;
  }
  const report = (title, items, sign) => {
    if (!items.length) return;
    gagal = true;
    console.log(`\n${title} (${items.length}):`);
    for (const i of items) console.log(`  ${sign} ${i}`);
  };
  report("MATI baru yang tidak ada di baseline", added, "+");
  report("Sudah diperbaiki, kecilkan baseline", fixed, "-");
  report("STUB baru", stubAdded, "+");
  report("STUB sudah hilang, kecilkan baseline", stubFixed, "-");

  if (!gagal) {
    console.log(`\nKontrak sesuai baseline: ${deadNow.size} path mati, ${stubsNow.length} stub, tidak ada regresi.`);
    return;
  }
  console.log("\nBaseline = keadaan nyata. Perbaiki kodenya, atau perbarui baseline secara sadar.");
  process.exit(1);
}

main();
