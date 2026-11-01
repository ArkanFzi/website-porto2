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
      wipe: p.wipe,
      babDari: p.babDari,
      babKe: p.babKe,
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

/** Bagian kotak portal yang benar-benar berisi kartu, diukur dari layar. Uniform boleh
 *  sempurna sementara shader tidak menggambar apa pun (pernah terjadi: nama konstanta
 *  TypeScript yang disisipkan apa adanya ke GLSL), jadi klaim tentang potongan wajib
 *  lewat piksel. Ambang 26/255 memisahkan kertas gelap dari potret; yang dibandingkan
 *  adalah LUAS relatif, bukan kecerahan, karena potret bergerak bersama kotaknya.
 *  Kotak dibaca sebelum DAN sesudah foto: tanpa itu yang diukur adalah kotak sekarang
 *  atas foto yang tadi, dan sapuan yang sedang lewat ketahuan sebagai bidang kecil
 *  yang sepenuhnya terang. */
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
      const w = Math.max(1, Math.min(Math.round(l), img.width - Math.round(k)));
      const h = Math.max(1, Math.min(Math.round(t), img.height - Math.round(a)));
      const d = ctx.getImageData(Math.round(k), Math.round(a), w, h).data;
      let terang = 0;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) {
        const v = (d[i] + d[i + 1] + d[i + 2]) / 3;
        n++;
        if (v > 26) terang++;
      }
      return { pecah: terang / n, piksel: n };
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

/** Berpindah bab sambil berhenti di tengahnya. Sapuan hanya fungsi dari posisi gulir,
 *  jadi halaman boleh DIPARKIR pada puncaknya dan difoto — kecepatan roda tidak akan
 *  pernah cukup lambat untuk menangkap satu frame di tengah sapuan. Langkah kecil,
 *  berhenti begitu sapuan menutup, lalu jalan lagi sampai ia membuka. */
const lewatiBand = async (n) => {
  await klikBab(n);
  const awal = await tungguSikap();
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
  const tenang = await tungguSikap();
  const foto = await areaKartu();
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
  const akhir = await tungguSikap();
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
  '| nilai:', profil.map((r) => r.wipe.toFixed(2)).join(' '),
  '\n         area  terbuka:', sapu.terbuka?.pecah.toFixed(3), 'tertutup:', sapu.foto?.pecah.toFixed(3),
  'mendarat:', sapu.mendarat?.pecah.toFixed(3),
  '| kotak foto:', JSON.stringify(sapu.foto?.portal), '→', JSON.stringify(sapu.foto?.portalSesudah)
);
cek('kartu diam dalam sebuah bab tidak terpotong sapuan', sapu.awal.wipe <= 0.02 && sapu.terbuka.pecah >= 0.5, true);
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
    sapu.foto.pecah <= 0.4 * sapu.terbuka.pecah,
  true
);
cek('setelah mendarat kartu terbuka kembali', sapu.akhir.wipe <= 0.02 && sapu.mendarat.pecah >= 0.5, true);

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
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
await diamkan(900);

// ── 6 · halaman masih bisa dinavigasi setelah semua ini ──
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
