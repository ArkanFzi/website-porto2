// Ukur APA YANG DIRENDER, bukan status code: angka di TODO.md §9.0, C3 dan C4 berasal dari sini.
// Kegagalan disimulasikan DI SISI KLIEN (request interception), jadi produksi tidak pernah diubah
// dan tidak ada request yang sampai ke backend dengan isi yang dikarang.
//
//   node docs/verify/browser-probe.mjs /cv-layout
//   node docs/verify/browser-probe.mjs --mock=/api/certificates:500 /dossier/certificates
//   node docs/verify/browser-probe.mjs --mock=/api/certificates:putus /dossier/certificates
//   node docs/verify/browser-probe.mjs --token=palsu /admin/dashboard
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
    else if (a.startsWith('--token=')) opsi.token = a.slice(8);
    else path.push(a);
}
if (path.length === 0) {
    console.error('pakai: browser-probe.mjs [--mock=<potongan-url>:<status|putus>] [--token=<isi>] <path> ...');
    process.exit(2);
}
// mock hanya berlaku untuk SATU url supaya tidak ada rute lain yang ikut berubah diam-diam.
const mock = opsi.mock ? { tertangkap: opsi.mock.split(':')[0], status: opsi.mock.split(':')[1] } : null;

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
    if (opsi.token) {
        // Kunci sebenarnya adalah admin_token (src/lib/auth.ts:3) — menaruh "token" menghasilkan
        // halaman yang sama dan nol informasi, jadi kunci salah = hasil nol, bukan temuan.
        await page.goto(FE + p, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.evaluate((k, v) => localStorage.setItem(k, v), 'admin_token', opsi.token);
    }

    // domcontentloaded + jeda tetap, bukan networkidle: '/' tidak pernah idle (FotoDiriFix.png >3s),
    // dan networkidle2 membuat probe timeouts tanpa mengukur apa pun.
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

    hasil.push({ path: p, mock: mock ? `${mock.tertangkap}→${mock.status}` : null, token: !!opsi.token, api, ...info, err: err.slice(0, 4) });
    await page.close();
}

console.log(JSON.stringify(hasil, null, 1));
await browser.close();
