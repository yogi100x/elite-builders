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

// Global leaderboard: top 50 users by points
export const leaderboard = query({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.db.query("users").collect();
        const sorted = users
            .filter((u) => u.points > 0)
            .sort((a, b) => b.points - a.points)
            .slice(0, 50);

        return Promise.all(
            sorted.map(async (user) => {
                const userBadges = await ctx.db
                    .query("badges")
                    .withIndex("by_user", (q) => q.eq("userId", user._id))
                    .collect();
                return { ...user, badges: userBadges };
            }),
        );
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
