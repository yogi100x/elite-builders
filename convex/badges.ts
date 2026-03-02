import { query, internalMutation, internalQuery } from "./_generated/server";
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

// Global leaderboard: top users by points with optional time period and season filtering
export const leaderboard = query({
    args: {
        limit: v.optional(v.number()),
        offset: v.optional(v.number()),
        period: v.optional(
            v.union(
                v.literal("all-time"),
                v.literal("month"),
                v.literal("week"),
            ),
        ),
        season: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit ?? 50;
        const offset = args.offset ?? 0;
        const period = args.period ?? "all-time";

        // If season is specified, get challenge IDs for that season
        let seasonChallengeIds: Set<string> | null = null;
        if (args.season) {
            const challenges = await ctx.db.query("challenges").collect();
            seasonChallengeIds = new Set(
                challenges
                    .filter((c) => c.season === args.season)
                    .map((c) => c._id.toString()),
            );
        }

        if (period === "all-time") {
            // When season is active, compute from badges rather than user points
            if (seasonChallengeIds) {
                const allBadges = await ctx.db.query("badges").collect();
                const seasonBadges = allBadges.filter((b) =>
                    seasonChallengeIds!.has(b.challengeId.toString()),
                );

                const userPoints = new Map<string, number>();
                for (const badge of seasonBadges) {
                    const current = userPoints.get(badge.userId.toString()) ?? 0;
                    userPoints.set(badge.userId.toString(), current + badge.level * 10);
                }

                const allSorted = [...userPoints.entries()].sort((a, b) => b[1] - a[1]);
                const hasMore = allSorted.length > offset + limit;
                const sorted = allSorted.slice(offset, offset + limit);

                const entries = await Promise.all(
                    sorted.map(async ([userId, pts]) => {
                        const user = await ctx.db.get(userId as any);
                        const badges = await ctx.db
                            .query("badges")
                            .withIndex("by_user", (q) => q.eq("userId", userId as any))
                            .take(4);
                        return { ...user!, points: pts, badges, skills: (user as any)?.skills ?? [] };
                    }),
                );
                return { entries, hasMore };
            }

            // Original all-time logic (no season filter)
            const allUsers = await ctx.db.query("users").collect();
            const allRanked = allUsers
                .filter((u) => u.points > 0)
                .sort((a, b) => b.points - a.points);
            const hasMore = allRanked.length > offset + limit;
            const ranked = allRanked.slice(offset, offset + limit);

            const entries = await Promise.all(
                ranked.map(async (user) => {
                    const badges = await ctx.db
                        .query("badges")
                        .withIndex("by_user", (q) => q.eq("userId", user._id))
                        .take(4);
                    return { ...user, badges, skills: user.skills ?? [] };
                }),
            );
            return { entries, hasMore };
        }

        // Time-filtered: aggregate from badges awarded in the period
        const cutoff =
            period === "week"
                ? Date.now() - 7 * 24 * 60 * 60 * 1000
                : Date.now() - 30 * 24 * 60 * 60 * 1000;

        const recentBadges = await ctx.db.query("badges").collect();
        const filtered = recentBadges.filter((b) => {
            if (b.awardedAt < cutoff) return false;
            if (seasonChallengeIds && !seasonChallengeIds.has(b.challengeId.toString())) return false;
            return true;
        });

        // Aggregate points per user
        const userPoints = new Map<string, number>();
        for (const badge of filtered) {
            const current = userPoints.get(badge.userId.toString()) ?? 0;
            userPoints.set(badge.userId.toString(), current + badge.level * 10);
        }

        // Sort and paginate
        const allSorted = [...userPoints.entries()]
            .sort((a, b) => b[1] - a[1]);
        const hasMore = allSorted.length > offset + limit;
        const sorted = allSorted.slice(offset, offset + limit);

        const entries = await Promise.all(
            sorted.map(async ([userId]) => {
                const user = await ctx.db.get(userId as any);
                const badges = await ctx.db
                    .query("badges")
                    .withIndex("by_user", (q) => q.eq("userId", userId as any))
                    .take(4);
                const userDoc = user as any;
                return { ...userDoc!, points: userPoints.get(userId)!, badges, skills: userDoc!.skills ?? [] };
            }),
        );
        return { entries, hasMore };
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

export const getProgression = query({
    handler: async (ctx) => {
        const caller = await requireAuth(ctx);

        const badges = await ctx.db
            .query("badges")
            .withIndex("by_user", (q) => q.eq("userId", caller._id))
            .collect();

        const submissions = await ctx.db
            .query("submissions")
            .withIndex("by_user", (q) => q.eq("userId", caller._id))
            .collect();

        const awardedCount = submissions.filter((s) => s.status === "awarded").length;

        const milestones = [
            { name: "Active Builder", trigger: "submissions" as const, threshold: 5, current: submissions.length },
            { name: "Prolific Builder", trigger: "submissions" as const, threshold: 10, current: submissions.length },
            { name: "Master Builder", trigger: "submissions" as const, threshold: 25, current: submissions.length },
            { name: "Century Club", trigger: "points" as const, threshold: 100, current: caller.points },
            { name: "Elite Builder", trigger: "points" as const, threshold: 500, current: caller.points },
            { name: "Award Collector", trigger: "awards" as const, threshold: 3, current: awardedCount },
            { name: "Award Master", trigger: "awards" as const, threshold: 10, current: awardedCount },
        ];

        const earnedNames = new Set(badges.map((b) => b.name));

        return milestones.map((m) => ({
            ...m,
            earned: earnedNames.has(m.name),
            progress: Math.min(m.current / m.threshold, 1),
        }));
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

export const leaderboardInternal = internalQuery({
    args: {},
    handler: async (ctx) => {
        const allUsers = await ctx.db.query("users").collect()
        return allUsers
            .filter((u) => u.points > 0)
            .sort((a, b) => b.points - a.points)
    },
})

export const listByUserInternal = internalQuery({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        return ctx.db
            .query("badges")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect()
    },
})
