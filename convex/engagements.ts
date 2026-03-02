import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireAuth } from "./lib/auth";
import { internal } from "./_generated/api";

export const expressInterest = mutation({
    args: {
        submissionId: v.id("submissions"),
        message: v.string(),
    },
    handler: async (ctx, args) => {
        const caller = await requireAuth(ctx, "sponsor");

        const sponsor = await ctx.db
            .query("sponsors")
            .withIndex("by_user", (q) => q.eq("userId", caller._id))
            .unique();
        if (!sponsor) throw new ConvexError("Sponsor profile not found");

        const submission = await ctx.db.get(args.submissionId);
        if (!submission) throw new ConvexError("Submission not found");

        // Verify the submission belongs to one of this sponsor's challenges
        const challenge = await ctx.db.get(submission.challengeId);
        if (!challenge || challenge.sponsorId !== sponsor._id) {
            throw new ConvexError("You can only express interest in submissions to your own challenges");
        }

        // Check for duplicate engagement
        const existing = await ctx.db
            .query("engagements")
            .withIndex("by_submission", (q) => q.eq("submissionId", args.submissionId))
            .collect();
        const duplicate = existing.find((e) => e.sponsorId === sponsor._id);
        if (duplicate) {
            throw new ConvexError("You have already expressed interest in this submission");
        }

        const engagementId = await ctx.db.insert("engagements", {
            sponsorId: sponsor._id,
            candidateId: submission.userId,
            submissionId: args.submissionId,
            challengeId: submission.challengeId,
            message: args.message,
            status: "pending",
        });

        // Notify the candidate
        await ctx.db.insert("notifications", {
            userId: submission.userId,
            type: "engagement",
            content: `${sponsor.orgName} is interested in your submission! They said: "${args.message}"`,
            read: false,
            relatedId: engagementId,
        });

        // Send sponsor interest email
        await ctx.scheduler.runAfter(0, internal.email.sendSponsorInterest, {
            userId: submission.userId,
            sponsorOrgName: sponsor.orgName,
            message: args.message,
        });

        return engagementId;
    },
});

export const listBySponsor = query({
    args: {},
    handler: async (ctx) => {
        const caller = await requireAuth(ctx, "sponsor");

        const sponsor = await ctx.db
            .query("sponsors")
            .withIndex("by_user", (q) => q.eq("userId", caller._id))
            .unique();
        if (!sponsor) return [];

        return ctx.db
            .query("engagements")
            .withIndex("by_sponsor", (q) => q.eq("sponsorId", sponsor._id))
            .order("desc")
            .collect();
    },
});

export const listByCandidate = query({
    args: {},
    handler: async (ctx) => {
        const caller = await requireAuth(ctx);

        const engagements = await ctx.db
            .query("engagements")
            .withIndex("by_candidate", (q) => q.eq("candidateId", caller._id))
            .order("desc")
            .collect();

        // Hydrate with sponsor + challenge info
        const hydrated = await Promise.all(
            engagements.map(async (eng) => {
                const sponsor = await ctx.db.get(eng.sponsorId);
                const challenge = await ctx.db.get(eng.challengeId);
                return {
                    ...eng,
                    sponsorOrgName: sponsor?.orgName ?? "Unknown",
                    sponsorLogoUrl: sponsor?.logoUrl,
                    challengeTitle: challenge?.title ?? "Unknown Challenge",
                };
            }),
        );

        return hydrated;
    },
});

export const respond = mutation({
    args: {
        engagementId: v.id("engagements"),
        status: v.union(v.literal("accepted"), v.literal("declined")),
    },
    handler: async (ctx, args) => {
        const caller = await requireAuth(ctx);

        const engagement = await ctx.db.get(args.engagementId);
        if (!engagement) throw new ConvexError("Engagement not found");
        if (engagement.candidateId !== caller._id) {
            throw new ConvexError("You can only respond to your own engagements");
        }
        if (engagement.status !== "pending") {
            throw new ConvexError("This engagement has already been responded to");
        }

        await ctx.db.patch(args.engagementId, { status: args.status });

        // Notify the sponsor about the candidate's response
        const sponsor = await ctx.db.get(engagement.sponsorId);
        if (sponsor) {
            const candidateName = caller.name ?? "A candidate";
            const statusLabel = args.status === "accepted" ? "accepted" : "declined";
            await ctx.db.insert("notifications", {
                userId: sponsor.userId,
                type: "engagement",
                content: `${candidateName} has ${statusLabel} your interest in their submission.`,
                read: false,
                relatedId: args.engagementId,
            });
        }
    },
});
