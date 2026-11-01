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
