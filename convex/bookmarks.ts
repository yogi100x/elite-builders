import { v, ConvexError } from "convex/values";
import { query, mutation } from "./_generated/server";

/** Helper: resolve the current user from JWT identity */
async function getCurrentUser(ctx: { auth: { getUserIdentity: () => Promise<any> }; db: any }) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
        .unique();
}

export const getBookmarked = query({
    args: {},
    handler: async (ctx) => {
        const user = await getCurrentUser(ctx);
        if (!user) return [];

        const bookmarks = await ctx.db
            .query("challengeBookmarks")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
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
        const user = await getCurrentUser(ctx);
        if (!user) return false;

        const bookmark = await ctx.db
            .query("challengeBookmarks")
            .withIndex("by_user_challenge", (q) =>
                q.eq("userId", user._id).eq("challengeId", args.challengeId)
            )
            .first();
        return !!bookmark;
    },
});

export const bookmark = mutation({
    args: { challengeId: v.id("challenges") },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) throw new ConvexError("Not authenticated");

        const existing = await ctx.db
            .query("challengeBookmarks")
            .withIndex("by_user_challenge", (q) =>
                q.eq("userId", user._id).eq("challengeId", args.challengeId)
            )
            .first();

        if (!existing) {
            await ctx.db.insert("challengeBookmarks", {
                userId: user._id,
                challengeId: args.challengeId,
                createdAt: Date.now(),
            });
        }
    },
});

export const unbookmark = mutation({
    args: { challengeId: v.id("challenges") },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) throw new ConvexError("Not authenticated");

        const bookmark = await ctx.db
            .query("challengeBookmarks")
            .withIndex("by_user_challenge", (q) =>
                q.eq("userId", user._id).eq("challengeId", args.challengeId)
            )
            .first();

        if (bookmark) {
            await ctx.db.delete(bookmark._id);
        }
    },
});
