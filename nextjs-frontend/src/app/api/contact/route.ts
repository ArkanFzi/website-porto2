import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const data = await req.json();

        // Validate request
        if (!data.name || !data.email || !data.message) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Simulate sending email (delay 1 second)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // In a real application, you would integrate Resend, SendGrid, or Nodemailer here.
        // console.log("Received contact form submission:", data);

        return NextResponse.json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        console.error("Contact API Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
