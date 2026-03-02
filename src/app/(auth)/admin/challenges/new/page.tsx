"use client"

import { useMutation } from "convex/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

const challengeSchema = z.object({
    title: z.string().min(1, "Title is required"),
    summary: z.string().min(1, "Summary is required"),
    overview: z.string().min(1, "Overview is required"),
    problemStatement: z.string().min(1, "Problem statement is required"),
    tags: z.string().min(1, "At least one tag is required"),
    difficulty: z.enum(["beginner", "intermediate", "advanced", "expert"]),
    prize: z.string().min(1, "Prize is required"),
    deadline: z.string().min(1, "Deadline is required"),
    season: z.string().optional(),
})

type ChallengeForm = z.infer<typeof challengeSchema>

export default function AdminNewChallengePage() {
    const createChallenge = useMutation(api.challenges.createPlatformChallenge)
    const router = useRouter()

    const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<ChallengeForm>({
        resolver: zodResolver(challengeSchema),
        defaultValues: { difficulty: "intermediate" },
    })

    async function onSubmit(data: ChallengeForm) {
        try {
            await createChallenge({
                title: data.title,
                summary: data.summary,
                overview: data.overview,
                problemStatement: data.problemStatement,
                tags: data.tags.split(",").map((t) => t.trim()).filter(Boolean),
                difficulty: data.difficulty,
                prize: data.prize,
                deadline: new Date(data.deadline).getTime(),
                season: data.season || undefined,
            })
            toast.success("Platform challenge created!")
            router.push("/admin/invites")
        } catch (error: unknown) {
            const msg = error instanceof Error
                ? error.message.replace(/^.*ConvexError:\s*/, "")
                : "Something went wrong"
            toast.error(msg)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-display text-3xl font-bold">Create Platform Challenge</h1>
                <p className="text-muted-foreground mt-1">Create a challenge under the EliteBuilders platform sponsor.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Challenge Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title *</Label>
                            <Input id="title" {...register("title")} />
                            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="summary">Summary *</Label>
                            <Textarea id="summary" rows={2} {...register("summary")} />
                            {errors.summary && <p className="text-sm text-destructive">{errors.summary.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="overview">Overview *</Label>
                            <Textarea id="overview" rows={4} {...register("overview")} />
                            {errors.overview && <p className="text-sm text-destructive">{errors.overview.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="problemStatement">Problem Statement *</Label>
                            <Textarea id="problemStatement" rows={4} {...register("problemStatement")} />
                            {errors.problemStatement && <p className="text-sm text-destructive">{errors.problemStatement.message}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="tags">Tags (comma-separated) *</Label>
                                <Input id="tags" placeholder="React, TypeScript, API" {...register("tags")} />
                                {errors.tags && <p className="text-sm text-destructive">{errors.tags.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label>Difficulty *</Label>
                                <Select
                                    value={watch("difficulty")}
                                    onValueChange={(v) => setValue("difficulty", v as ChallengeForm["difficulty"])}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="beginner">Beginner</SelectItem>
                                        <SelectItem value="intermediate">Intermediate</SelectItem>
                                        <SelectItem value="advanced">Advanced</SelectItem>
                                        <SelectItem value="expert">Expert</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="prize">Prize *</Label>
                                <Input id="prize" placeholder="$500 + mentorship" {...register("prize")} />
                                {errors.prize && <p className="text-sm text-destructive">{errors.prize.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="deadline">Deadline *</Label>
                                <Input id="deadline" type="datetime-local" {...register("deadline")} />
                                {errors.deadline && <p className="text-sm text-destructive">{errors.deadline.message}</p>}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="season">Season (optional)</Label>
                            <Input id="season" placeholder="e.g., Spring 2026" {...register("season")} />
                        </div>

                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Creating..." : "Create Challenge"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
