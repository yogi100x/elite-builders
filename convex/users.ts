import { mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./lib/auth";

// Called by Clerk webhook — unauthenticated (uses internal mutation pattern)
export const upsertFromClerk = mutation({
    args: {
        clerkId: v.string(),
        email: v.string(),
        name: v.string(),
        profileImageUrl: v.optional(v.string()),
        role: v.optional(v.union(
            v.literal("candidate"),
            v.literal("sponsor"),
            v.literal("judge"),
            v.literal("admin"),
        )),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, {
                email: args.email,
                name: args.name,
                profileImageUrl: args.profileImageUrl,
                ...(args.role ? { role: args.role } : {}),
            });
            return existing._id;
        }

        return await ctx.db.insert("users", {
            clerkId: args.clerkId,
            email: args.email,
            name: args.name,
            profileImageUrl: args.profileImageUrl,
            role: args.role ?? "candidate",
            points: 0,
        });
    },
});

export const getMe = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;
        return ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
            .unique();
    },
});

export const assignRole = mutation({
    args: {
        targetClerkId: v.string(),
        role: v.union(
            v.literal("candidate"),
            v.literal("sponsor"),
            v.literal("judge"),
            v.literal("admin"),
        ),
    },
    handler: async (ctx, args) => {
        await requireAuth(ctx, "admin");
        const target = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.targetClerkId))
            .unique();
        if (!target) throw new Error("User not found");
        await ctx.db.patch(target._id, { role: args.role });
    },
});

export const listAll = query({
    args: {},
    handler: async (ctx) => {
        await requireAuth(ctx, "admin");
        return ctx.db.query("users").collect();
    },
});

export const getByIdInternal = internalQuery({
    args: { subject: v.string() },
    handler: async (ctx, { subject }) => {
        return ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", subject))
            .unique();
    },
});

export const getById = internalQuery({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => ctx.db.get(userId),
});

import { internalMutation } from "./_generated/server";

export const makeAdmin = internalMutation({
    args: { email: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .first();

        if (!user) throw new Error("User not found");

        await ctx.db.patch(user._id, { role: "admin" });
        return `Promoted ${args.email} to admin`;
    }
});
