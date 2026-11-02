"use client";

/** /waktu sisi klien: satu angka dibaca dari store telemetri yang sama dengan HUD dan bilah
 *  panggung, lalu dilukis dua kali — sebagai persegi di DOM dan sebagai geometri di WebGL —
 *  lewat fungsi yang sama (lib/buketMenit). Kalau salah satu sisi menyisipkan konstantanya
 *  sendiri, verifier membandingkan `window.__jendela.fraksi` dengan lebar persegi DOM dan
 *  gerbangnya gagal. */
import { useEffect, useSyncExternalStore } from "react";
import JendelaWaktu from "@/components/Three/panggung/JendelaWaktu";
import PanggungKecil from "@/components/Three/panggung/PanggungKecil";
import { pecahanTinggi, rasioAmbang, BATAS_MS } from "@/lib/buketMenit";
import {
  bacaTelemetri,
  bacaTelemetriSaatSSR,
  dengarTelemetri,
  mulaiBacaTelemetri,
} from "@/lib/bacaTelemetri";

const EMPAT_DASH = "—";

function Angka({ label, nilai, satuan }: { label: string; nilai: string; satuan?: string }) {
  return (
    <div className="flex flex-col gap-1 pt-3 swiss-border-b">
      <span className="font-mono text-tag tracking-[0.18em] uppercase text-titanium">{label}</span>
      <span className="font-mono text-micro tabular-nums text-obsidian">
        {nilai}
        {satuan ? <span className="text-titanium"> {satuan}</span> : null}
      </span>
    </div>
  );
}

export default function WaktuHidup() {
  useEffect(() => {
    // Store global yang sama dengan /arsip dan panggung utama: idempoten, berhenti saat
    // tab tersembunyi, dan tidak pernah melahirkan polling kedua.
    mulaiBacaTelemetri();
  }, []);

  const t = useSyncExternalStore(dengarTelemetri, bacaTelemetri, bacaTelemetriSaatSSR);
  const p95 = t?.clientFrames?.p95Ms;
  const ada = typeof p95 === "number" && Number.isFinite(p95) && p95 > 0;
  const rasio = ada ? rasioAmbang(p95) : 0;
  const fraksi = ada ? pecahanTinggi(rasio) : 0;

  return (
    <div className="flex flex-col gap-10">
      <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-8 md:gap-14 items-center">
        <div className="flex flex-col gap-3">
          <span className="font-mono text-micro tracking-[0.2em] uppercase text-titanium">
            P95 FRAME TIME · REPORTED BY VISITING BROWSERS
          </span>
          <p
            data-waktu-angka="p95"
            className="font-serif text-[clamp(56px,11vw,140px)] leading-[0.85] tracking-tighter tabular-nums text-obsidian"
          >
            {ada ? p95.toFixed(1) : EMPAT_DASH}
            <span className="text-[0.35em] align-top ml-2 text-titanium">ms</span>
          </p>
          <p className="font-mono text-[10px] leading-relaxed text-titanium max-w-[46ch]">
            {ada
              ? `The window's side is this number divided by the ${BATAS_MS} ms threshold, drawn with the same height function the front-page bars use. Above the threshold the outline turns rosso.`
              : `No browser has reported a frame time to this process yet, so there is no window — an em-dash is not a measurement of zero.`}
          </p>
        </div>

        {/* Bingkai DOM: persegi acuan 1:1 tempat bukaan diukur dalam persen. */}
        <div className="relative w-full aspect-square max-w-[520px] mx-auto swiss-border">
          <span className="absolute left-2 top-2 font-mono text-[9px] tracking-[0.2em] uppercase text-titanium">
            WEBGL SIDE = {ada ? (fraksi * 2).toFixed(3) : EMPAT_DASH} / 2 UNITS
          </span>
          {ada ? (
            <>
              <div
                data-waktu-ambang=""
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border border-titanium/60"
                style={{ width: `${pecahanTinggi(1) * 100}%`, height: `${pecahanTinggi(1) * 100}%` }}
              />
              <div
                data-waktu-bukaan=""
                className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-2 ${
                  rasio > 1 ? "border-rosso" : "border-obsidian"
                }`}
                style={{ width: `${fraksi * 100}%`, height: `${fraksi * 100}%` }}
              />
            </>
          ) : (
            <span
              data-waktu-kosong=""
              className="absolute inset-0 flex items-center justify-center font-serif text-subtitle text-titanium"
            >
              {EMPAT_DASH}
            </span>
          )}
        </div>
      </div>

      <PanggungKecil className="w-full h-[52vh] min-h-[360px]" kamera={[0, 0, 3]} fov={42}>
        <JendelaWaktu />
      </PanggungKecil>

      <div className="grid md:grid-cols-2 gap-x-12">
        <div className="flex flex-col">
          <h2 className="font-mono text-tag tracking-[0.24em] uppercase text-rosso pb-1">
            THE NUMBER BEHIND THE SHAPE
          </h2>
          <Angka label="p95 frame" nilai={ada ? `${p95!.toFixed(2)} ms` : EMPAT_DASH} />
          <Angka
            label="ratio to threshold"
            nilai={ada ? `${rasio.toFixed(3)} × ${BATAS_MS} ms` : EMPAT_DASH}
          />
          <Angka label="median frame" nilai={t?.clientFrames ? `${t.clientFrames.medianMs.toFixed(2)} ms` : EMPAT_DASH} />
          <Angka label="lowest reported fps" nilai={t?.clientFrames ? String(t.clientFrames.fpsTerendah) : EMPAT_DASH} />
          <Angka
            label="frames over threshold"
            nilai={t?.clientFrames ? `${t.clientFrames.shareLambatPct}%` : EMPAT_DASH}
          />
        </div>
        <div className="flex flex-col">
          <h2 className="font-mono text-tag tracking-[0.24em] uppercase text-rosso pb-1">
            HOW THIS WINDOW IS MEASURED
          </h2>
          <Angka
            label="reports in window"
            nilai={t?.clientFrames ? `${t.clientFrames.laporan} / 120` : EMPAT_DASH}
          />
          <Angka
            label="frames counted"
            nilai={t?.clientFrames ? String(t.clientFrames.frame) : EMPAT_DASH}
          />
          <Angka
            label="window opened at"
            nilai={t?.clientFrames ? t.clientFrames.sejak : EMPAT_DASH}
          />
          <Angka
            label="top reported viewport"
            nilai={t?.clientFrames?.resolusiTeratas?.[0]?.resolusi ?? EMPAT_DASH}
          />
          <Angka label="reading sampled" nilai={t ? t.timestamp : EMPAT_DASH} />
        </div>
      </div>

      <p className="font-mono text-[10px] leading-relaxed text-titanium max-w-[80ch]">
        This page does not report its own frame rhythm. A page that paints zero frames while you
        read it would drag the shared window toward zero and make the window lie about the thing
        it measures, so the number above belongs to visitors of the editorial page, and the canvas
        here only draws it. When no reading arrives, the shape disappears instead of shrinking to a
        decorative stub; when a new reading lands while you are perfectly still, the DOM figure
        changes immediately and the WebGL outline catches up on the next frame you actually cause.
      </p>
    </div>
  );
}
