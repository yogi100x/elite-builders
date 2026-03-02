import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./lib/auth";

export const listByUser = query({
    args: {},
    handler: async (ctx) => {
        const caller = await requireAuth(ctx);
        return ctx.db
            .query("notifications")
            .withIndex("by_user", (q) => q.eq("userId", caller._id))
            .order("desc")
            .take(20);
    },
});

export const markRead = mutation({
    args: { id: v.id("notifications") },
    handler: async (ctx, args) => {
        await requireAuth(ctx);
        await ctx.db.patch(args.id, { read: true });
    },
});

export const countUnread = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity()
        if (!identity) return 0
        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
            .unique()
        if (!user) return 0
        const unread = await ctx.db
            .query("notifications")
            .withIndex("by_user_unread", (q) => q.eq("userId", user._id).eq("read", false))
            .collect()
        return unread.length
    },
});

export const createInternal = internalMutation({
    args: {
        userId: v.id("users"),
        type: v.union(v.literal("submission"), v.literal("award"), v.literal("not-selected")),
        content: v.string(),
        relatedId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("notifications", {
            userId: args.userId,
            type: args.type,
            content: args.content,
            read: false,
            relatedId: args.relatedId,
        });
    },
});
