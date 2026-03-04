import { NextResponse } from "next/server";

/**
 * GET /api/github-repos
 * Server-side proxy to fetch public repos from GitHub API.
 * This avoids CORS and rate-limit issues from direct browser calls.
 */
export async function GET() {
    try {
        const res = await fetch(
            "https://api.github.com/users/ArkanFzi/repos?sort=updated&per_page=20&type=public",
            {
                headers: {
                    "User-Agent": "ArkanFzi-Portfolio-App",
                    Accept: "application/vnd.github.v3+json",
                },
                // Cache for 10 minutes on the server so rapid page loads don't hit rate limits
                next: { revalidate: 600 },
            }
        );

        if (!res.ok) {
            return NextResponse.json(
                { error: `GitHub API error: ${res.status}` },
                { status: res.status }
            );
        }

        const repos = await res.json();

        // Filter out forks and meta repos, keep only real repos
        const filtered = repos.filter(
            (r: { fork: boolean; name: string }) =>
                !r.fork && r.name !== "ArkanFzi" // skip profile README repo
        );

        return NextResponse.json(filtered, {
            headers: {
                "Cache-Control": "public, s-maxage=600, stale-while-revalidate=60",
            },
        });
    } catch (err) {
        console.error("GitHub proxy error:", err);
        return NextResponse.json({ error: "Failed to fetch GitHub repos" }, { status: 500 });
    }
}
