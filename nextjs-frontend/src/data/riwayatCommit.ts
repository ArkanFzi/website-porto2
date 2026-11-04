// ─────────────────────────────────────────────────────────────────────────────
// Dihasilkan oleh tools/ci/riwayat-commit.mjs dari `git log` di mesin penulis.
// JANGAN diedit tangan dan jangan dipakai seolah langsung: image produksi tidak
// membawa .git, jadi modul ini adalah salinan bertanggal. Refresh dengan
//   node tools/ci/riwayat-commit.mjs
// sebelum menampilkan angka yang dianggap masih benar.
// ─────────────────────────────────────────────────────────────────────────────

export interface EntriRiwayat {
  /** Hash pendek seperti yang dicetak `git log --pretty=%h`. */
  commit: string;
  /** Tanggal penulis (author date) dalam ISO `YYYY-MM-DD`. */
  tanggal: string;
  /** Kata sebelum titik dua pada baris subjek; commit tanpa pola konvensi masuk
   *  keranjang "tanpa-pola" dan tidak dibuang. */
  tipe: string;
  scope: string | null;
  /** Sisa baris subjek, apa adanya. */
  ringkasan: string;
}

/** Kapan snapshot ini diambil dari repositori lokal, ISO UTC. */
export const DICATAT = "2026-11-02T08:38:59.596Z";

/** HEAD repositori lokal saat snapshot diambil. */
export const KEPALA_COMMIT = "0b6ebc0";

/** Seluruh commit yang reachable dari HEAD, termasuk merge. */
export const TOTAL_COMMIT = 229;

export const RENTANG_COMMIT = {
  "awal": "2025-12-09",
  "akhir": "2026-11-02"
};

/** Distribusi tipe atas SELURUH riwayat. Jumlahnya wajib sama dengan TOTAL_COMMIT. */
export const PER_TIPE = [
  {
    "tipe": "tanpa-pola",
    "jumlah": 60
  },
  {
    "tipe": "fix",
    "jumlah": 46
  },
  {
    "tipe": "feat",
    "jumlah": 43
  },
  {
    "tipe": "docs",
    "jumlah": 31
  },
  {
    "tipe": "ci",
    "jumlah": 18
  },
  {
    "tipe": "chore",
    "jumlah": 8
  },
  {
    "tipe": "refactor",
    "jumlah": 7
  },
  {
    "tipe": "perf",
    "jumlah": 5
  },
  {
    "tipe": "build",
    "jumlah": 4
  },
  {
    "tipe": "style",
    "jumlah": 3
  },
  {
    "tipe": "test",
    "jumlah": 3
  },
  {
    "tipe": "drill",
    "jumlah": 1
  }
] as const;

/** Commit tanpa merge di HEAD. Jumlah PENULIS wajib sama dengan angka ini. */
export const COMMIT_NON_MERGE = 195;

/** Commit tanpa merge yang subjeknya berakhir dengan tautan pull request, mis. "(#50)". */
export const COMMIT_LEWAT_PR = 47;

export interface Penulis {
  nama: string;
  email: string;
  jumlah: number;
  /** Nama yang berakhir "[bot]" — dependabot ikut menulis riwayat ini dan tidak disamarkan. */
  bot: boolean;
}

/** Penulis per identitas git, banyak dulu. Termasuk identitas ganda orang yang sama. */
export const PENULIS: Penulis[] = [
  {
    "nama": "Muhamad Arkan Fauzi",
    "email": "muhammadarkanfauzi9@gmail.com",
    "jumlah": 164,
    "bot": false
  },
  {
    "nama": "ArkanFzi",
    "email": "muhammadarkanfauzi9@gmail.com",
    "jumlah": 16,
    "bot": false
  },
  {
    "nama": "dependabot[bot]",
    "email": "49699333+dependabot[bot]@users.noreply.github.com",
    "jumlah": 6,
    "bot": true
  },
  {
    "nama": "root",
    "email": "root@ServerSija",
    "jumlah": 4,
    "bot": false
  },
  {
    "nama": "Fzi1",
    "email": "muhammadarkanfauzi9@gmail.com",
    "jumlah": 3,
    "bot": false
  },
  {
    "nama": "Arkan Fauzi",
    "email": "muhammadarkanfauzi9@gmail.com",
    "jumlah": 2,
    "bot": false
  }
];

/** 20 commit terakhir, baru ke lama. */
export const RIWAYAT_COMMIT: EntriRiwayat[] = [
  {
    "commit": "0b6ebc0",
    "tanggal": "2026-11-02",
    "tipe": "feat",
    "scope": "baca",
    "ringkasan": "trail commit dari snapshot riwayatCommit dengan keranjang tipe yang menutup total, generator tools/ci/riwayat-commit.mjs dan enam gerbang baru halaman-probe"
  },
  {
    "commit": "90ee3be",
    "tanggal": "2026-11-02",
    "tipe": "perf",
    "scope": "verify",
    "ringkasan": "drawcall-probe dapat --tulis yang menyimpan anggaran per bab (panggilan, segitiga, alokasi geometri/tekstur, fps dari counter frame, byte unduhan) ke docs/verify/anggaran.json"
  },
  {
    "commit": "a1d2b52",
    "tanggal": "2026-11-02",
    "tipe": "fix",
    "scope": "baca",
    "ringkasan": "judul tabel tidak lagi mengklaim dua puluh baris karena fork dan repo profil dibuang setelah filter, keterangan jendela ukur dilengkapi"
  },
  {
    "commit": "70f6aa2",
    "tanggal": "2026-11-02",
    "tipe": "feat",
    "scope": "hud",
    "ringkasan": "dua tautan lorong rincian ditumpuk vertikal di bawah monogram agar pil telemetri dan bar bawah tidak bergeser, halaman-probe 41 gerbang lolos"
  },
  {
    "commit": "0a3dec6",
    "tanggal": "2026-11-02",
    "tipe": "test",
    "scope": "halaman",
    "ringkasan": "probe baru 41 gerbang untuk dua lorong rincian, angka /baca ditagih baris per baris terhadap /api/github-repos dan /arsip ditagih lewat mock null serta endpoint mati"
  },
  {
    "commit": "b6646eb",
    "tanggal": "2026-11-02",
    "tipe": "feat",
    "scope": "arsip",
    "ringkasan": "halaman pit-wall berlangganan store telemetri yang sama dengan HUD, hop tanpa angka tercetak em-dash dengan nol bilah saat clientFrames null, aturan ukur dan blok privasi dicetak di bawahnya"
  },
  {
    "commit": "d15d74d",
    "tanggal": "2026-11-02",
    "tipe": "feat",
    "scope": "baca",
    "ringkasan": "halaman index repo tanpa tanggal dari payload github yang sama dengan halaman utama, angka bintang dan forks terverifikasi subset /api/github-repos"
  },
  {
    "commit": "bfa1842",
    "tanggal": "2026-11-02",
    "tipe": "feat",
    "scope": "kabur-jarak",
    "ringkasan": "depth of field palsu kartu potret lewat salinan seperempat resolusi yang diblend oleh jarak pixel ke bidang fokus, tanpa pass pasca-proses, plafon 0.6, nol draw call tambahan dan mati pada reduce-motion, ekstra-probe 91 gerbang"
  },
  {
    "commit": "394bdb7",
    "tanggal": "2026-11-02",
    "tipe": "feat",
    "scope": "sf26",
    "ringkasan": "model sf-26 grafit mengambil tempat potret saat baris /01 di-hover di bab arsip, silang kartu-mobil satu angka lewat holder module yang ditulis ulang karena r3f menyalin props uniforms, 50.458 triangle tiga draw call nol saat diam, ekstra-probe 81 gerbang"
  },
  {
    "commit": "0336ee2",
    "tanggal": "2026-11-02",
    "tipe": "feat",
    "scope": "spec-strip",
    "ringkasan": "modal kasus jadi strip sebaris yang melebarkan mask portal bab 3, satu var css --strip-lebar menggerakkan kolom baca dan tepi kiri portal sekaligus, ekstra-probe interaksi 55 gerbang"
  },
  {
    "commit": "2422b7a",
    "tanggal": "2026-11-02",
    "tipe": "feat",
    "scope": "roda-paddock",
    "ringkasan": "cincin torus di sudut bab penutup yang sudutnya dijumlahkan dari velositas gulir dan lepas di luar bab itu, ekstra-probe 62 gerbang termasuk hukum tanda dan gerbang reduce-motion, sensus bilah dibandingkan dengan bacaan yang dikonsumsi browser"
  },
  {
    "commit": "149d79c",
    "tanggal": "2026-11-02",
    "tipe": "feat",
    "scope": "jejak-arsitektur",
    "ringkasan": "garis waktu 3D dengan panjang segmen sama dengan milidetik terukur per lompatan, hop tanpa angka tanpa bentuk di DOM dan panggung lewat satu hukum bersama, ekstra-probe 45 gerbang plus test node --test"
  },
  {
    "commit": "8b46c78",
    "tanggal": "2026-11-02",
    "tipe": "feat",
    "scope": "telemetri-menit",
    "ringkasan": "gumpalan enam menit jadi satu store dengan bilah DOM dan bilah panggung dilukis dari hukum tinggi yang sama, ekstra-probe 34 gerbang plus test node --test"
  },
  {
    "commit": "845b296",
    "tanggal": "2026-11-02",
    "tipe": "fix",
    "scope": "verifier",
    "ringkasan": "bangunkan loop demand sebelum klik MODE dan pisahkan gerbang rekaman flip dari gerbang jendela wajah"
  },
  {
    "commit": "2f9c7d1",
    "tanggal": "2026-11-02",
    "tipe": "feat",
    "scope": "panggung-transisi",
    "ringkasan": "paralaks tipografi DOM dari proyeksi panggung yang sama dengan kartu lewat atribut data-paralaks, verifier transisi-probe 53 gerbang"
  },
  {
    "commit": "a6de8a9",
    "tanggal": "2026-11-02",
    "tipe": "feat",
    "scope": "panggung-transisi",
    "ringkasan": "wipe antar bab lewat satu bidang jarak pada uMask dengan plateau di tengah pita perpindahan, reduksi permintaan frame kartu dan parkir pada state untuk verifier, transisi-probe 23 gerbang termasuk bukti piksel"
  },
  {
    "commit": "13bb90d",
    "tanggal": "2026-11-02",
    "tipe": "feat",
    "scope": "panggung-kamera",
    "ringkasan": "dolly fov maksimal satu derajat dari kecepatan gulir dengan pegas pulang dan fov dasar sebagai sumber kalibrasi, loop demand bangun sampai kartu benar-benar mendarat di kotaknya, verifier transisi-probe 14 gerbang"
  },
  {
    "commit": "f09640d",
    "tanggal": "2026-11-02",
    "tipe": "feat",
    "scope": "panggung-interaksi",
    "ringkasan": "MODE jadi putaran 360 derajat yang mengangkut silang wajah duotone dan reticle kartu bisa dikunci lewat seret atau fokus keyboard, fix sisipkan JUMLAH_JEJAK sebagai angka supaya fragment shader terkompilasi lagi plus loop demand bangun sendiri selama jejak masih hidup, verifier interaksi-probe 39 gerbang termasuk gerbang piksel"
  },
  {
    "commit": "5fc867a",
    "tanggal": "2026-11-01",
    "tipe": "feat",
    "scope": "panggung-interaksi",
    "ringkasan": "jejak pointer 12 sampel masuk mask reveal dengan peluruhan eksponensial per detik"
  },
  {
    "commit": "9eabe2c",
    "tanggal": "2026-11-01",
    "tipe": "feat",
    "scope": "panggung-interaksi",
    "ringkasan": "seret kartu ±12° dengan pegas kembali dan padanan panah keyboard lewat kontrol yang bisa difokus, verifier interaksi-probe 15 gerbang"
  }
];
