import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
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
