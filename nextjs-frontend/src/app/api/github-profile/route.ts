import { NextResponse } from 'next/server';
import { GITHUB_USERNAME } from '@/data/github';

export async function GET() {
    try {
        const headers = {
            // Provide a PAT here in a real environment to increase limits:
            // Authorization: `token ${process.env.GITHUB_TOKEN}`
            'Content-Type': 'application/json',
            'User-Agent': 'NextJS-Portfolio'
        };

        const userRes = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}`, {
            headers,
            next: { revalidate: 3600 } // Cache for 1 hour
        });

        if (!userRes.ok) {
            return NextResponse.json({ error: 'Failed to fetch user' }, { status: userRes.status });
        }

        const user = await userRes.json();

        const reposRes = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100`, {
            headers,
            next: { revalidate: 3600 } // Cache for 1 hour
        });

        if (!reposRes.ok) {
            return NextResponse.json({ error: 'Failed to fetch repos' }, { status: reposRes.status });
        }

        const repos = await reposRes.json();
        const totalStars = repos.reduce((acc: number, r: any) => acc + (r.stargazers_count || 0), 0);

        return NextResponse.json({
            reposCount: user.public_repos?.toString() || "10+",
            starsCount: totalStars > 0 ? totalStars.toString() : "0",
            followersCount: user.followers?.toString() || "0",
        });
    } catch (error) {
        console.error("GitHub API Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
