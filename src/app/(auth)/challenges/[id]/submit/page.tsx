"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { SubmissionForm } from "@/components/submission-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { use } from "react"

const DEFAULT_RUBRIC = [
    { name: "Technical Implementation", maxScore: 40, description: "" },
    { name: "Problem Understanding", maxScore: 20, description: "" },
    { name: "Innovation", maxScore: 20, description: "" },
    { name: "Documentation", maxScore: 10, description: "" },
    { name: "Completeness", maxScore: 10, description: "" },
]

export default function SubmitPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const challengeId = id as Id<"challenges">
    const challenge = useQuery(api.challenges.getById, { id: challengeId })

    return (
        <div className="max-w-xl mx-auto space-y-6">
            <div>
                <h1 className="font-display text-3xl font-bold">Submit Your Solution</h1>
                <p className="text-muted-foreground mt-1">Provide links to your work. Repo URL is required.</p>
            </div>

            {/* Rubric */}
            {challenge && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Evaluation Criteria</CardTitle>
                        <CardDescription>
                            Your submission will be scored against these criteria.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {(challenge.rubricCriteria ?? DEFAULT_RUBRIC).map(
                                (criterion, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center justify-between rounded border p-2 text-sm"
                                    >
                                        <span>{criterion.name}</span>
                                        <span className="font-mono text-muted-foreground">
                                            /{criterion.maxScore}
                                        </span>
                                    </div>
                                ),
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            <SubmissionForm challengeId={challengeId} />
        </div>
    )
}
