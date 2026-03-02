import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireAuth } from "./lib/auth";
import { internal } from "./_generated/api";

export const create = mutation({
    args: {
        challengeId: v.id("challenges"),
        githubOwner: v.optional(v.string()),
        githubRepo: v.optional(v.string()),
        githubRepoUrl: v.optional(v.string()),
        githubDefaultBranch: v.optional(v.string()),
        repoUrl: v.optional(v.string()),
        deckUrl: v.optional(v.string()),
        videoUrl: v.optional(v.string()),
        notes: v.optional(v.string()),
        fileStorageIds: v.array(v.id("_storage")),
    },
    handler: async (ctx, args) => {
        const caller = await requireAuth(ctx);

        const challenge = await ctx.db.get(args.challengeId);
        if (!challenge) {
            throw new ConvexError("Challenge not found");
        }
        if (challenge.status === "closed") {
            throw new ConvexError("This challenge is closed and no longer accepting submissions");
        }
        if (challenge.deadline < Date.now()) {
            throw new ConvexError("The deadline for this challenge has passed");
        }

        // Check for existing submission — allow revision
        const existingSubmission = await ctx.db
            .query("submissions")
            .withIndex("by_challenge_user", (q) =>
                q.eq("challengeId", args.challengeId).eq("userId", caller._id),
            )
            .order("desc")
            .first();

        // If existing and already awarded, don't allow revision
        if (existingSubmission && existingSubmission.status === "awarded") {
            throw new ConvexError("Your submission has already been awarded — cannot resubmit.");
        }

        const version = existingSubmission ? (existingSubmission.version ?? 1) + 1 : 1;

        const submissionId = await ctx.db.insert("submissions", {
            ...args,
            userId: caller._id,
            status: "in-review",
            scoringStatus: "pending",
            version,
            previousSubmissionId: existingSubmission?._id,
        });

        // Notify candidate that submission was received
        await ctx.db.insert("notifications", {
            userId: caller._id,
            type: "submission",
            content: `Your submission to "${challenge.title}" was received and is being scored by AI.`,
            read: false,
            relatedId: submissionId.toString(),
        });

        // Schedule AI rubric evaluation (non-blocking)
        await ctx.scheduler.runAfter(0, internal.aiScoring.scoreSubmission, { submissionId });

        // Schedule "First Build" badge check (non-blocking)
        await ctx.scheduler.runAfter(0, internal.badges.grantFirstBuild, {
            userId: caller._id,
            submissionId,
            challengeId: args.challengeId,
        });

        return submissionId;
    },
});

export const getById = internalQuery({
    args: { submissionId: v.id("submissions") },
    handler: async (ctx, { submissionId }) => ctx.db.get(submissionId),
});

export const setProvisionalScore = internalMutation({
    args: {
        submissionId: v.id("submissions"),
        provisionalScore: v.number(),
        aiRubricFeedback: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.submissionId, {
            provisionalScore: args.provisionalScore,
            aiRubricFeedback: args.aiRubricFeedback,
            aiScoredAt: Date.now(),
        });
    },
});

export const setScoringStatus = internalMutation({
    args: {
        submissionId: v.id("submissions"),
        scoringStatus: v.union(
            v.literal("pending"),
            v.literal("scoring"),
            v.literal("scored"),
            v.literal("failed"),
        ),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.submissionId, {
            scoringStatus: args.scoringStatus,
        });
    },
});

export const listByUser = query({
    args: {},
    handler: async (ctx) => {
        const caller = await requireAuth(ctx);
        return ctx.db
            .query("submissions")
            .withIndex("by_user", (q) => q.eq("userId", caller._id))
            .collect();
    },
});

export const listPendingReview = query({
    args: {},
    handler: async (ctx) => {
        const caller = await requireAuth(ctx, "judge");

        const submissions = await ctx.db
            .query("submissions")
            .withIndex("by_status", (q) => q.eq("status", "in-review"))
            .collect();

        // Filter to only challenges assigned to this judge (if any assignments exist)
        const filtered = await Promise.all(
            submissions.map(async (s) => {
                const challenge = await ctx.db.get(s.challengeId);
                if (!challenge) return null;
                if (
                    challenge.assignedJudges &&
                    challenge.assignedJudges.length > 0 &&
                    !challenge.assignedJudges.includes(caller._id)
                ) {
                    return null;
                }
                return { ...s, challenge };
            }),
        );

        return filtered.filter(Boolean);
    },
});

export const listByChallenge = query({
    args: { challengeId: v.id("challenges") },
    handler: async (ctx, args) => {
        await requireAuth(ctx, "sponsor");
        return ctx.db
            .query("submissions")
            .withIndex("by_challenge", (q) => q.eq("challengeId", args.challengeId))
            .collect();
    },
});

export const award = mutation({
    args: {
        submissionId: v.id("submissions"),
        score: v.number(),
        feedback: v.string(),
        badgeName: v.string(),
        badgeColor: v.string(),
        badgeLevel: v.number(),
    },
    handler: async (ctx, args) => {
        const judge = await requireAuth(ctx, "judge");
        const submission = await ctx.db.get(args.submissionId);
        if (!submission) throw new Error("Submission not found");

        await ctx.db.patch(args.submissionId, {
            status: "awarded",
            score: args.score,
            feedback: args.feedback,
            judgedBy: judge._id,
        });

        await ctx.db.insert("badges", {
            userId: submission.userId,
            submissionId: args.submissionId,
            challengeId: submission.challengeId,
            name: args.badgeName,
            color: args.badgeColor,
            level: args.badgeLevel,
            awardedAt: Date.now(),
        });

        const user = await ctx.db.get(submission.userId);
        if (user) {
            await ctx.db.patch(submission.userId, {
                points: user.points + args.score,
            });
        }

        await ctx.db.insert("notifications", {
            userId: submission.userId,
            type: "award",
            content: `Congratulations! Your submission was awarded the "${args.badgeName}" badge.`,
            read: false,
            relatedId: args.submissionId,
        });

        await ctx.scheduler.runAfter(0, internal.email.sendAward, {
            userId: submission.userId,
            badgeName: args.badgeName,
            feedback: args.feedback,
            score: args.score,
        });
    },
});

export const reject = mutation({
    args: {
        submissionId: v.id("submissions"),
        feedback: v.string(),
    },
    handler: async (ctx, args) => {
        const judge = await requireAuth(ctx, "judge");
        const submission = await ctx.db.get(args.submissionId);
        if (!submission) throw new Error("Submission not found");

        await ctx.db.patch(args.submissionId, {
            status: "not-selected",
            feedback: args.feedback,
            judgedBy: judge._id,
        });

        await ctx.db.insert("notifications", {
            userId: submission.userId,
            type: "not-selected",
            content: "Your submission was reviewed. Thank you for participating!",
            read: false,
            relatedId: args.submissionId,
        });

        await ctx.scheduler.runAfter(0, internal.email.sendRejection, {
            userId: submission.userId,
            feedback: args.feedback,
        });
    },
});

export const generateUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        await requireAuth(ctx);
        return ctx.storage.generateUploadUrl();
    },
});

/** Returns weekly submission counts for a sponsor's challenges (last 8 weeks) */
export const weeklyCountsBySponsor = query({
    args: {},
    handler: async (ctx) => {
        const caller = await requireAuth(ctx);
        const sponsor = await ctx.db
            .query("sponsors")
            .withIndex("by_user", (q) => q.eq("userId", caller._id))
            .unique();
        if (!sponsor) return [];

        const challenges = await ctx.db
            .query("challenges")
            .withIndex("by_sponsor", (q) => q.eq("sponsorId", sponsor._id))
            .collect();

        const challengeIds = new Set(challenges.map((c) => c._id));
        const allSubs = await ctx.db.query("submissions").collect();
        const relevant = allSubs.filter((s) => challengeIds.has(s.challengeId));

        // Bucket into ISO week labels (last 8 weeks)
        const now = Date.now();
        const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
        const weeks: Record<string, number> = {};
        for (let i = 7; i >= 0; i--) {
            const weekStart = now - i * MS_PER_WEEK;
            const label = new Date(weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            weeks[label] = 0;
        }
        relevant.forEach((s) => {
            const age = Math.floor((now - s._creationTime) / MS_PER_WEEK);
            if (age >= 0 && age <= 7) {
                const label = new Date(now - age * MS_PER_WEEK).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                if (weeks[label] !== undefined) weeks[label]++;
            }
        });

        return Object.entries(weeks).map(([week, count]) => ({ week, count })).reverse();
    },
});

export const getFileUrls = query({
    args: { storageIds: v.array(v.id("_storage")) },
    handler: async (ctx, args) => {
        const urls = await Promise.all(
            args.storageIds.map((id) => ctx.storage.getUrl(id))
        );
        return urls;
    },
});

export const listAwardedByChallenge = internalQuery({
    args: { challengeId: v.id("challenges") },
    handler: async (ctx, { challengeId }) => {
        return ctx.db
            .query("submissions")
            .withIndex("by_challenge_status", (q) =>
                q.eq("challengeId", challengeId).eq("status", "awarded"),
            )
            .collect()
    },
})
