import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function GET(req: NextRequest) {
    try {
        // Launch a headless browser
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        const page = await browser.newPage();

        // Get the base URL from the request
        const url = new URL(req.url);
        const baseUrl = `${url.protocol}//${url.host}`;
        const targetUrl = `${baseUrl}/cv-layout`;

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
            },
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('PDF Generation Error:', error);
        return NextResponse.json({ error: 'Failed to generate PDF', details: errorMessage }, { status: 500 });
    }
}
