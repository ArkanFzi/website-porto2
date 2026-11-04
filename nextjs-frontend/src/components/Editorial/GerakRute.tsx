"use client";

/** Gerak untuk halaman rute dokumen (/tentang, /tulisan, /kontak, esai) — DOM murni.
 *
 *  Pulau ini tidak membungkus apa pun: ia mencari targetnya sendiri lewat atribut
 *  `data-gerak`, sama seperti `useParalaksTipografi` yang membaca `[data-paralaks]`
 *  dan menulis style langsung. Alasannya konkret — blok di halaman-halaman ini duduk
 *  langsung sebagai grid item (`PanggungFrame.Bagian` = `grid md:grid-cols-2`), jadi
 *  membungkus tiap baris dengan div animasi memindahkan border baris ke tinggi konten
 *  dan mengubah geometri yang sudah dibaca verifier. Menandai elemennya, tidak
 *  menambah kotaknya, membuat perubahannya nol secara layout.
 *
 *  Aturan yang dipegang, dan yang diuji docs/verify/rute-probe.mjs:
 *  1. TIDAK ADA KONTEKS WEBGL BARU. Tidak ada `<Canvas>` di sini; rute yang memang
 *     memamerkan objek 3D (/proyek, /potret, /kinerja, /transisi, /interaksi) punya
 *     island-nya sendiri dan tidak disentuh alat ini.
 *  2. TIDAK ADA KONTEN YANG BUTUH JS UNTUK BISA DIBACA. Server mencetak semuanya tanpa
 *     satu pun style inline; `opacity: 0` hanya dipasang efek setelah hydrasi, dan hanya
 *     untuk blok yang saat itu BELUM terlihat. Blok di atas lipatan — termasuk elemen LCP —
 *     tidak pernah dibuat transparan, jadi tidak ada huruf yang terlanjur terbaca lalu
 *     dipadamkan.
 *  3. TIDAK ADA ANGKA GERAK BARU. Jarak 8px, durasi `DURASI.cepat`, kurva `EASE.keluar`,
 *     jeda antre `DURASI.ketik` dengan plafon `DURASI.lapang`, dan luncur pointer
 *     `DURASI.sentuh` — semuanya nilai yang sudah dipakai bab editorial
 *     (`ChapterPrologue.tsx:96-101`, `PetaHidup.tsx:56-58`, `lib/motion.ts`).
 *  4. prefers-reduced-motion menang: tidak ada observer, tidak ada style yang ditulis,
 *     tidak ada transisi. Dibaca dari toko milik situs lewat useSyncExternalStore, nilai
 *     server `false` supaya hydration tidak berbeda. */
import { useEffect, useSyncExternalStore } from "react";
import {
  DURASI,
  EASE,
  bacaKurangiGerak,
  bacaKurangiGerakSaatSSR,
  dengarKurangiGerak,
  type EaseKubik,
} from "@/lib/motion";

/** Sama dengan `initial={{ y: 8 }}` reveal-nya bab pembuka dan daftar peta. */
const JARAK_PX = 8;

const kurva = (e: EaseKubik) => `cubic-bezier(${e.join(",")})`;

const urutanDari = (el: HTMLElement) => {
  const n = Number(el.dataset.urutan ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** Jeda antre per baris, dipotong supaya baris ke-sekian tidak menunggu sampai pembaca
 *  pindah ke bagian lain halaman. */
const jedaUntuk = (urutan: number) => Math.min(urutan * DURASI.ketik, DURASI.lapang);

/** Satu pulau per halaman, dipasang di akhir isi halaman. Targetnya dicari di
 *  `document`, sama seperti `useParalaksTipografi` yang membaca `[data-paralaks]`:
 *  di dalam satu halaman rute hanya ada satu set elemen bertanda, jadi tidak perlu
 *  akar tambahan dan tidak ada satu pun div baru yang mengubah grid. */
export function GerakDokumen() {
  const kurangiGerak = useSyncExternalStore(
    dengarKurangiGerak,
    bacaKurangiGerak,
    bacaKurangiGerakSaatSSR
  );

  useEffect(() => {
    if (kurangiGerak) return;

    const lepas = new Set<() => void>();

    // ── reveal saat masuk layar ──
    const target = Array.from(
      document.querySelectorAll<HTMLElement>('[data-gerak="terbit"]')
    ).filter((el) => el.getBoundingClientRect().top >= window.innerHeight);

    if (target.length > 0) {
      // Dua ambang, bukan satu: `threshold: 0.25` saja tidak pernah dipanggil untuk
      // elemen yang lebih tinggi dari ±4 viewport, karena rasio terbesarnya memang tidak
      // bisa mencapai 0,25 — blok seperti itu tertinggal selamanya dalam opacity 0.
      const pengamat = new IntersectionObserver(
        (masuk) => {
          for (const m of masuk) {
            if (!m.isIntersecting) continue;
            const el = m.target as HTMLElement;
            const tinggi = el.getBoundingClientRect().height;
            const cukup =
              m.intersectionRatio >= 0.25 || tinggi >= window.innerHeight * 0.5;
            if (!cukup) continue;
            const jeda = jedaUntuk(urutanDari(el));
            const kurvaKeluar = kurva(EASE.keluar);
            el.style.transition = `opacity ${DURASI.cepat}s ${kurvaKeluar} ${jeda}s, transform ${DURASI.cepat}s ${kurvaKeluar} ${jeda}s`;
            el.style.opacity = "1";
            el.style.transform = "translateY(0px)";
            pengamat.unobserve(el);
          }
        },
        { threshold: [0, 0.25] }
      );
      for (const el of target) {
        el.style.opacity = "0";
        el.style.transform = `translateY(${JARAK_PX}px)`;
        pengamat.observe(el);
      }
      lepas.add(() => pengamat.disconnect());
    }

    // ── header yang meluncur mengikuti pointer ──
    const geser = document.querySelector<HTMLElement>('[data-gerak="geser"]');
    if (geser) {
      geser.style.transition = `transform ${DURASI.sentuh}s ${kurva(EASE.keluar)}`;
      const ubah = (e: PointerEvent) => {
        const x = (e.clientX / window.innerWidth - 0.5) * -2 * JARAK_PX;
        const y = (e.clientY / window.innerHeight - 0.5) * -2 * JARAK_PX;
        geser.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
      };
      const pulang = () => {
        geser.style.transform = "translate(0px, 0px)";
      };
      window.addEventListener("pointermove", ubah, { passive: true });
      window.addEventListener("blur", pulang);
      lepas.add(() => {
        window.removeEventListener("pointermove", ubah);
        window.removeEventListener("blur", pulang);
        geser.style.removeProperty("transform");
        geser.style.removeProperty("transition");
      });
    }

    return () => {
      for (const b of lepas) b();
      for (const el of target) {
        el.style.removeProperty("opacity");
        el.style.removeProperty("transform");
        el.style.removeProperty("transition");
      }
    };
  }, [kurangiGerak]);

  return null;
}
