// Verifier interaksi pointer & keyboard (Tahap 4).
//
//   node docs/verify/interaksi-probe.mjs
//
// Yang dibuktikan bukan "ada listener", melainkan hasil akhirnya pada kartu:
//   · seret di atas kartu memutar kartu, tunduk pada batas ±12°, dan pegas kembali
//   · panah keyboard pada kontrol yang bisa difokus menghasilkan sudut yang SAMA
//   · seret yang dimulai di luar kartu tidak memutar apa pun
//   · ganti MODE ENGINEER/CREATOR = satu putaran penuh yang menanggung silang wajah
//   · reticle focus-lock: cahaya DITAHAN di titik kartu tempat pengunjung mengambilnya,
//     baik saat kartu diputar maupun saat pointer pindah jauh — dan fokus keyboard
//     melakukan persis hal yang sama
//   · prefers-reduced-motion mematikan rotasi, TIDAK mematikan navigasi bab, fokus,
//     maupun pergantian wajah
//   · klik SPEC membuka strip data DI KOLOM BACA (bukan lapisan dialog) dengan melebarkan
//     mask portal: satu variabel CSS menggerakkan tepi kiri mask dan lebar kolom, jadi
//     kartu membesar tanpa pernah menutupi teks, dan Escape mengembalikan geometri itu
// Rotasi dibaca dari window.__panggung.putar = [terpasangX, terpasangY, targetX,
// targetY] — komponen rotasi PERINTAH PENGUNJUNG saja. rotY total tidak dipakai untuk
// gerbang sudut karena ia juga mengandung parallax pointer, sehingga menggeser kursor
// 400px saja sudah cukup membuat gerbangnya terlihat gagal; rotY total hanya dipakai
// untuk sapuan flip MODE, di mana parallax jauh lebih kecil dari 360°.

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
// Bacaan apa pun di bawah bergantung pada frame pertama kanvas, dan frame pertama bukan
// kepastian waktu: dengan dua kanvas di perenderan perangkat lunak __panggung baru muncul
// sekitar 6 detik (terukur frame 9 tepat pada 6.000ms), jadi jeda tetap pernah gagal
// persis di ambangnya. Ditunggu sampai ada, maksimal 20 detik.
let ada = false;
for (let i = 0; i < 40; i++) {
  await new Promise((r) => setTimeout(r, 500));
  ada = await page.evaluate(() => !!window.__panggung);
  if (ada) break;
}
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

/** Rotasi perintah pengunjung, kotak portal kartu, jejak, reticle, dan keadaan gulir. */
const baca = () =>
  page.evaluate(() => {
    const p = window.__panggung;
    return p
      ? {
          putar: p.putar,
          portal: p.portal,
          jejak: p.jejak,
          kursor: p.kursor,
          p: p.p,
          t: p.t,
          wipe: p.wipe,
          babDari: p.babDari,
          babKe: p.babKe,
          skala: p.skala,
          // Nomor frame akar kanvas: tanpa ini "cahaya tidak bergerak" tidak bisa
          // dibedakan dari "loop demand sedang tertidur".
          frame: window.__render?.frame ?? -1,
        }
      : null;
  });
const derajati = (b, i) => DERAJAT(b.putar[i]);

/** Reticle: [u, v, dipegang (0|1), reveal]. u,v = titik cahaya pada UV kartu, jadi
 *  "terkunci" dibuktikan dari nilainya yang TETAP sementara pointer berpindah jauh. */
const bacaReticle = async () => {
  const b = await baca();
  return b
    ? { uv: [b.kursor[0], b.kursor[1]], dipegang: b.kursor[2], reveal: b.kursor[3], frame: b.frame }
    : null;
};
const jarakUV = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Cahaya datang dari pointer yang DIHALUSKAN mesin (lerp 0,08 per frame), jadi membaca
 *  reticle segera sesudah memindahkan pointer menangkap nilainya di tengah jalan.
 *  Ditunggu sampai berhenti bergerak — kalau tidak, "titik tempat pengunjung menekan"
 *  yang dikunci di bawah bukan titik yang sebenarnya, dan jarak pelepasan ikut salah.
 *
 *  "Berhenti bergerak" harus dibaca bersama nomor frame. Pada perenderan perangkat lunak
 *  satu poll 220ms bisa memuat NOL frame (deret ΔUV terukur: 0,082 0,144 0,063 0,205 …
 *  0,0018 0,000), dan dua bacaan yang identik karena loop-nya tertidur tidak bisa
 *  dibedakan dari cahaya yang benar-benar tenang — cahaya yang tenang adalah dua poll
 *  berturut-turut tanpa gerak SAMBIL frame tetap naik. Tanpa syarat itu fungsi ini pernah
 *  pulang di tengah lerp (±0,1 UV dari titik akhirnya) dan gerbang focus-lock menuduh
 *  produk menggeser cahaya, padahal yang belum sampai adalah titik acunya.
 *  Anggarannya 60 poll ≈ 13 detik: dari lompatan jauh, sisa lerp turun di bawah 0,002
 *  per frame setelah ±17 poll pada ±11fps. */
const tungguReticle = async () => {
  let tadi = await bacaReticle();
  let tenang = 0;
  for (let i = 0; i < 60; i++) {
    await diamkan(220);
    const kini = await bacaReticle();
    const adaFrame = kini.frame > tadi.frame;
    tenang = adaFrame && jarakUV(tadi.uv, kini.uv) < 0.002 ? tenang + 1 : 0;
    tadi = kini;
    if (tenang >= 2) return kini;
  }
  return tadi;
};

/** MODE dibaca dari rotY/balik/persona; flip hanya boleh terjadi di sana. */
const bacaMode = () =>
  page.evaluate(() => {
    const p = window.__panggung;
    return p ? { rotY: p.rotY, balik: p.balik, persona: p.persona } : null;
  });

/** Klik tombol MODE lewat pointer nyata. page.evaluate(el.click()) tidak menghasilkan
 *  pointerdown, dan kanvas hanya bangun dari loop "demand" karena peristiwa itu —
 *  flip-nya tidak akan pernah dimulai. */
const klikMode = async (label) => {
  const titik = await page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find((x) => (x.textContent ?? '').trim() === t);
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, label);
  if (!titik) throw new Error(`tombol MODE "${label}" tidak ditemukan`);
  // Loop "demand" dibangunkan TERLEBIH DAHULU, baru klik. Kalau tidak, frame pertama
  // sesudah klik adalah frame bangun itu sendiri — delta-nya sepanjang waktu sejak render
  // terakhir, dan satu frame seperti itu bisa memakan separuh pertama putaran. Gerbang
  // jendela wajah di bawah lalu melaporkan kodenya yang salah padahal yang terjadi mesin
  // yang sedang tidur. Pengunjung nyata juga menggerakkan pointer sebelum menekan tombol.
  await page.mouse.move(titik.x, titik.y);
  await diamkan(500);
  const sebelum = await bacaMode();
  await page.mouse.click(titik.x, titik.y);
  const rekam = [];
  // Sampai tuntas, bukan sejumlah. Putaran kartu adalah pegas per-frame dan SwiftShader di
  // bawah beban pernah menyelesaikannya lewat jendela 30 × 90 ms: rekamannya kehabisan waktu
  // sebelum wajah sempat berpindah, dan gerbang "wajah berganti ketika kartu masih berputar"
  // melapor merah karena alat ukurnya habis, bukan karena panggungnya salah.
  let landai = 0;
  for (let i = 0; i < 120 && landai < 4; i++) {
    await diamkan(90);
    const b = await bacaMode();
    rekam.push(b);
    const dahulu = rekam[rekam.length - 2];
    const tenang =
      !!dahulu &&
      b.balik <= 0.001 &&
      Math.abs(b.balik - dahulu.balik) < 1e-4 &&
      Math.abs(b.persona - dahulu.persona) < 1e-4 &&
      Math.abs(DERAJAT(b.rotY - dahulu.rotY)) < 0.05;
    landai = tenang ? landai + 1 : 0;
  }
  return { sebelum, rekam };
};

/** Sapuan terbesar rotY selama flip, derajat. Putarannya 360° dan berakhir di sikap
 *  awal, jadi selisih mentah ke target tetap nol; yang diukur di sini puncaknya. */
const sapuan = (sebelum, rekam) =>
  Math.max(...rekam.map((r) => Math.abs(DERAJAT(r.rotY - sebelum.rotY))));

/** Silang wajah dilicinkan per frame, bukan per detik: pada perenderan perangkat lunak
 *  satu frame bisa 200ms, jadi pengendapan ditunggu sampai benar-benar sampai, tidak
 *  diasumsikan selesai dalam waktu tertentu. */
const tungguPersona = async (target) => {
  let k = await bacaMode();
  for (let i = 0; i < 50; i++) {
    if (Math.abs(k.persona - target) < 0.02) break;
    await diamkan(200);
    k = await bacaMode();
  }
  // Sisa flip dibulatkan 4 desimal di bacaan, jadi "balik = 0" masih bisa berarti 4e-5 —
  // dan pada sekecil itu putarannya masih penuh 360°. Yang ditunggu karena itu sampai
  // rotY berhenti bergerak, bukan sampai bilangan pembulatnya nol.
  for (let i = 0; i < 40; i++) {
    const tadi = k;
    await diamkan(250);
    k = await bacaMode();
    if (Math.abs(DERAJAT(k.rotY - tadi.rotY)) < 0.05) break;
  }
  return k;
};


const diamkan = (ms) => new Promise((r) => setTimeout(r, ms));

/** Mendarat di sebuah sikap bab dan TUNGGU sampai benar-benar berhenti. Dua alasan:
 *  rasio gulir harus jatuh di dalam bab (t = 0, kartu duduk di portalnya sendiri, tanpa
 *  kemiringan tengah-pita) karena gerbang di bawah menguji seret/reticle pada kartu yang
 *  diam, bukan yang sedang berpindah; dan pegas sikap butuh puluhan frame untuk menutup
 *  sisanya, jadi jeda tetap 2 detik pernah mengukur kartu yang masih dalam perjalanan. */
const parkir = async (f) => {
  await page.evaluate((fr) => {
    const t = document.body.scrollHeight - window.innerHeight;
    window.scrollTo(0, Math.round(fr * t));
  }, f);
  let terakhir = null;
  let sama = 0;
  for (let i = 0; i < 60; i++) {
    await diamkan(200);
    const b = await baca();
    if (!b) continue;
    const tenang = terakhir !== null && b.portal.every((v, j) => Math.abs(v - terakhir[j]) < 0.01);
    sama = tenang ? sama + 1 : 0;
    terakhir = b.portal;
    if (sama >= 4) return b;
  }
  return await baca();
};

/** Sama seperti parkir tapi TANPA menggulir: dipakai untuk menunggu kotak portal berhenti
 *  bergerak setelah DOM-nya yang berubah (mis. kelas portal diganti saat strip terbuka). */
const tenang = async () => {
  let tadi = null;
  let sama = 0;
  for (let i = 0; i < 40; i++) {
    await diamkan(200);
    const b = await baca();
    if (!b) continue;
    sama = tadi && b.portal.every((v, j) => Math.abs(v - tadi[j]) < 0.01) ? sama + 1 : 0;
    tadi = b.portal;
    if (sama >= 3) return b;
  }
  return await baca();
};

/** Reset penuh: Escape melepas perintah keyboard, blur mengembalikan pegas. */
const reset = async () => {  await page.evaluate(() => document.activeElement?.blur());
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

await parkir(0.3);

// ── 0 · kartu tergambar sebagai piksel, bukan hanya sebagai uniform ──
// Semua gerbang di bawah membaca nilai uniform dan sudut. Program GLSL yang gagal
// kompilasi meninggalkan keduanya sempurna sambil tidak menggambar satu piksel pun —
// pernah terjadi nyata lewat `uniform vec3 uJejak[JUMLAH_JEJAK];`, nama konstanta
// TypeScript yang tidak dikenal GLSL. Jadi adu dulu screenshot dengan warna kertas.
{
  const sebelum = await baca();
  const [k, a, l, t] = sebelum.portal;
  const gamba = await page.screenshot({ encoding: 'base64' });
  const sesudah = await baca();
  const piksel = await page.evaluate(
    async ({ gamba, k, a, l, t }) => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + gamba;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      // Strip di dalam portal dan di atas tipografi DOM: 35–65% lebar, 10–22% tinggi.
      const d = ctx
        .getImageData(Math.round(k + l * 0.35), Math.round(a + t * 0.1), Math.max(4, Math.round(l * 0.3)), Math.max(4, Math.round(t * 0.12)))
        .data;
      let total = 0;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) {
        total += (d[i] + d[i + 1] + d[i + 2]) / 3;
        n++;
      }
      return { rata: total / n, piksel: n };
    },
    { gamba, k, a, l, t }
  );
  console.log(
    'piksel   ',
    JSON.stringify({
      ...piksel,
      rata: +piksel.rata.toFixed(1),
      portal: [k, a, l, t],
      gulir: [sebelum.p, sebelum.t, sebelum.wipe, sesudah.wipe],
    })
  );
  // Gerbangnya ikut terikat pada keadaan yang diukur: kartu hanya boleh diadukan ke
  // warna kertas kalau ia memang sedang terbuka (wipe nol di kedua sisi foto), kalau tidak
  // yang lulus atau gagal adalah sapuan, bukan shader.
  cek(
    'kartu tergambar di layar, bukan hanya di uniform',
    piksel.rata <= 200 && sebelum.wipe === 0 && sesudah.wipe === 0,
    true
  );
}

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

// ── 4 · reticle focus-lock: cahaya ditahan, kartu boleh berputar ──
{
  const p = await baca();
  const [k, a, l, t] = p.portal;
  const x = k + l / 2;
  const y = a + t / 2;
  await page.mouse.move(x - 60, y);
  const hover = await tungguReticle();

  cek('hover tanpa dipegang: reticle tidak terkunci', hover.dipegang === 0, true);

  await page.mouse.down();
  await page.mouse.move(x + 100, y, { steps: 10 });
  await diamkan(1300);
  const pegang = await bacaReticle();
  const saat = await baca();
  cek('seret: reticle terkunci', pegang.dipegang === 1, true);
  hasil.push({
    nama: 'seret: cahaya tinggal padahal pointer pindah 160px',
    ok: jarakUV(hover.uv, pegang.uv) < 0.06,
    dapat: `${jarakUV(hover.uv, pegang.uv).toFixed(3)} UV (harus <0,06)`,
    harus: true,
  });
  // Pengikatnya: cahaya menahan diri TEPAT pada saat kartu berputar. Tanpa gerbang ini,
  // reticle yang diam karena pointer macet juga akan lulus.
  cek('seret: kartu benar-benar berputar saat cahaya ditahan', Math.abs(derajati(saat, 2)) > 4, true);

  await page.mouse.up();
  const lepas = await tungguReticle();

  cek('lepas: reticle kembali melayani pointer', lepas.dipegang === 0, true);
  hasil.push({
    nama: 'lepas: cahaya pulang ke bawah pointer',
    ok: jarakUV(pegang.uv, lepas.uv) > 0.15,
    dapat: `${jarakUV(pegang.uv, lepas.uv).toFixed(3)} UV (harus >0,15)`,
    harus: true,
  });

  // Padanan keyboard: TAB ke kontrol yang sama, tanpa menyentuh kartu sama sekali.
  await page.focus('[data-kontrol-putar]');
  await diamkan(1300);
  const kb = await bacaReticle();
  cek('keyboard: fokus kontrol mengunci reticle', kb.dipegang === 1, true);
  cek('keyboard: reticle terkunci menyala seperti hover pointer', kb.reveal > 0.9, true);
  hasil.push({
    nama: 'paritas: kunci keyboard menahan titik yang sama dengan kunci pointer',
    ok: jarakUV(kb.uv, lepas.uv) < 0.06,
    dapat: `${jarakUV(kb.uv, lepas.uv).toFixed(3)} UV (harus <0,06)`,
    harus: true,
  });
  await page.evaluate(() => document.activeElement?.blur());
  await diamkan(700);
  cek('blur: reticle lepas lagi', (await bacaReticle()).dipegang === 0, true);
  await foto('03-reticle-terkunci');
}

// ── 5 · jejak pointer: 12 sampel masuk reveal ──
{
  const p = await baca();
  const [k, a, l, t] = p.portal;
  const y = a + t / 2;
  await page.mouse.move(k + 20, y);
  await diamkan(900);
  // Sampel baru hanya ditulis saat titik cahaya berpindah >0,01 UV, dan perpindahan itu
  // sendiri dihaluskan per frame — jadi berapa sampel yang "masih hidup" pada satu bacaan
  // berjarak tetap adalah soal irama mesin (terukur 0..9 antar langkah yang identik).
  // Yang dijanjikan kode adalah pitanya BISA terisi dan MATI sendiri, jadi yang diukur
  // puncaknya selama sapuan dan keadaannya setelah sapuan, bukan satu sampel waktu.
  let puncakHidup = 0;
  let puncakRentang = 0;
  for (let i = 1; i <= 24; i++) {
    await page.mouse.move(k + 20 + (i / 24) * (l - 40), y + (i % 2 ? 14 : -14));
    await diamkan(45);
    const j = (await baca()).jejak;
    if (j[0] > puncakHidup) puncakHidup = j[0];
    if (j[1] > puncakRentang) puncakRentang = j[1];
  }
  cek('jejak menyimpan lebih dari separuh sampel selama dilukis', puncakHidup >= 6, true);
  hasil.push({
    nama: 'jejak membentang di kartu, bukan menumpuk di satu titik',
    ok: puncakRentang >= 0.12,
    dapat: `${puncakRentang.toFixed(3)} UV (harus ≥0,12)`,
    harus: true,
  });
  await foto('02-jejak-pointer');
  // Padam sendiri: konvergensi pointer halus bisa memakan beberapa detik pada mesin lambat,
  // jadi ditunggu sampai pita benar-benar mati dengan batas 10 detik — mentok di batas itu
  // tetap terbaca sebagai GAGAL, bukan sebagai lulus.
  let hidup = (await baca()).jejak[0];
  for (let i = 0; i < 50 && hidup > 1; i++) {
    await diamkan(200);
    hidup = (await baca()).jejak[0];
  }
  cek('jejak meluruh sendiri saat pointer diam', hidup <= 1, true);
}

// ── 6 · prefers-reduced-motion: rotasi mati, navigasi tetap hidup ──
// Reticle TIDAK ikut digate di sini: pada reduce-motion cahaya pointer memang dimatikan
// oleh shader (lihat chiaroscuroMaterial) dan kanvas tidak memasang listener aktivitas,
// jadi "fokus mengunci reticle" bukan keadaan yang bisa tampil. Yang diuji: rotasi mati,
// keadaan kartu (wajah MODE) tetap berubah.

await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
await diamkan(1200);
const rd = await seret(300);
cek('reduce-motion: seret tidak memerintahkan rotasi', Math.abs(derajati(rd.saat, 2)) < 0.3, true);
cek('reduce-motion: tanpa rotasi, reticle tidak punya alasan untuk dikunci', rd.saat.kursor[2] === 0, true);
const rk = await panah('ArrowRight', 2);
cek('reduce-motion: panah pada kontrol tidak memerintahkan rotasi', Math.abs(derajati(rk.saat, 2)) < 0.3, true);
await page.evaluate(() => document.activeElement?.blur());
await diamkan(600);

// MODE di bawah reduce-motion: wajah tetap berganti, kartu tidak berputar.
const rmMode = await klikMode('THE CREATOR');
const rmSap = sapuan(rmMode.sebelum, rmMode.rekam);
hasil.push({
  nama: 'reduce-motion: ganti MODE tidak memutar kartu',
  ok: rmSap < 3,
  dapat: `${rmSap.toFixed(1)}° (harus <3)`,
  harus: true,
});
const rmPersona = await tungguPersona(1);
cek('reduce-motion: wajah tetap berganti tanpa putaran', Math.abs(rmPersona.persona - 1) < 0.05, true);

const sebelumNav = await page.evaluate(() => window.scrollY);
await page.click('button[title="THE PADDOCK & DISPATCH"]');
await diamkan(2500);
const sesudahNav = await page.evaluate(() => window.scrollY);
cek('reduce-motion: navigasi bab tetap jalan', Math.abs(sesudahNav - sebelumNav) > 200, true);
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
await diamkan(800);

// ── 7 · MODE ENGINEER/CREATOR: satu putaran penuh menanggung silang wajah ──
{
  const flip = await klikMode('THE ENGINEER');
  const sap = sapuan(flip.sebelum, flip.rekam);
  console.log(
    'flip ENGINEER   sebelum persona:', flip.sebelum.persona.toFixed(4),
    '| balik:', flip.rekam.map((r) => r.balik.toFixed(3)).join(' '),
    '| persona:', flip.rekam.map((r) => r.persona.toFixed(3)).join(' ')
  );
  // Batas bawah 150°, bukan 350°: flip berlangsung 0,8 detik dan pada perenderan
  // perangkat lunak hanya ~2-3 frame yang sempat merendernya (terukur 168,7°), jadi
  // menuntut sampel menyentuh plateau 360° akan menguji framerate, bukan kodenya. Yang
  // dibuktikan di bawah: kartu benar-benar lewat dari sikap miringnya (tidak mungkin
  // dihasilkan parallax pointer, yang mentok ±5,7°) — dan gerbang kepulangan di bawah
  // menuntut sisanya tepat nol, jadi satu putaran penuh itu memang dikerjakan.
  hasil.push({
    nama: 'flip MODE menyapu melewati separuh putaran',
    ok: sap >= 150,
    dapat: `${sap.toFixed(1)}° (harus ≥150)`,
    harus: true,
  });
  // Satu sampel di tengah rentang tidak bisa dituntut: jendela silang wajah cuma 0,32 detik
  // dari flip 0,8 detik, dan satu frame perenderan perangkat lunak pernah memakan 500ms —
  // pembacaan seperti itu menguji irama mesin, bukan kodenya. Yang tahan jumlah frame adalah
  // ARAHnya: wajah bergerak satu kali ke wajah baru dan tidak pernah berbalik. Bahwa
  // pergantian itu benar-benar diangkut putaran, bukan ditempel di ujung atau ditanak di
  // awal, itu dua gerbang jendela di bawah yang membuktikannya.
  const wajahBaru = 1 - flip.sebelum.persona;
  const jarak = flip.rekam.map((r) => Math.abs(r.persona - wajahBaru));
  let berbalik = 0;
  for (let i = 1; i < jarak.length; i++) if (jarak[i] > jarak[i - 1] + 0.02) berbalik++;
  cek('wajah bergerak satu arah selama putaran, tidak melompat lalu berbalik', berbalik === 0, true);

  // Dua jendela yang dibatasi sisa flip (bukan waktu dinding): bukti bahwa silang wajah
  // DIANGKUT putaran. Arah flip ditentukan oleh wajah yang sedang terpasang saat tombol
  // ditekan — di sini CREATOR → ENGINEER, karena seksi reduce-motion meninggalkan wajah
  // creator — jadi gerbangnya dibandingkan ke nilai awal, bukan ke angka nol.
  const wajahAwal = flip.sebelum.persona;
  const separuhAwal = flip.rekam.filter((r) => r.balik >= 0.5);
  // Dua hal yang dulu dicampur dalam satu gerbang: apakah rekaman sempat menangkap awal
  // putaran, dan apakah wajah lama benar-benar dipegang selama separuh pertama itu.
  // Digabung, mesin yang telat bangun melapor "kode rusak"; dipisah, yang merah adalah
  // gerbang rekaman dan namanya menyebut mesin, bukan panggung.
  // Dulu gerbang ini diikat ke sampel ke-nol. Itu menguji FASA penggaris, bukan panggung:
  // jeda klik→efek bisa lebih pendek dari satu langkah polling 90ms, jadi sampel pertama
  // sempat membaca balik=0 sebelum putaran mulai (terukur 0,000 padahal sampel 1-2
  // menangkap 0,659). Yang ditagih di sini adalah rekamannya PERNAH melihat separuh
  // pertama — dan kalau mesin tertidur lalu satu frame raksasa menelan separuh pertama,
  // angka terbesar itu tetap di bawah 0,5, jadi klaimnya tidak ikut dilonggarkan.
  cek(
    'rekaman menangkap putaran sejak separuh pertamanya',
    Math.max(0, ...flip.rekam.map((r) => r?.balik ?? 0)) >= 0.5,
    true
  );
  cek(
    'setengah pertama putaran masih memegang wajah lama',
    separuhAwal.length > 0 &&
      Math.max(...separuhAwal.map((r) => Math.abs(r.persona - wajahAwal))) < 0.25,
    true
  );
  const separuhAkhir = flip.rekam.filter((r) => r.balik > 0);
  cek(
    'wajah berganti ketika kartu masih berputar, bukan setelahnya',
    separuhAkhir.length > 0 &&
      separuhAkhir.some((r) => Math.abs(r.persona - wajahAwal) > 0.05),
    true
  );

  const akhir = await tungguPersona(0);
  cek('persona ENGINEER tercapai penuh', Math.abs(akhir.persona) < 0.03, true);
  cek('flip selesai sendiri (sisa balik 0)', akhir.balik === 0, true);
  // Sikap akhir = sikap awal: putaran 360° berhenti di titik berangkat. Toleransi 6°
  // bukan kelonggaran — parallax pointer (rotGeyang 0,1 rad) memang menyumbang sampai
  // ±5,7° antara dua posisi kursor, dan klik MODE memindahkan kursor.
  const sisa = Math.abs(DERAJAT(akhir.rotY - flip.sebelum.rotY));
  hasil.push({
    nama: 'setelah flip kartu pulang ke sikap bab',
    ok: sisa < 6,
    dapat: `${sisa.toFixed(2)}° (harus <6)`,
    harus: true,
  });
  await foto('04-flip-mode');
}


// ── 8 · SPEC membuka strip data dengan melebarkan mask portal, bukan modal ──
// Yang dibuktikan di sini bukan "ada panel spesifikasi" — itu bisa lulus dengan modal
// lama. Yang dibuktikan adalah hubungan DOM↔panggung yang jadi inti idenya: satu variabel
// CSS menentukan lebar kolom baca DAN tepi kiri portal, jadi (a) mask benar-benar melebar
// saat strip terbuka, (b) kartunya ikut membesar (bukan hanya kotaknya), (c) tidak ada
// satu pun teks bab yang jatuh di bawah mask, dan (d) semuanya pulang utuh saat Escape.
{
  const ukur = () =>
    page.evaluate(() => {
      const strip = document.querySelector('[data-strip]');
      const kolom = document.querySelector('#chapter-03 > div:nth-of-type(4)');
      const kanan = [...document.querySelectorAll('#chapter-03 a, #chapter-03 h3')].reduce(
        (m, el) => Math.max(m, Math.round(el.getBoundingClientRect().right)),
        0
      );
      const cs = strip ? getComputedStyle(strip) : null;
      return {
        indeks: strip?.dataset.strip ?? null,
        kananStrip: strip ? Math.round(strip.getBoundingClientRect().right) : null,
        dalam: strip
          ? strip.getBoundingClientRect().top > 0 && strip.getBoundingClientRect().bottom < window.innerHeight
          : null,
        kananIsi: kanan,
        kananKolom: kolom ? Math.round(kolom.getBoundingClientRect().right) : null,
        lebarKolom: kolom ? Math.round(kolom.getBoundingClientRect().width) : null,
        modal: !!document.querySelector('[aria-modal="true"], [role="dialog"]'),
        fixed: cs ? cs.position === 'fixed' || cs.position === 'absolute' : null,
        fokus: document.activeElement?.dataset?.strip ?? null,
        objek: window.__render?.objek ?? null,
      };
    });

  const f = await page.evaluate(() => {
    const top = (s) => document.querySelector(s).getBoundingClientRect().top + window.scrollY;
    const maks = document.body.scrollHeight - window.innerHeight;
    return (top('#chapter-03') + 0.3 * (top('#chapter-04') - top('#chapter-03'))) / maks;
  });
  await parkir(f);
  const tutup = await tenang();
  const tertutup = await ukur();
  cek('spesifikasi diuji di dalam bab 3', tutup.babDari === 3 && tutup.t === 0, true);
  cek('belum ada strip dan belum ada dialog', tertutup.indeks === null && !tertutup.modal, true);

  const titik = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => (x.textContent ?? '').includes('SPEC'));
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, terlihat: r.top > 100 && r.bottom < window.innerHeight - 20 };
  });
  if (!titik?.terlihat) throw new Error('tombol SPEC tidak ada di viewport bab 3 — parkirnya yang salah');
  await page.mouse.move(titik.x, titik.y);
  await diamkan(500);
  await page.mouse.click(titik.x, titik.y);
  await diamkan(600);
  const buka = await tenang();
  const terbuka = await ukur();
  await foto('05-strip-terbuka');

  cek('strip terbuka di baris yang ditekan', terbuka.indeks !== null && terbuka.dalam === true, true);
  hasil.push({
    nama: 'mask portal melebar, bukan bergeser saja',
    ok: buka.portal[2] - tutup.portal[2] > 100,
    dapat: `${tutup.portal[2]}px → ${buka.portal[2]}px (harus +>100)`,
    harus: true,
  });
  hasil.push({
    nama: 'kartu ikut membesar, tidak hanya kotaknya',
    ok: buka.skala > tutup.skala + 0.05,
    dapat: `${tutup.skala} → ${buka.skala} (harus naik ≥0,05)`,
    harus: true,
  });
  cek('kolom baca menyempit oleh keadaan yang sama', terbuka.lebarKolom < tertutup.lebarKolom, true);
  hasil.push({
    nama: 'tepi kiri mask = 3rem dari tepi kanan kolom baca',
    ok: Math.abs(buka.portal[0] - terbuka.kananKolom - 48) < 1,
    dapat: `${buka.portal[0]} − ${terbuka.kananKolom} = ${(buka.portal[0] - terbuka.kananKolom).toFixed(1)}px (harus 48)`,
    harus: true,
  });
  cek('tidak ada teks bab yang jatuh di bawah mask', terbuka.kananIsi <= Math.round(buka.portal[0]), true);
  cek('strip adalah isi dokumen, bukan lapisan', terbuka.fixed === false, true);
  cek('tidak ada dialog/aria-modal yang muncul', !terbuka.modal, true);
  cek('strip mengambil fokus saat dibuka', terbuka.fokus === terbuka.indeks, true);
  cek('sangkar hover tidak tertinggal setelah barisnya hilang', (terbuka.objek ?? []).includes('sangkar'), false);

  await page.keyboard.press('Escape');
  await diamkan(600);
  const kembali = await tenang();
  const pulang = await ukur();
  await foto('06-strip-tutup');
  cek('Escape mengembalikan daftar', pulang.indeks === null, true);
  cek('mask pulang ke geometri tertutup', Math.abs(kembali.portal[2] - tutup.portal[2]) < 1, true);
  cek('kolom baca pulang ke lebar semula', pulang.lebarKolom === tertutup.lebarKolom, true);
}

if (galat.length) console.log('pageerror:', galat.slice(0, 3));
for (const h of hasil) console.log(`${h.ok ? 'LULUS' : 'GAGAL '} ${h.nama}: dapat ${h.dapat}, harus ${h.harus}`);
const buruk = hasil.filter((h) => !h.ok).length;
console.log(`${hasil.length - buruk}/${hasil.length} gerbang lulus — foto di ${DIR}`);
await browser.close();
process.exit(buruk ? 1 : 0);
