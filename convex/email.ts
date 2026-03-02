import { internalAction } from "./_generated/server"
import { v } from "convex/values"
import { internal } from "./_generated/api"
import { sendAwardEmail, sendRejectionEmail, sendSponsorInterestEmail, sendScoringEmail, sendWeeklyDigestEmail } from "./lib/email"

export const sendAward = internalAction({
    args: {
        userId: v.id("users"),
        badgeName: v.string(),
        feedback: v.string(),
        score: v.number(),
    },
    handler: async (ctx, args) => {
        const internalUser: any = await ctx.runQuery(internal.users.getById, { userId: args.userId })
        if (!internalUser) return
        const prefs = internalUser.emailPreferences
        if (prefs && !prefs.awardNotifications) return
        await sendAwardEmail(internalUser.email, internalUser.name, args.badgeName, args.feedback, args.score)
    },
})

export const sendRejection = internalAction({
    args: { userId: v.id("users"), feedback: v.string() },
    handler: async (ctx, args) => {
        const internalUser: any = await ctx.runQuery(internal.users.getById, { userId: args.userId })
        if (!internalUser) return
        const prefs = internalUser.emailPreferences
        if (prefs && !prefs.rejectionNotifications) return
        await sendRejectionEmail(internalUser.email, internalUser.name, args.feedback)
    },
})

export const sendSponsorInterest = internalAction({
    args: {
        userId: v.id("users"),
        sponsorOrgName: v.string(),
        message: v.string(),
    },
    handler: async (ctx, args) => {
        const internalUser: any = await ctx.runQuery(internal.users.getById, { userId: args.userId })
        if (!internalUser) return
        const prefs = internalUser.emailPreferences
        if (prefs && !prefs.sponsorInterest) return
        await sendSponsorInterestEmail(internalUser.email, internalUser.name, args.sponsorOrgName, args.message)
    },
})

export const sendScoring = internalAction({
    args: {
        userId: v.id("users"),
        challengeTitle: v.string(),
        provisionalScore: v.number(),
    },
    handler: async (ctx, args) => {
        const internalUser: any = await ctx.runQuery(internal.users.getById, { userId: args.userId })
        if (!internalUser) return
        const prefs = internalUser.emailPreferences
        if (prefs && !prefs.scoringNotifications) return
        await sendScoringEmail(internalUser.email, internalUser.name, args.challengeTitle, args.provisionalScore)
    },
})

export const processWeeklyDigest = internalAction({
    args: {},
    handler: async (ctx) => {
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

        // Get candidates only — sponsors/judges/admins don't need digest emails
        const allUsers = await ctx.runQuery(internal.users.listAllInternal, {})
        const candidates = allUsers.filter((u) => u.role === "candidate")

        // Count new challenges this week
        const challenges = await ctx.runQuery(internal.challenges.listAllInternal, {})
        const newChallengeCount = challenges.filter(
            (c) => c._creationTime >= oneWeekAgo,
        ).length

        // Get leaderboard for rank lookup
        const leaderboard = await ctx.runQuery(internal.badges.leaderboardInternal, {})

        // Fetch all badges once to avoid N+1 queries per user
        const allBadges = await ctx.runQuery(internal.badges.listAllBadgesInternal, {})

        for (const user of candidates) {
            // Check if user opted into weekly digest
            const prefs = user.emailPreferences
            if (prefs && !prefs.weeklyDigest) continue

            // Count badges earned by this user in the past week (from pre-fetched data)
            const newBadgeCount = allBadges.filter(
                (b) => b.userId === user._id && b.awardedAt >= oneWeekAgo,
            ).length

            // Find leaderboard rank
            const rankIndex = leaderboard.findIndex(
                (entry) => entry._id === user._id,
            )
            const rank = rankIndex >= 0 ? rankIndex + 1 : null

            await sendWeeklyDigestEmail(
                user.email,
                user.name,
                newChallengeCount,
                newBadgeCount,
                rank,
            )
        }
    },
})
