// Status "produksi stabil" yang diambil dari hasil probe harian workflow Watch
// (.github/workflows/watch.yml) — bukan dari angka SLA yang dikarang. Workflow itu
// memukul /api/health, /api/certificates, /api/experience, halaman utama, dan /api/cv
// di produksi setiap hari; run-nya tercatat permanen di GitHub Actions.
//
// Cache ditulis di modul ini, bukan lewat `next: { revalidate }`, karena pembacaannya
// menempel di /api/telemetry yang di-poll tiap 30 detik: GET tidak boleh menunggu
// GitHub. Yang terjadi adalah nilai lama dikembalikan langsung dan refresh berjalan di
// latar belakang paling banyak sekali per TTL.

const REPO = "ArkanFzi/website-porto2";
const WORKFLOW = "watch.yml";
const JENDELA_RUN = 30;
const TTL_MS = 15 * 60_000;
const BATAS_WAKTU_MS = 4000;

export interface StatusWatch {
  hijau: number;
  total: number;
  jendelaRun: number;
  terakhir: { nomor: number; kesimpulan: string; selesaiPada: string } | null;
  diambilPada: string;
  tautan: string;
}

interface RunGitHub {
  run_number?: unknown;
  status?: unknown;
  conclusion?: unknown;
  event?: unknown;
  updated_at?: unknown;
}

let simpanan: StatusWatch | null = null;
let dicobaPada = 0;
let sedangJalan: Promise<void> | null = null;

function denganToken(): Record<string, string> {
  const header: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "ArkanFzi-Portfolio-App",
  };
  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) header.Authorization = `Bearer ${token}`;
  return header;
}

async function segarkan(): Promise<void> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/runs?per_page=${JENDELA_RUN}`,
      { headers: denganToken(), signal: AbortSignal.timeout(BATAS_WAKTU_MS), cache: "no-store" }
    );
    if (!res.ok) return;
    const data = (await res.json()) as { workflow_runs?: RunGitHub[] };
    const selesai = (data.workflow_runs ?? []).filter((r) => r.status === "completed");
    const terjadwal = selesai.filter((r) => r.event === "schedule");
    const hijau = terjadwal.filter((r) => r.conclusion === "success").length;
    const awal = terjadwal[0];
    simpanan = {
      hijau,
      total: terjadwal.length,
      jendelaRun: (data.workflow_runs ?? []).length,
      terakhir:
        awal && typeof awal.run_number === "number" && typeof awal.conclusion === "string"
          ? {
              nomor: awal.run_number,
              kesimpulan: awal.conclusion,
              selesaiPada: typeof awal.updated_at === "string" ? awal.updated_at : "",
            }
          : null,
      diambilPada: new Date().toISOString(),
      tautan: `https://github.com/${REPO}/actions/workflows/${WORKFLOW}`,
    };
  } catch {
    // GitHub lambat atau tanpa token lalu kena plafon: nilai lama tetap dipakai, dan
    // kalau belum pernah ada, pembacaan mengembalikan null (UI menampilkan "—").
  }
}

/** Non-blocking: selalu kembalikan cache terakhir, refresh di latar belakang. */
export function bacaStatusWatch(): StatusWatch | null {
  const sekarang = Date.now();
  if (!sedangJalan && sekarang - dicobaPada > TTL_MS) {
    dicobaPada = sekarang;
    sedangJalan = segarkan().finally(() => {
      sedangJalan = null;
    });
  }
  return simpanan;
}
