"use client"
import { useEffect, useRef } from "react"
import { useQuery } from "convex/react"
import confetti from "canvas-confetti"
import { api } from "@/convex/_generated/api"
import type { Doc } from "@/convex/_generated/dataModel"

interface BadgeDisplayProps {
    badges: Doc<"badges">[]
    newlyAwardedId?: string
}

export function BadgeDisplay({ badges, newlyAwardedId }: BadgeDisplayProps) {
    const hasTriggered = useRef(false)

    useEffect(() => {
        if (newlyAwardedId && !hasTriggered.current) {
            hasTriggered.current = true
            confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } })
        }
    }, [newlyAwardedId])

    if (badges.length === 0) {
        return <p className="text-sm text-muted-foreground">No badges yet — submit a solution to earn your first!</p>
    }

    return (
        <div className="flex flex-wrap gap-3">
            {badges.map((badge) => (
                <div
                    key={badge._id}
                    className="flex flex-col items-center gap-1 p-3 border rounded-card"
                    title={badge.name}
                >
                    <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold"
                        style={{ backgroundColor: badge.color }}
                    >
                        {badge.level}
                    </div>
                    <span className="text-[10px] text-center font-semibold max-w-[60px] leading-tight">{badge.name}</span>
                </div>
            ))}
        </div>
    )
}

export function BadgeProgression() {
    const progression = useQuery(api.badges.getProgression)

    if (!progression) return null

    const upcoming = progression.filter((m) => !m.earned).slice(0, 3)
    if (upcoming.length === 0) return null

    return (
        <div className="mt-4 space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Next Milestones</h3>
            {upcoming.map((milestone) => (
                <div key={milestone.name} className="space-y-1">
                    <div className="flex justify-between text-sm">
                        <span>{milestone.name}</span>
                        <span className="text-muted-foreground">
                            {milestone.current}/{milestone.threshold}
                        </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                        <div
                            className="h-2 rounded-full bg-brand-primary transition-all"
                            style={{ width: `${milestone.progress * 100}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    )
}
