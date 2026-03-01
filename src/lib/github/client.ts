import { Octokit } from "@octokit/rest"
import { graphql } from "@octokit/graphql"
import { REPO_ANALYSIS_QUERY } from "./queries"

/** GitHub API rate limit reset is Unix seconds; JS Date expects milliseconds */
const SECONDS_TO_MS = 1000

export interface GitHubRepo {
    id: number
    name: string
    fullName: string
    description: string | null
    language: string | null
    stars: number
    forks: number
    updatedAt: string
    pushedAt: string | null
    htmlUrl: string
    topics: string[]
    isPrivate: boolean
    defaultBranch: string
}

export interface RepoAnalysis {
    metadata: {
        name: string
        fullName: string
        description: string | null
        language: string | null
        languages: Array<{ name: string; size: number }>
        stars: number
        forks: number
        topics: string[]
        pushedAt: string | null
        defaultBranch: string
        htmlUrl: string
        contributorCount: number
    } | null
    readme: string | null
    packageJson: Record<string, unknown> | null
    rootFiles: Array<{ name: string; type: string }>
    recentCommits: Array<{
        message: string
        date: string
        additions: number
        deletions: number
        author: string
    }>
}

export class GitHubClient {
    private octokit: Octokit
    private graphqlClient: typeof graphql

    constructor(accessToken?: string) {
        this.octokit = new Octokit({ auth: accessToken })
        this.graphqlClient = graphql.defaults({
            headers: {
                authorization: accessToken ? `token ${accessToken}` : "",
            },
        })
    }

    async listUserRepos(): Promise<GitHubRepo[]> {
        const { data } = await this.octokit.repos.listForAuthenticatedUser({
            sort: "updated",
            per_page: 100,
            visibility: "public",
        })
        return data.map((r) => ({
            id: r.id,
            name: r.name,
            fullName: r.full_name,
            description: r.description ?? null,
            language: r.language ?? null,
            stars: r.stargazers_count,
            forks: r.forks_count,
            updatedAt: r.updated_at ?? "",
            pushedAt: r.pushed_at ?? null,
            htmlUrl: r.html_url,
            topics: r.topics ?? [],
            isPrivate: r.private,
            defaultBranch: r.default_branch,
        }))
    }

    async analyzeRepo(owner: string, repo: string): Promise<RepoAnalysis> {
        // WHY: graphql.defaults returns a configured graphql instance, not the base type
        type GraphQLFn = (query: string, variables: Record<string, string>) => Promise<unknown>
        const result = await (this.graphqlClient as unknown as GraphQLFn)(
            REPO_ANALYSIS_QUERY,
            { owner, repo },
        ) as { repository: RepoGraphQLData | null }

        const r = result.repository
        if (!r) return { metadata: null, readme: null, packageJson: null, rootFiles: [], recentCommits: [] }

        const readme = r.readme?.text ?? null

        let packageJson: Record<string, unknown> | null = null
        if (r.packageJson?.text) {
            try {
                packageJson = JSON.parse(r.packageJson.text)
            } catch {
                packageJson = null
            }
        }

        const recentCommits = r.defaultBranchRef?.target?.history?.nodes?.map((c) => ({
            message: c.message.split("\n")[0],
            date: c.committedDate,
            additions: c.additions,
            deletions: c.deletions,
            author: c.author?.name ?? "Unknown",
        })) ?? []

        return {
            metadata: {
                name: r.name,
                fullName: `${owner}/${repo}`,
                description: r.description ?? null,
                language: r.primaryLanguage?.name ?? null,
                languages: r.languages?.edges?.map((e) => ({ name: e.node.name, size: e.size })) ?? [],
                stars: r.stargazerCount,
                forks: r.forkCount,
                topics: r.repositoryTopics?.nodes?.map((n) => n.topic.name) ?? [],
                pushedAt: r.pushedAt ?? null,
                defaultBranch: r.defaultBranchRef?.name ?? "main",
                htmlUrl: `https://github.com/${owner}/${repo}`,
                contributorCount: r.mentionableUsers?.totalCount ?? 0,
            },
            readme,
            packageJson,
            rootFiles: r.rootTree?.entries ?? [],
            recentCommits,
        }
    }

    async getRateLimit() {
        const { data } = await this.octokit.rateLimit.get()
        return {
            limit: data.resources.core.limit,
            remaining: data.resources.core.remaining,
            reset: new Date(data.resources.core.reset * SECONDS_TO_MS),
        }
    }
}

export function createGitHubClient(accessToken?: string): GitHubClient {
    return new GitHubClient(accessToken)
}

// Internal type for GraphQL response shape
interface RepoGraphQLData {
    name: string
    description: string | null
    primaryLanguage: { name: string } | null
    languages: { edges: Array<{ size: number; node: { name: string } }> }
    stargazerCount: number
    forkCount: number
    repositoryTopics: { nodes: Array<{ topic: { name: string } }> }
    pushedAt: string | null
    mentionableUsers: { totalCount: number }
    readme: { text: string } | null
    packageJson: { text: string } | null
    rootTree: { entries: Array<{ name: string; type: string }> } | null
    defaultBranchRef: {
        name: string
        target: {
            history: {
                nodes: Array<{
                    message: string
                    committedDate: string
                    additions: number
                    deletions: number
                    author: { name: string } | null
                }>
            }
        }
    } | null
}
