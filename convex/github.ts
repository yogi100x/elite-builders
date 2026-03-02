import { action, internalAction } from "./_generated/server"
import { v } from "convex/values"
import { internal } from "./_generated/api"
import { analyzeRepo as analyzeRepoImpl } from "./lib/github"

/**
 * Internal action that checks the 1hr cache before hitting the GitHub API.
 * Used by aiScoring and other internal callers.
 */
export const analyzeRepoInternal = internalAction({
    args: {
        owner: v.string(),
        repo: v.string(),
    },
    handler: async (ctx, { owner, repo }) => {
        // Check cache first (1hr TTL enforced in getCached)
        const cached = await ctx.runQuery(internal.githubCache.getCached, { owner, repo })
        if (cached) {
            return JSON.parse(cached)
        }

        const token = process.env.GITHUB_TOKEN
        if (!token) {
            throw new Error("GITHUB_TOKEN not configured — add to Convex environment variables")
        }

        try {
            const analysis = await analyzeRepoImpl(owner, repo, token)

            // Cache the result
            await ctx.runMutation(internal.githubCache.setCache, {
                owner,
                repo,
                analysis: JSON.stringify(analysis),
            })

            return analysis
        } catch (err) {
            console.error("[convex/github.analyzeRepoInternal] GitHub API error:", { owner, repo, error: err })
            throw new Error(`Failed to analyze repository ${owner}/${repo}`)
        }
    },
})

/**
 * Public action for backward compatibility (e.g. client-side calls).
 * Delegates to the internal action which handles caching.
 */
export const analyzeRepo = action({
    args: {
        owner: v.string(),
        repo: v.string(),
    },
    handler: async (ctx, { owner, repo }) => {
        return await ctx.runAction(internal.github.analyzeRepoInternal, { owner, repo })
    },
})
