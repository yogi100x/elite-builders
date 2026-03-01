"use client"
import { usePreloadedQuery } from "convex/react"
import type { Preloaded } from "convex/react"
import type { api } from "@/convex/_generated/api"
import Link from "next/link"
import { SignInButton } from "@clerk/nextjs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Lock } from "lucide-react"
import { DIFFICULTY_COLORS, DIFFICULTY_LABELS } from "@/lib/constants"
import { formatDeadline } from "@/lib/utils"

interface Props {
    preloaded: Preloaded<typeof api.challenges.getById>
    isAuthenticated: boolean
}

export function ChallengeDetailView({ preloaded, isAuthenticated }: Props) {
    const challenge = usePreloadedQuery(preloaded)

    if (!challenge) return <div className="py-16 text-center text-muted-foreground">Challenge not found.</div>

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            {/* Header */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Badge className={DIFFICULTY_COLORS[challenge.difficulty]}>
                        {DIFFICULTY_LABELS[challenge.difficulty]}
                    </Badge>
                    <Badge variant={challenge.status === "open" ? "default" : "secondary"}>
                        {challenge.status === "open" ? "Open" : "Closed"}
                    </Badge>
                </div>
                <h1 className="font-display text-4xl font-bold">{challenge.title}</h1>
                <p className="text-muted-foreground">{challenge.summary}</p>
                <div className="flex flex-wrap gap-1">
                    {challenge.tags.map((tag) => (
                        <Badge key={tag} variant="outline">{tag}</Badge>
                    ))}
                </div>
            </div>

            {/* Prize + deadline */}
            <div className="flex gap-6 text-sm">
                <div>
                    <span className="text-muted-foreground">Prize</span>
                    <p className="font-mono font-bold text-brand-primary">{challenge.prize}</p>
                </div>
                <div>
                    <span className="text-muted-foreground">Deadline</span>
                    <p className="font-semibold">{formatDeadline(challenge.deadline)}</p>
                </div>
            </div>

            {/* Overview — always visible */}
            <section>
                <h2 className="font-display text-xl font-semibold mb-2">Overview</h2>
                <p className="text-muted-foreground whitespace-pre-line">{challenge.overview}</p>
            </section>

            {/* Problem statement — auth-walled */}
            {isAuthenticated ? (
                <section>
                    <h2 className="font-display text-xl font-semibold mb-2">Problem Statement</h2>
                    <div className="prose prose-sm max-w-none">
                        <p className="whitespace-pre-line">{challenge.problemStatement}</p>
                    </div>
                    {challenge.status === "open" && (
                        <Button asChild className="mt-6">
                            <Link href={`/challenges/${challenge._id}/submit`}>Submit Solution →</Link>
                        </Button>
                    )}
                </section>
            ) : (
                <div className="relative border rounded-card p-8 bg-muted/50 text-center space-y-3">
                    <Lock className="mx-auto text-muted-foreground" size={32} />
                    <h3 className="font-display font-semibold">Sign up to unlock the full challenge</h3>
                    <p className="text-sm text-muted-foreground">Get the problem statement, starter files, and submission instructions.</p>
                    <SignInButton mode="modal">
                        <Button>Sign Up Free</Button>
                    </SignInButton>
                </div>
            )}
        </div>
    )
}
