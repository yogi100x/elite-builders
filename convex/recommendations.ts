import { internalAction, internalMutation, internalQuery, query, action, ActionCtx } from "./_generated/server"
import { v, ConvexError } from "convex/values"
import { internal } from "./_generated/api"
import { requireAuth } from "./lib/auth"
import type { Doc, Id } from "./_generated/dataModel"

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

/**
 * Internal query to check cache for a user's recommendations.
 */
export const getCached = internalQuery({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        const entry = await ctx.db
            .query("recommendationCache")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .unique()

        if (!entry) return null
        if (Date.now() - entry.generatedAt > TWENTY_FOUR_HOURS_MS) return null
        return entry.recommendations
    },
})

/**
 * Internal mutation to upsert cached recommendations.
 */
export const setCache = internalMutation({
    args: {
        userId: v.id("users"),
        recommendations: v.string(),
    },
    handler: async (ctx, { userId, recommendations }) => {
        const existing = await ctx.db
            .query("recommendationCache")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .unique()

        if (existing) {
            await ctx.db.patch(existing._id, {
                recommendations,
                generatedAt: Date.now(),
            })
        } else {
            await ctx.db.insert("recommendationCache", {
                userId,
                recommendations,
                generatedAt: Date.now(),
            })
        }
    },
})

/**
 * Generate AI-powered challenge recommendations for a candidate.
 */
export const generateForUser = internalAction({
    args: { userId: v.id("users") },
    handler: async (ctx: ActionCtx, { userId }: { userId: Id<"users"> }): Promise<Array<{ challengeId: string; matchScore: number; reason: string }>> => {
        // Check cache first
        const cached: string | null = await ctx.runQuery(internal.recommendations.getCached, { userId })
        if (cached) return JSON.parse(cached)

        const user: Doc<"users"> | null = await ctx.runQuery(internal.users.getById, { userId })
        if (!user) return []

        // Get open challenges
        const challenges: Doc<"challenges">[] = await ctx.runQuery(internal.challenges.listOpenInternal, {})
        if (challenges.length === 0) return []

        // Get user's existing submissions to exclude
        const submissions: Doc<"submissions">[] = await ctx.runQuery(internal.submissions.listByUserInternal, {
            userId,
        })
        const submittedChallengeIds = new Set(submissions.map((s) => s.challengeId.toString()))

        // Filter out already-submitted challenges
        const availableChallenges = challenges.filter(
            (c) => !submittedChallengeIds.has(c._id.toString()),
        )
        if (availableChallenges.length === 0) return []

        // Build Gemini prompt
        const profileData = user.githubProfile ? JSON.parse(user.githubProfile) : null
        const profileSection = profileData
            ? `GitHub Profile Analysis:
  Languages: ${profileData.primaryLanguages?.join(", ") ?? "unknown"}
  Frameworks: ${profileData.frameworks?.join(", ") ?? "unknown"}
  Domains: ${profileData.domains?.join(", ") ?? "unknown"}
  Experience: ${profileData.experienceLevel ?? "unknown"}
  Summary: ${profileData.summary ?? "none"}`
            : "No GitHub profile analysis available."

        const challengeList = availableChallenges
            .map(
                (c) =>
                    `ID: ${c._id} | Title: ${c.title} | Difficulty: ${c.difficulty} | Tags: ${c.tags.join(", ")} | Summary: ${c.summary.slice(0, 200)}`,
            )
            .join("\n")

        const { GoogleGenerativeAI } = await import("@google/generative-ai")
        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey) return []

        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({
            model: process.env.GEMINI_SCORING_MODEL ?? "gemini-3-flash",
        })

        const prompt = `Match this developer to the most relevant open challenges.

Developer Profile:
  Self-reported skills: ${(user.skills ?? []).join(", ") || "none"}
  Bio: ${user.bio ?? "none provided"}
  ${profileSection}

Available Challenges:
${challengeList}

Return ONLY valid JSON — an array of the top 3-5 best matches (or fewer if not enough good matches). Only include challenges with matchScore >= 40.

[
  { "challengeId": "<exact ID from list>", "matchScore": <40-100>, "reason": "<1 sentence why this matches>" }
]

If no challenges are a good match, return an empty array: []`

        try {
            const result = await model.generateContent(prompt)
            const rawText = result.response.text().trim()
            const cleanedText = rawText.replace(/^```json/m, "").replace(/^```/m, "").trim()
            const recommendations = JSON.parse(cleanedText)

            // Cache results
            await ctx.runMutation(internal.recommendations.setCache, {
                userId,
                recommendations: JSON.stringify(recommendations),
            })

            return recommendations
        } catch (error) {
            console.error("[recommendations] Generation failed:", error)
            return []
        }
    },
})

/**
 * Public query that returns cached recommendations (or empty array).
 * The action is triggered separately to avoid blocking the UI.
 */
export const getForCurrentUser = query({
    handler: async (ctx) => {
        const caller = await requireAuth(ctx)
        const entry = await ctx.db
            .query("recommendationCache")
            .withIndex("by_user", (q) => q.eq("userId", caller._id))
            .unique()

        if (!entry) return null
        if (Date.now() - entry.generatedAt > TWENTY_FOUR_HOURS_MS) return null

        return JSON.parse(entry.recommendations)
    },
})

/**
 * Public action to trigger recommendation generation (called from dashboard).
 */
export const triggerGeneration = action({
    args: {},
    handler: async (ctx: ActionCtx) => {
        const identity = await ctx.auth.getUserIdentity()
        if (!identity) throw new ConvexError("Not authenticated")

        const user: Doc<"users"> | null = await ctx.runQuery(internal.users.getByClerkId, {
            clerkId: identity.subject,
        })
        if (!user) throw new ConvexError("User not found")

        await ctx.scheduler.runAfter(0, internal.recommendations.generateForUser, {
            userId: user._id,
        })
    },
})
