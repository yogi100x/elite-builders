"use client"
import { useQuery, Authenticated, Unauthenticated } from "convex/react"
import { api } from "@/convex/_generated/api"
import { BadgeDisplay } from "@/components/badge-display"
import { SubmissionStatusBadge } from "@/components/submission-status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import type { Doc } from "@/convex/_generated/dataModel"

function SubmissionRow({ sub }: { sub: Doc<"submissions"> }) {
    const challenge = useQuery(api.challenges.getById, { id: sub.challengeId })

    return (
        <div className="flex items-center justify-between p-3 border rounded-card">
            <div>
                <p className="text-sm font-medium truncate max-w-[260px]">
                    {challenge?.title ?? <span className="text-xs text-muted-foreground font-mono">Loading...</span>}
                </p>
                {(sub.score ?? sub.provisionalScore) !== undefined && (
                    <p className="font-mono text-sm font-bold">
                        Score: {sub.score ?? sub.provisionalScore}/100
                        {sub.score == null && <span className="text-xs text-muted-foreground ml-1">(AI)</span>}
                    </p>
                )}
                {sub.feedback && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{sub.feedback}</p>
                )}
            </div>
            {/* SubmissionStatusBadge subscribes to live Convex queries — auto-updates as scoring completes */}
            <SubmissionStatusBadge
                status={sub.status}
                scoringStatus={sub.scoringStatus}
                provisionalScore={sub.provisionalScore}
            />
        </div>
    )
}

export default function DashboardPage() {
    const me = useQuery(api.users.getMe)
    const submissions = useQuery(api.submissions.listByUser)
    const badges = useQuery(api.badges.listByUser)
    const router = useRouter()

    useEffect(() => {
        if (me) {
            if (me.role === "sponsor") router.push("/sponsor")
            else if (me.role === "admin") router.push("/admin/invites")
        }
    }, [me, router])

    if (!me || !submissions || !badges) {
        return <div className="space-y-4"><Skeleton className="h-32" /><Skeleton className="h-64" /></div>
    }

    // Don't render candidate dashboard if they are being redirected
    if (me.role !== "candidate") {
        return <div className="flex justify-center p-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
    }

    return (
        <>
            <Authenticated>
                <div className="space-y-8">
                    <div>
                        <h1 className="font-display text-3xl font-bold">My Dashboard</h1>
                        <p className="text-muted-foreground">{me.points} points earned</p>
                    </div>

                    <Card>
                        <CardHeader><CardTitle>My Badges</CardTitle></CardHeader>
                        <CardContent>
                            <BadgeDisplay badges={badges} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>My Submissions</CardTitle>
                                <Button asChild variant="outline" size="sm">
                                    <Link href="/challenges">Browse Challenges</Link>
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {submissions.length === 0 ? (
                                <div className="text-center py-8 space-y-2">
                                    <p className="text-muted-foreground">No submissions yet.</p>
                                    <Button asChild><Link href="/challenges">Find a Challenge →</Link></Button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {submissions.map((sub) => (
                                        <SubmissionRow key={sub._id} sub={sub} />
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </Authenticated>
            <Unauthenticated>
                <div className="text-center py-16">
                    <h2 className="text-2xl font-bold">Please sign in</h2>
                    <p className="text-muted-foreground mt-2">You need to be authenticated to view your dashboard.</p>
                </div>
            </Unauthenticated>
        </>
    )
}
