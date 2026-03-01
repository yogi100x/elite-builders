import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    users: defineTable({
        clerkId: v.string(),
        email: v.string(),
        name: v.string(),
        profileImageUrl: v.optional(v.string()),
        role: v.union(
            v.literal("candidate"),
            v.literal("sponsor"),
            v.literal("judge"),
            v.literal("admin"),
        ),
        points: v.number(),
        githubUsername: v.optional(v.string()),
        githubConnectedAt: v.optional(v.number()),
    })
        .index("by_clerk_id", ["clerkId"])
        .index("by_email", ["email"]),

    sponsors: defineTable({
        userId: v.id("users"),
        orgName: v.string(),
        logoUrl: v.optional(v.string()),
    }).index("by_user", ["userId"]),

    challenges: defineTable({
        sponsorId: v.id("sponsors"),
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
        status: v.union(v.literal("open"), v.literal("closed")),
        prize: v.string(),
        deadline: v.number(),
    })
        .index("by_sponsor", ["sponsorId"])
        .index("by_status", ["status"])
        .searchIndex("search_challenges", {
            searchField: "title",
            filterFields: ["status", "difficulty"],
        }),

    submissions: defineTable({
        userId: v.id("users"),
        challengeId: v.id("challenges"),

        // GitHub repo selection (primary submission method)
        githubOwner: v.optional(v.string()),       // "octocat"
        githubRepo: v.optional(v.string()),        // "hello-world"
        githubRepoUrl: v.optional(v.string()),     // "https://github.com/octocat/hello-world"
        githubDefaultBranch: v.optional(v.string()),

        // Fallback: manual URL for non-GitHub repos
        repoUrl: v.optional(v.string()),

        // Supplementary links
        deckUrl: v.optional(v.string()),
        videoUrl: v.optional(v.string()),
        notes: v.optional(v.string()),
        fileStorageIds: v.array(v.id("_storage")),

        // Review state
        status: v.union(
            v.literal("in-review"),
            v.literal("awarded"),
            v.literal("not-selected"),
        ),

        // AI-generated provisional score (set automatically after submission)
        provisionalScore: v.optional(v.number()),
        aiRubricFeedback: v.optional(v.string()),    // JSON string: per-criterion breakdown
        aiScoredAt: v.optional(v.number()),

        // Judge override (human review)
        score: v.optional(v.number()),
        feedback: v.optional(v.string()),
        judgedBy: v.optional(v.id("users")),
    })
        .index("by_challenge", ["challengeId"])
        .index("by_user", ["userId"])
        .index("by_status", ["status"])
        .index("by_challenge_status", ["challengeId", "status"]),

    badges: defineTable({
        userId: v.id("users"),
        submissionId: v.id("submissions"),
        challengeId: v.id("challenges"),
        name: v.string(),
        color: v.string(),
        level: v.number(),
        awardedAt: v.number(),
    })
        .index("by_user", ["userId"])
        .index("by_challenge", ["challengeId"]),

    notifications: defineTable({
        userId: v.id("users"),
        type: v.union(
            v.literal("submission"),
            v.literal("award"),
            v.literal("not-selected"),
        ),
        content: v.string(),
        read: v.boolean(),
        relatedId: v.optional(v.string()),
    })
        .index("by_user", ["userId"])
        .index("by_user_unread", ["userId", "read"]),

    invites: defineTable({
        email: v.string(),
        role: v.union(v.literal("sponsor"), v.literal("judge")),
        orgName: v.optional(v.string()), // Used to pre-fill Sponsor org name
        token: v.string(), // Secure, randomly generated
        status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("revoked")),
        createdBy: v.id("users"), // The admin who created it
    })
        .index("by_email", ["email"])
        .index("by_token", ["token"]),
});
