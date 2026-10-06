import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function GET() {
    try {
        // Launch a headless browser
        const browser = await puppeteer.launch({
            headless: true,
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
            ],
        });

        const page = await browser.newPage();

        // Navigate directly to the local CV layout page via internal HTTP loopback
        const port = process.env.PORT || '3000';
        const targetUrl = `http://127.0.0.1:${port}/cv-layout`;

        // Navigate to the CV layout page and wait for everything to load
        await page.goto(targetUrl, { waitUntil: 'networkidle0' });

        // Generate the PDF
        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '0px',
                bottom: '0px',
                left: '0px',
                right: '0px',
            },
        });

        await browser.close();

        // Return the PDF buffer
        return new Response(pdf as unknown as BodyInit, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename="CV_M_Arkan_Fauzi.pdf"',
                // Satu render PDF menyita headless browser; tanpa cache header, setiap klik
                // "Download CV" memicu puppeteer penuh di container yang sama.
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=60',
            },
        });
    } catch (error: unknown) {
        console.error('PDF Generation Error:', error);
        // Alasan internals (error.message) sering berisi path dan port loopback: berguna di log,
        // bukan untuk dikirim ke pengunjung.
        return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
    }
}
