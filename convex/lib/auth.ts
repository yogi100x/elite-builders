import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export async function requireAuth(
    ctx: MutationCtx | QueryCtx,
    role?: "candidate" | "sponsor" | "judge" | "admin",
) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthenticated");

    const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
        .unique();

    if (!user) throw new ConvexError("User record not found — webhook may not have fired yet");

    if (role && user.role !== role && user.role !== "admin") {
        throw new ConvexError(`Requires role: ${role}`);
    }

    return user;
}
