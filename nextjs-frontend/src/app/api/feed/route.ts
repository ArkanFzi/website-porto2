import { NextResponse } from "next/server";
import { EMAIL_KONTAK, SITE_URL } from "@/lib/site";
import { daftarPerjalanan, type Perjalanan } from "@/lib/server/journey";
import { daftarSertifikat, type Certificate } from "@/lib/server/certificates";

// Feed Atom dulu murni tulis-tangan: dua domain yang tidak pernah melayani situs,
// email contact@… yang tidak ada mailbox-nya, dan entri "12.8K RPS HRIS" bertanggal
// 2026-11-01 yang tidak bisa dilacak ke data mana pun. Sekarang setiap entri dibangun
// dari tabel yang sama yang dipakai halaman depan (journeys + certificates lewat lib
// server), lewat fungsi penanggalan di bawah, sehingga tidak ada satu pun tanggal atau
// URL yang dikarang di berkas ini.
//
// Sumber yang sengaja TIDAK dipakai: github.ts. RepoGitHub tidak punya field tanggal,
// jadi entri repo harus diberi <updated> karangan — persis kegagalan yang mau dicegah.

interface EntriFeed {
  id: string;
  judul: string;
  href: string;
  ringkas: string;
  diperbarui: string;
}

const BULAN: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, may: 5, jun: 6,
  jul: 7, agu: 8, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, des: 12, dec: 12,
};

// Tanggal ISO diturunkan dari presisi yang memang ada di data: "Nov 2025" -> 2025-11-01,
// "2024 — 2025" -> 2025-01-01 (pakai tahun terakhir sebuah rentang, bukan tahun pertama),
// "2024" -> 2024-01-01. Angka hari/bulan yang lebih rinci tidak pernah dikarang, dan
// kalau string sumber sama sekali tidak memuat tahun, pemanggil harus memutuskan sendiri
// (normalnya: pakai waktu build, jangan mengarang tanggal masa lalu).
function tanggalAtom(mentah: string | null | undefined): string | null {
  if (!mentah) return null;
  const teks = mentah.toLowerCase();
  const tahun = [...teks.matchAll(/\b((?:1[89]|2\d)\d{2})\b/g)].map((m) => Number(m[1]));
  if (tahun.length === 0) return null;
  const bulanTeks = teks.match(/\b([a-z]{3})[a-z]*\b/);
  const bulan = bulanTeks ? BULAN[bulanTeks[1]] ?? 1 : 1;
  return `${Math.max(...tahun)}-${String(bulan).padStart(2, "0")}-01T00:00:00Z`;
}

const waktuBuild = (): string => new Date().toISOString();

// Semua id/href diumpankan dari SITE_URL supaya Atom tetap berada di domain kanonik.
// linkHref external milik tabel journeys sengaja tidak dipakai sebagai <link>: feed
// ini bercerita tentang isi situs, dan setiap href-nya harus bisa ditelusuri ke halaman
// yang benar-benar ada di domain ini.
function entriDariPerjalanan(baris: Perjalanan[]): EntriFeed[] {
  return baris.map((p) => ({
    id: `${SITE_URL}/journey/${encodeURIComponent(p.id)}`,
    judul: `${p.year} — ${p.title}`,
    href: `${SITE_URL}/#chapter-02`,
    ringkas: p.body,
    diperbarui: tanggalAtom(p.year) ?? waktuBuild(),
  }));
}

function entriDariSertifikat(baris: Certificate[]): EntriFeed[] {
  return baris.map((c) => ({
    id: `${SITE_URL}/certificate/${encodeURIComponent(c.id)}`,
    judul: c.title,
    href: `${SITE_URL}/#chapter-02`,
    ringkas: `${c.issuer} (${c.date})`,
    diperbarui: tanggalAtom(c.date) ?? waktuBuild(),
  }));
}

const esc = (nilai: string): string =>
  nilai
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const barisEntri = (e: EntriFeed): string =>
  [
    "  <entry>",
    `    <title>${esc(e.judul)}</title>`,
    `    <link href="${esc(e.href)}" rel="alternate"/>`,
    `    <id>${esc(e.id)}</id>`,
    `    <updated>${e.diperbarui}</updated>`,
    `    <summary>${esc(e.ringkas)}</summary>`,
    "  </entry>",
  ].join("\n");

export async function GET() {
  const [perjalanan, sertifikat] = await Promise.all([
    daftarPerjalanan().catch(() => [] as Perjalanan[]),
    daftarSertifikat().catch(() => [] as Certificate[]),
  ]);

  const entri = [...entriDariSertifikat(sertifikat), ...entriDariPerjalanan(perjalanan)];
  // <updated> feed = tanggal entri paling terbaru; hanya kalau tidak ada satu pun entri
  // yang bisa dibaca kita jatuh ke waktu build.
  const terbaru = entri.length > 0
    ? entri.map((e) => e.diperbarui).reduce((a, b) => (b > a ? b : a))
    : waktuBuild();

  const feed = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom">',
    "  <title>M. Arkan Fauzi — Systems Architecture &amp; Spatial Changelog</title>",
    "  <subtitle>Changelog nyata dari data portfolio: perjalanan, sertifikat, dan backend Go yang melayani keduanya.</subtitle>",
    `  <link href="${esc(`${SITE_URL}/api/feed`)}" rel="self"/>`,
    `  <link href="${esc(`${SITE_URL}/`)}" rel="alternate"/>`,
    `  <updated>${terbaru}</updated>`,
    `  <id>${esc(`${SITE_URL}/`)}</id>`,
    "  <author>",
    "    <name>M. Arkan Fauzi</name>",
    `    <email>${esc(EMAIL_KONTAK)}</email>`,
    "  </author>",
    ...entri.map(barisEntri),
    "</feed>",
    "",
  ].join("\n");

  return new NextResponse(feed, {
    status: 200,
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
