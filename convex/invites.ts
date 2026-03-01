import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth } from "./lib/auth";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";

export const create = mutation({
    args: {
        email: v.string(),
        role: v.union(v.literal("sponsor"), v.literal("judge")),
        orgName: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, "admin");

        // Check if an active invite already exists
        const existingInvite = await ctx.db
            .query("invites")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .filter((q) => q.eq(q.field("status"), "pending"))
            .first();

        if (existingInvite) {
            throw new ConvexError("A pending invite already exists for this email.");
        }

        // Generate a secure random token
        const token = crypto.randomUUID();

        await ctx.db.insert("invites", {
            email: args.email,
            role: args.role,
            orgName: args.orgName,
            token,
            status: "pending",
            createdBy: user._id,
        });

        // In a real app, you would dispatch an email here via Resend/SendGrid
        // For now, the UI will display the link so the Admin can share it directly.

        return token;
    },
});

export const listPending = query({
    handler: async (ctx) => {
        await requireAuth(ctx, "admin");

        return await ctx.db
            .query("invites")
            .filter((q) => q.eq(q.field("status"), "pending"))
            .order("desc")
            .collect();
    },
});

export const revoke = mutation({
    args: { id: v.id("invites") },
    handler: async (ctx, args) => {
        await requireAuth(ctx, "admin");

        const invite = await ctx.db.get(args.id);
        if (!invite || invite.status !== "pending") {
            throw new ConvexError("Invalid or inactive invite.");
        }

        await ctx.db.patch(args.id, { status: "revoked" });
    },
});

export const getByToken = query({
    args: { token: v.string() },
    handler: async (ctx, args) => {
        const invite = await ctx.db
            .query("invites")
            .withIndex("by_token", (q) => q.eq("token", args.token))
            .first();

        if (!invite) return null;
        if (invite.status !== "pending") return { status: invite.status }; // Let UI handle 'accepted' or 'revoked'

        return { ...invite, status: "pending" as const };
    }
});

export const accept = mutation({
    args: { token: v.string() },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx); // Requires the user to be logged in

        const invite = await ctx.db
            .query("invites")
            .withIndex("by_token", (q) => q.eq("token", args.token))
            .first();

        if (!invite) {
            throw new ConvexError("Invalid invite token");
        }

        if (invite.status !== "pending") {
            throw new ConvexError(`This invite has already been ${invite.status}`);
        }

        // 1. Mark invite as accepted
        await ctx.db.patch(invite._id, { status: "accepted" });

        // 2. Promote the user's role
        await ctx.db.patch(user._id, { role: invite.role });

        // 3. If sponsor, create a sponsor profile
        if (invite.role === "sponsor") {
            // Check if they already have one (just in case)
            const existingSponsor = await ctx.db
                .query("sponsors")
                .withIndex("by_user", (q) => q.eq("userId", user._id))
                .first();

            if (!existingSponsor) {
                await ctx.db.insert("sponsors", {
                    userId: user._id,
                    orgName: invite.orgName || "Undefined Organization",
                });
            }
        }

        return { role: invite.role };
    },
});
