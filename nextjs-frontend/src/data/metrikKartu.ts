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

export interface UkurBahasa {
  /** Bahasa dengan byte sumber TERBANYAK di korpus ter-commit — bukan jumlah berkas. */
  bahasa: string;
  byte: number;
  berkas: number;
  /** Semua bahasa terklasifikasi, terurut turun menurut byte. Runner-up ikut dicetak di
   *  strip supaya keunggulan tipis (Pickertime 1,20x atas JavaScript) terlihat, bukan
   *  tersembunyi di balik satu kata. */
  peringkat: { bahasa: string; byte: number; berkas: number }[];
  byteTotal: number;
  jumlahBerkas: number;
  binerDilewati: number;
  jalurDibuang: number;
  korpus: 'git' | 'direktori';
  signature: string;
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
  /** Peta paralel `kartu`: bahasa dominan yang mengisi kotak WORKS. Null berarti baris itu
   *  tidak punya objek 3D — kartu tidak boleh memudar untuk objek yang tidak datang. */
  bahasa: {
    '01': UkurBahasa | null;
    '02': UkurBahasa | null;
    '03': UkurBahasa | null;
    '04': UkurBahasa | null;
    '05': UkurBahasa | null;
  };
}

export const METRIK_KARTU: MetrikKartu = {
  "versi": 2,
  "dihasilkanPada": "2026-11-04T02:20:47.285Z",
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
      "filePerDetik": 11.687943262411348,
      "totalFile": 1648,
      "totalDetik": 141,
      "min": 0.5,
      "maks": 34.64102564102564,
      "jumlahRun": 3,
      "runDibuang": 0,
      "jendelaAwal": "2026-11-04T00:30:01.000Z",
      "jendelaAkhir": "2026-11-04T00:40:01.000Z",
      "sumber": "/tmp/graphify.log (stempel Triggered → finished dibagi file uncached)"
    },
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
  },
  "bahasa": {
    "01": {
      "bahasa": "JavaScript",
      "byte": 291048,
      "berkas": 7,
      "peringkat": [
        {
          "bahasa": "JavaScript",
          "byte": 291048,
          "berkas": 7
        },
        {
          "bahasa": "Bash",
          "byte": 80350,
          "berkas": 8
        },
        {
          "bahasa": "Python",
          "byte": 9840,
          "berkas": 2
        }
      ],
      "byteTotal": 381238,
      "jumlahBerkas": 149,
      "binerDilewati": 100,
      "jalurDibuang": 0,
      "korpus": "git",
      "signature": "git|149|381238",
      "sumber": "git di /home/arkan/ferrari-ubuntu"
    },
    "02": {
      "bahasa": "TypeScript",
      "byte": 270534,
      "berkas": 40,
      "peringkat": [
        {
          "bahasa": "TypeScript",
          "byte": 270534,
          "berkas": 40
        },
        {
          "bahasa": "JavaScript",
          "byte": 225096,
          "berkas": 19
        },
        {
          "bahasa": "Bash",
          "byte": 147921,
          "berkas": 19
        }
      ],
      "byteTotal": 643551,
      "jumlahBerkas": 146,
      "binerDilewati": 5,
      "jalurDibuang": 0,
      "korpus": "git",
      "signature": "git|146|643551",
      "sumber": "git di /home/arkan/Documents/Coding/Pickertime"
    },
    "03": {
      "bahasa": "Python",
      "byte": 20996,
      "berkas": 3,
      "peringkat": [
        {
          "bahasa": "Python",
          "byte": 20996,
          "berkas": 3
        },
        {
          "bahasa": "Bash",
          "byte": 8128,
          "berkas": 4
        }
      ],
      "byteTotal": 29124,
      "jumlahBerkas": 15,
      "binerDilewati": 0,
      "jalurDibuang": 0,
      "korpus": "git",
      "signature": "git|15|29124",
      "sumber": "git di /home/arkan/Documents/Coding/graphify-devkit"
    },
    "04": {
      "bahasa": "Go",
      "byte": 649738,
      "berkas": 93,
      "peringkat": [
        {
          "bahasa": "Go",
          "byte": 649738,
          "berkas": 93
        },
        {
          "bahasa": "Python",
          "byte": 2056,
          "berkas": 1
        }
      ],
      "byteTotal": 651794,
      "jumlahBerkas": 125,
      "binerDilewati": 0,
      "jalurDibuang": 5,
      "korpus": "git",
      "signature": "git|125|651794",
      "sumber": "git di /home/arkan/Documents/Coding/hermes-control-tower"
    },
    "05": {
      "bahasa": "TypeScript",
      "byte": 699095,
      "berkas": 103,
      "peringkat": [
        {
          "bahasa": "TypeScript",
          "byte": 699095,
          "berkas": 103
        },
        {
          "bahasa": "JavaScript",
          "byte": 326775,
          "berkas": 15
        },
        {
          "bahasa": "Go",
          "byte": 106560,
          "berkas": 12
        },
        {
          "bahasa": "Bash",
          "byte": 1648,
          "berkas": 1
        }
      ],
      "byteTotal": 1134078,
      "jumlahBerkas": 175,
      "binerDilewati": 4,
      "jalurDibuang": 0,
      "korpus": "git",
      "signature": "git|175|1134078",
      "sumber": "git di /home/arkan/Documents/Coding/website-porto2"
    }
  }
};
