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

// Satu-satunya alamat email yang benar-benar menerima surat.
export const EMAIL_KONTAK = "muhammadarkanfauzi9@gmail.com";

// Host telanjang untuk teks bergaya shell/UI yang tidak butuh skema.
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "").replace(/\/$/, "");
