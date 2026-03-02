import { mutation, query, action, internalQuery, internalMutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireAuth } from "./lib/auth";
import type { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";

// Export User type for use in other modules
export type User = Doc<"users">;

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

export const getByClerkId = internalQuery({
    args: { clerkId: v.string() },
    handler: async (ctx, { clerkId }) => {
        return ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
            .unique()
    },
})

export const getById = internalQuery({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => ctx.db.get(userId),
});

export const becomeSponsor = mutation({
    args: {
        orgName: v.string(),
        logoUrl: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const caller = await requireAuth(ctx);
        if (caller.role !== "candidate") {
            throw new ConvexError(`Cannot become a sponsor — your current role is "${caller.role}"`);
        }
        await ctx.db.patch(caller._id, { role: "sponsor" });
        const sponsorId = await ctx.db.insert("sponsors", {
            userId: caller._id,
            orgName: args.orgName,
            logoUrl: args.logoUrl,
        });
        return sponsorId;
    },
});

export const getPublicProfile = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) return null;

        const badges = await ctx.db
            .query("badges")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();

        const submissions = await ctx.db
            .query("submissions")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();

        const awardedCount = submissions.filter(
            (s) => s.status === "awarded",
        ).length;

        return {
            _id: user._id,
            name: user.name,
            profileImageUrl: user.profileImageUrl,
            githubUsername: user.githubUsername,
            portfolioUrl: user.portfolioUrl,
            bio: user.bio,
            skills: user.skills,
            linkedinUrl: user.linkedinUrl,
            twitterUrl: user.twitterUrl,
            points: user.points,
            badges,
            totalSubmissions: submissions.length,
            awardedSubmissions: awardedCount,
        };
    },
});

export const updateProfile = mutation({
    args: {
        bio: v.optional(v.string()),
        portfolioUrl: v.optional(v.string()),
        skills: v.optional(v.array(v.string())),
        linkedinUrl: v.optional(v.string()),
        twitterUrl: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const caller = await requireAuth(ctx);
        const updates: Record<string, unknown> = {};

        if (args.bio !== undefined) updates.bio = args.bio;
        if (args.portfolioUrl !== undefined) updates.portfolioUrl = args.portfolioUrl;
        if (args.skills !== undefined) updates.skills = args.skills;
        if (args.linkedinUrl !== undefined) updates.linkedinUrl = args.linkedinUrl;
        if (args.twitterUrl !== undefined) updates.twitterUrl = args.twitterUrl;

        await ctx.db.patch(caller._id, updates);
    },
});

export const updateEmailPreferences = mutation({
    args: {
        awardNotifications: v.boolean(),
        rejectionNotifications: v.boolean(),
        scoringNotifications: v.boolean(),
        sponsorInterest: v.boolean(),
        weeklyDigest: v.boolean(),
    },
    handler: async (ctx, args) => {
        const caller = await requireAuth(ctx);
        await ctx.db.patch(caller._id, {
            emailPreferences: args,
        });
    },
});

export const setGithubProfile = internalMutation({
    args: {
        userId: v.id("users"),
        githubProfile: v.string(),
    },
    handler: async (ctx, { userId, githubProfile }) => {
        await ctx.db.patch(userId, {
            githubProfile,
            githubProfileAnalyzedAt: Date.now(),
        })
    },
})

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

export const triggerProfileAnalysis = action({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity()
        if (!identity) throw new ConvexError("Not authenticated")

        const user: any = await ctx.runQuery(internal.users.getByClerkId, {
            clerkId: identity.subject,
        })
        if (!user) throw new ConvexError("User not found")

        // Schedule analysis in background — don't block the user
        await ctx.scheduler.runAfter(0, internal.github.analyzeUserProfile, {
            userId: user._id,
        })
    },
})
