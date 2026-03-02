import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./lib/auth";

export const listByUser = query({
    args: {},
    handler: async (ctx) => {
        const caller = await requireAuth(ctx);
        return ctx.db
            .query("badges")
            .withIndex("by_user", (q) => q.eq("userId", caller._id))
            .collect();
    },
});

// Global leaderboard: top users by points (configurable limit, default 50)
export const leaderboard = query({
    args: { limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const cap = args.limit ?? 50;
        const users = await ctx.db.query("users").collect();
        const sorted = users
            .filter((u) => u.points > 0)
            .sort((a, b) => b.points - a.points)
            .slice(0, cap);

        return Promise.all(
            sorted.map(async (user) => {
                const userBadges = await ctx.db
                    .query("badges")
                    .withIndex("by_user", (q) => q.eq("userId", user._id))
                    .take(4);
                return { ...user, badges: userBadges };
            }),
        );
    },
});

// Per-challenge leaderboard: ranked awarded submissions for a specific challenge
export const challengeLeaderboard = query({
    args: { challengeId: v.id("challenges") },
    handler: async (ctx, args) => {
        const submissions = await ctx.db
            .query("submissions")
            .withIndex("by_challenge_status", (q) =>
                q.eq("challengeId", args.challengeId).eq("status", "awarded"),
            )
            .collect();

        const ranked = submissions
            .map((s) => ({
                ...s,
                effectiveScore: s.score ?? s.provisionalScore ?? 0,
            }))
            .sort((a, b) => b.effectiveScore - a.effectiveScore);

        const results = await Promise.all(
            ranked.map(async (submission, index) => {
                const user = await ctx.db.get(submission.userId);
                const badges = await ctx.db
                    .query("badges")
                    .withIndex("by_user", (q) => q.eq("userId", submission.userId))
                    .filter((q) => q.eq(q.field("challengeId"), args.challengeId))
                    .collect();

                return {
                    rank: index + 1,
                    user: user
                        ? {
                              _id: user._id,
                              name: user.name,
                              profileImageUrl: user.profileImageUrl,
                              githubUsername: user.githubUsername,
                          }
                        : null,
                    score: submission.effectiveScore,
                    badges,
                    submissionId: submission._id,
                };
            }),
        );
        return results;
    },
});

export const getCareerScore = query({
    handler: async (ctx) => {
        const caller = await requireAuth(ctx);

        const submissions = await ctx.db
            .query("submissions")
            .withIndex("by_user", (q) => q.eq("userId", caller._id))
            .collect();

        const badges = await ctx.db
            .query("badges")
            .withIndex("by_user", (q) => q.eq("userId", caller._id))
            .collect();

        const awarded = submissions.filter((s) => s.status === "awarded");
        const avgScore =
            awarded.length > 0
                ? awarded.reduce(
                      (sum, s) => sum + (s.score ?? s.provisionalScore ?? 0),
                      0,
                  ) / awarded.length
                : 0;

        const basePoints = caller.points;
        const performanceScore = Math.round(avgScore * awarded.length * 0.5);
        const consistencyBonus = submissions.length >= 5 ? 50 : submissions.length * 10;

        const careerScore = basePoints + performanceScore + consistencyBonus;

        return {
            careerScore,
            breakdown: {
                badgePoints: basePoints,
                performanceScore,
                consistencyBonus,
                averageScore: Math.round(avgScore),
                totalSubmissions: submissions.length,
                awardedSubmissions: awarded.length,
                totalBadges: badges.length,
            },
        };
    },
});

/** Awards a "First Build" badge if this is the user's first submission */
export const grantFirstBuild = internalMutation({
    args: { userId: v.id("users"), submissionId: v.id("submissions"), challengeId: v.id("challenges") },
    handler: async (ctx, args) => {
        // Check if this is their first submission
        const submissions = await ctx.db
            .query("submissions")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();
        if (submissions.length !== 1) return; // Not first submission — skip

        // Check if they already have a "First Build" badge (idempotency)
        const existingBadges = await ctx.db
            .query("badges")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();
        if (existingBadges.some((b) => b.name === "First Build")) return;

        // Award the badge
        await ctx.db.insert("badges", {
            userId: args.userId,
            submissionId: args.submissionId,
            challengeId: args.challengeId,
            name: "First Build",
            color: "#10B981",
            level: 1,
            awardedAt: Date.now(),
        });

        // Notify the user
        await ctx.db.insert("notifications", {
            userId: args.userId,
            type: "award",
            content: 'You earned the "First Build" badge! Welcome to EliteBuilders.',
            read: false,
            relatedId: args.submissionId,
        });
    },
});
