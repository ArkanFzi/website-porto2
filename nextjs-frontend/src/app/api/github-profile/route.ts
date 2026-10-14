import { NextResponse } from 'next/server';
import { ambilMetrikGitHub, GitHubGagal } from '@/lib/server/github';

export async function GET() {
    try {
        return NextResponse.json(await ambilMetrikGitHub());
    } catch (error) {
        if (error instanceof GitHubGagal) {
            return NextResponse.json({ error: error.pesan }, { status: error.status });
        }
        console.error("GitHub API Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
