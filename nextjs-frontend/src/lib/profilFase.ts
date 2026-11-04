/** Satu sumber daftar phase bab 02 — apa yang pernah kukerjakan, bukan yang terdengar bagus.
 *
 *  Sebelum modul ini, bab 02 menyimpan dua array yang diketik tangan (`ENGINEER_PHASES` dan
 *  `CREATOR_PHASES`) dan keduanya tidak pernah tampil: `daftarPengalaman()` selalu
 *  mengembalikan minimal dua baris stub, dan `ChapterDuality` memberi prioritas mutlak ke
 *  jalur itu — jadi yang tercetak dua baris tanpa summary plus label specs yang tidak bisa
 *  dibuktikan ("POSTGRESQL SYNCED · VERIFIED EMPLOYMENT", sementara Postgres tidak menjawab).
 *
 *  Sumber yang dipakai sekarang, berurutan:
 *  1. tabel `experiences` (Postgres) kalau benar-benar ada barisnya, detailnya dari kolom
 *     `summary` yang disunting lewat /admin;
 *  2. tabel `journeys` kalau isinya ≥ 3 babak (jalur yang bisa disunting dari /admin);
 *  3. blok Professional Record kertas CV (`src/lib/profil.ts`, cermin LinkedIn), dengan repo
 *     yang malam ini benar-benar dikembalikan `daftarReposGitHub()` sebagai detail di dalam
 *     panel record yang mengklaim publishes karyanya di GitHub — bukan sebagai phase sendiri.
 *
 *  Yang TIDAK kulakukan, dan alasannya: prose CV tidak ditempel ke baris DB lewat pencocokan
 *  kata kunci — "Sekawan Media" muncul di dua record yang berbeda dan menempelkan paragraf
 *  yang salah lebih buruk daripada tidak menempel apa pun. `summary` jalur 1 adalah apa yang
 *  diketik di /admin, bukan apa yang disalin dari `profil.ts`; baris yang detailnya belum
 *  diisi mencetak accordion kosong. Karya GitHub juga tidak menempel di jalur 1 dan 2:
 *  memasangkan repo ke baris yang tidak menyebutnya berarti mengarang sumber. */

import { REKAMAN } from "@/lib/profil";
import type { RepoBerlian } from "@/lib/server/github";
import type { Experience } from "@/lib/server/experience";
import type { Perjalanan } from "@/lib/server/journey";

/** Karya yang bisa ditunjuk, bukan yang bisa dibanggakan: tiap baris adalah satu repo yang
 *  malam ini benar-benar ada di payload `/api/github-repos`. */
export interface FaseKarya {
  nama: string;
  url: string;
  bahasa: string | null;
  bintang: number;
  deskripsi: string | null;
}

export interface CareerPhase {
  id: string;
  phase: string;
  title: string;
  org: string;
  year: string;
  summary: string;
  specs: string[];
  link?: string;
  karya?: FaseKarya[];
}

/** Link institusi yang sudah diterbitkan situs untuk record CV. Kompetisi tidak punya halaman
 *  resmi yang bisa kutunjuk, jadi rekamannya sengaja tanpa tautan. */
const LINK_INSTITUSI: Record<string, string> = {
  "Sekawan Media · Malang · Hybrid": "https://sekawanmedia.co.id",
  "SMK Negeri 6 Malang": "https://smkn6malang.sch.id",
};

/** Tag diambil dari kalimat rekaman itu sendiri, bukan dari luar: kalau CV berubah, tag ini
 *  ikut berubah, bukan mengarang profesi baru. */
const TAG_REKAMAN: Record<string, string[]> = {
  "Full Stack Engineer — Apprenticeship": ["MICROSERVICES", "HRIS + RECRUITMENT", "MALANG · HYBRID"],
  "Software Engineering Student": ["RPL SMKN 6", "INDUSTRIAL CLASS · TEFA", "LARAVEL / NEXT.JS / C#"],
  "Semi Finalist — JHIC 2025": ["SEMI FINALIS NASIONAL", "JAGOAN HOSTING · KOMDIGI · MASPION IT"],
};

function kategori(judul: string): string {
  if (/semi finalist|competition|jhic/i.test(judul)) return "COMPETITION RECORD";
  if (/student|smk|rpl/i.test(judul)) return "TRAINING RECORD";
  return "EMPLOYMENT RECORD";
}

const nomor = (idx: number) => String(idx + 1).padStart(2, "0");

/** Empat karya yang dipamerkan, urutan sama untuk kedua persona. Nama dicocokkan persis dengan
 *  `repo.name`, jadi karya yang hilang dari payload API tidak meninggalkan baris hantu. */
const REPO_YANG_DIPAMERKAN = ["graphify-devkit", "ferrari-ubuntu", "website-porto2", "Pickertime"];

function karyaDariGitHub(repos: RepoBerlian[]): FaseKarya[] {
  return REPO_YANG_DIPAMERKAN.map((nama) => repos.find((r) => r.name === nama))
    .filter((r): r is RepoBerlian => !!r)
    .map((r) => ({
      nama: r.name,
      url: r.html_url,
      bahasa: r.language,
      bintang: r.stargazers_count,
      deskripsi: r.description,
    }));
}

/** Repo bukan babak karier — ia bukti dari satu babak. Ia menempel pada record CV yang
 *  kalimatnya benar-benar mengklaim karya yang diterbitkan: record itu menulis "published
 *  publicly on GitHub", jadi angkanya di situ, bukan di baris baru yang menyamar jadi phase.
 *  Kalau kalimat CV diubah dan klaim GitHub-nya hilang, daftarnya lepas sendiri dan gerbang
 *  probe menagihnya — bukan diam-diam pindah tempat. */
const punyaKlaimGitHub = (keterangan: string) => /published publicly on github/i.test(keterangan);

function dariCv(repos: RepoBerlian[]): CareerPhase[] {
  const karya = karyaDariGitHub(repos);
  return REKAMAN.map((r, idx) => ({
    id: nomor(idx),
    phase: `PHASE ${nomor(idx)} // ${kategori(r.jabatan)}`,
    title: r.jabatan,
    org: r.tempat.toUpperCase(),
    year: r.sejak,
    summary: r.keterangan,
    specs: TAG_REKAMAN[r.jabatan] ?? ["CV RECORD"],
    link: LINK_INSTITUSI[r.tempat],
    karya: punyaKlaimGitHub(r.keterangan) ? karya : undefined,
  }));
}

export function daftarFase(
  experiences: Experience[] | undefined,
  perjalanan: Perjalanan[] | undefined,
  repos: RepoBerlian[]
): CareerPhase[] {
  const rows = experiences ?? [];
  if (rows.length > 0) {
    return rows.map((e, idx) => ({
      id: nomor(idx),
      phase: `PHASE ${nomor(idx)} // ${kategori(e.role)}`,
      title: e.role,
      org: e.company.toUpperCase(),
      year: e.period,
      summary: e.summary,
      specs: ["SUMBER: TABEL EXPERIENCES"],
    }));
  }

  const journey = perjalanan ?? [];
  if (journey.length >= 3) {
    return journey.map((p, idx) => ({
      id: nomor(idx),
      phase: `PHASE ${nomor(idx)} // SECTOR ${idx + 1}`,
      title: p.title,
      org: p.linkLabel || "SEKAWAN MEDIA",
      year: p.year,
      summary: p.body,
      specs: ["POSTGRESQL SYNCED", "VERIFIED TELEMETRY"],
      link: p.linkHref,
    }));
  }

  return dariCv(repos);
}
