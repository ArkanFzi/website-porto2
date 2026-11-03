// ─────────────────────────────────────────────────────────────────────────────
// Dihasilkan oleh tools/ci/ukur-kartu.mjs dari artefak pengukuran di mesin penulis.
// JANGAN diedit tangan: angka di sini adalah satu-satunya sumber "TERUKUR" yang tercetak
// di kartu proyek halaman utama, dan menyuntingnya langsung sama dengan kembali ke angka
// karangan. Refresh dengan
//   node tools/ci/ukur-kartu.mjs
// Sumber yang tidak ada saat generator jalan ditulis `null`, dan kartu yang null tercetak
// "BELUM TERUKUR" — bukan angka terakhir yang masih tersisa.
// ─────────────────────────────────────────────────────────────────────────────

/** Umur maksimum artefak dalam hari; lewat ini formatter mengembalikan "BELUM TERUKUR". */
export const BATAS_USIA_HARI = 90;

export interface UkurEkstensi {
  /** Jumlah direktori extensions yang benar-benar ber-ekstensi (extension.js + metadata.json). */
  jumlah: number;
  nama: string[];
  sumber: string;
}

export interface UkurBatasLaju {
  /** Konstanta RATE_LIMIT_REQUESTS yang dibaca dari hook, bukan angka yang diketik ulang. */
  permintaanPerMenit: number;
  ditegakkanDi: string;
  sumber: string;
}

export interface UkurEkstraksi {
  /** File per detik secara agregat atas seluruh run hook yang terukur. */
  filePerDetik: number;
  totalFile: number;
  totalDetik: number;
  /** Rentang per-run, disimpan untuk audit; tidak dicetak karena penyebutnya seluruh hook. */
  min: number;
  maks: number;
  jumlahRun: number;
  /** Run tanpa stempel penutup atau tanpa hitungan file — dibuang, tapi dihitung. */
  runDibuang: number;
  jendelaAwal: string;
  jendelaAkhir: string;
  sumber: string;
}

export interface UkurHris {
  permintaan: number;
  uriBerbeda: number;
  /** Statement berjenis query. BEGIN/COMMIT dihitung terpisah di `transaksi`. */
  query: number;
  /** Statement berjenis transaction; durasinya selalu 0 di tangkapan Debugbar. */
  transaksi: number;
  totalStatement: number;
  p99Ms: number;
  p95Ms: number;
  medianMs: number;
  maksMs: number;
  medianPerPermintaan: number;
  maksPerPermintaan: number;
  rentangAwal: string;
  rentangAkhir: string;
  connection: string;
  signature: string;
  sumber: string;
}

export interface UkurJendela {
  /** fps TERENDAH dari bab yang diukur — kartu tidak boleh mengklaim bab terbaiknya. */
  fpsTerendah: number;
  fpsTertinggi: number;
  jumlahBab: number;
  frame: number;
  lebar: number | null;
  tinggi: number | null;
  /** String WEBGL_debug_renderer_info apa adanya; klaim ini cuma berlaku padanya. */
  perangkat: string;
  dibuat: string | null;
}

export interface UkurFrame extends UkurJendela {
  /** Jendela ukur yang sama di SwiftShader, dari docs/verify/anggaran.json — null kalau belum ada. */
  perantiLunak: UkurJendela | null;
  sumber: string;
}

export interface MetrikKartu {
  versi: number;
  dihasilkanPada: string;
  batasUsiaHari: number;
  kartu: {
    '01': UkurEkstensi | null;
    '02': UkurBatasLaju | null;
    '03': UkurEkstraksi | null;
    '04': UkurHris | null;
    '05': UkurFrame | null;
  };
}

export const METRIK_KARTU: MetrikKartu = {
  "versi": 1,
  "dihasilkanPada": "2026-11-03T14:23:27.295Z",
  "batasUsiaHari": 90,
  "kartu": {
    "01": {
      "jumlah": 6,
      "nama": [
        "noir-clock@arkan",
        "noir-cluster@arkan",
        "noir-island@arkan",
        "noir-rail@arkan",
        "noir-startlights@arkan",
        "noir-telemetry@arkan"
      ],
      "sumber": "/home/arkan/ferrari-ubuntu/extensions/*/extension.js + metadata.json"
    },
    "02": {
      "permintaanPerMenit": 10,
      "ditegakkanDi": "pb_hooks/ai_proxy.pb.js:40",
      "sumber": "konstanta yang dibaca dari hook, bukan angka yang diketik ulang"
    },
    "03": {
      "filePerDetik": 10.625806451612902,
      "totalFile": 1647,
      "totalDetik": 155,
      "min": 0.37681159420289856,
      "maks": 34.64102564102564,
      "jumlahRun": 3,
      "runDibuang": 0,
      "jendelaAwal": "2026-11-03T00:30:01.000Z",
      "jendelaAkhir": "2026-11-03T00:40:01.000Z",
      "sumber": "/tmp/graphify.log (stempel Triggered → finished dibagi file uncached)"
    },
    "04": {
      "permintaan": 681,
      "uriBerbeda": 51,
      "query": 3440,
      "transaksi": 730,
      "totalStatement": 4170,
      "p99Ms": 1.6543800000000002,
      "p95Ms": 0.67311,
      "medianMs": 0.0994,
      "maksMs": 13.20051,
      "medianPerPermintaan": 5,
      "maksPerPermintaan": 38,
      "rentangAwal": "2026-08-20T08:08:14.966Z",
      "rentangAkhir": "2026-08-21T12:02:35.398Z",
      "connection": "hris_development",
      "signature": "681|01M0F3DBBMBX79M6H4D4PK4HM6.json|01M0J37586NBA0DVKWPVXC9W69.json|hris_development",
      "sumber": "/home/arkan/Documents/Coding/Sekawan_Media_Tasks/hris/hris-admin/storage/debugbar/*.json (tangkapan Debugbar dev lokal, bukan produksi)"
    },
    "05": {
      "fpsTerendah": 59.9,
      "fpsTertinggi": 60.6,
      "jumlahBab": 4,
      "frame": 60,
      "lebar": 1440,
      "tinggi": 900,
      "perangkat": "ANGLE (NVIDIA, Vulkan 1.4.329 (NVIDIA NVIDIA GeForce RTX 2050 (0x000025AD)), NVIDIA)",
      "dibuat": "2026-11-03T14:18:15.332Z",
      "perantiLunak": {
        "fpsTerendah": 7.1,
        "fpsTertinggi": 17.8,
        "jumlahBab": 4,
        "frame": 60,
        "lebar": 1440,
        "tinggi": 900,
        "perangkat": "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)",
        "dibuat": "2026-11-03T07:02:43.366Z"
      },
      "sumber": "docs/verify/drawcall-probe.mjs --gpu --tulis docs/verify/anggaran-gpu.json"
    }
  }
};
