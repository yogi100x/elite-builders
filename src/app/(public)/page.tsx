import { preloadQuery } from "convex/nextjs"
import { api } from "@/convex/_generated/api"
import { ChallengeGrid } from "@/components/challenge-grid"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function LandingPage() {
    const preloaded = await preloadQuery(api.challenges.listTopSix)

    return (
        <div className="space-y-12">
            {/* Hero */}
            <section className="text-center py-16 space-y-4">
                <h1 className="font-display text-5xl font-bold tracking-tight">
                    Build. Ship. <span className="text-brand-primary">Get Recognized.</span>
                </h1>
                <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                    Portfolio-worthy challenges for elite engineers and designers.
                    Earn badges, climb leaderboards, get hired.
                </p>
                <div className="flex gap-3 justify-center">
                    <Button asChild size="lg">
                        <Link href="/challenges">Browse Challenges</Link>
                    </Button>
                    <Button asChild variant="outline" size="lg">
                        <Link href="/leaderboard">View Leaderboard</Link>
                    </Button>
                </div>
            </section>

            {/* Top challenges */}
            <section>
                <h2 className="font-display text-2xl font-semibold mb-4">Active Challenges</h2>
                <ChallengeGrid preloaded={preloaded} />
                <div className="text-center mt-6">
                    <Button asChild variant="outline">
                        <Link href="/challenges">View All Challenges →</Link>
                    </Button>
                </div>
            </section>
        </div>
    )
}
