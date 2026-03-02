import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./lib/auth";

export const listPublic = query({
    args: {
        difficulty: v.optional(v.string()),
        status: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const challenges = args.status
            ? await ctx.db
                .query("challenges")
                .withIndex("by_status", (q) => q.eq("status", args.status as "open" | "closed"))
                .collect()
            : await ctx.db.query("challenges").collect();

        return args.difficulty
            ? challenges.filter((c) => c.difficulty === args.difficulty)
            : challenges;
    },
});

export const getById = query({
    args: { id: v.id("challenges") },
    handler: async (ctx, args) => {
        return ctx.db.get(args.id);
    },
});

export const getByIdInternal = internalQuery({
    args: { id: v.id("challenges") },
    handler: async (ctx, { id }) => ctx.db.get(id),
});

export const listTopSix = query({
    args: {},
    handler: async (ctx) => {
        return ctx.db
            .query("challenges")
            .withIndex("by_status", (q) => q.eq("status", "open"))
            .take(6);
    },
});

export const create = mutation({
    args: {
        title: v.string(),
        summary: v.string(),
        overview: v.string(),
        problemStatement: v.string(),
        tags: v.array(v.string()),
        difficulty: v.union(
            v.literal("beginner"),
            v.literal("intermediate"),
            v.literal("advanced"),
            v.literal("expert"),
        ),
        prize: v.string(),
        deadline: v.number(),
        rubricCriteria: v.optional(
            v.array(
                v.object({
                    name: v.string(),
                    maxScore: v.number(),
                    description: v.string(),
                }),
            ),
        ),
        dataPackUrl: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const caller = await requireAuth(ctx, "sponsor");
        const sponsor = await ctx.db
            .query("sponsors")
            .withIndex("by_user", (q) => q.eq("userId", caller._id))
            .unique();
        if (!sponsor) throw new Error("Sponsor profile not found");

        return ctx.db.insert("challenges", {
            ...args,
            sponsorId: sponsor._id,
            status: "open",
        });
    },
});

export const update = mutation({
    args: {
        id: v.id("challenges"),
        title: v.optional(v.string()),
        summary: v.optional(v.string()),
        overview: v.optional(v.string()),
        problemStatement: v.optional(v.string()),
        prize: v.optional(v.string()),
        deadline: v.optional(v.number()),
        rubricCriteria: v.optional(
            v.array(
                v.object({
                    name: v.string(),
                    maxScore: v.number(),
                    description: v.string(),
                }),
            ),
        ),
        dataPackUrl: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const caller = await requireAuth(ctx, "sponsor");
        const challenge = await ctx.db.get(args.id);
        if (!challenge) throw new Error("Challenge not found");
        const sponsor = await ctx.db
            .query("sponsors")
            .withIndex("by_user", (q) => q.eq("userId", caller._id))
            .unique();
        if (!sponsor || challenge.sponsorId !== sponsor._id) {
            throw new Error("Not your challenge");
        }
        const { id, ...patch } = args;
        await ctx.db.patch(id, patch);
    },
});

export const close = mutation({
    args: { id: v.id("challenges") },
    handler: async (ctx, args) => {
        await requireAuth(ctx, "sponsor");
        await ctx.db.patch(args.id, { status: "closed" });
    },
});

export const setStatus = internalMutation({
    args: { challengeId: v.id("challenges"), status: v.union(v.literal("open"), v.literal("closed")) },
    handler: async (ctx, { challengeId, status }) => {
        await ctx.db.patch(challengeId, { status })
    },
})

export const listBySponsor = query({
    args: {},
    handler: async (ctx) => {
        const caller = await requireAuth(ctx);
        const sponsor = await ctx.db
            .query("sponsors")
            .withIndex("by_user", (q) => q.eq("userId", caller._id))
            .unique();
        if (!sponsor) return [];
        return ctx.db
            .query("challenges")
            .withIndex("by_sponsor", (q) => q.eq("sponsorId", sponsor._id))
            .collect();
    },
});
