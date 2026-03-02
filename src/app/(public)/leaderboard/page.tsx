"use client"

import { useState, useEffect } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { LeaderboardTable } from "@/components/leaderboard-table"
import { Button } from "@/components/ui/button"

type Period = "all-time" | "month" | "week"

const PAGE_SIZE = 50

export default function LeaderboardPage() {
    const [period, setPeriod] = useState<Period>("all-time")
    const [offset, setOffset] = useState(0)

    // Reset offset when period changes
    useEffect(() => { setOffset(0) }, [period])

    const result = useQuery(api.badges.leaderboard, { period, limit: PAGE_SIZE, offset })

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
            {result !== undefined ? (
                <>
                    <LeaderboardTable entries={result.entries} rankOffset={offset} />
                    <div className="flex justify-center gap-2">
                        {offset > 0 && (
                            <Button
                                variant="outline"
                                onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
                                className="w-full max-w-xs"
                            >
                                Previous
                            </Button>
                        )}
                        {result.hasMore && (
                            <Button
                                variant="outline"
                                onClick={() => setOffset((prev) => prev + PAGE_SIZE)}
                                className="w-full max-w-xs"
                            >
                                Load More
                            </Button>
                        )}
                    </div>
                </>
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
