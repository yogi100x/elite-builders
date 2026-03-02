import { preloadQuery } from "convex/nextjs"
import { api } from "@/convex/_generated/api"
import { LeaderboardTable } from "@/components/leaderboard-table"

export default async function LeaderboardPage() {
    const preloaded = await preloadQuery(api.badges.leaderboard, { limit: 50 })
    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-display text-3xl font-bold">Leaderboard</h1>
                <p className="text-muted-foreground mt-1">Top builders ranked by total score.</p>
            </div>
            <LeaderboardTable preloaded={preloaded} />
        </div>
    )
}
