"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { LeaderboardTable } from "@/components/leaderboard-table"
import { Button } from "@/components/ui/button"

type Period = "all-time" | "month" | "week"

export default function LeaderboardPage() {
    const [period, setPeriod] = useState<Period>("all-time")
    const entries = useQuery(api.badges.leaderboard, { period, limit: 50 })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display text-3xl font-bold">Leaderboard</h1>
                    <p className="text-muted-foreground mt-1">Top builders ranked by total score.</p>
                </div>
                <div className="flex gap-1">
                    {(["all-time", "month", "week"] as Period[]).map((p) => (
                        <Button
                            key={p}
                            variant={period === p ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPeriod(p)}
                        >
                            {p === "all-time" ? "All Time" : p === "month" ? "This Month" : "This Week"}
                        </Button>
                    ))}
                </div>
            </div>
            {entries !== undefined ? (
                <LeaderboardTable entries={entries} />
            ) : (
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
                    ))}
                </div>
            )}
        </div>
    )
}
