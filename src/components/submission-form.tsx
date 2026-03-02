"use client"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RepoSelector } from "./repo-selector"
import { Id } from "@/convex/_generated/dataModel"
import { ALLOWED_UPLOAD_MIME_TYPES, MAX_UPLOAD_SIZE_BYTES } from "@/lib/constants"
import type { GitHubRepo } from "@/lib/github/client"
import { Github, Link2 } from "lucide-react"
import { VideoEmbed } from "@/components/video-embed"
import { Badge } from "@/components/ui/badge"

const schema = z.object({
    deckUrl: z.string().url().optional().or(z.literal("")),
    videoUrl: z.string().url().optional().or(z.literal("")),
    notes: z.string().max(500).optional(),
    // Fallback manual URL (used only when GitHub tab not used)
    manualRepoUrl: z.string().url().optional().or(z.literal("")),
})

type FormValues = z.infer<typeof schema>

export function SubmissionForm({ challengeId, templateRepoUrl }: { challengeId: Id<"challenges">; templateRepoUrl?: string }) {
    const router = useRouter()
    const createSubmission = useMutation(api.submissions.create)
    const generateUploadUrl = useMutation(api.submissions.generateUploadUrl)
    const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null)
    const [file, setFile] = useState<File | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [repoTab, setRepoTab] = useState<"github" | "manual">("github")

    const existingSubmissions = useQuery(api.submissions.listByUser)
    const existingForChallenge = existingSubmissions?.find(
        (s) => s.challengeId === challengeId && s.status !== "awarded",
    )

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { deckUrl: "", videoUrl: "", notes: "", manualRepoUrl: "" },
    })

    const videoUrl = form.watch("videoUrl")

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const selected = e.target.files?.[0]
        if (!selected) return
        if (!(ALLOWED_UPLOAD_MIME_TYPES as ReadonlyArray<string>).includes(selected.type)) {
            toast.error("Invalid file type: Allowed PDF, PNG, JPG, ZIP")
            return
        }
        if (selected.size > MAX_UPLOAD_SIZE_BYTES) {
            toast.error("File too large: Maximum size is 10MB")
            return
        }
        setFile(selected)
    }

    async function onSubmit(values: FormValues) {
        // Validate repo selection
        const hasGitHub = repoTab === "github" && selectedRepo
        const hasManual = repoTab === "manual" && values.manualRepoUrl
        if (!hasGitHub && !hasManual) {
            toast.error("Repository required: Select a GitHub repo or paste a URL")
            return
        }

        setIsSubmitting(true)
        try {
            const fileStorageIds: Id<"_storage">[] = []
            if (file) {
                const uploadUrl = await generateUploadUrl()
                const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file })
                const { storageId } = await res.json()
                fileStorageIds.push(storageId)
            }

            await createSubmission({
                challengeId,
                githubOwner: hasGitHub ? selectedRepo.fullName.split("/")[0] : undefined,
                githubRepo: hasGitHub ? selectedRepo.name : undefined,
                githubRepoUrl: hasGitHub ? selectedRepo.htmlUrl : undefined,
                githubDefaultBranch: hasGitHub ? selectedRepo.defaultBranch : undefined,
                repoUrl: hasManual ? values.manualRepoUrl : undefined,
                deckUrl: values.deckUrl || undefined,
                videoUrl: values.videoUrl || undefined,
                notes: values.notes || undefined,
                fileStorageIds,
            })

            toast.success("Submission received!", {
                description: "Our AI is scoring your submission. You'll be notified when judged.",
            })
            router.push("/dashboard")
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to submit. Please try again.";
            const convexMessage =
                typeof (error as any)?.data === "string"
                    ? (error as any).data
                    : message;
            toast.error(convexMessage);
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {existingForChallenge && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                        <div className="flex items-center justify-between">
                            <span>You already submitted v{existingForChallenge.version ?? 1}.
                            Submitting again will create a new revision.</span>
                            {existingForChallenge.startedAt && existingForChallenge.submittedAt && (
                                <Badge variant="outline" className="text-xs">
                                    {Math.round((existingForChallenge.submittedAt - existingForChallenge.startedAt) / 60000)} minutes elapsed
                                </Badge>
                            )}
                        </div>
                    </div>
                )}

                {templateRepoUrl && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                            This challenge has a template repository
                        </p>
                        <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                            Fork the template below and build your solution on top of it.
                        </p>
                        <a
                            href={templateRepoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-100"
                        >
                            <Github size={14} />
                            View Template Repository
                        </a>
                    </div>
                )}

                {/* Repo selection — GitHub or manual */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Repository *</label>
                    <Tabs value={repoTab} onValueChange={(v) => setRepoTab(v as "github" | "manual")}>
                        <TabsList className="w-full">
                            <TabsTrigger value="github" className="flex-1 gap-2">
                                <Github size={14} /> Select from GitHub
                            </TabsTrigger>
                            <TabsTrigger value="manual" className="flex-1 gap-2">
                                <Link2 size={14} /> Paste URL
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="github" className="pt-3">
                            <RepoSelector onSelect={setSelectedRepo} selectedRepo={selectedRepo} />
                        </TabsContent>
                        <TabsContent value="manual" className="pt-3">
                            <FormField control={form.control} name="manualRepoUrl" render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Input placeholder="https://github.com/you/project" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </TabsContent>
                    </Tabs>
                </div>

                <FormField control={form.control} name="deckUrl" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Deck / Slides URL</FormLabel>
                        <FormControl><Input placeholder="https://docs.google.com/presentation/..." {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                <FormField control={form.control} name="videoUrl" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Demo Video URL (YouTube / Vimeo)</FormLabel>
                        <FormControl><Input placeholder="https://youtube.com/watch?v=..." {...field} /></FormControl>
                        <FormMessage />
                        {videoUrl && (
                            <div className="mt-2 text-xs text-muted-foreground">
                                <VideoEmbed url={videoUrl} />
                            </div>
                        )}
                    </FormItem>
                )} />

                <div>
                    <label className="text-sm font-medium">Supplementary File (PDF, ZIP, PNG — max 10MB)</label>
                    <Input type="file" onChange={handleFileChange} className="mt-1" accept=".pdf,.zip,.png,.jpg,.jpeg" />
                </div>

                <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Pitch (max 500 chars)</FormLabel>
                        <FormControl><Textarea placeholder="Describe your approach, key decisions, and what makes your solution stand out..." {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? "Submitting & scoring..." : existingForChallenge ? "Resubmit Solution" : "Submit Solution"}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                    Your submission will be automatically scored by AI, then reviewed by a human judge.
                </p>
            </form>
        </Form>
    )
}
