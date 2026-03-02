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
        portfolioUrl: v.optional(v.string()),
        resumeStorageId: v.optional(v.id("_storage")),
        bio: v.optional(v.string()),
        skills: v.optional(v.array(v.string())),
        linkedinUrl: v.optional(v.string()),
        twitterUrl: v.optional(v.string()),
        emailPreferences: v.optional(
            v.object({
                awardNotifications: v.boolean(),
                rejectionNotifications: v.boolean(),
                scoringNotifications: v.boolean(),
                sponsorInterest: v.boolean(),
                weeklyDigest: v.boolean(),
            }),
        ),
        githubProfile: v.optional(v.string()),          // JSON: Gemini-generated skill profile
        githubProfileAnalyzedAt: v.optional(v.number()), // timestamp of last analysis
    })
        .index("by_clerk_id", ["clerkId"])
        .index("by_email", ["email"]),

    sponsors: defineTable({
        userId: v.id("users"),
        orgName: v.string(),
        logoUrl: v.optional(v.string()),
        website: v.optional(v.string()),
        description: v.optional(v.string()),
        industry: v.optional(v.string()),
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
        status: v.union(v.literal("draft"), v.literal("open"), v.literal("closed")),
        prize: v.string(),
        deadline: v.number(),
        dataPackUrl: v.optional(v.string()),
        rubricCriteria: v.optional(
            v.array(
                v.object({
                    name: v.string(),
                    maxScore: v.number(),
                    description: v.string(),
                }),
            ),
        ),
        assignedJudges: v.optional(v.array(v.id("users"))),
        season: v.optional(v.string()),
        templateRepoUrl: v.optional(v.string()),
        templateRepoOwner: v.optional(v.string()),
        templateRepoName: v.optional(v.string()),
        hiddenTestFileIds: v.optional(v.array(v.id("_storage"))),
        testRunCommand: v.optional(v.string()),
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

        // AI scoring pipeline state (real-time tracking)
        scoringStatus: v.optional(
            v.union(
                v.literal("pending"),
                v.literal("scoring"),
                v.literal("scored"),
                v.literal("failed"),
            ),
        ),

        // AI-generated provisional score (set automatically after submission)
        provisionalScore: v.optional(v.number()),
        codeQualityScore: v.optional(v.number()),    // 0-100 code quality score (separate from rubric)
        aiRubricFeedback: v.optional(v.string()),    // JSON string: per-criterion breakdown
        aiScoredAt: v.optional(v.number()),

        // Revision tracking
        version: v.optional(v.number()),
        previousSubmissionId: v.optional(v.id("submissions")),

        // Test results
        testResults: v.optional(
            v.object({
                passed: v.number(),
                failed: v.number(),
                total: v.number(),
                details: v.optional(v.string()),
            }),
        ),

        // Judge override (human review)
        score: v.optional(v.number()),
        feedback: v.optional(v.string()),
        judgedBy: v.optional(v.id("users")),

        // Timing
        startedAt: v.optional(v.number()),
        submittedAt: v.optional(v.number()),
    })
        .index("by_challenge", ["challengeId"])
        .index("by_user", ["userId"])
        .index("by_status", ["status"])
        .index("by_challenge_status", ["challengeId", "status"])
        .index("by_challenge_user", ["challengeId", "userId"]),

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
            v.literal("engagement"),
        ),
        content: v.string(),
        read: v.boolean(),
        relatedId: v.optional(v.string()),
    })
        .index("by_user", ["userId"])
        .index("by_user_unread", ["userId", "read"]),

    sponsorApplications: defineTable({
        userId: v.id("users"),
        orgName: v.string(),
        website: v.optional(v.string()),
        description: v.optional(v.string()),
        industry: v.optional(v.string()),
        contactEmail: v.string(),
        status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
        reviewedBy: v.optional(v.id("users")),
        reviewedAt: v.optional(v.number()),
        rejectionReason: v.optional(v.string()),
    })
        .index("by_user", ["userId"])
        .index("by_status", ["status"]),

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

    githubAnalysisCache: defineTable({
        owner: v.string(),
        repo: v.string(),
        analysis: v.string(), // JSON-stringified RepoAnalysis
        cachedAt: v.number(), // Date.now() when cached
    }).index("by_repo", ["owner", "repo"]),

    engagements: defineTable({
        sponsorId: v.id("sponsors"),
        candidateId: v.id("users"),
        submissionId: v.id("submissions"),
        challengeId: v.id("challenges"),
        message: v.string(),
        status: v.union(
            v.literal("pending"),
            v.literal("accepted"),
            v.literal("declined"),
        ),
    })
        .index("by_sponsor", ["sponsorId"])
        .index("by_candidate", ["candidateId"])
        .index("by_submission", ["submissionId"]),

    recommendationCache: defineTable({
        userId: v.id("users"),
        recommendations: v.string(), // JSON: array of { challengeId, matchScore, reason }
        generatedAt: v.number(),
    }).index("by_user", ["userId"]),

    challengeBookmarks: defineTable({
        userId: v.id("users"),
        challengeId: v.id("challenges"),
        createdAt: v.number(),
    }).index("by_user", ["userId"])
      .index("by_user_challenge", ["userId", "challengeId"]),
});
