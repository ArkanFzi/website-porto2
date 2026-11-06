// Sumber kebenaran tunggal untuk identitas publik situs. Domain kanonik ini adalah
// alamat yang benar-benar melayani situs (lihat DOMAIN di .github/workflows/watch.yml),
// bukan domain impian yang belum terdaftar: dulu beberapa tempat menulis
// arkanfauzi.dev — mailbox dan URL-nya tidak pernah ada, jadi feed Atom dan metadata
// open graph ikut mengklaim hal yang tidak benar.
//
// Modul ini dibaca komponen client (TerminalModal) dan server (feed, metadata), jadi
// isinya harus tetap aman di kedua sisi: tanpa token, tanpa kredensial, tanpa nilai
// yang berasal dari request.
export const SITE_URL = process.env.SITE_URL ?? "https://arkfazone-portofolio.elarisnoir.my.id";

// og:image untuk rute yang menyetel openGraph sendiri. Konvensi file
// src/app/opengraph-image.png memang menjangkau rute yang TIDAK menyetelnya (index, admin,
// 404), tapi anak yang menyetel openGraph mengganti seluruh objek induk — gambar ikut hilang.
// Terukur di build: tanpa nilai ini hanya 3 dari 12 HTML yang memancarkan og:image.
// URL-nya sengaja path telanjang, bukan URL ber-hash yang dikeluarkan konvensi file: yang
// terakhir berubah tiap build, jadi ia tidak bisa ditulis di modul yang dibaca kedua sisi.
export const OG_GAMBAR = {
  url: "/opengraph-image.png",
  width: 1200,
  height: 630,
  alt: "M. Arkan Fauzi - Systems Architect & Creative Technologist. Swiss-grid editorial portfolio with a real-time WebGL stage and telemetry measured live from the running services.",
};

// Satu-satunya alamat email yang benar-benar menerima surat.
export const EMAIL_KONTAK = "muhammadarkanfauzi9@gmail.com";

// Host telanjang untuk teks bergaya shell/UI yang tidak butuh skema.
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "").replace(/\/$/, "");

// Pembungkus <script type="application/ld+json">. JSON.stringify TIDAK meng-escape "<", jadi
// satu nilai yang mengandung "</script>" akan menutup tag dan isinya dieksekusi peramban —
// ini alasan klassik "JSON in HTML", bukan teori: \u003c tetap JSON yang sama setelah di-parse.
export const jsonLd = (data: unknown) => ({
  __html: JSON.stringify(data).replace(/</g, "\\u003c"),
});
