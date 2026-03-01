"use client"
import { useQuery, useAction } from "convex/react"
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

export default function SponsorPage() {
    const { user } = useUser()
    const role = user?.publicMetadata?.role as string | undefined
    const router = useRouter()
    const me = useQuery(api.users.getMe)
    const challenges = useQuery(api.challenges.listBySponsor)
    const closeAndAward = useAction(api.autoBadges.closeChallengeAndAwardBadges)
    const chartData = useQuery(api.submissions.weeklyCountsBySponsor)

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
                    <p className="text-muted-foreground">{challenges.length} challenge(s) posted</p>
                </div>
                <Button onClick={() => router.push("/sponsor/new")}>+ Create Challenge</Button>
            </div>

            {challenges.length === 0 ? (
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

                    {challenges.map((challenge) => (
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
