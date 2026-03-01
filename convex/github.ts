import { action } from "./_generated/server"
import { v } from "convex/values"
import { analyzeRepo as analyzeRepoImpl } from "./lib/github"

/**
 * Fetches GitHub repo analysis for a submitted repo.
 * Uses the app's GITHUB_TOKEN (PAT) — not the candidate's token.
 * WHY: Judges need to view public repos; app token gives higher rate limits
 * and avoids storing candidate OAuth tokens in our DB.
 */
export const analyzeRepo = action({
    args: {
        owner: v.string(),
        repo: v.string(),
    },
    handler: async (_ctx, { owner, repo }) => {
        const token = process.env.GITHUB_TOKEN
        if (!token) {
            throw new Error("GITHUB_TOKEN not configured — add to Convex environment variables")
        }

        try {
            return await analyzeRepoImpl(owner, repo, token)
        } catch (err) {
            console.error("[convex/github.analyzeRepo] GitHub API error:", { owner, repo, error: err })
            throw new Error(`Failed to analyze repository ${owner}/${repo}`)
        }
    },
})
