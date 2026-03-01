"use client"
import { useEffect, useRef } from "react"
import confetti from "canvas-confetti"
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
