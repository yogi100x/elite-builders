import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { VideoEmbed } from "@/components/video-embed"
import { GitHubRepoPanel } from "@/components/github-repo-panel"
import { api } from "@/convex/_generated/api"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Doc } from "@/convex/_generated/dataModel"
import { BADGE_COLORS } from "@/lib/constants"
import { FileDown } from "lucide-react"

interface Props {
    submission: Doc<"submissions">
    onDone: () => void
}

export function JudgePanel({ submission, onDone }: Props) {
    const award = useMutation(api.submissions.award)
    const reject = useMutation(api.submissions.reject)
    const [score, setScore] = useState(75)
    const [feedback, setFeedback] = useState("")
    const [badgeName, setBadgeName] = useState("Builder")
    const [badgeLevel, setBadgeLevel] = useState(2)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const fileUrls = useQuery(
        api.submissions.getFileUrls,
        submission.fileStorageIds && submission.fileStorageIds.length > 0
            ? { storageIds: submission.fileStorageIds }
            : "skip"
    )

    async function handleAward() {
        if (!feedback.trim()) {
            toast.error("Feedback required")
            return
        }
        setIsSubmitting(true)
        try {
            await award({
                submissionId: submission._id,
                score,
                feedback,
                badgeName,
                badgeColor: BADGE_COLORS[badgeLevel] ?? BADGE_COLORS[2],
                badgeLevel,
            })
            toast.success("Badge awarded!")
            onDone()
        } catch (err) {
            toast.error("Error", { description: String(err) })
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleReject() {
        if (!feedback.trim()) {
            toast.error("Feedback required before rejecting")
            return
        }
        setIsSubmitting(true)
        try {
            await reject({ submissionId: submission._id, feedback })
            toast.success("Submission marked as not selected")
            onDone()
        } catch (err) {
            toast.error("Error", { description: String(err) })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="border rounded-card p-6 space-y-4">
            <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-mono">Submission ID: {submission._id}</p>
                <div className="flex gap-3 text-sm">
                    <a href={submission.repoUrl} target="_blank" className="text-brand-primary underline break-all max-w-[50vw]">Repo → {submission.repoUrl}</a>
                    {submission.deckUrl && <a href={submission.deckUrl} target="_blank" className="text-brand-primary underline">Deck →</a>}
                    {submission.videoUrl && <a href={submission.videoUrl} target="_blank" className="text-brand-primary underline">Video →</a>}
                </div>
                {submission.notes && <p className="text-sm text-muted-foreground italic">"{submission.notes}"</p>}

                {/* Uploaded Files */}
                {submission.fileStorageIds && submission.fileStorageIds.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium">Uploaded Files</h3>
                        <div className="flex flex-wrap gap-2">
                            {submission.fileStorageIds.map((storageId, i) => (
                                <a
                                    key={storageId}
                                    href={fileUrls?.[i] ?? "#"}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
                                >
                                    <FileDown className="h-4 w-4" />
                                    File {i + 1}
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {(submission.githubOwner && submission.githubRepo) && (
                <GitHubRepoPanel
                    owner={submission.githubOwner}
                    repo={submission.githubRepo}
                    repoUrl={submission.githubRepoUrl ?? `https://github.com/${submission.githubOwner}/${submission.githubRepo}`}
                />
            )}

            {/* Provisional AI score display */}
            {submission.provisionalScore !== undefined && (
                <div className="bg-muted/50 border rounded-card p-4 space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">AI Provisional Score</p>
                        <span className="font-mono font-bold text-brand-primary text-lg">
                            {submission.provisionalScore}/100
                        </span>
                    </div>
                </div>
            )}

            {submission.videoUrl && (
                <div className="space-y-2">
                    <p className="text-sm font-semibold">Demo Video</p>
                    <VideoEmbed url={submission.videoUrl} />
                </div>
            )}

            <div className="space-y-2">
                <Label>Score (0–100)</Label>
                <Input
                    type="number"
                    min={0}
                    max={100}
                    value={score}
                    onChange={(e) => setScore(Number(e.target.value))}
                    className="font-mono w-24"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Badge Name</Label>
                    <Input value={badgeName} onChange={(e) => setBadgeName(e.target.value)} placeholder="Builder" />
                </div>
                <div className="space-y-2">
                    <Label>Badge Level</Label>
                    <Select value={String(badgeLevel)} onValueChange={(v) => setBadgeLevel(Number(v))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {[1, 2, 3, 4, 5].map((l) => (
                                <SelectItem key={l} value={String(l)}>Level {l}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <Label>Feedback * (required)</Label>
                <Textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Structured feedback for the builder..."
                    rows={4}
                />
            </div>

            <div className="flex gap-3">
                <Button onClick={handleAward} disabled={isSubmitting} className="flex-1">
                    Award Badge
                </Button>
                <Button onClick={handleReject} disabled={isSubmitting} variant="outline" className="flex-1">
                    Not Selected
                </Button>
            </div>
        </div >
    )
}
