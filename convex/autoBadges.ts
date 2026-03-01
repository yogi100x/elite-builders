import { action, internalMutation } from "./_generated/server"
import { v } from "convex/values"
import { requireAuth } from "./lib/auth"
import { internal } from "./_generated/api"

const TOP_PERCENT_THRESHOLD = 0.1     // Top 10%
const TOP_PERCENT_BADGE_NAME = "Top 10%"
const TOP_PERCENT_BADGE_COLOR = "hsl(258 90% 66%)"  // achievement purple
const CATEGORY_WINNER_BADGE_NAME = "Category Winner"
const CATEGORY_WINNER_BADGE_COLOR = "#F59E0B"        // amber

/**
 * Closes a challenge and auto-awards ranking badges.
 * Sponsor or admin triggers this after judging period ends.
 *
 * Auto-awards:
 * - "Category Winner" badge → highest scored submission per challenge
 * - "Top 10%" badge → top decile of all awarded submissions
 * - "Sponsor Favorite" → manually selected by sponsor (separate action)
 */
export const closeChallengeAndAwardBadges = action({
    args: { challengeId: v.id("challenges") },
    handler: async (ctx, { challengeId }) => {
        const identity = await ctx.auth.getUserIdentity()
        if (!identity) throw new Error("Unauthenticated")

        const user = await ctx.runQuery(internal.users.getByIdInternal, { subject: identity.subject })
        if (!user || (user.role !== "sponsor" && user.role !== "admin")) {
            throw new Error("Only sponsors and admins can close challenges")
        }

        // Get all awarded submissions for this challenge, sorted by score descending
        const awarded = await ctx.runQuery(internal.submissions.listAwardedByChallenge, {
            challengeId,
        })

        if (awarded.length === 0) {
            console.warn("[auto-badges] No awarded submissions for challenge", { challengeId })
            return { awardedCount: 0 }
        }

        const sorted = [...awarded].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        const topCount = Math.max(1, Math.floor(sorted.length * TOP_PERCENT_THRESHOLD))

        let badgesAwarded = 0

        // Award Category Winner to highest scorer
        const winner = sorted[0]
        await ctx.runMutation(internal.autoBadges.awardRankBadge, {
            userId: winner.userId,
            submissionId: winner._id,
            challengeId,
            name: CATEGORY_WINNER_BADGE_NAME,
            color: CATEGORY_WINNER_BADGE_COLOR,
            level: 4,
        })
        badgesAwarded++

        // Award Top 10% to top decile (excluding winner who already got Category Winner)
        for (const sub of sorted.slice(1, topCount)) {
            await ctx.runMutation(internal.autoBadges.awardRankBadge, {
                userId: sub.userId,
                submissionId: sub._id,
                challengeId,
                name: TOP_PERCENT_BADGE_NAME,
                color: TOP_PERCENT_BADGE_COLOR,
                level: 3,
            })
            badgesAwarded++
        }

        // Close the challenge
        await ctx.runMutation(internal.challenges.setStatus, {
            challengeId,
            status: "closed",
        })

        console.log(`[auto-badges] Awarded ${badgesAwarded} rank badges for challenge ${challengeId}`)
        return { awardedCount: badgesAwarded }
    },
})

export const awardSponsorFavorite = action({
    args: {
        submissionId: v.id("submissions"),
        challengeId: v.id("challenges"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity()
        if (!identity) throw new Error("Unauthenticated")

        const user = await ctx.runQuery(internal.users.getByIdInternal, { subject: identity.subject })
        if (!user || user.role !== "sponsor") {
            throw new Error("Only sponsors can award favorites")
        }

        const submission = await ctx.runQuery(internal.submissions.getById, { submissionId: args.submissionId })
        if (!submission) throw new Error("Submission not found")

        await ctx.runMutation(internal.autoBadges.awardRankBadge, {
            userId: submission.userId,
            submissionId: args.submissionId,
            challengeId: args.challengeId,
            name: "Sponsor Favorite",
            color: "#2563EB",
            level: 3,
        })
    },
})

export const awardRankBadge = internalMutation({
    args: {
        userId: v.id("users"),
        submissionId: v.id("submissions"),
        challengeId: v.id("challenges"),
        name: v.string(),
        color: v.string(),
        level: v.number(),
    },
    handler: async (ctx, args) => {
        // Idempotent — don't double-award same badge+submission
        const existingBadges = await ctx.db
            .query("badges")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect()
        const alreadyAwarded = existingBadges.some(
            (b) => b.submissionId === args.submissionId && b.name === args.name,
        )
        if (alreadyAwarded) return

        await ctx.db.insert("badges", {
            userId: args.userId,
            submissionId: args.submissionId,
            challengeId: args.challengeId,
            name: args.name,
            color: args.color,
            level: args.level,
            awardedAt: Date.now(),
        })

        const user = await ctx.db.get(args.userId)
        if (user) {
            await ctx.db.patch(args.userId, { points: user.points + (args.level * 10) })
        }

        await ctx.db.insert("notifications", {
            userId: args.userId,
            type: "award",
            content: `Congratulations! You earned the "${args.name}" rank for your EliteBuilders submission.`,
            read: false,
            relatedId: args.submissionId,
        })
    },
})
