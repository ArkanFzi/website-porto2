import { NextResponse } from "next/server";
import { daftarReposGitHub, GitHubGagal } from "@/lib/server/github";

/**
 * GET /api/github-repos
 * Daftar repo publik lewat API GitHub, objek utuh (dossier membaca forks_count).
 */
export async function GET() {
    try {
        return NextResponse.json(await daftarReposGitHub(), {
            headers: {
                "Cache-Control": "public, s-maxage=600, stale-while-revalidate=60",
            },
        });
    } catch (err) {
        if (err instanceof GitHubGagal) {
            return NextResponse.json({ error: err.pesan }, { status: err.status });
        }
        console.error("GitHub proxy error:", err);
        return NextResponse.json({ error: "Failed to fetch GitHub repos" }, { status: 500 });
    }
}
