/** Satu sumber untuk isi profil yang tampil di /tentang, /kontak, dan bab penutup
 *  halaman utama.
 *
 *  Angkanya tidak dikarang: nama, peran, lokasi, rekaman kerja, pendidikan, dan stack
 *  diambil apa adanya dari kertas render /cv-layout (yang dipakai /api/cv untuk mencetak
 *  PDF), dan saluran kontak dari daftar yang sudah diterbitkan ChapterPaddock. Kertas CV
 *  sengaja tidak diubah di langkah ini — ia satu-satunya input Chromium untuk /api/cv,
 *  jadi memecahnya butuh langkah dan verifikasi sendiri.
 *
 *  Modul ini dibaca komponen client dan server, jadi isinya harus tetap aman di kedua
 *  sisi: tanpa token, tanpa kredensial, tanpa nilai yang berasal dari request. */

import { EMAIL_KONTAK } from "@/lib/site";

export const NAMA = "M. Arkan Fauzi";
export const PERAN = "Full-Stack Developer & System Analyst";
export const LOKASI = "Malang, Indonesia";

/** Paragraf pembuka yang sama dengan yang tercetak di CV. */
export const RINGKAS =
  "Software Engineering student at SMK Negeri 6 Malang who works across the whole path — from analysing " +
  "system requirements to shipping the code that satisfies them. Since May 2026 I have been an apprentice " +
  "Full Stack Engineer at Sekawan Media, maintaining and continuously developing two enterprise-scale " +
  "applications built on a microservices architecture, alongside project work published on GitHub " +
  "(Next.js, Go, PHP / Laravel, C#).";

export type Rekaman = {
  jabatan: string;
  tempat: string;
  sejak: string;
  keterangan: string;
  rosso?: boolean;
};

/** Apa adanya dari blok "Professional Record" kertas CV, urutan tidak diubah. */
export const REKAMAN: Rekaman[] = [
  {
    jabatan: "Full Stack Engineer — Apprenticeship",
    tempat: "Sekawan Media · Malang · Hybrid",
    sejak: "May 2026 - Present",
    keterangan:
      "Entrusted with the maintenance and continuous development of two enterprise-scale applications built on a " +
      "microservices architecture, including an HRIS and recruitment system. The work runs from requirement " +
      "analysis through backend services to the frontend that consumes them, on code that already serves real users.",
  },
  {
    jabatan: "Software Engineering Student",
    tempat: "SMK Negeri 6 Malang",
    sejak: "Jun 2024 - Present",
    keterangan:
      "Building a software portfolio through independent projects and team collaborations while studying " +
      "Software Engineering (RPL). The school programme runs alongside an industrial class with Sekawan Media — " +
      "advanced frontend modules and the Teaching Factory (TEFA) programme — producing Laravel, Next.js and C# " +
      "work that is published publicly on GitHub.",
  },
  {
    jabatan: "Semi Finalist — JHIC 2025",
    tempat: "Jagoan Hosting Infra Competition",
    sejak: "Nov 2025",
    rosso: true,
    keterangan:
      "A national-level school website competition organized by Jagoan Hosting in collaboration with Komdigi and " +
      "Maspion IT. Covering stages through bootcamps (coding, cyber security, design) to the finals, it focuses on " +
      "enhancing digital literacy and school digital identities. Competing for the official trophy from the " +
      "Ministry of Communication and Digital of the Republic of Indonesia.",
  },
];

export const PENDIDIKAN = {
  sekolah: "SMKN 6 Malang",
  jurusan: "Software Engineering",
  sejak: "2024 - Present",
};

/** Tiga kelompok yang sama dengan blok "Tech Stack" kertas CV. */
export const STACK: { kelompok: string; isi: string[] }[] = [
  {
    kelompok: "Languages & Frameworks",
    isi: ["C# / .NET", "Go", "Node.js", "PHP / Laravel", "Next.js", "React", "Dart", "Tailwind CSS"],
  },
  { kelompok: "Databases & Cloud", isi: ["PostgreSQL", "MySQL", "MariaDB", "SQL Server", "Firebase"] },
  { kelompok: "Tools", isi: ["Docker", "NGINX", "Caddy", "Figma", "Git"] },
];

export type Saluran = { nama: string; url: string; catatan: string };

/** Daftar saluran yang sebelumnya hidup sendiri di ChapterPaddock. Nomor WhatsApp dan
 *  alamat email ditulis apa adanya dari daftar itu; nomor telepon yang tercetak di kertas
 *  CV (+62 812 3231 4845) berbeda dari wa.me di bawah, dan perbedaan itu belum saya
 *  putuskan sendiri — tunggu konfirmasi pemiliknya. */
export const SALURAN: Saluran[] = [
  { nama: "GITHUB", url: "https://github.com/ArkanFzi", catatan: "proyek dan perkakas yang diterbitkan" },
  { nama: "LINKEDIN", url: "https://www.linkedin.com/in/muhamad-arkan-fauzi-5a6799380/", catatan: "riwayat kerja" },
  { nama: "INSTAGRAM", url: "https://instagram.com/arkan_fzi", catatan: "sisi di luar kode" },
  { nama: "WHATSAPP", url: "https://wa.me/6281332314854", catatan: "jalan tercepat untuk bertanya" },
  { nama: "EMAIL", url: `mailto:${EMAIL_KONTAK}`, catatan: "surat yang benar-benar masuk" },
];
