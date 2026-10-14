// Satu daftar untuk nav sticky kiri, titik navigasi kanan, dan menu atas. Sebelum ini
// id section ditulis ulang di tiga tempat (SECTIONS di GlobalScrollNav, SECTION_LINKS
// plus array hardcode di Navigation), jadi section baru gampang bocor di salah satunya
// dan tautan aktif bisa tertinggal satu section.
export interface DefinisiSection {
  id: string;
  // Angka yang tampil di nav sticky.
  label: string;
  // Diisi kalau section ini juga muncul sebagai item menu atas.
  menuLabel?: string;
}

export const SECTIONS: DefinisiSection[] = [
  { id: "hero", label: "01" },
  { id: "about", label: "02" },
  { id: "journey", label: "03" },
  { id: "projects", label: "04", menuLabel: "WORK" },
  { id: "contact", label: "05", menuLabel: "CONTACT" },
];

export type SectionMenu = DefinisiSection & { menuLabel: string };

export const MENU_SECTIONS: SectionMenu[] = SECTIONS.filter(
  (s): s is SectionMenu => Boolean(s.menuLabel)
);

// href anchor untuk halaman depan; dari halaman lain harus lewat "/" dulu supaya
// browser tidak mencari id yang tidak ada di DOM.
export const hrefSection = (id: string) => `/#${id}`;

export const SECTION_LINKS: Record<string, string> = Object.fromEntries(
  MENU_SECTIONS.map((s) => [s.id, hrefSection(s.id)])
);

// Urutan cek untuk "section mana yang paling dalam sudah lewat garis pemicu".
export const ID_SECTION = [...SECTIONS].reverse().map((s) => s.id);
