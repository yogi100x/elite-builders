import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { Webhook } from "svix";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

export async function POST(req: Request) {
    if (!WEBHOOK_SECRET) {
        throw new Error("CLERK_WEBHOOK_SECRET environment variable not set");
    }

    // Next.js 15: headers() is mostly async, but Next.js 15.0 stable may still support sync
    // depending on usage. We'll use 'await headers()' to be safe, as it's the intended pattern for App Router 15+.
    const headerPayload = await headers();
    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    if (!svix_id || !svix_timestamp || !svix_signature) {
        return new Response("Missing svix headers", { status: 400 });
    }

    const payload = await req.json();
    const body = JSON.stringify(payload);
    const wh = new Webhook(WEBHOOK_SECRET);

    let event: WebhookEvent;
    try {
        event = wh.verify(body, {
            "svix-id": svix_id,
            "svix-timestamp": svix_timestamp,
            "svix-signature": svix_signature,
        }) as WebhookEvent;
    } catch (err) {
        console.error("[clerk-webhook] Verification failed:", err);
        return new Response("Webhook verification failed", { status: 400 });
    }

    if (event.type === "user.created" || event.type === "user.updated") {
        const { id, email_addresses, first_name, last_name, image_url, public_metadata } = event.data;
        const primaryEmail = email_addresses.find((e) => e.id === event.data.primary_email_address_id);

        await fetchMutation(api.users.upsertFromClerk, {
            clerkId: id,
            email: primaryEmail?.email_address ?? "",
            name: `${first_name ?? ""} ${last_name ?? ""}`.trim(),
            profileImageUrl: image_url,
            role: (public_metadata?.role as "candidate" | "sponsor" | "judge" | "admin") ?? undefined,
        });
    }

    return new Response("OK", { status: 200 });
}
