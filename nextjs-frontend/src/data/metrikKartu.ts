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

export interface UkurHermes {
  /** Jumlah `func Test` di seluruh *_test.go — bukan jumlah assertion. */
  testFungsi: number;
  testBerkas: number;
  /** Nol berarti kartu ini tidak punya angka waktu respons; nilainya ikut dicetak. */
  benchmarkFungsi: number;
  /** Registrasi HandleFunc ber-"METHOD /path". Penangkap root SPA dihitung terpisah. */
  rute: number;
  ruteApi: number;
  berkasRute: number;
  tangkapSPA: number;
  modul: number;
  namaModul: string[];
  /** Tipe data kontrak WebSocket di pkg/protocol. */
  tipeProtokol: number;
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
    '04': UkurHermes | null;
    '05': UkurFrame | null;
  };
}

export const METRIK_KARTU: MetrikKartu = {
  "versi": 1,
  "dihasilkanPada": "2026-11-03T22:39:45.735Z",
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
    "03": null,
    "04": {
      "testFungsi": 186,
      "testBerkas": 39,
      "benchmarkFungsi": 0,
      "rute": 82,
      "ruteApi": 80,
      "berkasRute": 13,
      "tangkapSPA": 1,
      "modul": 13,
      "namaModul": [
        "agent",
        "alerting",
        "broker",
        "cron",
        "devops",
        "filemgr",
        "gcpcompute",
        "hermes",
        "hostexec",
        "kanban",
        "sentinel",
        "sync",
        "telemetry"
      ],
      "tipeProtokol": 13,
      "signature": "39|cmd/agent/logfollows_test.go|pkg/protocol/events_test.go|13",
      "sumber": "/home/arkan/Documents/Coding/hermes-control-tower (sumber yang dikomit: func Test di *_test.go, HandleFunc literal, internal/modules/*)"
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
