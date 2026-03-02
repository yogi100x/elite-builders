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
    const format = url.searchParams.get("format") ?? "json"

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

    const sortedSubmissions = submissions
        .sort((a: any, b: any) => (b.score ?? b.provisionalScore ?? 0) - (a.score ?? a.provisionalScore ?? 0))

    if (format === "html") {
        const html = `<!DOCTYPE html>
<html>
<head>
    <title>EliteBuilders - ${challenge.title} Submissions</title>
    <style>
        body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; }
        h1 { color: #2563EB; }
        .submission { border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; margin: 1rem 0; }
        .rank { font-size: 1.5rem; font-weight: bold; color: #2563EB; }
        .score { font-family: monospace; font-size: 1.2rem; }
        .label { color: #6b7280; font-size: 0.875rem; }
        .feedback { background: #f9fafb; padding: 0.75rem; border-radius: 4px; margin-top: 0.5rem; }
    </style>
</head>
<body>
    <h1>${challenge.title}</h1>
    <p class="label">Exported ${new Date().toLocaleDateString()}</p>
    ${sortedSubmissions
        .map(
            (s: any, i: number) => `
        <div class="submission">
            <span class="rank">#${i + 1}</span>
            <span class="score">${s.score ?? s.provisionalScore ?? "N/A"}/100</span>
            <p><strong>GitHub:</strong> ${s.githubRepoUrl ? `<a href="${s.githubRepoUrl}">${s.githubOwner}/${s.githubRepo}</a>` : s.repoUrl ? `<a href="${s.repoUrl}">${s.repoUrl}</a>` : "N/A"}</p>
            ${s.deckUrl ? `<p><strong>Deck:</strong> <a href="${s.deckUrl}">${s.deckUrl}</a></p>` : ""}
            ${s.videoUrl ? `<p><strong>Video:</strong> <a href="${s.videoUrl}">${s.videoUrl}</a></p>` : ""}
            ${s.notes ? `<p><strong>Pitch:</strong> ${s.notes}</p>` : ""}
            ${s.feedback ? `<div class="feedback"><span class="label">Judge Feedback:</span><br>${s.feedback}</div>` : ""}
        </div>`,
        )
        .join("")}
</body>
</html>`

        return new Response(html, {
            headers: {
                "Content-Type": "text/html",
                "Content-Disposition": `attachment; filename="elitebuilders-${challengeId}.html"`,
            },
        })
    }

    const packet = {
        challenge: {
            id: challengeId,
            title: challenge?.title,
            exportedAt: new Date().toISOString(),
        },
        submissions: sortedSubmissions
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
