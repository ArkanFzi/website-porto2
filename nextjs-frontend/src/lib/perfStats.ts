// Pengukur ritme frame halaman dari sisi pengunjung. Ini sumber angka "fps" yang dipakai
// HUD dan yang dikirim ke /api/telemetry — jadi klaim di kartu proyek bisa dikutip dari
// data pengunjung, bukan dari harness lokal satu mesin.
//
// Yang diukur adalah delta requestAnimationFrame selama tab terlihat: ritme komposit
// halaman, bukan waktu render shader saja. Angka ini tetap 60 saat tab kosong karena
// tidak ada yang digambar — itu memang arti "halamannya lancar di mesin ini".

export interface CuplikanFrame {
  fps: number;
  medianMs: number;
  p95Ms: number;
  /** jumlah frame yang lebih lambat dari 33 ms (di bawah ~30 fps) */
  over33ms: number;
  frames: number;
  dpr: number;
  lebar: number;
  tinggi: number;
}

const JENDELA_FRAME = 300;
const TERBIT_MS = 1000;
const LAPOR_MS = 20_000;

let delta: number[] = [];
let terakhir = 0;
let timer = 0;
let laporTimer = 0;
let cuplik: CuplikanFrame | null = null;
let dprPerangkat = 1;
let dprKanvas = 0;
const dprTerpakai = () => dprKanvas || dprPerangkat;
const pendengar = new Set<() => void>();

function kuantil(sudahDisortir: number[], p: number): number {
  if (!sudahDisortir.length) return 0;
  const idx = Math.min(sudahDisortir.length - 1, Math.floor(p * sudahDisortir.length));
  return sudahDisortir[idx];
}

function ringkas(): CuplikanFrame | null {
  if (delta.length < 30) return null;
  const urut = [...delta].sort((a, b) => a - b);
  const totalMs = urut.reduce((a, b) => a + b, 0);
  return {
    fps: Math.round((urut.length / totalMs) * 1000 * 10) / 10,
    medianMs: Math.round(kuantil(urut, 0.5) * 10) / 10,
    p95Ms: Math.round(kuantil(urut, 0.95) * 10) / 10,
    over33ms: urut.filter((d) => d > 33).length,
    frames: urut.length,
    dpr: dprTerpakai(),
    lebar: window.innerWidth,
    tinggi: window.innerHeight,
  };
}

function terbitkan() {
  const baru = ringkas();
  // Referensi objek hanya diganti saat isinya ada, supaya useSyncExternalStore tidak
  // melihat "berubah" tiap tick dan memicu re-render tanpa isi.
  if (baru) {
    cuplik = baru;
    pendengar.forEach((f) => f());
  }
}

function tick(now: number) {
  if (document.hidden) {
    // Tab tersembunyi: rAF dihemat, jendela sampel dibuang supaya ritme saat kembali
    // tidak tercemar jeda panjang ketika browser menjeda loop.
    delta = [];
    terakhir = 0;
    return;
  }
  if (terakhir) {
    const d = now - terakhir;
    // Delta > 1 detik = jeda (tab di-suspend, breakpoint), bukan frame.
    if (d > 0 && d < 1000) {
      delta.push(d);
      if (delta.length > JENDELA_FRAME) delta.shift();
    }
  }
  terakhir = now;
  requestAnimationFrame(tick);
}

/** Idempoten: dipanggil dari effect mount; loop berhenti sendiri saat tab hidden. */
export function mulai() {
  dprPerangkat = window.devicePixelRatio || 1;
  if (timer) return;
  requestAnimationFrame(tick);
  window.addEventListener("resize", () => {
    dprPerangkat = window.devicePixelRatio || 1;
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      terakhir = 0;
      requestAnimationFrame(tick);
    }
  });
  timer = window.setInterval(terbitkan, TERBIT_MS);
  terbitkan();
}

/** Tier dpr efektif kanvas (diatur PerformanceMonitor), bukan devicePixelRatio mentah. */
export function setDprKanvas(v: number) {
  dprKanvas = v;
}

export const bacaCuplik = (): CuplikanFrame | null => cuplik;

export function dengarCuplik(ubah: () => void): () => void {
  pendengar.add(ubah);
  return () => void pendengar.delete(ubah);
}

/**
 * Kirim ringkasan ke server secara berkala. Sekali per LAPOR_MS dan hanya saat ada
 * isi, jadi satu pengunjung menghasilkan ~3 request per menit.
 */
export function mulaiLapor() {
  if (laporTimer) return;
  laporTimer = window.setInterval(() => {
    const s = cuplik;
    if (!s || document.hidden) return;
    fetch("/api/telemetry", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(s),
      keepalive: true,
    }).catch(() => {
      /* telemetri tidak boleh mengganggu pembacaan halaman */
    });
  }, LAPOR_MS);
}
