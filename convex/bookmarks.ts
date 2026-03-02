import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getBookmarked = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];
        
        const internalUser: any = await ctx.runQuery(
            require("./users").getByClerkId,
            { clerkId: identity.subject }
        );
        if (!internalUser) return [];
        
        const bookmarks = await ctx.db
            .query("challengeBookmarks")
            .withIndex("by_user", (q) => q.eq("userId", internalUser._id))
            .collect();
        
        return Promise.all(
            bookmarks.map(async (b) => {
                const challenge = await ctx.db.get(b.challengeId);
                return { ...b, challenge };
            })
        );
    },
});

export const isBookmarked = query({
    args: { challengeId: v.id("challenges") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return false;
        
        const internalUser: any = await ctx.runQuery(
            require("./users").getByClerkId,
            { clerkId: identity.subject }
        );
        if (!internalUser) return false;
        
        const bookmark = await ctx.db
            .query("challengeBookmarks")
            .withIndex("by_user_challenge", (q) =>
                q.eq("userId", internalUser._id).eq("challengeId", args.challengeId)
            )
            .first();
        return !!bookmark;
    },
});

export const bookmark = mutation({
    args: { challengeId: v.id("challenges") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");
        
        const internalUser: any = await ctx.runQuery(
            require("./users").getByClerkId,
            { clerkId: identity.subject }
        );
        if (!internalUser) throw new Error("User not found");
        
        const existing = await ctx.db
            .query("challengeBookmarks")
            .withIndex("by_user_challenge", (q) =>
                q.eq("userId", internalUser._id).eq("challengeId", args.challengeId)
            )
            .first();
        
        if (!existing) {
            await ctx.db.insert("challengeBookmarks", {
                userId: internalUser._id,
                challengeId: args.challengeId,
                createdAt: Date.now(),
            });
        }
    },
});

export const unbookmark = mutation({
    args: { challengeId: v.id("challenges") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");
        
        const internalUser: any = await ctx.runQuery(
            require("./users").getByClerkId,
            { clerkId: identity.subject }
        );
        if (!internalUser) throw new Error("User not found");
        
        const bookmark = await ctx.db
            .query("challengeBookmarks")
            .withIndex("by_user_challenge", (q) =>
                q.eq("userId", internalUser._id).eq("challengeId", args.challengeId)
            )
            .first();
        
        if (bookmark) {
            await ctx.db.delete(bookmark._id);
        }
    },
});
