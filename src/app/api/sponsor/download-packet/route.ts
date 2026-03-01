import { auth } from "@clerk/nextjs/server"
import { fetchQuery } from "convex/nextjs"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"

export async function GET(req: Request) {
    const { userId } = await auth()
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const url = new URL(req.url)
    const challengeId = url.searchParams.get("challengeId") as Id<"challenges"> | null
    if (!challengeId) return Response.json({ error: "challengeId required" }, { status: 400 })

    const submissions = await fetchQuery(api.submissions.listByChallenge, { challengeId })
    const challenge = await fetchQuery(api.challenges.getById, { id: challengeId })

    const packet = {
        challenge: {
            id: challengeId,
            title: challenge?.title,
            exportedAt: new Date().toISOString(),
        },
        submissions: submissions
            .sort((a: any, b: any) => (b.score ?? b.provisionalScore ?? 0) - (a.score ?? a.provisionalScore ?? 0))
            .map((s: any, index: number) => ({
                rank: index + 1,
                submissionId: s._id,
                repoUrl: s.githubRepoUrl ?? s.repoUrl,
                githubHandle: s.githubOwner ? `${s.githubOwner}/${s.githubRepo}` : null,
                videoUrl: s.videoUrl,
                deckUrl: s.deckUrl,
                pitch: s.notes,
                status: s.status,
                judgeScore: s.score,
                provisionalAiScore: s.provisionalScore,
                judgeFeedback: s.feedback,
            })),
    }

    return new Response(JSON.stringify(packet, null, 2), {
        headers: {
            "Content-Type": "application/json",
            "Content-Disposition": `attachment; filename="elitebuilders-submissions-${challengeId}.json"`,
        },
    })
}
