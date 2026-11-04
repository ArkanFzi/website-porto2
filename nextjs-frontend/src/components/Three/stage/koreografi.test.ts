import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BARIS_DIAM,
  BARIS_FERRARI,
  BAB_ARSIP,
  aktorDipanggil,
  aktorUntukBaris,
  penggantiDipanggil,
  type BahasaBaris
} from "./koreografi.ts";
import { LABEL_BAHASA } from "../../../data/logoBahasa.ts";
import { PATH_BAHASA } from "../../../data/logoPath.ts";

// Aturan pengganti kartu adalah satu-satunya tempat "baris mana" bertemu "objek mana", dan
// ia memutuskan dua hal sekaligus: apakah kartu mundur (usePanggung) dan objek mana yang
// terpasang (AktorSF26 / AktorBahasa). Dua pemakai yang boleh berbeda putusan berarti
// kartu yang memudar untuk objek yang tidak pernah datang — layar kosong di dalam sangkar.
//
// Kenapa test ini ada di Node dan bukan hanya di browser: keadaan paling berbahaya adalah
// baris arsip yang TIDAK memanggil objek apa pun. Di halaman live keadaan itu tidak bisa
// diproduksi — kelima baris terukur pada bahasa yang punya bentuk — jadi ekstra-probe tidak
// akan pernah melihatnya. Ia baru muncul kalau generator gagal (repo hilang, artefak menua
// >90 hari) atau kalau bahasa dominan tidak ada di whitelist bentuk (`Bash` sudah menang di
// beberapa korpus sebagai runner-up), dan saat itu yang terjadi harus "tidak ada objek,
// kartu tetap utuh", bukan "kotak kosong bersangkakan".

/** Empat keadaan baris: semuanya terukur dan punya bentuk; yang sama dengan /05 belum
 *  terukur; dan satu daftar yang berisi bahasa tanpa bentuk. Tiga-tiganya perlu karena
 *  aturan tidak boleh memudar untuk dua alasan yang berbeda. */
const SEMUA: BahasaBaris = ["JavaScript", "TypeScript", "Python", "Go", "TypeScript"];
const UKUR: BahasaBaris = ["JavaScript", "TypeScript", "Python", "Go", null];
const TANPA_BENTUK: BahasaBaris = ["Bash", "Bash", "Bash", "Bash", "Bash"];

describe("keadaan diam bab arsip", () => {
  it("diam = baris Ferrari, jadi kotaknya selalu punya objek", () => {
    assert.equal(BARIS_DIAM, BARIS_FERRARI, "mengubah ini memindahkan keadaan diam ke potret");
    assert.equal(aktorDipanggil(BAB_ARSIP, null, false, UKUR), "mobil");
    assert.equal(penggantiDipanggil(BAB_ARSIP, null, false, UKUR), true);
  });

  it("baris /01 memanggil mobil meski ada bahasa terukur di sana", () => {
    // Urutan cabang yang disengaja: kalau bahasa yang menang, satu baris bisa punya dua
    // aktor yang rebutan tempat dan sensus frame akan melaporkan keduanya.
    for (const hovered of [null, BARIS_FERRARI]) {
      assert.equal(aktorDipanggil(BAB_ARSIP, hovered, false, SEMUA), "mobil", `hovered=${hovered}`);
    }
  });
});

describe("baris dengan bahasa terukur memanggil logo", () => {
  it("setiap baris terukur selain /01 memberi aktor bahasa", () => {
    for (const hovered of [1, 2, 3, 4]) {
      assert.equal(aktorDipanggil(BAB_ARSIP, hovered, false, SEMUA), "bahasa", `baris ${hovered}`);
      assert.equal(penggantiDipanggil(BAB_ARSIP, hovered, false, SEMUA), true, `baris ${hovered}`);
    }
  });

  it("bahasa yang terukur tapi tidak punya bentuk tidak memanggil apa pun", () => {
    // Ini lubang yang ditutup aturan, bukan oleh renderer: `Bash` keluar dari generator
    // (ukur-kartu.mjs PETA_EKSTENSI) dan logoUntuk("Bash") = null. Selama aktorUntukBaris
    // hanya melihat "ada string", kartu menyerahkan tempatnya untuk objek yang tidak akan
    // pernah dipasang — sangkar kosong. Di browser keadaan ini tidak bisa diproduksi karena
    // kelima baris live terukur pada bahasa berbetuk, jadi test ini satu-satunya bukti.
    assert.equal(aktorUntukBaris(1, ["Bash"] as BahasaBaris), null, "Bash tidak punya bentuk");
    assert.equal(aktorDipanggil(BAB_ARSIP, 1, false, TANPA_BENTUK), null);
    assert.equal(penggantiDipanggil(BAB_ARSIP, 1, false, TANPA_BENTUK), false, "silang tetap 0");
    // /01 tetap mobil: bahasa baris itu tidak dibaca sama sekali, dan itu yang membuat
    // artefak bahasa yang gagal tidak pernah bisa menghapus mobil dari keadaan diam.
    assert.equal(aktorDipanggil(BAB_ARSIP, null, false, TANPA_BENTUK), "mobil");
  });

  it("hanya label yang terdaftar di peta bentuk yang boleh memanggil logo", () => {
    // Pasangan whitelist↔geometri diuji di src/lib/logoBahasa.test.ts; yang diuji di sini
    // adalah bahwa aturan memakai pasangan yang SAMA untuk setiap label, termasuk variasi
    // huruf besar/kecil yang bisa datang dari artefak tua.
    const id = Object.keys(PATH_BAHASA);
    assert.deepEqual(id, Object.keys(LABEL_BAHASA), "whitelist dan peta bentuk berbeda");
    for (const nama of id) {
      const label = LABEL_BAHASA[nama as keyof typeof LABEL_BAHASA];
      for (const calon of [label, label.toLowerCase(), label.toUpperCase()]) {
        assert.equal(aktorUntukBaris(1, [null, calon] as BahasaBaris), "bahasa", calon);
      }
    }
    for (const calon of ["Bash", "Rust", "Shell", ""]) {
      assert.equal(aktorUntukBaris(1, [null, calon] as BahasaBaris), null, calon);
    }
  });
});

describe("baris tanpa bahasa terukur tidak memanggil apa pun", () => {
  it("null di daftar berarti tidak ada objek dan tidak ada kartu yang mundur", () => {
    assert.equal(aktorDipanggil(BAB_ARSIP, 4, false, UKUR), null, "/05 belum terukur");
    assert.equal(penggantiDipanggil(BAB_ARSIP, 4, false, UKUR), false, "silang harus tetap 0");
  });

  it("indeks di luar daftar juga null", () => {
    for (const hovered of [5, 9, -1]) {
      assert.equal(aktorUntukBaris(hovered, SEMUA), null, `baris ${hovered}`);
    }
  });

  it("baris terisi pun tidak memanggil kalau babnya bukan arsip", () => {
    for (const bab of [0, 1, 2, 4, 5]) {
      assert.equal(aktorDipanggil(bab, 2, false, SEMUA), null, `bab ${bab}`);
      assert.equal(aktorDipanggil(bab, null, false, SEMUA), null, `bab ${bab} diam`);
      assert.equal(penggantiDipanggil(bab, 2, false, SEMUA), false, `bab ${bab}`);
    }
  });

  it("gerak dikurangi menang atas selalu-ada-objek", () => {
    for (const hovered of [null, 0, 1, 2]) {
      assert.equal(aktorDipanggil(BAB_ARSIP, hovered, true, SEMUA), null, `hovered=${hovered}`);
      assert.equal(penggantiDipanggil(BAB_ARSIP, hovered, true, SEMUA), false, `hovered=${hovered}`);
    }
  });
});

describe("satu aturan untuk kedua pemakai", () => {
  it("penggantiDipanggil persis aktorDipanggil yang bukan null", () => {
    for (const bab of [0, 1, 2, 3, 4]) {
      for (const hovered of [null, 0, 1, 2, 3, 4, 7]) {
        for (const kurangiGerak of [false, true]) {
          for (const bahasa of [UKUR, SEMUA]) {
            const aktor = aktorDipanggil(bab, hovered, kurangiGerak, bahasa);
            assert.equal(
              penggantiDipanggil(bab, hovered, kurangiGerak, bahasa),
              aktor !== null,
              `bab=${bab} hovered=${hovered} kurangiGerak=${kurangiGerak} aktor=${aktor}`
            );
          }
        }
      }
    }
  });

  it("putusan hanya pernah tiga nilai", () => {
    const nilai = new Set<string | null>();
    for (const bab of [0, 1, 2, 3, 4]) {
      for (const hovered of [null, 0, 1, 2, 3, 4]) {
        nilai.add(aktorDipanggil(bab, hovered, false, SEMUA));
      }
    }
    assert.deepEqual([...nilai].sort(), ["bahasa", "mobil", null]);
  });
});
