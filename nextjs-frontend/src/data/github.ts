// ─────────────────────────────────────────────────────────────────────────────
// GitHub Data Utilities — All GitHub fetches go through the server-side proxy
// ─────────────────────────────────────────────────────────────────────────────

export const GITHUB_USERNAME = "ArkanFzi";

export const GITHUB_AVATAR = `https://avatars.githubusercontent.com/${GITHUB_USERNAME}`;
export const GITHUB_PROFILE = `https://github.com/${GITHUB_USERNAME}`;

export async function fetchGitHubMetrics(username: string = GITHUB_USERNAME) {
  try {
    // We only fetch public data (no token needed, but subject to IP rate limits)
    // In production, you'd want a GITHUB_TOKEN in your .env
    const res = await fetch(`https://api.github.com/users/${username}`, {
      next: { revalidate: 3600 } // Cache for 1 hour
    });
    
    if (!res.ok) throw new Error("Failed to fetch GitHub profile");
    const user = await res.json();
    
    // Fetch repos to calculate languages and stars
    const reposRes = await fetch(`https://api.github.com/users/${username}/repos?per_page=100`, {
      next: { revalidate: 3600 }
    });
    
    if (!reposRes.ok) throw new Error("Failed to fetch repos directly");
    const repos = await reposRes.json();
    
    // Calculate total stars
    const totalStars = repos.reduce((acc: number, r: any) => acc + r.stargazers_count, 0);
    
    // This is basic calculation. Fetching total commits cleanly requires GraphQL.
    // For now we'll display total repos, followers, and proxy commits via repos count.
    
    return {
      publicRepos: user.public_repos,
      followers: user.followers,
      stars: totalStars
    };
  } catch (err) {
    console.error("Error fetching GitHub metrics", err);
    return null; // Fallback structure
  }
}
