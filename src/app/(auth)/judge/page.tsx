"use client"
import { useState } from "react"
import { useQuery } from "convex/react"
import { useUser } from "@clerk/nextjs"
import { api } from "@/convex/_generated/api"
import { JudgePanel } from "@/components/judge-panel"
import { Skeleton } from "@/components/ui/skeleton"
import type { Doc } from "@/convex/_generated/dataModel"

function SubmissionListItem({
    sub,
    isSelected,
    onClick,
}: {
    sub: Doc<"submissions">
    isSelected: boolean
    onClick: () => void
}) {
    const challenge = useQuery(api.challenges.getById, { id: sub.challengeId })

    return (
        <div
            onClick={onClick}
            className={`border rounded-card p-4 cursor-pointer hover:border-brand-primary transition-brand ${isSelected ? "border-brand-primary bg-blue-50/5" : ""}`}
        >
            <p className="text-sm font-medium">
                {challenge?.title ?? <span className="text-xs text-muted-foreground font-mono">Loading...</span>}
            </p>
            {sub.githubOwner && (
                <p className="text-xs text-muted-foreground mt-0.5">by {sub.githubOwner}</p>
            )}
            <a href={sub.repoUrl} target="_blank" className="text-sm text-brand-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                {sub.repoUrl}
            </a>
        </div>
    )
}

export default function JudgePage() {
    const { user } = useUser()
    const role = user?.publicMetadata?.role as string | undefined
    const submissions = useQuery(api.submissions.listPendingReview)
    const [selected, setSelected] = useState<Doc<"submissions"> | null>(null)

    if (role !== "judge" && role !== "admin") {
        return <div className="text-center py-16 text-muted-foreground">You don't have judge access.</div>
    }

    if (!submissions) return <Skeleton className="h-64" />

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
                <div>
                    <h1 className="font-display text-3xl font-bold">Judge Console</h1>
                    <p className="text-muted-foreground">{submissions.length} submission(s) pending review</p>
                </div>
                {submissions.length === 0 ? (
                    <p className="text-muted-foreground py-8 text-center">No submissions pending review.</p>
                ) : (
                    submissions.map((sub) => (
                        <SubmissionListItem
                            key={sub._id}
                            sub={sub}
                            isSelected={selected?._id === sub._id}
                            onClick={() => setSelected(sub)}
                        />
                    ))
                )}
            </div>
            <div>
                {selected ? (
                    <JudgePanel submission={selected} onDone={() => setSelected(null)} />
                ) : (
                    <div className="border rounded-card p-8 text-center text-muted-foreground">
                        Select a submission from the list to review it.
                    </div>
                )}
            </div>
        </div>
    )
}
