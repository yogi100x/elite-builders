"use client"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const schema = z.object({
    title: z.string().min(5, "Title must be at least 5 characters"),
    summary: z.string().min(20),
    overview: z.string().min(50),
    problemStatement: z.string().min(50),
    tags: z.string().min(1, "At least one tag is required"),
    difficulty: z.enum(["beginner", "intermediate", "advanced", "expert"]),
    prize: z.string().min(1),
    deadlineDays: z.coerce.number().min(1).max(365),
})

type FormValues = z.infer<typeof schema>

export default function NewChallengePage() {
    const router = useRouter()
    const createChallenge = useMutation(api.challenges.create)

    const form = useForm<FormValues>({
        resolver: zodResolver(schema) as any,
        defaultValues: { title: "", summary: "", overview: "", problemStatement: "", tags: "", difficulty: "intermediate", prize: "", deadlineDays: 30 },
    })

    async function onSubmit(values: FormValues) {
        try {
            const tags = values.tags.split(",").map((t) => t.trim()).filter(Boolean)
            const deadline = Date.now() + values.deadlineDays * 24 * 60 * 60 * 1000
            await createChallenge({ ...values, deadline, tags })
            toast.success("Challenge created!")
            router.push("/sponsor")
        } catch (err) {
            toast.error("Error", { description: String(err) })
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="font-display text-3xl font-bold">Create Challenge</h1>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField control={form.control} name="title" render={({ field }) => (
                        <FormItem><FormLabel>Title *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="summary" render={({ field }) => (
                        <FormItem><FormLabel>Summary *</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="overview" render={({ field }) => (
                        <FormItem><FormLabel>Overview *</FormLabel><FormControl><Textarea rows={4} {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="problemStatement" render={({ field }) => (
                        <FormItem><FormLabel>Problem Statement * (shown to authenticated users only)</FormLabel><FormControl><Textarea rows={6} {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="difficulty" render={({ field }) => (
                            <FormItem><FormLabel>Difficulty</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="beginner">Beginner</SelectItem>
                                        <SelectItem value="intermediate">Intermediate</SelectItem>
                                        <SelectItem value="advanced">Advanced</SelectItem>
                                        <SelectItem value="expert">Expert</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="deadlineDays" render={({ field }) => (
                            <FormItem><FormLabel>Deadline (days from now)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>
                    <FormField control={form.control} name="prize" render={({ field }) => (
                        <FormItem><FormLabel>Prize</FormLabel><FormControl><Input placeholder="$2,000 + Badge" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="tags" render={({ field }) => (
                        <FormItem><FormLabel>Tags (comma-separated)</FormLabel><FormControl><Input placeholder="AI, developer-tools, LLM" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <Button type="submit" className="w-full">Create Challenge</Button>
                </form>
            </Form>
        </div>
    )
}
