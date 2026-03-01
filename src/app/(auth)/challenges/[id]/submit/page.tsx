import { Id } from "@/convex/_generated/dataModel"
import { SubmissionForm } from "@/components/submission-form"

export default async function SubmitPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    return (
        <div className="max-w-xl mx-auto space-y-6">
            <div>
                <h1 className="font-display text-3xl font-bold">Submit Your Solution</h1>
                <p className="text-muted-foreground mt-1">Provide links to your work. Repo URL is required.</p>
            </div>
            <SubmissionForm challengeId={id as Id<"challenges">} />
        </div>
    )
}
