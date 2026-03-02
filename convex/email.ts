import { internalAction } from "./_generated/server"
import { v } from "convex/values"
import { internal } from "./_generated/api"
import { sendAwardEmail, sendRejectionEmail, sendSponsorInterestEmail, sendScoringEmail } from "./lib/email"

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
