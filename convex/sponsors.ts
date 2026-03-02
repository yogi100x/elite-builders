import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireAuth } from "./lib/auth";

export const getMyProfile = query({
    args: {},
    handler: async (ctx) => {
        const caller = await requireAuth(ctx);
        return ctx.db
            .query("sponsors")
            .withIndex("by_user", (q) => q.eq("userId", caller._id))
            .unique();
    },
});

export const createProfile = mutation({
    args: { orgName: v.string(), logoUrl: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const caller = await requireAuth(ctx, "sponsor");
        const existing = await ctx.db
            .query("sponsors")
            .withIndex("by_user", (q) => q.eq("userId", caller._id))
            .unique();
        if (existing) return existing._id;
        return ctx.db.insert("sponsors", { userId: caller._id, ...args });
    },
});

export const updateProfile = mutation({
    args: {
        orgName: v.optional(v.string()),
        logoUrl: v.optional(v.string()),
        website: v.optional(v.string()),
        description: v.optional(v.string()),
        industry: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const caller = await requireAuth(ctx, "sponsor");
        const sponsor = await ctx.db
            .query("sponsors")
            .withIndex("by_user", (q) => q.eq("userId", caller._id))
            .unique();
        if (!sponsor) throw new ConvexError("Sponsor profile not found");

        const updates: Record<string, unknown> = {};
        if (args.orgName !== undefined) updates.orgName = args.orgName;
        if (args.logoUrl !== undefined) updates.logoUrl = args.logoUrl;
        if (args.website !== undefined) updates.website = args.website;
        if (args.description !== undefined) updates.description = args.description;
        if (args.industry !== undefined) updates.industry = args.industry;

        await ctx.db.patch(sponsor._id, updates);
    },
});
