"use client"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Trophy } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Id } from "@/convex/_generated/dataModel"

interface ChallengeLeaderboardProps {
    challengeId: Id<"challenges">
}

export function ChallengeLeaderboard({ challengeId }: ChallengeLeaderboardProps) {
    const entries = useQuery(api.badges.challengeLeaderboard, { challengeId })

    if (entries === undefined) {
        return (
            <section className="space-y-3">
                <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                    <Trophy size={20} />
                    Leaderboard
                </h2>
                <div className="border rounded-card overflow-hidden">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 border-b last:border-b-0">
                            <Skeleton className="h-6 w-6 rounded" />
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                            <Skeleton className="h-5 w-16" />
                        </div>
                    ))}
                </div>
            </section>
        )
    }

    if (entries.length === 0) {
        return (
            <section className="space-y-3">
                <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                    <Trophy size={20} />
                    Leaderboard
                </h2>
                <div className="border rounded-card p-8 text-center">
                    <p className="text-muted-foreground">No awarded submissions yet. Be the first to earn a spot!</p>
                </div>
            </section>
        )
    }

    return (
        <section className="space-y-3">
            <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                <Trophy size={20} />
                Leaderboard
            </h2>
            <div className="border rounded-card overflow-hidden">
                {entries.map((entry) => {
                    const isTop3 = entry.rank <= 3
                    return (
                        <div
                            key={entry.submissionId}
                            className={cn(
                                "flex items-center gap-4 p-4 border-b last:border-b-0 transition-brand",
                                isTop3 && "bg-achievement/5",
                            )}
                        >
                            <span
                                className={cn(
                                    "font-mono font-bold text-lg w-8 text-center",
                                    entry.rank === 1 && "text-amber-500",
                                    entry.rank === 2 && "text-slate-400",
                                    entry.rank === 3 && "text-orange-600",
                                    entry.rank > 3 && "text-muted-foreground",
                                )}
                            >
                                {entry.rank}
                            </span>
                            <Avatar>
                                <AvatarImage src={entry.user?.profileImageUrl} />
                                <AvatarFallback>
                                    {entry.user?.name?.[0] ?? "?"}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <p className="font-semibold">
                                    {entry.user?.name ?? "Unknown User"}
                                </p>
                                {entry.badges.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {entry.badges.map((badge) => (
                                            <Badge
                                                key={badge._id}
                                                className="text-[10px]"
                                                style={{ backgroundColor: badge.color, color: "white" }}
                                            >
                                                {badge.name}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <span className="font-mono font-bold text-brand-primary">
                                {entry.score} pts
                            </span>
                        </div>
                    )
                })}
            </div>
        </section>
    )
}
