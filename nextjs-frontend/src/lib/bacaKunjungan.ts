"use client";

/** Satu pembaca GET /api/visits untuk seluruh halaman.
 *
 *  Sebelumnya hanya panel telemetri yang memanggil rute ini, dan ia melakukannya sendiri
 *  setiap 5 detik selama panel terbuka. Bab penutup ingin menampilkan angka yang sama;
 *  kalau bab itu menambah polling sendiri, dua tempat bisa mencetak dua angka yang berbeda
 *  tergantung siapa yang terakhir membaca. Jadi store inilah satu-satunya yang memanggil
 *  /api/visits: panel dan bab penutup berlangganan ke sini.
 *
 *  Ritmenya 20 detik, sama dengan store telemetri, dan tab yang tersembunyi berhenti
 *  membaca. Gagal berarti tidak ada bacaan: angka lama dihapus, bukan dibiarkan tinggal
 *  di layar sambil mengaku baru. */

// Kontrak GET /api/visits di go-backend (lihat main.go, ringkasanKunjungan):
// {"total":int,"today":int,"uniqueLast24h":int}.
export interface PayloadKunjungan {
  total: number;
  today: number;
  uniqueLast24h: number;
}

const JEDA_MS = 20_000;

let bacaan: PayloadKunjungan | null = null;
const pendengar = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
let controller: AbortController | undefined;

function terbitkan(baru: PayloadKunjungan | null) {
  if (baru === bacaan) return;
  bacaan = baru;
  pendengar.forEach((f) => f());
}

async function ambil() {
  controller?.abort();
  controller = new AbortController();
  const sinyal = controller.signal;
  try {
    const res = await fetch("/api/visits", { signal: sinyal, cache: "no-store" });
    if (!res.ok) {
      terbitkan(null);
      return;
    }
    const data = (await res.json()) as PayloadKunjungan;
    if (!sinyal.aborted) terbitkan(data);
  } catch {
    if (!sinyal.aborted) terbitkan(null);
  }
}

const jalan = () => {
  if (timer) return;
  void ambil();
  timer = setInterval(() => void ambil(), JEDA_MS);
};

/** Idempoten: dipanggil dari effect mount tiap komponen yang menampilkan angka kunjungan.
 *  StrictMode memanggil effect dua kali, jadi penjaga sudahMulai ada di sini supaya
 *  listener visibility tidak dobel. */
let sudahMulai = false;
export function mulaiBacaKunjungan() {
  if (sudahMulai) return;
  sudahMulai = true;
  jalan();
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      clearInterval(timer);
      timer = undefined;
      controller?.abort();
    } else {
      jalan();
    }
  });
}

export const bacaKunjungan = (): PayloadKunjungan | null => bacaan;

export const bacaKunjunganSaatSSR = () => null;

export function dengarKunjungan(ubah: () => void): () => void {
  pendengar.add(ubah);
  return () => void pendengar.delete(ubah);
}
