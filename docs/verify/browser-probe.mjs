// Ukur APA YANG DIRENDER, bukan status code: angka di TODO.md §9.0, C3 dan C4 berasal dari sini.
// Kegagalan disimulasikan DI SISI KLIEN (request interception), jadi produksi tidak pernah diubah
// dan tidak ada request yang sampai ke backend dengan isi yang dikarang.
//
//   node docs/verify/browser-probe.mjs /cv-layout
//   node docs/verify/browser-probe.mjs --mock=/api/certificates:500 /dossier/certificates
//   node docs/verify/browser-probe.mjs --mock=/api/certificates:putus /dossier/certificates
//   ADMIN_PASS=... node docs/verify/browser-probe.mjs --login /admin/dashboard
import { createRequire } from 'node:module';

// puppeteer adalah dependency nextjs-frontend, dan ESM mencari node_modules dari direktori file ini,
// jadi resolve lewat package.json frontend — tanpa itu probe ini mati ERR_MODULE_NOT_FOUND.
const require = createRequire(new URL('../../nextjs-frontend/package.json', import.meta.url));
const puppeteer = require('puppeteer');
const FE = process.env.FE_URL ?? 'https://portfolio-fe-xicnrszwjq-uc.a.run.app';
const KATA_ERROR = ['gagal', 'error', 'tidak bisa dimuat', 'terjadi kesalahan', 'coba lagi', 'kosong', 'belum ada'];

const argv = process.argv.slice(2);
const opsi = {};
const path = [];
for (const a of argv) {
    if (a.startsWith('--mock=')) opsi.mock = a.slice(7);
    else if (a === '--login') opsi.login = true;
    else path.push(a);
}
if (path.length === 0) {
    console.error('pakai: browser-probe.mjs [--mock=<potongan-url>:<status|putus>] [--login] <path> ...');
    process.exit(2);
}
// mock hanya berlaku untuk SATU url supaya tidak ada rute lain yang ikut berubah diam-diam.
const mock = opsi.mock ? { tertangkap: opsi.mock.split(':')[0], status: opsi.mock.split(':')[1] } : null;

// Kredensial asli, bukan token karangan. Sesi admin pindah ke cookie HttpOnly `porto_sesi` yang
// dicetak POST /api/login; kunci lama `admin_token` di localStorage sudah tidak dibaca server, jadi
// menaruh nilai apa pun di sana hanya menghasilkan halaman 401 yang terlihat seperti temuan.
async function ambilCookieSesi() {
    if (!process.env.ADMIN_PASS) {
        console.error('--login butuh ADMIN_PASS (sama dengan secret Cloud Run backend); tanpa itu tidak ada sesi yang bisa dibuat');
        process.exit(2);
    }
    const r = await fetch(`${FE}/api/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: process.env.ADMIN_USER ?? 'admin', password: process.env.ADMIN_PASS }),
    });
    if (!r.ok) {
        // Nilai kredensial tidak boleh muncul di log; kode status + pesan server sudah cukup.
        console.error(`login gagal: HTTP ${r.status} ${JSON.stringify(await r.json().catch(() => null))}`);
        process.exit(1);
    }
    const semua = typeof r.headers.getSetCookie === 'function'
        ? r.headers.getSetCookie()
        : String(r.headers.get('set-cookie') ?? '').split(/,\s*(?=[a-zA-Z0-9_-]+=)/);
    const hit = semua.find((k) => k.startsWith('porto_sesi=') && k.length > 'porto_sesi='.length + 1);
    if (!hit) {
        console.error(`login 200 tapi tidak ada porto_sesi di Set-Cookie (dapat: ${semua.map((k) => k.split('=')[0]).join(', ') || 'kosong'})`);
        process.exit(1);
    }
    return hit.split(';')[0];
}
const cookieSesi = opsi.login ? await ambilCookieSesi() : null;

const browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

const hasil = [];
for (const p of path) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    const api = [];
    const err = [];
    page.on('response', (r) => {
        if (r.url().includes('/api/')) api.push(`${r.url().replace(FE, '')}=${r.status()}`);
    });
    page.on('console', (m) => { if (m.type() === 'error') err.push(`console: ${m.text().slice(0, 120)}`); });
    page.on('pageerror', (e) => err.push(`pageerror: ${String(e).slice(0, 120)}`));

    if (mock) {
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (!req.url().includes(mock.tertangkap)) return req.continue();
            if (mock.status === 'putus') return req.abort('failed');
            return req.respond({
                status: Number(mock.status),
                contentType: 'application/json',
                body: JSON.stringify({ error: `mock ${mock.status}` }),
            });
        });
    }
    if (cookieSesi) {
        const [nama, nilai] = cookieSesi.split('=');
        await page.setCookie({ name: nama, value: nilai, url: FE, httpOnly: true, sameSite: 'Lax', secure: FE.startsWith('https') });
        // admin/layout.tsx memutuskan "tampilkan" vs "lempar ke /admin/login" dari penanda
        // localStorage, bukan dari cookie. Tanpa ini halaman terverifikasi pun terbaca kosong.
        await page.evaluateOnNewDocument((k) => localStorage.setItem(k, '1'), 'admin_sesi');
    }

    // domcontentloaded + jeda tetap, bukan networkidle: sebagian halaman memanggil /api/* dari
    // klien dan ada yang tidak pernah benar-benar diam, jadi networkidle membuat probe timeouts
    // tanpa mengukur apa pun. Jeda 7 s memberi waktu render data yang datang belakangan.
    await page.goto(FE + p, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await new Promise((r) => setTimeout(r, 7000));

    const info = await page.evaluate((kata) => {
        const teks = (document.body?.innerText || '').replace(/\n{2,}/g, '\n');
        return {
            panjangTeks: teks.length,
            barisError: teks.split('\n').filter((l) => kata.some((k) => l.toLowerCase().includes(k))).slice(0, 6),
            linkLokal: (document.body?.innerHTML || '').match(/localhost/g)?.length ?? 0,
            inputPwd: document.querySelectorAll('input[type=password]').length,
            jumlahImg: document.querySelectorAll('img').length,
            teksDepan: teks.slice(0, 200),
        };
    }, KATA_ERROR);

    hasil.push({ path: p, mock: mock ? `${mock.tertangkap}→${mock.status}` : null, sesi: !!cookieSesi, api, ...info, err: err.slice(0, 4) });
    await page.close();
}

console.log(JSON.stringify(hasil, null, 1));
await browser.close();
