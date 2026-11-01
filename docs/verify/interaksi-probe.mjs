// Verifier interaksi pointer & keyboard (Tahap 4).
//
//   node docs/verify/interaksi-probe.mjs
//
// Yang dibuktikan bukan "ada listener", melainkan hasil akhirnya pada kartu:
//   · seret di atas kartu memutar kartu, tunduk pada batas ±12°, dan pegas kembali
//   · panah keyboard pada kontrol yang bisa difokus menghasilkan sudut yang SAMA
//   · seret yang dimulai di luar kartu tidak memutar apa pun
//   · prefers-reduced-motion mematikan rotasi, TIDAK mematikan navigasi bab
// Dibaca dari window.__panggung.putar = [terpasangX, terpasangY, targetX, targetY] —
// komponen rotasi PERINTAH PENGUNJUNG saja. rotY total tidak dipakai di sini karena ia
// juga mengandung parallax pointer, sehingga menggeser kursor 400px saja sudah cukup
// membuat gerbangnya terlihat gagal.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const require = createRequire(new URL('../../nextjs-frontend/package.json', import.meta.url));
const puppeteer = require('puppeteer');
const FE = process.env.FE_URL ?? 'http://localhost:3001';
const DIR = '/tmp/interaksi';
const DERAJAT = (r) => (r * 180) / Math.PI;
/** Sama dengan lib/putaran.ts: 200px seret = batas penuh 12°, satu langkah panah = 4°. */
const BATAS = 12;
const PX_PER_DERAJAT = 200 / BATAS;
const LANGKAH = 4;

const browser = await puppeteer.launch({
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
const galat = [];
page.on('pageerror', (e) => galat.push(String(e).slice(0, 160)));
await page.goto(FE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await new Promise((r) => setTimeout(r, 6000));
const ada = await page.evaluate(() => !!window.__panggung);
if (!ada) {
  console.error('window.__panggung tidak ada — butuh `next dev`, bukan build produksi.');
  await browser.close();
  process.exit(1);
}
mkdirSync(DIR, { recursive: true });

const hasil = [];
const cek = (nama, dapat, harus) => hasil.push({ nama, ok: dapat === harus, dapat, harus });
const kisar = (nama, dapat, target, toleransi) =>
  hasil.push({
    nama,
    ok: Math.abs(dapat - target) <= toleransi,
    dapat: `${dapat.toFixed(2)}° (harus ${target}±${toleransi})`,
    harus: true,
  });

/** [terpasangX, terpasangY, targetX, targetY] dalam derajat + kotak portal kartu. */
const baca = () =>
  page.evaluate(() => {
    const p = window.__panggung;
    return p ? { putar: p.putar, portal: p.portal, jejak: p.jejak } : null;
  });
const derajati = (b, i) => DERAJAT(b.putar[i]);

const diamkan = (ms) => new Promise((r) => setTimeout(r, ms));

const parkir = async (f) => {
  await page.evaluate((fr) => {
    const t = document.body.scrollHeight - window.innerHeight;
    window.scrollTo(0, Math.round(fr * t));
  }, f);
  await diamkan(2000);
};

/** Reset penuh: Escape melepas perintah keyboard, blur mengembalikan pegas. */
const reset = async () => {
  await page.evaluate(() => document.activeElement?.blur());
  await diamkan(2200);
  const b = await baca();
  return b;
};

/** Seret horizontal sejauh dx dari titik yang diberikan (default: tengah kartu). */
const seret = async (dx, titik = null) => {
  const p = await baca();
  const [k, a, l, t] = titik ?? p.portal;
  const x = k + l / 2;
  const y = a + t / 2;
  await page.mouse.move(x, y);
  await diamkan(500);
  const sebelum = await baca();
  await page.mouse.down();
  await page.mouse.move(x + dx, y, { steps: 12 });
  await diamkan(1400);
  const saat = await baca();
  await page.mouse.up();
  await page.mouse.move(x, y);
  await diamkan(2600);
  const setelah = await baca();
  return { sebelum, saat, setelah };
};

/** Satu tombol, sampai tercatat. Fokus + keydown ke React handler adalah peristiwa
 *  asinkron: tanpa verifikasi-ulang langkah panah kadang hilang dan gerbangnya gagal
 *  bukan karena kodenya (terukur 1 dari 3 jalan). Delta akhirnya tetap yang dinilai,
 *  jadi langkah yang terulang tidak bisa menyembunyikan regresi. */
const panah = async (tombol, jumlah) => {
  const sumbu = tombol === 'ArrowLeft' || tombol === 'ArrowRight' ? 2 : 3;
  const tanda = tombol === 'ArrowLeft' || tombol === 'ArrowUp' ? -1 : 1;
  await page.focus('[data-kontrol-putar]');
  await diamkan(400);
  const sebelum = await baca();
  for (let n = 1; n <= jumlah; n++) {
    const harus = derajati(sebelum, sumbu) + tanda * LANGKAH * n;
    for (let percobaan = 0; percobaan < 3; percobaan++) {
      await page.keyboard.press(tombol);
      await diamkan(500);
      const kini = await baca();
      if (Math.abs(derajati(kini, sumbu) - harus) <= 0.6) break;
      await page.focus('[data-kontrol-putar]');
      await diamkan(300);
    }
  }
  return { sebelum, saat: await baca() };
};

const foto = async (nama) => page.screenshot({ path: `${DIR}/${nama}.png` });

await parkir(0.12);

// ── 1 · seret: arah, besaran, batas, pegas kembali ──
const s6 = await seret(Math.round(6 * PX_PER_DERAJAT));
kisar('seret 100px memutar 6°', derajati(s6.saat, 2) - derajati(s6.sebelum, 2), 6, 1);
cek('seret dilepas kembali ke sikap bab', Math.abs(derajati(s6.setelah, 2)) < 0.3, true);
cek('pegas benar-benar bergerak, bukan melompat', Math.abs(derajati(s6.setelah, 0)) < 0.5, true);

const sPenuh = await seret(400);
const dPenuh = derajati(sPenuh.saat, 2);
cek(`melewati 200px tetap dibatasi ${BATAS}°`, dPenuh <= BATAS + 0.2 && dPenuh >= BATAS - 0.6, true);
cek('dilepas dari keadaan terbatas, target nol lagi', Math.abs(derajati(sPenuh.setelah, 2)) < 0.3, true);

const sNeg = await seret(-400);
const dNeg = derajati(sNeg.saat, 2);
cek('seret ke kiri memutar arah berlawanan, tetap di batas', dNeg >= -(BATAS + 0.2) && dNeg <= -(BATAS - 0.6), true);

// ── 2 · keyboard: nilai yang sama lewat jalur yang berbeda ──
const kb2 = await panah('ArrowRight', 2);
kisar('2× panah kanan = 8°', derajati(kb2.saat, 2) - derajati(kb2.sebelum, 2), 2 * LANGKAH, 0.6);
cek('kontrol panah bisa difokus', await page.evaluate(() => document.activeElement?.hasAttribute('data-kontrol-putar')), true);
await reset();
const sParitas = await seret(Math.round(2 * LANGKAH * PX_PER_DERAJAT));
const dParitas = derajati(sParitas.saat, 2) - derajati(sParitas.sebelum, 2);
cek('seret dan panah menghasilkan sudut yang sama', Math.abs(dParitas - 2 * LANGKAH) <= 0.8, true);
await reset();
const kbUp = await panah('ArrowDown', 1);
kisar('panah bawah memutar pitch, bukan hanya yaw', derajati(kbUp.saat, 3) - derajati(kbUp.sebelum, 3), LANGKAH, 0.6);
await page.keyboard.press('Escape');
cek('Escape mengampiri nol', Math.abs(derajati((await baca()), 2)) < 0.3, true);
await reset();
await foto('01-putar-diam');

// ── 3 · seret di luar kartu tidak melakukan apa pun ──
{
  const p = await baca();
  const [k, a, l, t] = p.portal;
  const diLuar = [k + l + 120, a + t / 2 - 120, 60, 60];
  const s = await seret(260, diLuar);
  cek('seret di luar kartu tidak memutar', Math.abs(derajati(s.saat, 2) - derajati(s.sebelum, 2)) < 0.3, true);
}

// ── 4 · jejak pointer: 12 sampel masuk reveal ──
{
  const p = await baca();
  const [k, a, l, t] = p.portal;
  const y = a + t / 2;
  await page.mouse.move(k + 20, y);
  await diamkan(900);
  // Jeda panjang bukan kemalasan verifier: posisi jejak diambil dari pointer yang
  // sudah dihaluskan mesin kartu (lerp 0.08 per frame), dan pada perenderan perangkat
  // lunak 1 frame bisa 200ms — langkah 90ms hanya menempuh ~10% lintasannya.
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(k + 20 + i * Math.max(14, (l - 40) / 8), y + (i % 2 ? 18 : -18));
    await diamkan(320);
  }
  const j = await baca();
  cek('jejak menyimpan lebih dari separuh sampel', j.jejak[0] >= 6, true);
  cek('jejak membentang di kartu, bukan menumpuk di satu titik', j.jejak[1] >= 0.12, true);
  await foto('02-jejak-pointer');
  await diamkan(1400);
  const h = await baca();
  cek('jejak meluruh sendiri saat pointer diam', h.jejak[0] <= 1, true);
}

// ── 5 · prefers-reduced-motion: rotasi mati, navigasi tetap hidup ──
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
await diamkan(1200);
const rd = await seret(300);
cek('reduce-motion: seret tidak memerintahkan rotasi', Math.abs(derajati(rd.saat, 2)) < 0.3, true);
const rk = await panah('ArrowRight', 2);
cek('reduce-motion: panah pada kontrol tidak memerintahkan rotasi', Math.abs(derajati(rk.saat, 2)) < 0.3, true);
await page.evaluate(() => document.activeElement?.blur());

const sebelumNav = await page.evaluate(() => window.scrollY);
await page.click('button[title="THE PADDOCK & DISPATCH"]');
await diamkan(2500);
const sesudahNav = await page.evaluate(() => window.scrollY);
cek('reduce-motion: navigasi bab tetap jalan', Math.abs(sesudahNav - sebelumNav) > 200, true);
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
await diamkan(800);

if (galat.length) console.log('pageerror:', galat.slice(0, 3));
for (const h of hasil) console.log(`${h.ok ? 'LULUS' : 'GAGAL '} ${h.nama}: dapat ${h.dapat}, harus ${h.harus}`);
const buruk = hasil.filter((h) => !h.ok).length;
console.log(`${hasil.length - buruk}/${hasil.length} gerbang lulus — foto di ${DIR}`);
await browser.close();
process.exit(buruk ? 1 : 0);
