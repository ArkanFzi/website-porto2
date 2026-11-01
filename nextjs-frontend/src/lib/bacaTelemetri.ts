"use client";

/** Satu pembaca /api/telemetry untuk seluruh halaman.
 *
 *  Sebelumnya panel telemetri mempolling endpoint ini sendiri (5 detik sekali saat dibuka)
 *  dan tidak ada yang lain yang boleh membacanya — jadi angka yang sama tidak pernah bisa
 *  dilukis di dua tempat. Sekarang store inilah satu-satunya yang memanggil rute itu:
 *  bilah DOM di panel dan bilah instans di panggung WebGL sama-sama berlangganan ke sini,
 *  dan apa pun yang butuh gumpalan per menit di masa depan tidak menambah polling ketiga.
 *
 *  Ritmenya 20 detik, sama dengan ritme POST perfStats: satu pengunjung menghasilkan ±3
 *  laporan dan ±3 bacaan per menit, bukan 12 bacaan seperti polling panel yang lama.
 *  Store ini sengaja tidak pernah dihentikan saat komponen pindah: kanvas global hidup
 *  selamanya, dan bilahnya butuh data meski panel tidak pernah dibuka. */
import type { BuketMenit } from "./buketMenit";

// Kontrak GET /api/telemetry (lihat src/app/api/telemetry/route.ts). Field yang bisa null
// berarti tidak ada pengukuran, dan yang menampilkannya wajib menulis "—" — bukan angka
// pengganti.
export interface PayloadTelemetri {
  status: string;
  latencyMs: number;
  latencySamples: number[];
  heapMb: number | null;
  backend: { reachable: boolean; db: "ok" | "error" | null; rttMs: number | null };
  runtime: { node: string | null; next: string | null };
  watch: {
    hijau: number;
    total: number;
    jendelaRun: number;
    tautan: string;
    terakhir: { nomor: number; kesimpulan: string; selesaiPada: string } | null;
  } | null;
  clientFrames: {
    laporan: number;
    frame: number;
    medianMs: number;
    p95Ms: number;
    fpsTerendah: number;
    shareLambatPct: number;
    resolusiTeratas: { resolusi: string; laporan: number }[];
    buket: BuketMenit[];
    sejak: string;
  } | null;
  gitCommit: string | null;
  timestamp: string;
}

const JEDA_MS = 20_000;

let bacaan: PayloadTelemetri | null = null;
const pendengar = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
let controller: AbortController | undefined;

function terbitkan(baru: PayloadTelemetri | null) {
  // Referensi objek hanya diganti saat isinya benar-benar berbeda, supaya
  // useSyncExternalStore tidak melihat "berubah" dan me-render ulang yang tidak perlu.
  if (baru === bacaan) return;
  bacaan = baru;
  pendengar.forEach((f) => f());
}

async function ambil() {
  controller?.abort();
  controller = new AbortController();
  const sinyal = controller.signal;
  try {
    const res = await fetch("/api/telemetry", { signal: sinyal, cache: "no-store" });
    if (!res.ok) {
      // Gagal = tidak ada bacaan terbaru. Angka lama tidak boleh tinggal di layar
      // sambil mengaku baru.
      terbitkan(null);
      return;
    }
    const data = (await res.json()) as PayloadTelemetri;
    if (!sinyal.aborted) terbitkan(data);
  } catch {
    // Jaringan mati atau request dibatalkan karena tab sembunyi. Yang dibatalkan tidak
    // menghapus bacaan; yang gagal memang harus menghapus.
    if (!sinyal.aborted) terbitkan(null);
  }
}

const jalan = () => {
  if (timer) return;
  void ambil();
  timer = setInterval(() => void ambil(), JEDA_MS);
};

/** Idempoten: dipanggil dari effect mount kanvas global. Tab tersembunyi berhenti membaca,
 *  tab kembali langsung membaca lagi — pengunjung tidak membayar request untuk halaman
 *  yang tidak dilihatnya. StrictMode memanggil effect dua kali, jadi penjaganya di sini,
 *  bukan di pemanggil: pendengar visibility tidak boleh dobel. */
let sudahMulai = false;
export function mulaiBacaTelemetri() {
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

export const bacaTelemetri = (): PayloadTelemetri | null => bacaan;

export const bacaTelemetriSaatSSR = () => null;

export function dengarTelemetri(ubah: () => void): () => void {
  pendengar.add(ubah);
  return () => void pendengar.delete(ubah);
}
