import { NextResponse } from "next/server";

// Semua angka di respons ini adalah hasil pengukuran pada request itu juga. Tidak ada konstanta
// hiasan: kalau sesuatu tidak bisa diukur, field-nya null dan yang menampilkannya wajib menulis "—".

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

  laporanFrame.push({
    fps: body.fps,
    medianMs: body.medianMs,
    p95Ms: body.p95Ms,
    over33ms: Math.round(body.over33ms),
    frames: Math.round(body.frames),
    dpr: body.dpr,
    lebar: Math.round(body.lebar),
    tinggi: Math.round(body.tinggi),
  });
  if (laporanFrame.length > MAKS_LAPORAN) laporanFrame.shift();

  return NextResponse.json(
    { disimpan: true, jendela: laporanFrame.length },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function GET() {
  const started = performance.now();
  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";
  const probe = await probeBackend(backendUrl);
  const latencyMs = Math.round(performance.now() - started);

  latencySamples.push(latencyMs);
  if (latencySamples.length > MAX_SAMPLES) latencySamples.shift();

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

  return NextResponse.json(
    {
      status,
      latencyMs,
      latencySamples: [...latencySamples],
      heapMb,
      backend: { reachable: probe.reachable, db: probe.db, rttMs: probe.rttMs },
      runtime: { node: process.versions.node ?? null, next: next ? next : null },
      clientFrames: agregatFrame(),
      gitCommit: commit ? commit : null,
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
