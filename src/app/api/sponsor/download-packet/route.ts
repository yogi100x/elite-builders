import { auth } from "@clerk/nextjs/server"
import { fetchQuery } from "convex/nextjs"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"

export async function GET(req: Request) {
    const { userId, getToken } = await auth()
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const token = await getToken({ template: "convex" })
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const url = new URL(req.url)
    const challengeId = url.searchParams.get("challengeId") as Id<"challenges"> | null
    if (!challengeId) return Response.json({ error: "challengeId required" }, { status: 400 })

    // Verify ownership: requesting user must be the sponsor who created this challenge, or an admin
    const [user, challenge] = await Promise.all([
        fetchQuery(api.users.getMe, {}, { token }),
        fetchQuery(api.challenges.getById, { id: challengeId }, { token }),
    ])

    if (!user) return Response.json({ error: "User not found" }, { status: 401 })
    if (!challenge) return Response.json({ error: "Challenge not found" }, { status: 404 })

    // Admin can download any packet
    if (user.role !== "admin") {
        // Non-admin must be the owning sponsor
        const sponsor = await fetchQuery(api.sponsors.getMyProfile, {}, { token })
        if (!sponsor || sponsor._id !== challenge.sponsorId) {
            return Response.json({ error: "Forbidden: you do not own this challenge" }, { status: 403 })
        }
    }

    const submissions = await fetchQuery(api.submissions.listByChallenge, { challengeId }, { token })

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
