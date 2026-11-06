// Bukti Tahap 5 — transisi dan kamera (dolly velositas, wipe antar bab, depth-of-field
// palsu, paralaks tipografi). Semuanya diukur dari frame nyata lewat window.__panggung,
// kontrak yang sama dengan verifier lain; tidak ada satu pun gerbang yang membaca kode.
//
//   node docs/verify/transisi-probe.mjs [outdir]      butuh `next dev`
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const require = createRequire(new URL('../../nextjs-frontend/package.json', import.meta.url));
const puppeteer = require('puppeteer');
const FE = process.env.FE_URL ?? 'http://localhost:3001';
const OUT = process.argv[2] ?? '/tmp/transisi';
mkdirSync(OUT, { recursive: true });

/** Harus sama dengan DOLLY_DERAJAT di usePanggung.ts. */
const DOLLY_MAKS = 1;

const pakaiGPU = process.env.PUPPETEER_GPU !== '0' && !process.argv.includes('--swiftshader');
const browser = await puppeteer.launch({
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome',
  headless: 'new',
  args: pakaiGPU
    ? ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=vulkan']
    : ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto(FE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await new Promise((r) => setTimeout(r, 6000));

const diamkan = (ms) => new Promise((r) => setTimeout(r, ms));

/** Sikap kartu + dolly kamera. `dolly` derajat bertanda: negatif = kamera menyempit.
 *  Posisinya dibaca langsung dari scene graph, bukan dari angka kontrak debug yang
 *  dibulatkan ke 1e-4: pegas kartu mendekat asimtotes, jadi pembulatan membuat dua
 *  pembacaan terlihat sama sementara kartu masih 0,06 unit (±14 pixel) dari rumahnya. */
const baca = () =>
  page.evaluate(() => {
    const p = window.__panggung;
    if (!p) return null;
    const kartu = window.__scene?.children
      .flatMap((o) => (o.type === 'Group' ? o.children : [o]))
      .find(
        (o) => o.isMesh && o.geometry?.type === 'PlaneGeometry' && o.geometry?.parameters?.height > 1.6
      );
    const kanvas = document.querySelector('canvas');
    const kotakKanvas = kanvas?.getBoundingClientRect();
    return {
      dolly: p.dolly,
      /** Nomor frame root utama. Dibawa supaya "dua bacaan identik" bisa dibedakan dari
       *  "loop sedang tidak melukis apa pun" — di perenderan perangkat lunak satu jeda
       *  150ms bisa memuat nol frame, dan angkanya lalu disalin dari frame yang sama. */
      frame: window.__render?.frame ?? -1,
      skala: kartu?.scale.x ?? p.skala,
      x: kartu?.position.x ?? p.x,
      y: kartu?.position.y ?? p.y,
      z: kartu?.position.z ?? p.z,
      rotY: kartu?.rotation.y ?? p.rotY,
      p: p.p,
      t: p.t,
      wipe: p.wipe,
      babDari: p.babDari,
      babKe: p.babKe,
      mask: p.mask,
      kamera: p.kamera,
      portal: p.portal,
      layarX: kotakKanvas?.width ?? 0,
      layarY: kotakKanvas?.height ?? 0,
      /** Judul besar di DOM: kedalaman yang ia deklarasikan dan angka yang benar-benar
       *  terpasang pada elemennya. Hanya ini yang membuktikan huruf dan kartu satu ruang —
       *  yang dibandingkan adalah pixel di layar, bukan angka kontrak debug. */
      tipografi: [...document.querySelectorAll('[data-paralaks]')].map((el) => ({
        d: Number(el.getAttribute('data-paralaks')),
        x: getComputedStyle(el).getPropertyValue('--tipografi-x').trim(),
        y: getComputedStyle(el).getPropertyValue('--tipografi-y').trim(),
        teks: (el.textContent ?? '').trim().slice(0, 14),
      })),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

/** Ukuran kanvas = `size` yang dipakai panggung untuk kalibrasi; dibaca dari DOM supaya
 *  gerbang ini tidak menelan asumsi sendiri soal rasio layar. */
const aspekLayar = () =>
  page.evaluate(() => {
    const k = document.querySelector('canvas');
    if (!k) return null;
    const r = k.getBoundingClientRect();
    return r.height > 0 ? r.width / r.height : null;
  });

/** Gulir dengan roda sambil merekam dolly tiap `jedaMs`. Roda dipakai karena velositas
 *  hanya lahir dari peristiwa gulir sungguhan — scrollTo instan tidak menghasilkan apa
 *  pun, dan debu/kompas di verifier lain punya alasan yang sama. */
const rekamDolly = async (arah, langkah = 14, jedaMs = 60) => {
  const rekam = [];
  for (let i = 0; i < langkah; i++) {
    await page.mouse.wheel({ deltaY: arah * 90 });
    await diamkan(jedaMs);
    const b = await baca();
    if (b) rekam.push(b);
  }
  return rekam;
};

/** Tunggu keadaan, bukan waktu: dolly pulang ke nol (atau mendarat di batas waktunya). */
const tungguDolly = async (batas, maksMs = 8000) => {
  const akhir = Date.now() + maksMs;
  let b = await baca();
  while (b && Math.abs(b.dolly) > batas && Date.now() < akhir) {
    await diamkan(120);
    b = await baca();
  }
  return b;
};

/** Bagian kotak portal yang benar-benar berisi kartu, diukur dari layar. Uniform boleh
 *  sempurna sementara shader tidak menggambar apa pun (pernah terjadi: nama konstanta
 *  TypeScript yang disisipkan apa adanya ke GLSL), jadi klaim tentang potongan wajib
 *  lewat piksel.
 *  Yang dibaca ada DUA angka, karena satu tidak cukup: potret hitam-putih dan halaman
 *  kosong yang tinggal di baliknya sama-sama "terang" di atas ambang kertas, jadi
 *  fraksi pixel saja tidak bisa memisahkan keduanya (terukur pada sapuan penuh: 1,000
 *  pixel terang, rata-rata 243, DAN simpangan 9 — bidang datar; potret: 0,560 terang,
 *  rata-rata 120, simpangan 110). Yang membuktikan potret hilang adalah teksturnya,
 *  dan itu diukur sebagai simpangan luminansi.
 *  Kotak dibaca sebelum DAN sesudah foto: tanpa itu yang diukur adalah kotak sekarang
 *  atas foto yang tadi, dan sapuan yang sedang lewat ketahuan sebagai bidang kecil
 *  yang sepenuhnya terang.
 *  Kotak DIPOTONG ke layar lebih dulu, dan hasil potongannya dilaporkan sebagai
 *  `diLayar`. Di bab 02 portalnya sendiri menjulur keluar tepi kiri (terukur x=-85,6),
 *  dan getImageData dengan sx negatif tidak melempar — ia mengembalikan area di luar
 *  kanvas sebagai hitam-transparan, yang oleh penghitung ini terbaca sebagai "potongan
 *  sapuan sampai ke layar" padahal yang diukur sudut layar. Sebaliknya, kotak yang
 *  hampir seluruhnya di luar layar menyisakan sehelai 1px yang boleh terhitung 100%
 *  apa pun — jadi gerbang wajib menyebut berapa besar kotak yang benar-benar terlihat. */
const areaKartu = async () => {
  const sebelum = await baca();
  if (!sebelum) return null;
  const gamba = await page.screenshot({ encoding: 'base64' });
  const sesudah = await baca();
  const [k, a, l, t] = sebelum.portal;
  const ukur = await page.evaluate(
    async ({ gamba, k, a, l, t }) => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + gamba;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const x0 = Math.max(0, Math.round(k));
      const y0 = Math.max(0, Math.round(a));
      const w = Math.max(1, Math.min(Math.round(k) + Math.round(l), img.width) - x0);
      const h = Math.max(1, Math.min(Math.round(a) + Math.round(t), img.height) - y0);
      const d = ctx.getImageData(x0, y0, w, h).data;
      let terang = 0;
      let jumlah = 0;
      let kuadrat = 0;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) {
        const v = (d[i] + d[i + 1] + d[i + 2]) / 3;
        n++;
        jumlah += v;
        kuadrat += v * v;
        if (v > 26) terang++;
      }
      const rata = jumlah / n;
      return {
        pecah: terang / n,
        rata,
        simpang: Math.sqrt(Math.max(0, kuadrat / n - rata * rata)),
        diLayar: (w * h) / (Math.max(1, Math.round(l)) * Math.max(1, Math.round(t))),
        piksel: n,
      };
    },
    { gamba, k, a, l, t }
  );
  return {
    ...ukur,
    portal: sebelum.portal,
    portalSesudah: sesudah?.portal ?? null,
    wipeSebelum: sebelum.wipe,
    wipeSesudah: sesudah?.wipe ?? -1,
  };
};

/** Pointer DIPARKIR di titik yang diketahui sebelum setiap bukti pixel, dan kartu
 *  ditunggu tenang di titik itu. `klikBab` meninggalkan pointer di atas pil HUD, sementara
 *  suku geyang pointer menggeser BAGIAN POTRET yang jatuh di dalam kotak portal — jadi
 *  `pecah` (fraksi pixel terang) bergantung ke mana klik terakhir jatuh, dan posisi pil ikut
 *  berubah mengikuti layout HUD (terukur: 0,562 saat pil di satu tempat, 0,390–0,491 saat di
 *  tempat lain, pada gerbang yang menuntut 0,5). Titik (16,500) sama dengan yang dipakai
 *  sikapDiBab, jadi ketiga bacaan section ini satu posisi dengan bacaan bagian 3. */
const parkirPointer = async () => {
  await page.mouse.move(16, 500);
  return tungguSikap();
};

/** Berpindah bab sambil berhenti di tengahnya. Sapuan hanya fungsi dari posisi gulir,
 *  jadi halaman boleh DIPARKIR pada puncaknya dan difoto — kecepatan roda tidak akan
 *  pernah cukup lambat untuk menangkap satu frame di tengah sapuan. Langkah kecil,
 *  berhenti begitu sapuan menutup, lalu jalan lagi sampai ia membuka. */
const lewatiBand = async (n) => {
  await pilihBab(n);
  const awal = await parkirPointer();
  const terbuka = await areaKartu();
  const langkah = 30;
  const batas = 60;
  const naik = [];
  let puncak = awal?.wipe ?? 0;
  for (let i = 0; i < batas; i++) {
    await page.mouse.wheel({ deltaY: langkah });
    await diamkan(90);
    const b = await baca();
    if (!b) break;
    naik.push(b);
    puncak = Math.max(puncak, b.wipe);
    if (b.wipe >= 0.85) break;
  }
  const tenang = await parkirPointer();
  let foto = await areaKartu();
  // Foto harus diambil pada sapuan yang BENAR-BENAR menutup. Loop di atas berhenti pada
  // 0,85 dan glide Lenis sesudahnya bisa berhenti di 0,941: 6% potret masih tersohong,
  // simpangan luminansinya terukur 30,9 — sisa wajah kartu, bukan bidang datar, dan gerbang
  // "sapuan sampai ke layar" lalu merah karena angkanya sendiri yang tidak menutup.
  for (let i = 0; i < 8 && foto && foto.wipeSebelum < 0.98; i++) {
    await page.mouse.wheel({ deltaY: 10 });
    await diamGulir();
    foto = await areaKartu();
  }
  const turun = [];
  for (let i = 0; i < batas; i++) {
    await page.mouse.wheel({ deltaY: langkah });
    await diamkan(90);
    const b = await baca();
    if (!b) break;
    turun.push(b);
    // Satu sapuan saja yang direkam: begitu kartu membuka kembali, perpindahan bab ini
    // selesai dan sisanya adalah ruang diam di dalam bab tujuan.
    if (b.wipe <= 0.05) break;
  }
  // Sapuan membuka kembali jauh sebelum pita selesai: pada wipe 0,05 kartu masih di
  // tengah perjalanan (t 0,83) dan kotaknya adalah kotak bab tujuan yang belum ia tempati.
  // "Setelah mendarat" jadi wajib diukur pada keadaan babDari sudah pindah — tanpa itu yang
  // merah adalah gerbangnya, sementara kartunya memang belum sampai.
  //
  // "Sudah pindah" harus berarti SAMPAI DI BAB TUJUAN, bukan "nomornya sudah lewat": di
  // antara bab 02 dan 03 berdiri panggung SF-26 (bab 5) yang kotak portalnya tidak punya
  // satu pixel pun di layar (terukur [-432,180,331,540] → helai 1px setelah dipotong).
  // Dengan syarat lama `< tujuan` berhenti di sana, `mendarat` mengukur sehelai halaman
  // dan melaporkan 1,000 — angka yang tampak lulus tapi tidak membuktikan apa pun.
  let akhir = await tungguSikap();
  let susut = 0;
  while (akhir && akhir.babDari !== n + 1 && susut < batas * 8) {
    await page.mouse.wheel({ deltaY: langkah });
    await diamkan(90);
    const b = await baca();
    if (!b) break;
    akhir = b;
    susut++;
  }
  // "Mendarat" dibaca pada pose pointer yang sama dengan dua bukti pixel sebelumnya, dan
  // `akhir` ikut dibaca ulang di pose itu: tanpa itu gerbang wipe/bab di bawah menilai
  // keadaan sebelum parkir sementara `pecah` menilai sesudahnya.
  akhir = await parkirPointer();
  const mendarat = await areaKartu();
  const semua = [...naik, tenang, ...turun].filter(Boolean);
  return {
    awal,
    terbuka,
    naik,
    turun,
    foto,
    tenang,
    akhir,
    mendarat,
    susut,
    profil: semua,
    puncak: Math.max(puncak, ...semua.map((r) => r.wipe)),
  };
};

const hasil = [];
const cek = (nama, dapat, harus) => {
  hasil.push({ nama, ok: dapat === harus, dapat: String(dapat), harus: String(harus) });
};
const kisar = (nama, dapat, harus, toleransi) => {
  hasil.push({
    nama,
    ok: Math.abs(dapat - harus) <= toleransi,
    dapat: `${dapat.toFixed(6)} (harus ${harus}±${toleransi})`,
    harus: true,
  });
};

/** Pusat kartu dalam NDC layar, dihitung dari kamera HIDUP (fov yang sedang berjalan),
 *  lalu dibandingkan ke pusat kotak portal yang sudah berupa NDC. Ini ukuran "apakah
 *  kartu duduk di dalam kotaknya" pada tempat yang sama dengan potongan shader — dan
 *  tidak bergerak kalau halaman mendarat beberapa pixel berbeda, karena keduanya ikut. */
const relPusat = (b, aspek) => {
  const [fov, camZ] = b.kamera;
  const tan = Math.tan((fov * Math.PI) / 180 / 2);
  const sisa = camZ - b.z;
  return [
    b.x / (tan * aspek * sisa) - (b.mask[0] + b.mask[1]) / 2,
    b.y / (tan * sisa) - (b.mask[2] + b.mask[3]) / 2,
  ];
};

/** Kalibrasi world→pixel yang dihitung verifier sendiri dari fov DASAR, jarak kamera, dan
 *  tinggi kanvas — rumus proyeksi perspektif yang sama yang dipakai panggung, tapi tidak
 *  menelan angkanya. fov dasar direkonstruksi dari fov hidup dikurangi dolly, jadi gerbang
 *  ini tetap benar walau pembacaan dilakukan saat kamera masih dalam perjalanan. */
const kalibrasi = (b) => {
  const camZ = b.kamera[1];
  const dpp = (2 * Math.tan(((b.kamera[0] - b.dolly) * Math.PI) / 360) * camZ) / b.layarY;
  return { kePx: (z) => (1 / dpp) * (camZ / (camZ - z)), camZ, dpp };
};

/** Tunggu kartu benar-benar berhenti: enam pembacaan berturut-turut tanpa perubahan
 *  posisi pada presisi float, plus dolly sudah mendarat di nol. Ambangnya 1e-6, bukan
 *  1e-3, karena pegasnya asimtotes — pada 1e-3 kartu masih bisa berjarak belasan pixel
 *  dari kotaknya sementara angkanya sudah terlihat tenang, dan verifier lalu mengukur
 *  sikap yang masih dalam perjalanan. */
const tungguSikap = async () => {
  let terakhir = null;
  let sama = 0;
  for (let i = 0; i < 100; i++) {
    await diamkan(150);
    const b = await baca();
    if (!b) continue;
    const tenang =
      terakhir !== null &&
      Math.abs(b.x - terakhir.x) < 1e-6 &&
      Math.abs(b.y - terakhir.y) < 1e-6 &&
      Math.abs(b.z - terakhir.z) < 1e-6 &&
      Math.abs(b.rotY - terakhir.rotY) < 1e-6 &&
      Math.abs(b.skala - terakhir.skala) < 1e-6 &&
      Math.abs(b.dolly) < 0.005;
    sama = tenang ? sama + 1 : 0;
    terakhir = b;
    if (sama >= 6) return b;
  }
  return terakhir;
};

const klikBab = async (n) => {
  const titik = await page.evaluate((label) => {
    const b = [...document.querySelectorAll('[aria-label="Chapter index"] button')].find(
      (x) => (x.textContent ?? '').trim() === label
    );
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, `CH.0${n}`);
  if (!titik) throw new Error(`tombol CH.0${n} tidak ditemukan`);
  await page.mouse.click(titik.x, titik.y);
};

/** Tunggu sampai bab yang dituju memang dilaporkan panggung. Kartu bisa terbaca tenang
 *  di bab asal selagi gulirannya belum sempat jalan — presisi float tidak bisa
 *  membedakan "sudah sampai" dari "belum berangkat" — dan dua pembacaan yang
 *  dibandingkan lalu datang dari dua bab yang berbeda. */
const tungguBab = async (n, maksMs = 8000) => {
  const akhir = Date.now() + maksMs;
  let b = await baca();
  while (b && b.babDari !== n && Date.now() < akhir) {
    await diamkan(120);
    b = await baca();
  }
  return b;
};

/** Guliran harus sudah berhenti sebelum pil bab ditekan: klik yang jatuh sementara
 *  antrean roda dari bagian sebelumnya masih jalan pernah ditelan tanpa bekas (terukur:
 *  sikapDiBab(2) pulang melaporkan 1→2, dan dua pembacaan sikap yang dibandingkan di
 *  bawahnya lalu selisihnya tepat jarak kedua kotak portal — 1,351 unit dunia). */
const diamGulir = async () => {
  let dulu = -1;
  let sama = 0;
  for (let i = 0; i < 40; i++) {
    const y = await page.evaluate(() => Math.round(window.scrollY));
    await diamkan(120);
    sama = y === dulu ? sama + 1 : 0;
    dulu = y;
    if (sama >= 3) return;
  }
};

/** Tekan pil bab SAMBIL menagih hasilnya: yang dijanjikan adalah bab itu dilaporkan
 *  panggung, jadi kalau tidak berubah tekan lagi — sama seperti langkah panah di
 *  verifier interaksi, yang diregresi oleh peristiwa yang hilang, bukan oleh kodenya. */
const pilihBab = async (n) => {
  for (let percobaan = 0; percobaan < 3; percobaan++) {
    await diamGulir();
    await klikBab(n);
    const b = await tungguBab(n);
    if (b && b.babDari === n) return b;
  }
  return await baca();
};

/** Sikap kartu di awal sebuah bab, lewat jalur yang dipakai pengunjung (tombol bab →
 *  lenis.scrollTo), jadi dua pembacaan banding pada progress yang benar-benar sama.
 *  Pointer diparkir di titik yang sama karena x dan rotY kartu memang mengandung
 *  parallax pointer. */
const sikapDiBab = async (n) => {
  await pilihBab(n);
  await tungguSikap();
  await page.mouse.move(16, 500);
  return tungguSikap();
};

/** Parkir pointer di satu titik dan tunggu SAMBIL huruf ikut berhenti. `tungguSikap`
 *  hanya menunggu kartu; suku geyang pointer sampai ke tipografi satu langkah lebih dulu
 *  (kartu masih tertinggal pegasnya sendiri), jadi membaca huruf setelah kartu tenang
 *  saja tidak cukup — yang ditunggu adalah keduanya tidak berubah.
 *
 *  "Tidak berubah" saja bohong. Dua pembacaan yang identik bisa berarti perjalanan selesai,
 *  bisa berarti loop tidak melukis apa pun: pada perenderan perangkat lunak satu jeda
 *  150ms kadang memuat nol frame, dan loop "demand" pernah tertidur SEBELUM pegasnya habis
 *  (terukur: kartu berhenti di −0,0151 sementara tujuannya −0,0541, huruf di 19,24px dari
 *  22,16px, nomor frame membeku di 39 selama empat jeda). Karena itu ketenangan diuji
 *  dengan bangun: satu peristiwa pointer di titik yang sama — tujuannya tidak berubah,
 *  tapi loop dipaksa melukis lagi. Angka yang masih bergerak setelah dibangun berarti
 *  yang tadi itu tidurnya loop, bukan sikap akhirnya, dan perjalanannya ditunggu ulang. */
const parkirTipografi = async (px, py) => {
  const identik = (a, b) =>
    Math.abs(b.x - a.x) < 1e-6 &&
    Math.abs(b.y - a.y) < 1e-6 &&
    Math.abs(b.dolly) < 0.005 &&
    b.tipografi.length === a.tipografi.length &&
    b.tipografi.every((t, j) => t.x === a.tipografi[j].x && t.y === a.tipografi[j].y);
  await page.mouse.move(px, py);
  let dulu = null;
  let sama = 0;
  for (let i = 0; i < 60; i++) {
    await diamkan(150);
    const b = await baca();
    if (!b) continue;
    sama = dulu !== null && identik(dulu, b) ? sama + 1 : 0;
    dulu = b;
    if (sama < 3) continue;
    await page.mouse.move(px, py);
    await diamkan(800);
    const bangun = await baca();
    if (!bangun || identik(b, bangun)) return bangun ?? b;
    console.log(
      `  parkir (${px},${py}): loop tertidur di tengah jalan, dibangun lagi (frame ${b.frame} → ${bangun.frame}, kartu ${b.y.toFixed(6)} → ${bangun.y.toFixed(6)})`
    );
    dulu = bangun;
    sama = 0;
  }
  return dulu;
};

const px = (v) => Number.parseFloat(v);

// ── 1 · dolly dari kecepatan gulir: ada, terbatas, dan pulang sendiri ──
const diam1 = await sikapDiBab(2);
const turun = await rekamDolly(1);
const puncakTurun = Math.min(...turun.map((r) => r.dolly));
const terbesarTurun = Math.max(...turun.map((r) => Math.abs(r.dolly)));
console.log(
  'dolly    diam:', diam1?.dolly, '| turun puncak:', puncakTurun.toFixed(4), '° | sampel:', turun.length,
  '| nilai:', turun.map((r) => r.dolly.toFixed(3)).join(' ')
);
cek('gulir diam membuat kamera diam (dolly nol)', Math.abs(diam1.dolly) < 0.02, true);
cek('gulir ke bawah menggeser fov dari dasarnya', terbesarTurun >= 0.05, true);
cek('dolly tidak pernah melewati satu derajat', turun.every((r) => Math.abs(r.dolly) <= DOLLY_MAKS + 1e-6), true);
cek('gulir ke bawah menyempitkan fov (kamera mendorong ke dalam)', puncakTurun < 0, true);
const pulih1 = await tungguDolly(0.02);
cek('gulir berhenti, fov pulang ke dasarnya', Math.abs(pulih1.dolly) <= 0.02, true);

// ── 2 · arah: gulir balik menarik kamera, bukan mengulang dorongan ──
const naik = await rekamDolly(-1);
const puncakNaik = Math.max(...naik.map((r) => r.dolly));
cek('gulir ke atas melebarkan fov (tanda berlawanan)', puncakNaik > 0, true);
cek('dolly ke atas juga dibatasi satu derajat', naik.every((r) => Math.abs(r.dolly) <= DOLLY_MAKS + 1e-6), true);
const pulih2 = await tungguDolly(0.02);
cek('dolly ke atas pulang sendiri', Math.abs(pulih2.dolly) <= 0.02, true);

// ── 3 · sikap kartu tidak bergeser permanen oleh dolly ──
// Kalibrasi pixel→world sengaja diikat ke fov DASAR. Kalau ia ikut bergerak, kartu
// kehilangan ukuran kotaknya dan portal DOM memotong di tempat yang salah — jadi yang
// diuji adalah sikap setelah dolly mati, bukan selama ia hidup. Dua gerbang tambahan
// membandingkan pusat kartu ke pusat kotak portalnya dalam NDC: ukuran itu tidak ikut
// bergerak kalau halaman mendarat beberapa pixel berbeda, jadi ia memisahkan "kamera
// meninggalkan bekas" dari "Lenis mendarat sedikit berbeda".
const aspek = (await aspekLayar()) ?? 1440 / 900;
const relSebelum = relPusat(diam1, aspek);
const sesudah3 = (await sikapDiBab(2)) ?? (await baca());
const relSesudah = relPusat(sesudah3, aspek);
const selisihRel = Math.hypot(relSesudah[0] - relSebelum[0], relSesudah[1] - relSebelum[1]);
console.log(
  'rel NDC  sebelum:', relSebelum.map((v) => v.toFixed(4)).join(' '),
  '| sesudah:', relSesudah.map((v) => v.toFixed(4)).join(' '),
  '| portal:', JSON.stringify(diam1.portal), '→', JSON.stringify(sesudah3.portal)
);
cek(
  'dua-duanya membaca bab yang sama, jadi perbandingan di bawahnya tidak apel-vs-jeruk',
  `${diam1.babDari}→${sesudah3.babDari}`,
  '2→2'
);
kisar('skala kartu kembali persis seperti sebelum digulir', Math.abs(sesudah3.skala - diam1.skala), 0, 0.005);
kisar('posisi kartu kembali seperti sebelum digulir', Math.abs(sesudah3.x - diam1.x), 0, 0.01);
kisar('yaw kartu kembali seperti sebelum digulir', Math.abs(sesudah3.rotY - diam1.rotY), 0, 0.005);
kisar('pusat kartu mendarat di tempat yang sama terhadap kotak portalnya', selisihRel, 0, 0.002);

// ── 4 · wipe antar bab: satu sapuan pada bingkai portal, terbukti di layar ──
// Sapuan lahir dari bidang jarak yang sama dengan potongan portal, jadi yang diuji
// adalah: diam = terbuka penuh, berpindah = menutup lalu membuka lagi, dan keduanya
// sampai ke piksel. Gerbang uniform saja tidak cukup — shader yang gagal kompilasi
// melaporkan angka sempurna tanpa menggambar satu pixel pun.
const sapu = await lewatiBand(2);
const profil = sapu.profil;
const tengah = sapu.foto ? sapu.foto.wipeSebelum : 0;
console.log(
  'sapuan   puncak:', sapu.puncak.toFixed(3), '| parkir:', tengah.toFixed(3), '| sampel:', profil.length,
  '| langkah sampai mendarat:', sapu.susut,
  '| nilai:', profil.map((r) => r.wipe.toFixed(2)).join(' '),
  '\n         area  terbuka:', sapu.terbuka?.pecah.toFixed(3), 'tertutup:', sapu.foto?.pecah.toFixed(3),
  'mendarat:', sapu.mendarat?.pecah.toFixed(3),
  '\n         tekstur (simpangan luminansi) terbuka:', sapu.terbuka?.simpang.toFixed(1),
  'tertutup:', sapu.foto?.simpang.toFixed(1), 'mendarat:', sapu.mendarat?.simpang.toFixed(1),
  '| di layar:', [sapu.terbuka, sapu.foto, sapu.mendarat].map((r) => r?.diLayar?.toFixed(2)).join(' '),
  '| kotak foto:', JSON.stringify(sapu.foto?.portal), '→', JSON.stringify(sapu.foto?.portalSesudah)
);
// POTRET = bidangnya bertekstur, BIDANG DATAR = potret tidak ada di sana. Angkanya dari
// pengukuran yang sama tiga kali: potret terbuka simpangan 110 (rata-rata 120), sapuan
// penuh simpangan 9 (rata-rata 243), mendarat kembali 105. Ambang 40/25 memisahkan dua
// clustered itu dengan margin lebar, bukan memotong di tengah-tengah satu.
const POTRET_MIN = 40;
const DATAR_MAKS = 25;
cek(
  'kartu diam dalam sebuah bab tidak terpotong sapuan',
  sapu.awal.wipe <= 0.02 && sapu.terbuka.diLayar >= 0.5 && sapu.terbuka.simpang >= POTRET_MIN,
  true
);
cek('berpindah bab menghasilkan sapuan yang hampir menutup', sapu.puncak >= 0.9, true);
cek('sapuan tidak pernah melewati satu', profil.every((r) => r.wipe <= 1 + 1e-6), true);
cek('sapuan menutup lalu membuka lagi, satu punggungan', (() => {
  const w = profil.map((r) => r.wipe);
  const p = w.indexOf(Math.max(...w));
  const mulai = w.findIndex((v) => v >= 0.05);
  const selesai = w.slice(p).findIndex((v) => v <= 0.05);
  if (mulai < 0 || p <= mulai || selesai < 0) return false;
  const sisiNaik = w.slice(mulai, p + 1);
  const sisiTurun = w.slice(p, p + selesai + 1);
  return (
    sisiNaik.every((v, j) => j === 0 || v >= sisiNaik[j - 1] - 0.03) &&
    sisiTurun.every((v, j) => j === 0 || v <= sisiTurun[j - 1] + 0.03)
  );
})(), true);
cek(
  'potongan sapuan sampai ke layar, bukan hanya ke uniform',
  !!sapu.foto &&
    sapu.foto.wipeSebelum >= 0.6 &&
    sapu.foto.wipeSesudah >= 0.6 &&
    sapu.foto.portal.every((v, i) => Math.abs(v - sapu.foto.portalSesudah[i]) <= 1) &&
    sapu.foto.diLayar >= 0.5 &&
    sapu.foto.simpang <= DATAR_MAKS,
  true
);
cek(
  'setelah mendarat kartu terbuka kembali',
  sapu.akhir.wipe <= 0.02 && sapu.mendarat.diLayar >= 0.5 && sapu.mendarat.simpang >= POTRET_MIN,
  true
);
// Prasyarat gerbang di atas ikut ditagih, bukan diasumsikan: kalau pitanya belum selesai,
// angka 0,5 itu mengukur kartu yang masih terbang.
cek('pita selesai sebelum keadaan mendarat diukur', sapu.akhir?.babDari === 3, true);

// ── 5 · prefers-reduced-motion: kamera tidak boleh didolly, kartu tidak disapu ──
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
await diamkan(900);
const query = await page.evaluate(() =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches
);
cek('emulasi reduce-motion sampai ke dokumen', query, true);
const rekam5 = await rekamDolly(1, 10);
// Yang dibuktikan gerbang ini hanya "fov tidak bergeser": di bawah reduce-motion Lenis
// tidak berjalan, jadi velositas gulir memang nol dan cabang kurangiGerak pada dolly tidak
// pernah bisa terbedakan dari laju nol. Cabang itu diuji lewat sapuan di bawah, yang
// paksa satu render per langkah supaya keadaan yang dibaca benar-benar keadaan terbaru.
cek('reduce-motion: fov kamera tidak pernah bergeser selama gulir', rekam5.every((r) => r.dolly === 0), true);
const sapu5 = [];
let lewatTengah = 0;
for (let i = 0; i < 24; i++) {
  await page.mouse.wheel({ deltaY: 90 });
  // Di bawah reduce-motion halaman sengaja tidak menggambar saat menggulir (loop-nya
  // "demand" permanen dan pendengar aktivitas tidak dipasang), jadi tanpa satu pemicu
  // render gerbang ini hanya membaca keadaan basi dan akan selalu lulus. Resize adalah
  // pemicu yang tidak mengubah keadaan apa pun selain membuat registry mengukur lagi.
  await page.evaluate(() => window.dispatchEvent(new Event("resize")));
  await diamkan(350);
  const b = await baca();
  if (!b) break;
  sapu5.push(b);
  if (b.babDari !== b.babKe && b.t > 0.05 && b.t < 0.95) lewatTengah++;
}
console.log(
  'reduce-motion   sampel:', sapu5.length,
  '| bab yang lewat:', [...new Set(sapu5.map((r) => `${r.babDari}→${r.babKe}`))].join(' '),
  '| di tengah pita:', lewatTengah,
  '| wipe terbesar:', Math.max(0, ...sapu5.map((r) => r.wipe))
);
cek(
  'reduce-motion: kartu benar-benar terlihat berpindah bab saat diuji', lewatTengah >= 1, true
);
cek(
  'reduce-motion: berpindah bab tidak pernah menutup kartu',
  sapu5.length > 3 && sapu5.every((r) => r.wipe === 0),
  true
);
// Tipografi DOM ikut dikunci. Yang diuji di sini adalah keadaan TERAKHIR yang bisa
// terjadi: effect tulis-nol sudah menulis 0px saat preferensi berubah, lalu satu render
// dipaksa dengan pointer tertahan di tepi kanan — kalau loop masih menggeser huruf pada
// frame berikutnya, gerbang ini melihatnya.
await page.mouse.move(1424, 300);
await page.evaluate(() => window.dispatchEvent(new Event('resize')));
await diamkan(500);
await page.evaluate(() => window.dispatchEvent(new Event('resize')));
await diamkan(400);
const terkunci = await baca();
console.log(
  'reduce-motion tipografi   simpul:', terkunci?.tipografi.length,
  '|', (terkunci?.tipografi ?? []).map((t) => `${t.teks}=${t.x},${t.y}`).join(' ')
);
cek(
  'reduce-motion: sapuan pointer tidak menggeser satu pixel huruf pun',
  !!terkunci &&
    terkunci.tipografi.length > 0 &&
    terkunci.tipografi.every((t) => t.x === '0px' && t.y === '0px'),
  true
);

await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
await diamkan(900);

// ── 6 · huruf DOM dan kartu potret duduk di ruang yang sama ──
// Ide 12 tidak bisa dibuktikan dengan "angkanya sama di kode". Yang diukur di sini geseran
// huruf dalam pixel di layar lalu dibandingkan ke geseran kartunya pada bab yang sama:
// selisih keduanya harus tepat sebesar faktor proyeksi (camZ − z) / (camZ − z − d), dihitung
// verifier dari kamera dan ukuran kanvas sendiri. Kalau suatu saat tipografi diberi konstanta
// gesernya sendiri lagi, rasioninya menyimpang dan gerbang ini jatuh.
// Toleransi 5% bukan kelonggaran: huruf ditulis dari angka frame ini, kartu adalah hasil
// pegas yang masih tertinggal di belakang targetnya sendiri, jadi yang dibandingkan dua
// pembacaan yang memang tidak pernah identik. Nisbah antarkedalaman (0.02) bebas dari
// efek itu karena kedua huruf dibaca pada frame yang sama.
for (const n of [1, 2, 4]) {
  // Parkir dulu, baru parkir pointer. `parkirTipografi` menunggu kartu DAN huruf berhenti
  // berubah, tapi ia tidak tahu bab mana yang sedang dituju: klik bab melepas glide Lenis
  // yang masih berjalan, dan pada dokumen yang lebih tinggi (celah judul bab 02/03 dilebarkan)
  // pembacaan "kiri" sempat diambil di tengah penerbangan itu — Δkartu membengkak 4×
  // (terukur 119,59px vs 30,42px yang sebenarnya) sementara Δhuruf benar, jadi rasio
  // proyeksinya jatuh ke 0,18. Dua gerbang yang sama sekali tidak menyentuh tipografi.
  await pilihBab(n);
  await tungguSikap();
  const kiri = await parkirTipografi(16, 450);
  const kanan = await parkirTipografi(1424, 450);
  const tengah = await parkirTipografi(720, 450);
  const { kePx, camZ, dpp } = kalibrasi(kanan);
  const kartuPx = (kanan.x - kiri.x) * kePx(kanan.z);
  const bergerak = kiri.tipografi
    .map((t, j) => ({
      d: t.d,
      teks: t.teks,
      geser: px(kanan.tipografi[j]?.x ?? 'NaN') - px(t.x),
    }))
    .filter((t) => Number.isFinite(t.geser) && Math.abs(t.geser) > 4);
  console.log(
    `── tipografi bab 0${n} ── z=${kanan.z.toFixed(3)} camZ=${camZ} dpp=${dpp.toFixed(6)}`,
    `| kartu ${kartuPx.toFixed(2)}px | overflow ${kiri.overflow}/${kanan.overflow}`,
    '|', bergerak.map((t) => `${t.teks}(d=${t.d}) ${t.geser.toFixed(2)}px`).join(' ')
  );
  cek(
    `bab 0${n}: semua judul mendeklarasikan kedalamannya dan tertulis di DOM`,
    kiri.tipografi.length >= 3 &&
      kiri.tipografi.every((t) => Number.isFinite(t.d) && t.x !== '' && t.y !== ''),
    true
  );
  cek(
    `bab 0${n}: pointer di tengah, tidak ada sisa geser huruf`,
    tengah.tipografi.length > 0 && tengah.tipografi.every((t) => t.x === '0px' && t.y === '0px'),
    true
  );
  cek(
    `bab 0${n}: geser huruf tidak pernah melebarkan halaman`,
    kiri.overflow === 0 && kanan.overflow === 0,
    true
  );
  for (const t of bergerak) {
    kisar(
      `bab 0${n}: geser "${t.teks}" mengikuti proyeksi kartunya (d=${t.d})`,
      t.geser / kartuPx,
      (camZ - kanan.z) / (camZ - kanan.z - t.d),
      0.05
    );
  }
  const dua = bergerak.length >= 2;
  const dekat = dua ? bergerak.reduce((a, b) => (a.d > b.d ? a : b)) : null;
  const jauh = dua ? bergerak.reduce((a, b) => (a.d < b.d ? a : b)) : null;
  cek(
    `bab 0${n}: ada dua kedalaman berbeda untuk dibandingkan`,
    dua && jauh.d !== dekat.d,
    true
  );
  if (dua && jauh.d !== dekat.d)
    kisar(
      `bab 0${n}: yang lebih jauh bergeser lebih kecil, tepat sebanding proyeksinya`,
      jauh.geser / dekat.geser,
      (camZ - kanan.z - dekat.d) / (camZ - kanan.z - jauh.d),
      0.02
    );
}

// Sumbu y punya tanda sendiri di dunia (ke atas) dan di layar (ke bawah). Kalau salah
// satu dibalik, huruf justru melawan kartu saat pointer naik-turun.
const atas = await parkirTipografi(720, 60);
const bawah = await parkirTipografi(720, 840);
const kalTu = kalibrasi(bawah);
const kartuPy = -(bawah.y - atas.y) * kalTu.kePx(bawah.z);
const judul = atas.tipografi[0];
const geserY = px(bawah.tipografi[0]?.y ?? 'NaN') - px(judul?.y ?? 'NaN');
console.log(`── tipografi vertikal ── kartu ${kartuPy.toFixed(2)}px | huruf ${geserY.toFixed(2)}px`);
cek(
  'pointer naik-turun: huruf bergerak searah kartu',
  Number.isFinite(geserY) && Math.sign(geserY) === Math.sign(kartuPy) && Math.abs(geserY) > 4,
  true
);
if (Number.isFinite(geserY) && Math.abs(kartuPy) > 4)
  kisar(
    'pointer naik-turun: geser vertikal huruf mengikuti proyeksinya',
    geserY / kartuPy,
    (kalTu.camZ - bawah.z) / (kalTu.camZ - bawah.z - judul.d),
    0.05
  );

// ── 7 · halaman masih bisa dinavigasi setelah semua ini ──
const bab = await page.evaluate(() => {
  const el = document.querySelector('[data-bab="4"]') || document.querySelector('#chapter-04');
  return !!el;
});
cek('bab 04 masih ada di DOM (navigasi tidak dirusak)', bab, true);

await page.screenshot({ path: `${OUT}/01-setelah-dolly.png` });
console.log('foto di', OUT);

const gagal = hasil.filter((h) => !h.ok);
for (const h of hasil) console.log(`${h.ok ? 'LULUS' : 'GAGAL '} ${h.nama}: dapat ${h.dapat}, harus ${h.harus}`);
console.log(`${hasil.length - gagal.length}/${hasil.length} gerbang lulus — foto di ${OUT}`);
await browser.close();
process.exit(gagal.length ? 1 : 0);
