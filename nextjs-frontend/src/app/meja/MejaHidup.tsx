"use client";

/** /meja sisi klien: enam knob yang menulis langsung ke uniform material potret.
 *
 *  Angka yang dicetak di DOM adalah nilai yang DIPERINTAHKAN; window.__meja adalah nilai yang
 *  ada di dalam material setelah frame berjalan. Verifier membandingkan keduanya, jadi yang
 *  dibuktikan adalah jalur perintahnya, bukan keindahan hasilnya. */
import React, { useState } from "react";
import PanggungKecil from "@/components/Three/panggung/PanggungKecil";
import MejaTipografi, {
  potongKeMask,
  type MejaNilai,
} from "@/components/Three/panggung/MejaTipografi";

const AWAL: MejaNilai = {
  persona: 0,
  sorot: 0,
  fokus: 5,
  kabur: 0.6,
  iris: 0,
  potong: 0,
};

interface Knob {
  key: keyof MejaNilai;
  label: string;
  uniform: string;
  hint: string;
  min: number;
  max: number;
  langkah: number;
}

const KNOB: Knob[] = [
  {
    key: "persona",
    label: "WAJAH",
    uniform: "uPersona",
    hint: "0 = engineer (kontras dingin, aberasi turun) · 1 = creator (rim caldo, aberasi naik)",
    min: 0,
    max: 1,
    langkah: 0.05,
  },
  {
    key: "sorot",
    label: "SOROT",
    uniform: "uReveal",
    hint: "duotone rosso di sekitar titik cahaya; di panggung utama ini yang menyala oleh jejak pointer",
    min: 0,
    max: 1,
    langkah: 0.05,
  },
  {
    key: "fokus",
    label: "FOKUS",
    uniform: "uFokus",
    hint: "jarak bidang fokus dari kamera, dalam satuan dunia — kartu diam duduk di 5,00, jadi di situ tajam",
    min: 4.5,
    max: 5.5,
    langkah: 0.02,
  },
  {
    key: "kabur",
    label: "KABUR",
    uniform: "uKabur",
    hint: "plafon efek jarak; jarak 0,5 satuan dari bidang fokus sudah berarti kabur penuh",
    min: 0,
    max: 1,
    langkah: 0.05,
  },
  {
    key: "iris",
    label: "IRIS",
    uniform: "uWipe",
    hint: "sapuan menutup dari tepi ke tengah; holder yang dibagi panggung utama tidak ikut tersentuh",
    min: 0,
    max: 1,
    langkah: 0.05,
  },
  {
    key: "potong",
    label: "POTONG",
    uniform: "uMask",
    hint: "fraksi dari setengah viewport yang dihapus di tiap tepi — inilah kotak portal yang dipakai bab",
    min: 0,
    max: 0.45,
    langkah: 0.01,
  },
];

const tetap = (v: number) => v.toFixed(2);

export default function MejaHidup() {
  const [nilai, setNilai] = useState<MejaNilai>(AWAL);
  const mask = potongKeMask(nilai.potong);

  return (
    <div className="flex flex-col gap-10">
      <div className="grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-8 lg:gap-12 items-start">
        <div className="w-full h-[58vh] min-h-[420px] swiss-border bg-obsidian/5">
          <PanggungKecil className="w-full h-full">
            <MejaTipografi nilai={nilai} />
          </PanggungKecil>
        </div>

        <div className="flex flex-col gap-5">
          {KNOB.map((k) => (
            <label key={k.key} className="flex flex-col gap-1.5" htmlFor={`meja-${k.key}`}>
              <span className="flex items-baseline justify-between gap-3">
                <span className="font-mono text-micro tracking-[0.2em] uppercase text-obsidian">
                  {k.label}
                </span>
                <span className="flex items-baseline gap-2 font-mono text-[10px] text-titanium">
                  <span className="tracking-[0.12em] uppercase">{k.uniform}</span>
                  <span
                    data-meja-angka={k.key}
                    className="tabular-nums text-obsidian text-[13px] font-bold"
                  >
                    {tetap(nilai[k.key])}
                  </span>
                </span>
              </span>
              <input
                id={`meja-${k.key}`}
                data-meja-knob={k.key}
                type="range"
                min={k.min}
                max={k.max}
                step={k.langkah}
                value={nilai[k.key]}
                onChange={(e) =>
                  setNilai((n) => ({ ...n, [k.key]: Number(e.target.value) }))
                }
                aria-valuetext={`${k.label} ${tetap(nilai[k.key])}`}
                className="w-full accent-rosso cursor-pointer"
              />
              <span className="font-mono text-[9px] leading-relaxed text-titanium max-w-[52ch]">
                {k.hint}
              </span>
            </label>
          ))}

          <div className="flex items-center justify-between gap-3 pt-2 swiss-border-t">
            <span data-meja-mask className="font-mono text-[9px] tracking-[0.1em] text-titanium">
              uMask [{tetap(mask[0])}, {tetap(mask[1])}, {tetap(mask[2])}, {tetap(mask[3])}]
            </span>
            <button
              type="button"
              data-meja-reset
              onClick={() => setNilai(AWAL)}
              className="font-mono text-[10px] tracking-[0.2em] uppercase px-4 py-2 rounded-full swiss-border hover:border-rosso hover:text-rosso transition-colors cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <p className="font-mono text-[10px] leading-relaxed text-titanium max-w-[86ch]">
        Every knob writes one uniform of one material. Nothing here is animated by the page:
        the image only changes when you move something, and the change costs exactly one frame —
        a knob is a command, so it is allowed to ask for a frame even while the idle law is holding
        the loop at zero. The commanded value and the uniform value are printed side by side above;
        the verifier reads both and fails when they disagree.
      </p>
    </div>
  );
}
