import { GITHUB_USERNAME } from "@/data/github";

// Dua dataset GitHub memang sengaja beda: kartu metrik About butuh seluruh repo
// (per_page=100) supaya total bintang dan porsi bahasa tidak setengah, sementara
// berlian Projects hanya butuh repo yang paling baru diubah.
const HEADER_PROFIL = {
    "Content-Type": "application/json",
    "User-Agent": "NextJS-Portfolio",
};

const HEADER_REPOS = {
    "User-Agent": "ArkanFzi-Portfolio-App",
    Accept: "application/vnd.github.v3+json",
};

export class GitHubGagal extends Error {
    constructor(readonly status: number, readonly pesan: string) {
        super(pesan);
    }
}

export interface MetrikGitHub {
    reposCount: string;
    starsCount: string;
    followersCount: string;
    langShare: string;
}

export interface RepoGitHub {
    id: number;
    name: string;
    description: string | null;
    homepage: string | null;
    html_url: string;
    stargazers_count: number;
    forks_count: number;
    language: string | null;
    fork: boolean;
}

export async function ambilMetrikGitHub(): Promise<MetrikGitHub> {
    const userRes = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}`, {
        headers: HEADER_PROFIL,
        next: { revalidate: 3600 },
    });

    if (!userRes.ok) throw new GitHubGagal(userRes.status, "Failed to fetch user");

    const user = await userRes.json();

    const reposRes = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100`, {
        headers: HEADER_PROFIL,
        next: { revalidate: 3600 },
    });

    if (!reposRes.ok) throw new GitHubGagal(reposRes.status, "Failed to fetch repos");

    const repos = await reposRes.json();
    const totalStars = repos.reduce((acc: number, r: { stargazers_count?: number }) => acc + (r.stargazers_count || 0), 0);

    // Porsi bahasa dihitung dari repo yang benar-benar punya label bahasa, bukan dikarang:
    // kartu "TS/JS" di halaman About dulu menulis 90% padahal hasil hitung nyata berbeda.
    const berBahasa = repos.filter(
        (r: { fork?: boolean; language?: string | null }) => !r.fork && !!r.language
    );
    const tsJs = berBahasa.filter(
        (r: { language?: string }) => r.language === "TypeScript" || r.language === "JavaScript"
    ).length;
    const langShare = berBahasa.length > 0
        ? `${Math.round((tsJs / berBahasa.length) * 100)}%`
        : "—";

    return {
        reposCount: user.public_repos?.toString() || "10+",
        starsCount: totalStars > 0 ? totalStars.toString() : "0",
        followersCount: user.followers?.toString() || "0",
        langShare,
    };
}

export async function daftarReposGitHub(): Promise<RepoGitHub[]> {
    const res = await fetch(
        `https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=20&type=public`,
        {
            headers: HEADER_REPOS,
            next: { revalidate: 600 },
        }
    );

    if (!res.ok) throw new GitHubGagal(res.status, `GitHub API error: ${res.status}`);

    const repos: RepoGitHub[] = await res.json();

    // Fork dan repo README profil bukan karya yang ingin dipamerkan.
    return repos.filter((r) => !r.fork && r.name !== GITHUB_USERNAME);
}

export interface RepoBerlian {
    id: number;
    name: string;
    description: string | null;
    homepage: string | null;
    html_url: string;
    stargazers_count: number;
    language: string | null;
}

// Objek GitHub penuh dipakai lagi oleh /api/github-repos (dossier membaca forks_count),
// tapi tidak perlu ikut ter-serialisasi ke payload halaman depan yang cuma menampilkan
// nama, bahasa, dan bintang.
export function ringkasRepos(repos: RepoGitHub[]): RepoBerlian[] {
    return repos.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        homepage: r.homepage,
        html_url: r.html_url,
        stargazers_count: r.stargazers_count,
        language: r.language,
    }));
}
