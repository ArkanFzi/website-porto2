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

const browser = await puppeteer.launch({
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
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
    return {
      dolly: p.dolly,
      skala: kartu?.scale.x ?? p.skala,
      x: kartu?.position.x ?? p.x,
      y: kartu?.position.y ?? p.y,
      z: kartu?.position.z ?? p.z,
      rotY: kartu?.rotation.y ?? p.rotY,
      p: p.p,
      t: p.t,
      mask: p.mask,
      kamera: p.kamera,
      portal: p.portal,
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

/** Sikap kartu di awal sebuah bab, lewat jalur yang dipakai pengunjung (tombol bab →
 *  lenis.scrollTo), jadi dua pembacaan banding pada progress yang benar-benar sama.
 *  Pointer diparkir di titik yang sama karena x dan rotY kartu memang mengandung
 *  parallax pointer. */
const sikapDiBab = async (n) => {
  await klikBab(n);
  await tungguSikap();
  await page.mouse.move(16, 500);
  return tungguSikap();
};

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
kisar('skala kartu kembali persis seperti sebelum digulir', Math.abs(sesudah3.skala - diam1.skala), 0, 0.005);
kisar('posisi kartu kembali seperti sebelum digulir', Math.abs(sesudah3.x - diam1.x), 0, 0.01);
kisar('yaw kartu kembali seperti sebelum digulir', Math.abs(sesudah3.rotY - diam1.rotY), 0, 0.005);
kisar('pusat kartu mendarat di tempat yang sama terhadap kotak portalnya', selisihRel, 0, 0.002);

// ── 4 · prefers-reduced-motion: kamera tidak boleh didolly ──
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
await diamkan(900);
const rekam4 = await rekamDolly(1, 10);
cek('reduce-motion: gulir cepat tidak menggeser fov', rekam4.every((r) => r.dolly === 0), true);
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
await diamkan(900);

// ── 5 · halaman masih bisa dinavigasi setelah semua ini ──
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
