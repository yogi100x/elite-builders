"use client"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"

interface SubmissionStatusBadgeProps {
    status: string
    scoringStatus?: string   // "pending" | "complete" | "failed"
    testRunStatus?: string   // "running" | "complete" | "error" | "skipped"
}

/**
 * Shows the submission's pipeline status at a glance.
 * Convex live queries keep this up-to-date without a page refresh.
 */
export function SubmissionStatusBadge({ status, scoringStatus, testRunStatus }: SubmissionStatusBadgeProps) {
    // Scoring in progress
    if (scoringStatus === "pending") {
        return (
            <Badge variant="outline" className="gap-1 text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                AI Scoring…
            </Badge>
        )
    }

    // Tests running
    if (testRunStatus === "running") {
        return (
            <Badge variant="outline" className="gap-1 text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                Tests Running…
            </Badge>
        )
    }

    // Scoring failed
    if (scoringStatus === "failed") {
        return <Badge variant="destructive">Scoring Failed</Badge>
    }

    // Final award status
    if (status === "awarded") {
        return <Badge className="bg-brand-success text-white">Awarded</Badge>
    }

    if (status === "rejected") {
        return <Badge variant="secondary">Not Selected</Badge>
    }

    // Scored but awaiting final judge review
    if (scoringStatus === "complete") {
        return <Badge variant="outline" className="text-brand-primary border-brand-primary">Scored — Pending Review</Badge>
    }

    return <Badge variant="secondary">In Review</Badge>
}
