import { internalAction } from "./_generated/server"
import { v } from "convex/values"
import { internal } from "./_generated/api"
import { sendAwardEmail, sendRejectionEmail } from "./lib/email"

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
