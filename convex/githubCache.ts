import { internalQuery, internalMutation } from "./_generated/server"
import { v } from "convex/values"

const ONE_HOUR_MS = 60 * 60 * 1000

/**
 * Look up a cached GitHub analysis by owner/repo.
 * Returns null if not found or if the cache entry is older than 1 hour.
 */
export const getCached = internalQuery({
    args: {
        owner: v.string(),
        repo: v.string(),
    },
    handler: async (ctx, { owner, repo }) => {
        const entry = await ctx.db
            .query("githubAnalysisCache")
            .withIndex("by_repo", (q) => q.eq("owner", owner).eq("repo", repo))
            .unique()

        if (!entry) return null

        // Check TTL: 1 hour
        if (Date.now() - entry.cachedAt > ONE_HOUR_MS) return null

        return entry.analysis
    },
})

/**
 * Upsert a cached GitHub analysis for owner/repo.
 */
export const setCache = internalMutation({
    args: {
        owner: v.string(),
        repo: v.string(),
        analysis: v.string(),
    },
    handler: async (ctx, { owner, repo, analysis }) => {
        const existing = await ctx.db
            .query("githubAnalysisCache")
            .withIndex("by_repo", (q) => q.eq("owner", owner).eq("repo", repo))
            .unique()

        if (existing) {
            await ctx.db.patch(existing._id, {
                analysis,
                cachedAt: Date.now(),
            })
        } else {
            await ctx.db.insert("githubAnalysisCache", {
                owner,
                repo,
                analysis,
                cachedAt: Date.now(),
            })
        }
    },
})
