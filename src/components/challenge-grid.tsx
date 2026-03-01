"use client"
import { usePreloadedQuery } from "convex/react"
import type { Preloaded } from "convex/react"
import type { api } from "@/convex/_generated/api"
import type { Doc } from "@/convex/_generated/dataModel"
import { ChallengeCard } from "./challenge-card"
import { Skeleton } from "@/components/ui/skeleton"

type ChallengeGridProps = {
    emptyMessage?: string
} & (
    | { preloaded: Preloaded<typeof api.challenges.listPublic> | Preloaded<typeof api.challenges.listTopSix>; challenges?: never }
    | { challenges: Doc<"challenges">[] | undefined; preloaded?: never }
)

function GridSkeleton() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-card" />
            ))}
        </div>
    )
}

function PreloadedGrid({ preloaded, emptyMessage }: { preloaded: Preloaded<typeof api.challenges.listPublic> | Preloaded<typeof api.challenges.listTopSix>; emptyMessage: string }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const challenges = usePreloadedQuery(preloaded as any)

    if (!challenges) return <GridSkeleton />

    if (challenges.length === 0) {
        return (
            <div className="text-center py-16 text-muted-foreground">
                <p>{emptyMessage}</p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {challenges.map((c: Doc<"challenges">) => (
                <ChallengeCard key={c._id} challenge={c} />
            ))}
        </div>
    )
}

export function ChallengeGrid(props: ChallengeGridProps) {
    const { emptyMessage = "No challenges found." } = props

    if ("preloaded" in props && props.preloaded) {
        return <PreloadedGrid preloaded={props.preloaded} emptyMessage={emptyMessage} />
    }

    const challenges = props.challenges

    if (!challenges) return <GridSkeleton />

    if (challenges.length === 0) {
        return (
            <div className="text-center py-16 text-muted-foreground">
                <p>{emptyMessage}</p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {challenges.map((c) => (
                <ChallengeCard key={c._id} challenge={c} />
            ))}
        </div>
    )
}
