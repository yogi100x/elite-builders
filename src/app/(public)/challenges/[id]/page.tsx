import { preloadQuery } from "convex/nextjs"
import { auth } from "@clerk/nextjs/server"
import { api } from "@/convex/_generated/api"
import { ChallengeDetailView } from "@/components/challenge-detail"
import { Id } from "@/convex/_generated/dataModel"

export default async function ChallengeDetailPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { userId } = await auth()
    const { id } = await params
    const preloaded = await preloadQuery(api.challenges.getById, {
        id: id as Id<"challenges">,
    })

    return <ChallengeDetailView preloaded={preloaded} isAuthenticated={!!userId} />
}
