"use client"

import { useQuery, useMutation, useAction, Authenticated, Unauthenticated } from "convex/react"
import { api } from "@/convex/_generated/api"
import { BadgeDisplay, BadgeProgression } from "@/components/badge-display"
import { SubmissionStatusBadge } from "@/components/submission-status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Building2, CheckCircle, XCircle } from "lucide-react"
import type { Doc } from "@/convex/_generated/dataModel"

function SubmissionRow({ sub }: { sub: Doc<"submissions"> }) {
    const challenge = useQuery(api.challenges.getById, { id: sub.challengeId })

    return (
        <div className="flex items-center justify-between p-3 border rounded-card">
            <div>
                <p className="text-sm font-medium truncate max-w-[260px]">
                    {challenge?.title ?? <span className="text-xs text-muted-foreground font-mono">Loading...</span>}
                </p>
                {sub.score !== undefined && (
                    <p className="font-mono text-sm font-bold">
                        Score: {sub.score}/100
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
            />
        </div>
    )
}

function SponsorInterestSection() {
    const engagements = useQuery(api.engagements.listByCandidate)
    const respond = useMutation(api.engagements.respond)

    if (!engagements || engagements.length === 0) return null

    async function handleRespond(engagementId: Doc<"engagements">["_id"], status: "accepted" | "declined") {
        try {
            await respond({ engagementId, status })
            toast.success(status === "accepted" ? "Interest accepted!" : "Interest declined.")
        } catch (error: unknown) {
            const msg =
                error instanceof Error
                    ? error.message.replace(/^.*ConvexError:\s*/, "")
                    : "Something went wrong"
            toast.error(msg)
        }
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-brand-primary" />
                    <CardTitle>Sponsor Interest</CardTitle>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {engagements.map((eng) => (
                        <div
                            key={eng._id}
                            className="flex flex-col gap-2 p-3 border rounded-card"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold">
                                        {eng.sponsorOrgName}
                                    </span>
                                    <Badge
                                        variant={
                                            eng.status === "accepted"
                                                ? "default"
                                                : eng.status === "declined"
                                                  ? "destructive"
                                                  : "secondary"
                                        }
                                    >
                                        {eng.status}
                                    </Badge>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                    {eng.challengeTitle}
                                </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {eng.message}
                            </p>
                            {eng.status === "pending" && (
                                <div className="flex items-center gap-2 mt-1">
                                    <Button
                                        size="sm"
                                        className="gap-1.5"
                                        onClick={() =>
                                            handleRespond(
                                                eng._id,
                                                "accepted",
                                            )
                                        }
                                    >
                                        <CheckCircle size={14} />
                                        Accept
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="gap-1.5"
                                        onClick={() =>
                                            handleRespond(
                                                eng._id,
                                                "declined",
                                            )
                                        }
                                    >
                                        <XCircle size={14} />
                                        Decline
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

function RecommendedChallenges() {
    const recommendations = useQuery(api.recommendations.getForCurrentUser)
    const triggerGeneration = useAction(api.recommendations.triggerGeneration)
    const [triggered, setTriggered] = useState(false)

    // Trigger generation if no cached recommendations
    useEffect(() => {
        if (recommendations === null && !triggered) {
            setTriggered(true)
            triggerGeneration().catch(() => {})
        }
    }, [recommendations, triggered]) // eslint-disable-line react-hooks/exhaustive-deps

    // Still loading from Convex
    if (recommendations === undefined) {
        return (
            <Card>
                <CardHeader><CardTitle>Recommended For You</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                    <Skeleton className="h-16" />
                    <Skeleton className="h-16" />
                    <Skeleton className="h-16" />
                </CardContent>
            </Card>
        )
    }

    // No recommendations (generating or no matches)
    if (!recommendations || recommendations.length === 0) {
        return (
            <Card>
                <CardHeader><CardTitle>Find Your Next Challenge</CardTitle></CardHeader>
                <CardContent className="text-center py-6 space-y-3">
                    <p className="text-sm text-muted-foreground">
                        {triggered
                            ? "Generating personalized recommendations..."
                            : "Complete your profile or connect GitHub to get matched."}
                    </p>
                    <Button asChild variant="outline">
                        <Link href="/challenges">Browse Open Challenges</Link>
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Recommended For You</CardTitle>
                    <Badge variant="secondary" className="text-xs">AI Matched</Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {recommendations.map((rec: any) => (
                    <RecommendationCard key={rec.challengeId} rec={rec} />
                ))}
                <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href="/challenges">Browse All Challenges</Link>
                </Button>
            </CardContent>
        </Card>
    )
}

function RecommendationCard({ rec }: { rec: { challengeId: string; matchScore: number; reason: string } }) {
    const challenge = useQuery(api.challenges.getById, { id: rec.challengeId as any })

    if (!challenge) return <Skeleton className="h-16" />

    return (
        <Link href={`/challenges/${rec.challengeId}`} className="block">
            <div className="flex items-center justify-between p-3 border rounded-card hover:border-brand-primary transition-brand cursor-pointer">
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{challenge.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{rec.reason}</p>
                </div>
                <Badge variant="outline" className="ml-3 shrink-0 font-mono text-xs">
                    {rec.matchScore}%
                </Badge>
            </div>
        </Link>
    )
}

export default function DashboardPage() {
    const me = useQuery(api.users.getMe)
    const submissions = useQuery(api.submissions.listByUser)
    const badges = useQuery(api.badges.listByUser)
    const careerScore = useQuery(api.badges.getCareerScore)
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

                    {careerScore && (
                        <Card>
                            <CardHeader><CardTitle>Career Score</CardTitle></CardHeader>
                            <CardContent>
                                <p className="text-4xl font-bold font-mono text-brand-primary">
                                    {careerScore.careerScore}
                                </p>
                                <div className="mt-2 grid grid-cols-3 gap-2 text-sm text-muted-foreground">
                                    <span>Badges: {careerScore.breakdown.badgePoints}pts</span>
                                    <span>Performance: {careerScore.breakdown.performanceScore}pts</span>
                                    <span>Consistency: {careerScore.breakdown.consistencyBonus}pts</span>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <RecommendedChallenges />

                    <SponsorInterestSection />

                    <Card>
                        <CardHeader><CardTitle>My Badges</CardTitle></CardHeader>
                        <CardContent>
                            <BadgeDisplay badges={badges} />
                            <BadgeProgression />
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
