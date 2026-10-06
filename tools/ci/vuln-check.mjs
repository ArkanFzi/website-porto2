#!/usr/bin/env node
// Tripwire kerentanan: membandingkan temuan govulncheck + npm audit hari ini dengan baseline yang
// sengaja dikomit, dan gagal kalau keduanya bergerak — ke arah mana pun.
//
// Dipakai di workflow scan.yml. Alasannya baseline dan bukan ambang batas severitas:
//   * diukur 2026-10-06, govulncheck sudah rc=1 dengan 3 kerentanan yang BENAR-BENAR dipanggil kode
//     backend (x/text lewat gorm, quic-go lewat gin.Engine.Run, pgx lewat gorm.DB.Scan), dan
//     `npm audit --omit=dev` melaporkan 60 advisori GHSA unik pada 12 paket produksi.
//   * gerbang yang lahir-lahir merah tidak punya nilai informasi: ia akan diredam dalam seminggu,
//     persis kegagalan yang diberantas tools/ci/api-contract-check.mjs.
// Jadi yang dilarang di sini bukan "ada kerentanan", tapi "kerentanan baru muncul tanpa keputusan",
// dan "kerentanan lama hilang tanpa baseline dikecilkan" — yang kedua itu sebab baseline tidak boleh
// menua diam-diam.
//
// Regenerasi sadar:
//   node tools/ci/vuln-check.mjs --govuln=/tmp/govuln.txt --audit=/tmp/audit.json --emit-baseline

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const BASELINE_PATH = join(ROOT, "tools/ci/vuln-baseline.json");

function arg(name) {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}

const EMIT = process.argv.includes("--emit-baseline");
const govulnPath = arg("govuln");
const auditPath = arg("audit");

function fail(msg) {
  console.error(`vuln-check: ${msg}`);
  process.exit(1);
}

if (!govulnPath) fail("butuh --govuln=<path> keluaran govulncheck (teks biasa)");
if (!auditPath) fail("butuh --audit=<path> keluaran `npm audit --json`");
for (const [label, p] of [["govuln", govulnPath], ["audit", auditPath]]) {
  if (!existsSync(p)) fail(`file ${label} tidak ada: ${p} (scan gagal sebelum membandingkan)`);
}

// govulncheck mencetak satu blok "Vulnerability #n: GO-YYYY-nnnn" untuk setiap temuan yang
// terpanggil, dan mengulang id yang sama di baris "More info:". Set() menghilangkan duplikat.
// Yang dibaca di sini memang hanya temuan terpanggil: itu definisi govulncheck, dan itu yang
// membuat perbedaan dengan `npm audit` yang tidak tahu jalur panggilan.
const govulnText = readFileSync(govulnPath, "utf8");
const goIds = [...new Set(govulnText.match(/GO-\d{4}-\d{4}/g) || [])].sort();

// npm audit --json: .vulnerabilities[pkg].via berisi campuran nama paket transitif (string) dan
// objek advisori {url: "https://github.com/advisories/GHSA-..."}. Yang stabil sebagai identitas
// hanyalah GHSA-nya; jalur string dilewati.
let auditJson;
try {
  auditJson = JSON.parse(readFileSync(auditPath, "utf8"));
} catch (e) {
  fail(`audit bukan JSON: ${e.message}`);
}
if (!auditJson.vulnerabilities || typeof auditJson.vulnerabilities !== "object") {
  fail("keluaran npm audit tidak punya .vulnerabilities — bentuknya berubah, perbandingan tidak berarti");
}
const npmMap = new Map();
for (const [pkg, v] of Object.entries(auditJson.vulnerabilities)) {
  for (const via of v.via || []) {
    if (typeof via !== "object" || !via.url) continue;
    const id = via.url.split("/").pop();
    if (/^GHSA-/.test(id) && !npmMap.has(id)) npmMap.set(id, { pkg, severity: via.severity || v.severity });
  }
}
const npmIds = [...npmMap.keys()].sort();

// Saat --emit-baseline baseline boleh belum ada (itu memang jalur BOOTSTRAP); tanpa flag itu
// ketiadiannya adalah kegagalan, bukan ajakan menulis ulang daftar.
if (!existsSync(BASELINE_PATH)) {
  if (!EMIT) fail(`baseline tidak ada: ${BASELINE_PATH}`);
  console.log("baseline belum ada; --emit-baseline dipakai untuk menulisnya pertama kali");
}
const baseline = existsSync(BASELINE_PATH) ? JSON.parse(readFileSync(BASELINE_PATH, "utf8")) : {};
const baseGo = [...(baseline.go || [])].sort();
const baseNpm = [...(baseline.npm || [])].sort();

const diff = (a, b) => a.filter(x => !b.includes(x));
const baruGo = diff(goIds, baseGo);
const hilangGo = diff(baseGo, goIds);
const baruNpm = diff(npmIds, baseNpm);
const hilangNpm = diff(baseNpm, npmIds);

console.log(`terukur   : go=${goIds.length} terpanggil, npm=${npmIds.length} GHSA unik (produksi)`);
console.log(`baseline  : go=${baseGo.length}, npm=${baseNpm.length}`);

if (EMIT) {
  const keluar = {
    _catatan: "Temuan yang diketahui. Harus SAMA PERSIS dengan hasil scan hari ini: bertambah membuat scan.yml gagal, berkurang juga gagal sampai daftar ini dikecilkan. Regenerasi sadar: node tools/ci/vuln-check.mjs --govuln=<file> --audit=<file> --emit-baseline",
    diukur: new Date().toISOString().slice(0, 10),
    go: goIds,
    npm: npmIds,
  };
  writeFileSync(BASELINE_PATH, JSON.stringify(keluar, null, 2) + "\n");
  console.log(`baseline ditulis ulang ke ${join("tools/ci", "vuln-baseline.json")}: ${goIds.length} GO + ${npmIds.length} GHSA`);
  process.exit(0);
}

for (const [label, list] of [["GO baru", baruGo], ["GO hilang", hilangGo], ["GHSA baru", baruNpm], ["GHSA hilang", hilangNpm]]) {
  for (const id of list) {
    const detail = label.startsWith("GHSA") && npmMap.get(id) ? ` (${npmMap.get(id).pkg}/${npmMap.get(id).severity})` : "";
    console.log(`  ${label}: ${id}${detail}`);
  }
}

if (baruGo.length + hilangGo.length + baruNpm.length + hilangNpm.length === 0) {
  console.log("sesuai baseline: tidak ada temuan baru dan tidak ada yang hilang diam-diam");
  process.exit(0);
}

console.error(`GERBANG MERAH: ${baruGo.length + baruNpm.length} temuan baru, ${hilangGo.length + hilangNpm.length} temuan hilang dari baseline`);
console.error("baru  = ada kode/lockfile yang kini tersentuh advisori yang belum pernah diputuskan");
console.error("hilang = baseline menua; kecilkan daftarnya lewat --emit-baseline supaya yang tersisa tetap berarti");
process.exit(1);
