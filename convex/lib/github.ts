/**
 * GitHub API helpers for the Convex runtime.
 * Uses GitHub REST API via fetch() — no Octokit dependency needed.
 */

export interface RepoAnalysis {
    metadata: {
        name: string;
        fullName: string;
        description: string | null;
        language: string | null;
        languages: Array<{ name: string; size: number }>;
        stars: number;
        forks: number;
        topics: string[];
        pushedAt: string | null;
        defaultBranch: string;
        htmlUrl: string;
    } | null;
    readme: string | null;
    packageJson: Record<string, unknown> | null;
    rootFiles: Array<{ name: string; type: string }>;
    recentCommits: Array<{
        message: string;
        date: string;
        author: string;
    }>;
}

const GITHUB_API = "https://api.github.com";

async function githubFetch(path: string, token: string) {
    const res = await fetch(`${GITHUB_API}${path}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    });
    if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
    }
    return res.json();
}

export async function analyzeRepo(
    owner: string,
    repo: string,
    token: string,
): Promise<RepoAnalysis> {
    // Fetch repo metadata, README, recent commits, languages, package.json, root tree in parallel
    const [repoData, readmeData, commitsData, languagesData, pkgJsonData, contentsData] = await Promise.all([
        githubFetch(`/repos/${owner}/${repo}`, token),
        githubFetch(`/repos/${owner}/${repo}/readme`, token).catch(() => null),
        githubFetch(`/repos/${owner}/${repo}/commits?per_page=10`, token).catch(() => null),
        githubFetch(`/repos/${owner}/${repo}/languages`, token).catch(() => null),
        githubFetch(`/repos/${owner}/${repo}/contents/package.json`, token).catch(() => null),
        githubFetch(`/repos/${owner}/${repo}/contents`, token).catch(() => null),
    ]);

    if (!repoData) {
        return { metadata: null, readme: null, packageJson: null, rootFiles: [], recentCommits: [] };
    }

    // Decode README from base64
    let readme: string | null = null;
    if (readmeData?.content) {
        try {
            readme = atob(readmeData.content.replace(/\n/g, ""));
        } catch {
            readme = null;
        }
    }

    // Parse languages object into array
    const languages: Array<{ name: string; size: number }> = languagesData
        ? Object.entries(languagesData as Record<string, number>).map(([name, size]) => ({ name, size }))
        : [];

    // Parse package.json
    let packageJson: Record<string, unknown> | null = null;
    if (pkgJsonData?.content) {
        try {
            packageJson = JSON.parse(atob(pkgJsonData.content.replace(/\n/g, "")));
        } catch {
            packageJson = null;
        }
    }

    // Parse root tree
    const rootFiles: Array<{ name: string; type: string }> = Array.isArray(contentsData)
        ? contentsData.map((f: any) => ({ name: f.name, type: f.type }))
        : [];

    // Map commits
    const recentCommits = Array.isArray(commitsData)
        ? commitsData.map((c: any) => ({
              message: (c.commit?.message ?? "").split("\n")[0],
              date: c.commit?.author?.date ?? "",
              author: c.commit?.author?.name ?? "Unknown",
          }))
        : [];

    return {
        metadata: {
            name: repoData.name,
            fullName: repoData.full_name,
            description: repoData.description ?? null,
            language: repoData.language ?? null,
            languages,
            stars: repoData.stargazers_count,
            forks: repoData.forks_count,
            topics: repoData.topics ?? [],
            pushedAt: repoData.pushed_at ?? null,
            defaultBranch: repoData.default_branch ?? "main",
            htmlUrl: repoData.html_url,
        },
        readme,
        packageJson,
        rootFiles,
        recentCommits,
    };
}
