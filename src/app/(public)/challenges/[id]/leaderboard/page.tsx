"use client"

import { use } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Trophy, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function ChallengeLeaderboardPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = use(params)
    const challengeId = id as Id<"challenges">
    const challenge = useQuery(api.challenges.getById, { id: challengeId })
    const leaderboard = useQuery(api.badges.challengeLeaderboard, { challengeId })

    if (!challenge || leaderboard === undefined) {
        return (
            <div className="max-w-3xl mx-auto space-y-4 py-8">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-64" />
            </div>
        )
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6 py-8">
            <div className="flex items-center gap-3">
                <Button asChild variant="ghost" size="icon">
                    <Link href={`/challenges/${id}`}><ArrowLeft size={18} /></Link>
                </Button>
                <div>
                    <h1 className="font-display text-2xl font-bold">{challenge.title}</h1>
                    <p className="text-sm text-muted-foreground">Challenge Leaderboard</p>
                </div>
            </div>

            {leaderboard.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Trophy className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">No awarded submissions yet.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-2">
                    {leaderboard.map((entry: any) => (
                        <Card key={entry.submissionId} className={entry.rank <= 3 ? "border-brand-primary/30" : ""}>
                            <CardContent className="py-3 px-4 flex items-center gap-4">
                                <span className={`font-mono text-lg font-bold w-8 text-center ${
                                    entry.rank === 1 ? "text-yellow-500" :
                                    entry.rank === 2 ? "text-gray-400" :
                                    entry.rank === 3 ? "text-amber-600" : "text-muted-foreground"
                                }`}>
                                    #{entry.rank}
                                </span>
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={entry.user?.profileImageUrl} />
                                    <AvatarFallback>{entry.user?.name?.[0] ?? "?"}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold truncate">
                                        {entry.user?.name ?? "Unknown"}
                                    </p>
                                    {entry.user?.githubUsername && (
                                        <p className="text-xs text-muted-foreground">@{entry.user.githubUsername}</p>
                                    )}
                                </div>
                                <span className="font-mono text-sm font-bold">{entry.score}/100</span>
                                <div className="flex gap-1">
                                    {entry.badges.map((b: any) => (
                                        <Badge key={b._id} style={{ backgroundColor: b.color, color: "white" }} className="text-xs">
                                            {b.name}
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
