import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAuth } from "./lib/auth";

export const submit = mutation({
    args: {
        orgName: v.string(),
        contactEmail: v.string(),
        website: v.optional(v.string()),
        description: v.optional(v.string()),
        industry: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const caller = await requireAuth(ctx, "candidate");

        // Check for existing pending/approved application
        const existing = await ctx.db
            .query("sponsorApplications")
            .withIndex("by_user", (q) => q.eq("userId", caller._id))
            .filter((q) =>
                q.or(
                    q.eq(q.field("status"), "pending"),
                    q.eq(q.field("status"), "approved"),
                ),
            )
            .first();

        if (existing?.status === "approved") {
            throw new ConvexError("You already have an approved sponsor application.");
        }
        if (existing?.status === "pending") {
            throw new ConvexError("You already have a pending application. Please wait for admin review.");
        }

        return await ctx.db.insert("sponsorApplications", {
            userId: caller._id,
            orgName: args.orgName,
            contactEmail: args.contactEmail,
            website: args.website,
            description: args.description,
            industry: args.industry,
            status: "pending",
        });
    },
});

export const getMyApplication = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;
        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
            .unique();
        if (!user) return null;

        // Return the most recent application
        const applications = await ctx.db
            .query("sponsorApplications")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .order("desc")
            .take(1);
        return applications[0] ?? null;
    },
});

export const listPending = query({
    args: {},
    handler: async (ctx) => {
        await requireAuth(ctx, "admin");
        const applications = await ctx.db
            .query("sponsorApplications")
            .withIndex("by_status", (q) => q.eq("status", "pending"))
            .order("desc")
            .collect();

        // Join user names
        return Promise.all(
            applications.map(async (app) => {
                const user = await ctx.db.get(app.userId);
                return {
                    ...app,
                    applicantName: user?.name ?? "Unknown",
                    applicantEmail: user?.email ?? "",
                };
            }),
        );
    },
});

export const approve = mutation({
    args: { applicationId: v.id("sponsorApplications") },
    handler: async (ctx, args) => {
        const admin = await requireAuth(ctx, "admin");
        const app = await ctx.db.get(args.applicationId);
        if (!app) throw new ConvexError("Application not found");
        if (app.status !== "pending") throw new ConvexError("Application is not pending");

        // 1. Mark approved
        await ctx.db.patch(args.applicationId, {
            status: "approved",
            reviewedBy: admin._id,
            reviewedAt: Date.now(),
        });

        // 2. Promote user to sponsor role
        await ctx.db.patch(app.userId, { role: "sponsor" });

        // 3. Create sponsor profile
        const existingSponsor = await ctx.db
            .query("sponsors")
            .withIndex("by_user", (q) => q.eq("userId", app.userId))
            .first();
        if (!existingSponsor) {
            await ctx.db.insert("sponsors", {
                userId: app.userId,
                orgName: app.orgName,
                website: app.website,
                description: app.description,
                industry: app.industry,
            });
        }

        // 4. Send notification
        await ctx.runMutation(internal.notifications.createInternal, {
            userId: app.userId,
            type: "engagement",
            content: "Your sponsor application has been approved! You can now create challenges.",
        });

        // 5. Send email
        await ctx.scheduler.runAfter(0, internal.email.sendApplicationApproval, {
            userId: app.userId,
        });
    },
});

export const reject = mutation({
    args: {
        applicationId: v.id("sponsorApplications"),
        reason: v.string(),
    },
    handler: async (ctx, args) => {
        const admin = await requireAuth(ctx, "admin");
        const app = await ctx.db.get(args.applicationId);
        if (!app) throw new ConvexError("Application not found");
        if (app.status !== "pending") throw new ConvexError("Application is not pending");

        // 1. Mark rejected
        await ctx.db.patch(args.applicationId, {
            status: "rejected",
            reviewedBy: admin._id,
            reviewedAt: Date.now(),
            rejectionReason: args.reason,
        });

        // 2. Send notification
        await ctx.runMutation(internal.notifications.createInternal, {
            userId: app.userId,
            type: "engagement",
            content: `Your sponsor application was not approved. Reason: ${args.reason}`,
        });

        // 3. Send email
        await ctx.scheduler.runAfter(0, internal.email.sendApplicationRejection, {
            userId: app.userId,
            reason: args.reason,
        });
    },
});
