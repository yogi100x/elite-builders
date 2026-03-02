"use client"

import { use, useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Id } from "@/convex/_generated/dataModel"
import { Download, ExternalLink, MessageSquare, Loader2 } from "lucide-react"
import { STATUS_LABELS } from "@/lib/constants"
import { toast } from "sonner"
import type { Doc } from "@/convex/_generated/dataModel"

function ExpressInterestButton({ submission }: { submission: Doc<"submissions"> }) {
    const [open, setOpen] = useState(false)
    const [message, setMessage] = useState("")
    const [sending, setSending] = useState(false)
    const expressInterest = useMutation(api.engagements.expressInterest)

    async function handleSend() {
        if (!message.trim()) {
            toast.error("Please enter a message")
            return
        }
        setSending(true)
        try {
            await expressInterest({
                submissionId: submission._id,
                message: message.trim(),
            })
            toast.success("Interest expressed! The candidate has been notified.")
            setMessage("")
            setOpen(false)
        } catch (error: unknown) {
            const msg =
                error instanceof Error
                    ? error.message.replace(/^.*ConvexError:\s*/, "")
                    : "Something went wrong"
            toast.error(msg)
        } finally {
            setSending(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                    <MessageSquare size={14} />
                    Express Interest
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Express Interest</DialogTitle>
                    <DialogDescription>
                        Send a message to the candidate about their submission. They will be notified immediately.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                    <Label htmlFor="interest-message">Your message</Label>
                    <Textarea
                        id="interest-message"
                        placeholder="We were impressed by your solution and would love to discuss an opportunity..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={4}
                    />
                </div>
                <DialogFooter>
                    <Button
                        onClick={handleSend}
                        disabled={sending || !message.trim()}
                    >
                        {sending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sending...
                            </>
                        ) : (
                            "Send Interest"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function SponsorSubmissionsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const submissions = useQuery(api.submissions.listByChallenge, {
        challengeId: id as Id<"challenges">,
    })

    if (!submissions) return <Skeleton className="h-64" />

    const sorted = [...submissions].sort((a, b) => {
        const scoreA = a.score ?? a.provisionalScore ?? 0
        const scoreB = b.score ?? b.provisionalScore ?? 0
        return scoreB - scoreA
    })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display text-2xl font-bold">Submissions</h1>
                    <p className="text-muted-foreground">{submissions.length} total</p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => window.open(`/api/sponsor/download-packet?challengeId=${id}`, "_blank")}
                >
                    <Download size={14} />
                    Download Candidate Packets
                </Button>
            </div>

            <div className="border rounded-card divide-y">
                {sorted.map((sub, index) => {
                    const displayScore = sub.score ?? sub.provisionalScore
                    return (
                        <div key={sub._id} className="flex items-center gap-4 p-4">
                            <span className="font-mono font-bold w-8 text-center text-muted-foreground">
                                #{index + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="font-mono text-xs text-muted-foreground truncate">{sub._id}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    {(sub.githubRepoUrl ?? sub.repoUrl) && (
                                        <a
                                            href={sub.githubRepoUrl ?? sub.repoUrl ?? "#"}
                                            target="_blank"
                                            className="text-xs text-brand-primary flex items-center gap-1 hover:underline"
                                        >
                                            {sub.githubOwner
                                                ? `${sub.githubOwner}/${sub.githubRepo}`
                                                : "View Repo"}
                                            <ExternalLink size={10} />
                                        </a>
                                    )}
                                    {sub.videoUrl && (
                                        <a href={sub.videoUrl} target="_blank" className="text-xs text-muted-foreground hover:underline">
                                            Demo Video →
                                        </a>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <ExpressInterestButton submission={sub} />
                                <Badge variant={sub.status === "awarded" ? "default" : "secondary"}>
                                    {STATUS_LABELS[sub.status]}
                                </Badge>
                                {displayScore !== undefined && (
                                    <span className="font-mono font-bold text-sm">
                                        {displayScore}
                                        <span className="text-muted-foreground font-normal">/100</span>
                                        {sub.score === undefined && sub.provisionalScore !== undefined && (
                                            <span className="text-[10px] text-muted-foreground ml-1">(AI)</span>
                                        )}
                                    </span>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
