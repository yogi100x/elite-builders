import { action, internalMutation } from "./_generated/server"
import { v } from "convex/values"
import { requireAuth } from "./lib/auth"
import { internal } from "./_generated/api"

const MILESTONE_BADGES = [
    { trigger: "submissions", threshold: 5, name: "Active Builder", color: "#10B981", level: 2 },
    { trigger: "submissions", threshold: 10, name: "Prolific Builder", color: "#2563EB", level: 3 },
    { trigger: "submissions", threshold: 25, name: "Master Builder", color: "hsl(258 90% 66%)", level: 4 },
    { trigger: "points", threshold: 100, name: "Century Club", color: "#F59E0B", level: 2 },
    { trigger: "points", threshold: 500, name: "Elite Builder", color: "#EF4444", level: 4 },
    { trigger: "awards", threshold: 3, name: "Award Collector", color: "#2563EB", level: 2 },
    { trigger: "awards", threshold: 10, name: "Award Master", color: "hsl(258 90% 66%)", level: 4 },
] as const;

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

export const checkMilestones = internalMutation({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) return;

        const submissions = await ctx.db
            .query("submissions")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();

        const awardedCount = submissions.filter((s) => s.status === "awarded").length;
        const existingBadges = await ctx.db
            .query("badges")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();
        const existingBadgeNames = new Set(existingBadges.map((b) => b.name));

        for (const milestone of MILESTONE_BADGES) {
            if (existingBadgeNames.has(milestone.name)) continue;

            let count = 0;
            if (milestone.trigger === "submissions") count = submissions.length;
            else if (milestone.trigger === "points") count = user.points;
            else if (milestone.trigger === "awards") count = awardedCount;

            if (count >= milestone.threshold) {
                const latestSubmission = submissions.sort(
                    (a, b) => b._creationTime - a._creationTime,
                )[0];
                if (!latestSubmission) continue;

                await ctx.db.insert("badges", {
                    userId: args.userId,
                    submissionId: latestSubmission._id,
                    challengeId: latestSubmission.challengeId,
                    name: milestone.name,
                    color: milestone.color,
                    level: milestone.level,
                    awardedAt: Date.now(),
                });

                await ctx.db.patch(args.userId, {
                    points: user.points + milestone.level * 10,
                });

                await ctx.db.insert("notifications", {
                    userId: args.userId,
                    type: "award",
                    content: `Achievement unlocked: ${milestone.name}!`,
                    read: false,
                });
            }
        }
    },
})
