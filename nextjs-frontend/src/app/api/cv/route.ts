import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

// Diukur pada 2026-10-07 terhadap produksi: dua GET /api/cv identik berurutan butuh
// 5,358 s dan 5,956 s — tidak ada satu pun lapisan cache yang bekerja. Cloud Run berdiri
// tanpa CDN, jadi `s-maxage` tidak pernah dibaca siapa pun; yang tersisa hanya cache di
// dalam proses ini.
const MASA_SIMPAN_MS = 60_000;

// Rem token-bucket, sama bentuknya dengan yang dipakai /api/contact di backend. Global,
// bukan per-IP: yang masuk lewat rewrite Next berbagi pool egress Cloud Run, dan
// X-Forwarded-For boleh diisi sendiri oleh pengirimnya.
//
// Yang sebenarnya melindungi kontainer adalah singleflight di bawah — dia memaksa satu
// instance Chromium, sekuat apa pun ledakannya. Bucket ini hanya menutup jalur masuk
// kembali berulang-ulang setelah cache kedaluwarsa.
const REM_BURST = 5;
const REM_JENDETAK_MS = 15_000;

// page.pdf() mengembalikan Uint8Array, bukan Buffer: memberi anotasi Buffer di sini
// membuat `npm run build` gagal dengan TS2740 (Buffer menuntut metode yang tidak ada
// pada Uint8Array generik).
type Hasil = { pdf: Uint8Array; pada: number };

let simpanan: Hasil | null = null;
let sedangMeras: Promise<Uint8Array> | null = null;
let token = REM_BURST;
let tickTerakhir = Date.now();

// Query string sengaja BUKAN bagian dari kunci cache: rute ini tidak membaca parameter
// apa pun, jadi `/api/cv?x=1` dan `/api/cv` adalah dokumen yang sama. Ledakan variasi
// query tidak boleh bisa memaksa render baru.
function ambilToken(): { boleh: boolean; tungguDetik: number } {
    const kini = Date.now();
    token = Math.min(REM_BURST, token + (kini - tickTerakhir) / REM_JENDETAK_MS);
    tickTerakhir = kini;
    if (token < 1) {
        const kurang = 1 - token;
        return { boleh: false, tungguDetik: Math.max(1, Math.ceil((kurang * REM_JENDETAK_MS) / 1000)) };
    }
    token -= 1;
    return { boleh: true, tungguDetik: 0 };
}

// Batas keras SATU render, dari awal sampai akhir — termasuk boot Chromium.
//
// Sebelumnya angka ini hanya memagari fase sesudah launch: `puppeteer.launch()` tanpa opsi
// `timeout` mewarisi default puppeteer-core 30_000 ms, dan watchdog di bawah baru dipasang
// setelah launch kembali. Jadi instance yang dingin kehabisan jatah di detik ke-30 sementara
// anggaran yang didokumentasikan 45 s. Terukur 2026-10-12 16:03:35 UTC pada deploy #48:
// "Timed out after 30000 ms while waiting for the WS endpoint URL to appear in stdout", revisi
// fe-00049 di-rollback padahal kode frontend tidak berubah sama sekali.
//
// Yang dilindungi bukan respons pengunjung — itu toh sudah pulang dengan 500 — melainkan
// instance-nya. page.pdf() tidak punya timeout sendiri, dan promise yang tidak pernah settle
// membuat `sedangMeras` di bawah tetap menggantung selamanya: setiap GET /api/cv berikutnya
// menunggu Chromium yang sudah macet itu sampai replikanya didaur ulang.
const BATAS_RENDER_MS = 45_000;

async function renderPdf(): Promise<Uint8Array> {
    type Browser = Awaited<ReturnType<typeof puppeteer.launch>>;
    let browser: Browser | null = null;
    let lewatBatas = false;

    // Dipasang SEBELUM launch, cuma itu yang membuatnya jadi batas untuk seluruh render.
    // Kalau batas lewat sementara launch masih menggantung, `browser` masih null — karena itu
    // handle yang tiba belakangan harus ditutup di bawah, kalau tidak Chromium yatim tinggal
    // di instance ini sampai replikanya didaur ulang.
    const penunggu = setTimeout(() => {
        lewatBatas = true;
        browser?.close().catch(() => undefined);
    }, BATAS_RENDER_MS);

    try {
        browser = await puppeteer.launch({
            headless: true,
            timeout: BATAS_RENDER_MS,
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
            ],
        });
        if (lewatBatas) throw new Error(`Boot Chromium melewati batas ${BATAS_RENDER_MS} ms`);

        const page = await browser.newPage();
        const port = process.env.PORT || '3000';
        await page.goto(`http://127.0.0.1:${port}/cv-layout`, { waitUntil: 'networkidle0', timeout: 30_000 });
        return await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '0px', bottom: '0px', left: '0px', right: '0px' },
        });
    } finally {
        clearTimeout(penunggu);
        // close() pada browser yang sudah ditutup oleh penunggu di atas akan melempar;
        // membiarkannya berarti menutupi galat render yang justru ingin kita lihat.
        await browser?.close().catch(() => undefined);
    }
}

export async function GET() {
    const rem = ambilToken();
    if (!rem.boleh) {
        return NextResponse.json(
            { error: 'Terlalu banyak permintaan unduhan CV, coba lagi sebentar' },
            { status: 429, headers: { 'Retry-After': String(rem.tungguDetik) } },
        );
    }

    const kini = Date.now();
    if (simpanan && kini - simpanan.pada < MASA_SIMPAN_MS) {
        return kirim(simpanan.pdf, 'pukulan-cache');
    }

    // Permintaan yang datang sambil satu render berjalan menunggu render yang sama,
    // bukan menambah Chromium kedua di kontainer 1Gi.
    if (!sedangMeras) {
        sedangMeras = renderPdf().finally(() => { sedangMeras = null; });
    }

    try {
        const pdf = await sedangMeras;
        simpanan = { pdf, pada: Date.now() };
        return kirim(pdf, 'render');
    } catch (error: unknown) {
        console.error('PDF Generation Error:', error);
        // Alasan internals (error.message) sering berisi path dan port loopback: berguna di log,
        // bukan untuk dikirim ke pengunjung.
        return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
    }
}

function kirim(pdf: Uint8Array, asal: string): Response {
    return new Response(pdf as unknown as BodyInit, {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="CV_M_Arkan_Fauzi.pdf"',
            'Cache-Control': 'public, max-age=60',
            // Penanda supaya kriteria selesai bisa diukur dari luar, bukan dipercaya dari narasi:
            // GET kedua dalam 60 detik wajib menjawab `pukulan-cache`, bukan `render`.
            'X-CV-Asal': asal,
        },
    });
}
