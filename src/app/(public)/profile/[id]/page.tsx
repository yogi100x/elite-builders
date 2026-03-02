import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ProfileView } from "@/components/profile-view";

export default async function ProfilePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const preloaded = await preloadQuery(api.users.getPublicProfile, {
        userId: id as Id<"users">,
    });

    return <ProfileView preloaded={preloaded} />;
}
