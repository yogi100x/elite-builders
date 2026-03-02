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

        // Get all users
        const users: any[] = await ctx.runQuery(internal.users.listAllInternal, {})

        // Count new challenges this week
        const challenges: any[] = await ctx.runQuery(internal.challenges.listAllInternal, {})
        const newChallengeCount = challenges.filter(
            (c: any) => c._creationTime >= oneWeekAgo,
        ).length

        // Get leaderboard for rank lookup
        const leaderboard: any = await ctx.runQuery(internal.badges.leaderboardInternal, {})

        for (const user of users) {
            // Check if user opted into weekly digest
            const prefs = user.emailPreferences
            if (prefs && !prefs.weeklyDigest) continue
            // Skip users with no email preferences set (default opt-in is fine)

            // Count badges earned by this user in the past week
            const userBadges: any[] = await ctx.runQuery(internal.badges.listByUserInternal, {
                userId: user._id,
            })
            const newBadgeCount = userBadges.filter(
                (b: any) => b.awardedAt >= oneWeekAgo,
            ).length

            // Find leaderboard rank
            const rankIndex = leaderboard.findIndex(
                (entry: any) => entry._id?.toString() === user._id.toString(),
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
