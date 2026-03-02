"use client"
import Link from "next/link"
import { useMutation, useQuery } from "convex/react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, Bookmark } from "lucide-react"
import { DIFFICULTY_COLORS, DIFFICULTY_LABELS } from "@/lib/constants"
import { formatDeadline } from "@/lib/utils"
import { api } from "@/convex/_generated/api"
import type { Doc, Id } from "@/convex/_generated/dataModel"

interface ChallengeCardProps {
    challenge: Doc<"challenges">
}

function BookmarkButton({ challengeId }: { challengeId: Id<"challenges"> }) {
    const isBookmarked = useQuery(api.bookmarks.isBookmarked, { challengeId })
    const bookmark = useMutation(api.bookmarks.bookmark)
    const unbookmark = useMutation(api.bookmarks.unbookmark)
    
    return (
        <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                isBookmarked ? unbookmark({ challengeId }) : bookmark({ challengeId })
            }}
        >
            <Bookmark size={16} className={isBookmarked ? "fill-current text-brand-primary" : ""} />
        </Button>
    )
}

export function ChallengeCard({ challenge }: ChallengeCardProps) {
    return (
        <Card className="group transition-brand hover:-translate-y-1 hover:shadow-lg rounded-card flex flex-col items-stretch">
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display font-semibold text-sm leading-snug line-clamp-2">
                        {challenge.title}
                    </h3>
                    <div className="flex items-center gap-1">
                        <BookmarkButton challengeId={challenge._id} />
                        <Badge className={DIFFICULTY_COLORS[challenge.difficulty]} variant="secondary">
                            {DIFFICULTY_LABELS[challenge.difficulty]}
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pb-2 flex-grow">
                <p className="text-xs text-muted-foreground line-clamp-2">{challenge.summary}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                    {challenge.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                    ))}
                </div>
            </CardContent>
            <CardFooter className="flex items-center justify-between pt-2 border-t mt-auto">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                    <Clock size={12} />
                    <span>{formatDeadline(challenge.deadline)}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs font-mono text-brand-primary font-semibold">{challenge.prize}</span>
                    <Button asChild size="sm" variant={challenge.status === "open" ? "default" : "secondary"}>
                        <Link href={`/challenges/${challenge._id}`}>
                            {challenge.status === "open" ? "View" : "Closed"}
                        </Link>
                    </Button>
                </div>
            </CardFooter>
        </Card>
    )
}
