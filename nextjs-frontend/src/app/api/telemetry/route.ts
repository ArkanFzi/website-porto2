import { NextRequest, NextResponse } from "next/server";
import { bacaStatusWatch } from "@/lib/server/statusWatch";
import {
  JUMLAH_BUKET,
  jadiBuket,
  kunciMenit,
  tambahLaporan,
  tambunBaru,
  type Tambun,
} from "@/lib/buketMenit";

// Semua angka di respons ini adalah hasil pengukuran pada request itu juga. Tidak ada konstanta
// hiasan: kalau sesuatu tidak bisa diukur, field-nya null dan yang menampilkannya wajib menulis "—".
//
// Respons ini publik — dia dipoll setiap 20 detik dari halaman yang dilihat siapa pun. Sebagian
// field isinya bukan pengukuran untuk pengunjung melainkan diagnostik mesin (versi runtime, isi
// heap, komit yang melayani, status ping database). Field itu sekarang null untuk yang tidak
// bersesi admin, sehingga "—" punya dua sebab: tidak terukur, atau tidak untuk mata publik.

export const dynamic = "force-dynamic";

const MAX_SAMPLES = 24;

// Jendela sampel latency per proses Node. Isinya hanya pengukuran nyata dari request yang sudah
// lewat, jadi proses yang baru start mengembalikan array kosong. Yang mengonsumsi tidak boleh
// menambal array kosong itu dengan angka karangan.
const latencySamples: number[] = [];

interface BackendProbe {
  reachable: boolean;
  db: "ok" | "error" | null;
  rttMs: number | null;
}

// go-backend /api/health membalas {"status":"ok","db":"ok"} saat ping PostgreSQL succeed dan
// {"status":"unavailable","db":"error"} dengan 503 saat gagal (lihat go-backend/main.go).
// Jadi field `db` yang menentukan sehat tidaknya, bukan sekadar HTTP 200.
async function probeBackend(backendUrl: string): Promise<BackendProbe> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 800);
  const started = performance.now();
  try {
    const res = await fetch(`${backendUrl}/api/health`, {
      signal: controller.signal,
      cache: "no-store",
    });
    const rttMs = Math.round(performance.now() - started);
    const data = (await res.json().catch(() => null)) as { db?: unknown } | null;
    const db = typeof data?.db === "string" ? data.db : null;
    return { reachable: true, db: db === "ok" || db === "error" ? db : null, rttMs };
  } catch {
    // Abort (timeout), DNS mati, atau backend tidak berjalan: tidak ada pengukuran yang bisa
    // dilaporkan, jadi rttMs tetap null dan bukan angka terendah yang kebetulan enak dibaca.
    return { reachable: false, db: null, rttMs: null };
  } finally {
    clearTimeout(timer);
  }
}

const NAMA_COOKIE_SESI = "porto_sesi";

// Penilaian sesi dikerjakan backend, bukan di sini. JWT_SECRET tidak (dan tidak boleh) ada di
// proses Next — memverifikasi tanda tangan sendiri berarti menyimpan setengah kredensial di dua
// tempat, dan dua tempat berarti dua yang bisa lupa dirotasi.
//
// Kontrak yang dipakai adalah guard NoRoute go-backend: path di bawah /api/admin/ yang TIDAK
// terdaftar dijawab 401 untuk token rusak/kedaluwarsa/revoked, dan 404 {"error":"Not found"} untuk
// token sah. Nama `__sesi` sengaja bukan rute yang mungkin jadi nyata, jadi kontraknya tidak bisa
// bergeser diam-diam oleh fitur baru.
//
// Status 404 saja TIDAK cukup dan itu terukur di mesin ini: port 8080 di laptop ini pernah
// ditempati Adminer, yang menjawab 404 HTML untuk path apa pun — aturan "404 = sah" akan membuka
// diagnostik ke token karangan siapa pun. Karena itu yang ditagih adalah sampul respons backend
// secara utuh: 404 + JSON + persis {"error":"Not found"}. Selain itu — 401, 5xx, backend mati,
// timeout, HTML — dianggap tidak bersesi (fail-closed).
async function sesiTervalidasi(req: NextRequest, backendUrl: string): Promise<boolean> {
  const token = req.cookies.get(NAMA_COOKIE_SESI)?.value;
  if (!token) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 800);
  try {
    const res = await fetch(`${backendUrl}/api/admin/__sesi`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: controller.signal,
    });
    if (res.status !== 404) return false;
    if (!res.headers.get("content-type")?.includes("application/json")) return false;
    const body = (await res.json().catch(() => null)) as { error?: unknown } | null;
    return body?.error === "Not found";
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// Ringkasan ritme frame yang dikirim browser pengunjung (lihat src/lib/perfStats.ts).
// Jendela ini hidup di dalam proses Node: instance yang baru start mengembalikan null,
// dan angka di dalamnya bukan agregat global — GET melabeli window-nya lewat `sejak`.
interface LaporanFrame {
  fps: number;
  medianMs: number;
  p95Ms: number;
  over33ms: number;
  frames: number;
  dpr: number;
  lebar: number;
  tinggi: number;
}

const MAKS_LAPORAN = 120;
const MAKS_PANJANG_BODY = 512;
const BUKET_MAKS = 6;
const BUKET_JEDA_MS = 60_000;

const laporanFrame: LaporanFrame[] = [];
/** Tumpukan per menit, kunci "2026-11-02T07:03Z". Ini yang dirender dua kali (bilah DOM dan
 *  bilah panggung), jadi hanya JUMLAH_BUKET menit terakhir yang ditahan — laporan mentahnya
 *  sendiri sudah ada di `laporanFrame`. Menit yang sedang berjalan ikut tercatat sejak
 *  laporan pertama, sehingga bilah pertama muncul tanpa menunggu menitnya selesai. */
const tambunMenit = new Map<string, Tambun>();
const buket = new Map<string, { sisa: number; reset: number }>();
const sejakProses = new Date().toISOString();

function angka(v: unknown, min: number, max: number): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
}

function median(nilai: number[]): number {
  if (!nilai.length) return 0;
  const urut = [...nilai].sort((a, b) => a - b);
  return Math.round(urut[Math.floor(urut.length / 2)] * 10) / 10;
}

function agregatFrame() {
  if (!laporanFrame.length) return null;
  const frame = laporanFrame.reduce((a, l) => a + l.frames, 0);
  const lambat = laporanFrame.reduce((a, l) => a + l.over33ms, 0);
  const resolusi = new Map<string, number>();
  for (const l of laporanFrame) {
    const k = `${l.lebar}×${l.tinggi}@${l.dpr}`;
    resolusi.set(k, (resolusi.get(k) ?? 0) + 1);
  }
  return {
    laporan: laporanFrame.length,
    frame,
    medianMs: median(laporanFrame.map((l) => l.medianMs)),
    p95Ms: median(laporanFrame.map((l) => l.p95Ms)),
    fpsTerendah: Math.min(...laporanFrame.map((l) => l.fps)),
    shareLambatPct: Math.round((lambat / frame) * 1000) / 10,
    resolusiTeratas: [...resolusi.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([resolusi, laporan]) => ({ resolusi, laporan })),
    // Kronologis, dan kunci ISO bisa disortir sebagai teks: "2026-11-02T07:03" <
    // "2026-11-02T07:04" tanpa perlu diparsing. Menit yang belum selesai ikut, dengan
    // `laporan` sebanyak yang sudah masuk — itu sebabnya penampil menyebut jumlah laporannya.
    buket: [...tambunMenit.values()].sort((a, b) => (a.menit < b.menit ? -1 : 1)).map(jadiBuket),
    sejak: sejakProses,
  };
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "tanpa-alamat";
  const sekarang = Date.now();
  const b = buket.get(ip);
  const buketAktif = b && b.reset > sekarang ? b : { sisa: BUKET_MAKS, reset: sekarang + BUKET_JEDA_MS };
  if (buketAktif.sisa <= 0) {
    return NextResponse.json({ disimpan: false, alasan: "rate-limited" }, { status: 429 });
  }
  buketAktif.sisa -= 1;
  buket.set(ip, buketAktif);

  const teks = await req.text().catch(() => "");
  if (!teks || teks.length > MAKS_PANJANG_BODY) {
    return NextResponse.json({ disimpan: false, alasan: "body-ditolak" }, { status: 400 });
  }
  const body = JSON.parse(teks) as Partial<Record<keyof LaporanFrame, unknown>> | null;
  if (
    !body ||
    !angka(body.fps, 0, 240) ||
    !angka(body.medianMs, 0, 1000) ||
    !angka(body.p95Ms, 0, 1000) ||
    !angka(body.over33ms, 0, 100_000) ||
    !angka(body.frames, 30, 100_000) ||
    !angka(body.dpr, 0.5, 5) ||
    !angka(body.lebar, 200, 10_000) ||
    !angka(body.tinggi, 200, 10_000)
  ) {
    return NextResponse.json({ disimpan: false, alasan: "field-di-luar-isi-mungkin" }, { status: 400 });
  }

  const ritme = {
    fps: body.fps,
    medianMs: body.medianMs,
    p95Ms: body.p95Ms,
    over33ms: Math.round(body.over33ms),
    frames: Math.round(body.frames),
  };
  laporanFrame.push({
    ...ritme,
    dpr: body.dpr,
    lebar: Math.round(body.lebar),
    tinggi: Math.round(body.tinggi),
  });
  if (laporanFrame.length > MAKS_LAPORAN) laporanFrame.shift();

  const menit = kunciMenit(sekarang);
  let tambun = tambunMenit.get(menit);
  if (!tambun) {
    tambun = tambunBaru(menit);
    tambunMenit.set(menit, tambun);
  }
  tambahLaporan(tambun, ritme);
  // Yang dibuang adalah menit yang paling tua, bukan yang paling besar angkanya: enam
  // slot yang dibaca penampil harus selalu menit enam terakhir secara berurutan.
  if (tambunMenit.size > JUMLAH_BUKET) {
    const tua = [...tambunMenit.keys()].sort().slice(0, tambunMenit.size - JUMLAH_BUKET);
    for (const k of tua) tambunMenit.delete(k);
  }

  return NextResponse.json(
    { disimpan: true, jendela: laporanFrame.length },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function GET(req: NextRequest) {
  const started = performance.now();
  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";
  const probe = await probeBackend(backendUrl);
  const latencyMs = Math.round(performance.now() - started);

  latencySamples.push(latencyMs);
  if (latencySamples.length > MAX_SAMPLES) latencySamples.shift();

  // Sengaja diukur setelah latencyMs ditutup: `latencyMs` adalah lama probe /api/health, dan
  // membledekkan pemeriksaan sesi ke dalamnya membuat angka itu berubah makna tiap kali admin
  // membuka halaman. Yang tidak membawa cookie pulang tanpa round-trip tambahan sama sekali.
  const hanyaAdmin = await sesiTervalidasi(req, backendUrl);

  const heapMb =
    typeof process !== "undefined" && typeof process.memoryUsage === "function"
      ? Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
      : null;

  // Commit dibaca dari build (lihat next.config.ts env.APP_COMMIT, diisi github.sha di ci.yml).
  // Build lokal tanpa env itu menghasilkan null, dan UI menampilkan "—" — bukan hash lama.
  const commit = process.env.APP_COMMIT?.trim();
  const next = process.env.NEXT_VERSION?.trim();

  const status = !probe.reachable
    ? "BACKEND UNREACHABLE"
    : probe.db === "ok"
      ? "OK"
      : probe.db === "error"
        ? "DATABASE ERROR"
        : "BACKEND NO HEALTH FIELD";

  // `status` tetap publik: dia verdict kasar yang memang ditunjukkan ke pengunjung. Yang
  // dikembalikan sebagai null adalah angka identifikasi mesin dan kolom diagnostiknya sendiri.
  return NextResponse.json(
    {
      status,
      latencyMs,
      latencySamples: [...latencySamples],
      heapMb: hanyaAdmin ? heapMb : null,
      backend: { reachable: probe.reachable, db: hanyaAdmin ? probe.db : null, rttMs: probe.rttMs },
      runtime: {
        node: hanyaAdmin ? (process.versions.node ?? null) : null,
        next: hanyaAdmin && next ? next : null,
      },
      clientFrames: agregatFrame(),
      watch: bacaStatusWatch(),
      gitCommit: hanyaAdmin && commit ? commit : null,
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
