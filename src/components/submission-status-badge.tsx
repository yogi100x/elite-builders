"use client"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"

interface SubmissionStatusBadgeProps {
    status: string
    scoringStatus?: string   // "pending" | "scoring" | "scored" | "failed"
    provisionalScore?: number
}

/**
 * Shows the submission's pipeline status at a glance.
 * Convex live queries keep this up-to-date without a page refresh.
 */
export function SubmissionStatusBadge({ status, scoringStatus, provisionalScore }: SubmissionStatusBadgeProps) {
    // Final award status takes priority
    if (status === "awarded") {
        return <Badge className="bg-brand-success text-white">Awarded</Badge>
    }

    if (status === "not-selected") {
        return <Badge variant="secondary">Not Selected</Badge>
    }

    // In-review states depend on scoringStatus
    if (status === "in-review") {
        if (scoringStatus === "pending") {
            return (
                <Badge variant="outline" className="gap-1 animate-pulse text-muted-foreground">
                    Queued for AI Scoring
                </Badge>
            )
        }

        if (scoringStatus === "scoring") {
            return (
                <Badge variant="outline" className="gap-1 text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    AI Scoring...
                </Badge>
            )
        }

        if (scoringStatus === "scored") {
            return (
                <Badge variant="outline" className="text-brand-primary border-brand-primary">
                    Scored ({provisionalScore ?? "?"}/100) — Pending Review
                </Badge>
            )
        }

        if (scoringStatus === "failed") {
            return <Badge variant="destructive">Scoring Failed</Badge>
        }
    }

    // Default fallback
    return <Badge variant="secondary">In Review</Badge>
}
