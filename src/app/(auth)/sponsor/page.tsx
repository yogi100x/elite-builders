"use client"
import { useQuery, useAction, useMutation } from "convex/react"
import { useUser } from "@clerk/nextjs"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { DIFFICULTY_LABELS } from "@/lib/constants"
import { formatDeadline } from "@/lib/utils"
import { SponsorChart } from "@/components/sponsor-chart"
import { Github, ExternalLink } from "lucide-react"

export default function SponsorPage() {
    const { user } = useUser()
    const role = user?.publicMetadata?.role as string | undefined
    const router = useRouter()
    const me = useQuery(api.users.getMe)
    const challenges = useQuery(api.challenges.listBySponsor)
    const closeAndAward = useAction(api.autoBadges.closeChallengeAndAwardBadges)
    const publishDraft = useMutation(api.challenges.publishDraft)
    const chartData = useQuery(api.submissions.weeklyCountsBySponsor)

    const drafts = challenges?.filter((c) => c.status === "draft") ?? []
    const published = challenges?.filter((c) => c.status !== "draft") ?? []

    if (role !== "sponsor" && role !== "admin") {
        return (
            <div className="text-center py-16">
                <p className="text-muted-foreground">You don't have sponsor access.</p>
            </div>
        )
    }

    if (!challenges) return <Skeleton className="h-64" />

    async function handleCloseAndAward(id: string) {
        try {
            const result = await closeAndAward({ challengeId: id as any })
            toast.success(`Challenge closed — ${result.awardedCount} rank badges awarded!`)
        } catch (err) {
            toast.error(String(err))
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display text-3xl font-bold">Sponsor Dashboard</h1>
                    <p className="text-muted-foreground">{published.length} challenge(s) posted</p>
                </div>
                <Button onClick={() => router.push("/sponsor/new")}>+ Create Challenge</Button>
            </div>

            <a
                href="https://github.com/yogi100x/elitebuilders-challenge-template"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 hover:bg-blue-100 transition-colors dark:border-blue-900 dark:bg-blue-950/40 dark:hover:bg-blue-950/60"
            >
                <Github className="h-8 w-8 text-blue-600 dark:text-blue-400 shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                        Setting up standardized testing? Start with our template
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                        Clone the example repo to see the exact folder structure, visible tests, hidden tests, and reference solution.
                        Customize it for your challenge, then link it when creating a new challenge.
                    </p>
                </div>
                <ExternalLink className="h-4 w-4 text-blue-400 dark:text-blue-500 shrink-0" />
            </a>

            {drafts.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Drafts</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {drafts.map((draft) => (
                            <div key={draft._id} className="flex items-center justify-between p-3 border rounded-card">
                                <div>
                                    <p className="font-medium">{draft.title}</p>
                                    <p className="text-sm text-muted-foreground">{draft.summary || "No summary"}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={async () => {
                                            try {
                                                await publishDraft({ id: draft._id })
                                                toast.success("Challenge published!")
                                            } catch (err) {
                                                toast.error(String(err))
                                            }
                                        }}
                                    >
                                        Publish
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {published.length === 0 ? (
                <Card>
                    <CardContent className="text-center py-12 space-y-3">
                        <p className="text-muted-foreground">No challenges yet.</p>
                        <Button onClick={() => router.push("/sponsor/new")}>Create Your First Challenge</Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    <Card key="chart-card">
                        <CardHeader><CardTitle>Submissions This Month</CardTitle></CardHeader>
                        <CardContent>
                            <SponsorChart data={chartData ?? []} />
                        </CardContent>
                    </Card>

                    {published.map((challenge) => (
                        <Card key={challenge._id}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg">{challenge.title}</CardTitle>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={challenge.status === "open" ? "default" : "secondary"}>
                                            {challenge.status}
                                        </Badge>
                                        <Badge variant="outline">{DIFFICULTY_LABELS[challenge.difficulty]}</Badge>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">{challenge.summary}</p>
                                <div className="flex items-center justify-between mt-4">
                                    <span className="text-xs text-muted-foreground">Deadline: {formatDeadline(challenge.deadline)}</span>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => router.push(`/sponsor/challenges/${challenge._id}/submissions`)}>
                                            View Submissions
                                        </Button>
                                        {challenge.status === "open" && (
                                            <Button variant="outline" size="sm" onClick={() => handleCloseAndAward(challenge._id)}>
                                                Close Challenge & Award Badges
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
