"use client";

import { useEffect } from "react";
import { useSyncExternalStore } from "react";
import {
  bacaTelemetri,
  bacaTelemetriSaatSSR,
  dengarTelemetri,
  mulaiBacaTelemetri,
} from "@/lib/bacaTelemetri";
import { JUMLAH_BUKET, isiSlot, pecahanTinggi, rasioAmbang } from "@/lib/buketMenit";
import { hopsDari, pecahanJejak, totalMs } from "@/lib/jejakArsitektur";

// Halaman ini tidak memanggil /api/telemetry sendiri. Ia berlangganan store yang sama dengan
// panel HUD dan dengan bilah di panggung WebGL (lib/bacaTelemetri), jadi angka di /arsip,
// di drawer, dan di kanvas tidak mungkin menyimpang satu sama lain — dan polling ketiga
// tidak pernah lahir.
const EMPAT_DASH = "—";

const teks = (v: string | number | null | undefined): string =>
  v === null || v === undefined || v === "" ? EMPAT_DASH : String(v);

function Sel({ label, nilai, nama }: { label: string; nilai: string; nama: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 py-3 swiss-border-b">
      <span className="font-mono text-tag tracking-[0.2em] uppercase text-titanium">{label}</span>
      <span data-arsip-sel={nama} className="font-mono text-micro tabular-nums text-obsidian text-right">
        {nilai}
      </span>
    </div>
  );
}

function Bagian({ judul, isi }: { judul: string; isi: React.ReactNode }) {
  return (
    <section className="flex flex-col">
      <h2 className="font-mono text-tag tracking-[0.24em] uppercase text-rosso pb-3">{judul}</h2>
      {isi}
    </section>
  );
}

/** Enam slot menit terakhir, sisi DOM yang memakai fungsi tinggi yang sama dengan bilah
 *  instancedMesh di panggung: `pecahanTinggi(rasioAmbang(p95Rerata))`. Slot tanpa laporan
 *  tidak menghasilkan elemen — bukan bilah pendek. */
function DeretBuket() {
  const telemetri = useSyncExternalStore(dengarTelemetri, bacaTelemetri, bacaTelemetriSaatSSR);
  const buket = telemetri?.clientFrames?.buket ?? [];
  if (!telemetri?.clientFrames) {
    return (
      <div
        data-bilah-dom=""
        className="flex items-end gap-[3px] h-8"
        title="no frame reports in this process window"
      >
        {Array.from({ length: JUMLAH_BUKET }, (_, i) => (
          <div key={`kosong-${i}`} className="flex-1 h-full" />
        ))}
      </div>
    );
  }
  return (
    <div data-bilah-dom="" className="flex items-end gap-[3px] h-8">
      {isiSlot(buket, telemetri.timestamp).map((b, i) => (
        <div key={b?.menit ?? `slot-${i}`} className="flex-1 h-full flex items-end">
          {b ? (
            <div
              data-bilah-menit={i}
              className={`w-full ${rasioAmbang(b.p95RerataMs) > 1 ? "bg-rosso" : "bg-obsidian"}`}
              style={{ height: `${pecahanTinggi(rasioAmbang(b.p95RerataMs)) * 100}%` }}
              title={`${b.menit} · p95 rerata ${b.p95RerataMs} ms · ${b.laporan} laporan · fps terendah ${b.fpsTerendah}`}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

export default function ArsipHidup() {
  useEffect(() => {
    // Store global: idempoten, dan tab tersembunyi berhenti membaca.
    mulaiBacaTelemetri();
  }, []);

  const t = useSyncExternalStore(dengarTelemetri, bacaTelemetri, bacaTelemetriSaatSSR);
  const cf = t?.clientFrames ?? null;
  const hops = hopsDari(t?.latencyMs, t?.backend.rttMs);
  const total = totalMs(hops);
  const senyap = !t;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-center gap-2">
        <span
          data-arsip-status={senyap ? "senyap" : "hidup"}
          className={`w-2 h-2 rounded-full ${senyap ? "bg-titanium" : "bg-rosso animate-pulse"}`}
          aria-hidden="true"
        />
        <p className="font-mono text-micro tracking-[0.16em] uppercase text-titanium">
          {senyap
            ? "NO READING — GET /api/telemetry did not answer this cycle"
            : `READING ${t.status.toUpperCase()} · SAMPLED EVERY 20 S`}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-x-10 gap-y-10">
        <Bagian
          judul="SERVER ROUND TRIP"
          isi={
            <>
              <Sel nama="latency" label="handler duration (ms)" nilai={teks(t?.latencyMs)} />
              <Sel
                nama="samples"
                label="samples kept in this process"
                nilai={t ? `${t.latencySamples.length} / 24` : EMPAT_DASH}
              />
              <Sel
                nama="backend-reach"
                label="go-backend reachable"
                nilai={t ? (t.backend.reachable ? "yes" : "no") : EMPAT_DASH}
              />
              <Sel
                nama="backend-db"
                label="postgres ping reported"
                nilai={t ? teks(t.backend.db) : EMPAT_DASH}
              />
              <Sel nama="backend-rtt" label="backend fetch (ms)" nilai={teks(t?.backend.rttMs)} />
              <Sel nama="heap" label="node heap used (MB)" nilai={teks(t?.heapMb)} />
              <Sel nama="node" label="runtime node" nilai={teks(t?.runtime.node)} />
              <Sel nama="next" label="runtime next" nilai={teks(t?.runtime.next)} />
            </>
          }
        />

        <Bagian
          judul="ARCHITECTURE TRACE"
          isi={
            <div className="flex flex-col gap-2.5 pt-1">
              {hops.map((h) => {
                const pecahan = pecahanJejak(h.ms, total);
                return (
                  <div key={h.id} className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-mono text-tag tracking-[0.2em] uppercase text-titanium">
                        {h.id}
                      </span>
                      <span
                        data-arsip-sel={`hop-${h.id}`}
                        className="font-mono text-micro tabular-nums text-obsidian"
                      >
                        {h.ms === null ? EMPAT_DASH : `${h.ms.toFixed(1)} ms`}
                      </span>
                    </div>
                    {/* Lebar hanya kalau ada angka: hop tanpa pengukuran tidak boleh
                        melahirkan garis acuan, termasuk hop PostgreSQL yang memang tidak
                        pernah mengembalikan milidetik. */}
                    {pecahan > 0 ? (
                      <div
                        data-jejak={h.id}
                        className="h-[2px] bg-obsidian"
                        style={{ width: `${pecahan * 100}%` }}
                      />
                    ) : null}
                  </div>
                );
              })}
              <p className="font-mono text-tag leading-relaxed text-titanium pt-2">
                node = handler duration minus the backend fetch measured inside it; backend =
                fetch to /api/health; postgres = never measured, the health endpoint answers ok or
                error without a millisecond figure.
              </p>
            </div>
          }
        />

        <Bagian
          judul="BROWSER FRAME RHYTHM"
          isi={
            <>
              <Sel nama="laporan" label="reports in window" nilai={teks(cf?.laporan)} />
              <Sel nama="frame" label="frames counted" nilai={teks(cf?.frame)} />
              <Sel nama="median" label="median frame (ms)" nilai={teks(cf?.medianMs)} />
              <Sel nama="p95" label="p95 frame (ms)" nilai={teks(cf?.p95Ms)} />
              <Sel nama="fpsTerendah" label="lowest fps" nilai={teks(cf?.fpsTerendah)} />
              <Sel
                nama="shareLambat"
                label="frames over 33 ms"
                nilai={cf ? `${cf.shareLambatPct}%` : EMPAT_DASH}
              />
              <Sel
                nama="resolusi"
                label="top reported resolution"
                nilai={teks(cf?.resolusiTeratas?.[0]?.resolusi)}
              />
              <Sel nama="sejak" label="window opened at" nilai={teks(cf?.sejak)} />
              <div className="pt-5">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="font-mono text-tag tracking-[0.2em] uppercase text-titanium">
                    LAST {JUMLAH_BUKET} MINUTES · p95 MEAN PER MINUTE
                  </span>
                  <span className="font-mono text-tag text-titanium">bar = p95 / 33 ms</span>
                </div>
                <DeretBuket />
              </div>
            </>
          }
        />

        <Bagian
          judul="PROVENANCE"
          isi={
            <>
              <Sel nama="commit" label="build commit" nilai={teks(t?.gitCommit)} />
              <Sel nama="timestamp" label="response timestamp" nilai={teks(t?.timestamp)} />
              <p className="font-mono text-tag leading-relaxed text-titanium pt-4">
                The latency window and the frame window live inside a single Node process, so a
                second instance keeps its own numbers. Without a build-time commit stamp the field
                is left empty rather than filled with an old hash.
              </p>
            </>
          }
        />
      </div>
    </div>
  );
}
