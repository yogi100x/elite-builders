"use client"
import { usePreloadedQuery } from "convex/react"
import type { Preloaded } from "convex/react"
import type { api } from "@/convex/_generated/api"
import Link from "next/link"
import { SignInButton } from "@clerk/nextjs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Download, Lock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { DIFFICULTY_COLORS, DIFFICULTY_LABELS } from "@/lib/constants"
import { formatDeadline } from "@/lib/utils"
import { ChallengeLeaderboard } from "@/components/challenge-leaderboard"

interface Props {
    preloaded: Preloaded<typeof api.challenges.getById>
    isAuthenticated: boolean
}

const DEFAULT_RUBRIC = [
    { name: "Technical Implementation", maxScore: 40, description: "Quality of code, architecture, use of AI/ML techniques" },
    { name: "Problem Understanding", maxScore: 20, description: "How well the submission addresses the stated problem" },
    { name: "Innovation", maxScore: 20, description: "Creative use of AI, novel approach, differentiated solution" },
    { name: "Documentation & Clarity", maxScore: 10, description: "README quality, pitch clarity, demo explanation" },
    { name: "Completeness", maxScore: 10, description: "End-to-end functionality, working demo" },
]

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

            {/* Data Pack download link */}
            {challenge.dataPackUrl && (
                <section>
                    <Button asChild variant="outline">
                        <a href={challenge.dataPackUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4 mr-2" />
                            Download Data Pack
                        </a>
                    </Button>
                </section>
            )}

            {/* Evaluation Criteria */}
            <section>
                <h2 className="font-display text-xl font-semibold mb-3">Evaluation Criteria</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                    {(challenge.rubricCriteria ?? DEFAULT_RUBRIC).map((criterion) => (
                        <Card key={criterion.name}>
                            <CardContent className="pt-4">
                                <div className="flex items-baseline justify-between mb-1">
                                    <h3 className="font-semibold text-sm">{criterion.name}</h3>
                                    <span className="text-xs font-mono text-muted-foreground">/{criterion.maxScore}</span>
                                </div>
                                <p className="text-sm text-muted-foreground">{criterion.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
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

            {/* Per-challenge leaderboard */}
            <ChallengeLeaderboard challengeId={challenge._id} />
        </div>
    )
}
