"use client"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useState } from "react"
import type { Id } from "@/convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Trash2 } from "lucide-react"

const rubricCriterionSchema = z.object({
    name: z.string().min(1, "Criterion name is required"),
    maxScore: z.coerce.number().min(1, "Must be at least 1").max(100, "Must be at most 100"),
    description: z.string().min(1, "Description is required"),
})

const schema = z.object({
    title: z.string().min(5, "Title must be at least 5 characters"),
    summary: z.string().min(20),
    overview: z.string().min(50),
    problemStatement: z.string().min(50),
    tags: z.string().min(1, "At least one tag is required"),
    difficulty: z.enum(["beginner", "intermediate", "advanced", "expert"]),
    prize: z.string().min(1),
    deadlineDays: z.coerce.number().min(1).max(365),
    dataPackUrl: z.string().url("Must be a valid URL").or(z.literal("")),
    rubricCriteria: z.array(rubricCriterionSchema),
})

type FormValues = z.infer<typeof schema>

export default function NewChallengePage() {
    const router = useRouter()
    const createChallenge = useMutation(api.challenges.create)
    const judges = useQuery(api.users.listJudges)
    const [selectedJudges, setSelectedJudges] = useState<Id<"users">[]>([])

    const form = useForm<FormValues>({
        resolver: zodResolver(schema) as any,
        defaultValues: {
            title: "",
            summary: "",
            overview: "",
            problemStatement: "",
            tags: "",
            difficulty: "intermediate",
            prize: "",
            deadlineDays: 30,
            dataPackUrl: "",
            rubricCriteria: [],
        },
    })

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "rubricCriteria",
    })

    async function onSubmit(values: FormValues) {
        try {
            const tags = values.tags.split(",").map((t) => t.trim()).filter(Boolean)
            const deadline = Date.now() + values.deadlineDays * 24 * 60 * 60 * 1000
            const rubricCriteria = values.rubricCriteria.length > 0 ? values.rubricCriteria : undefined
            const dataPackUrl = values.dataPackUrl || undefined
            const assignedJudges = selectedJudges.length > 0 ? selectedJudges : undefined
            await createChallenge({ ...values, deadline, tags, rubricCriteria, dataPackUrl, assignedJudges })
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
                    <FormField control={form.control} name="dataPackUrl" render={({ field }) => (
                        <FormItem><FormLabel>Data Pack URL (optional)</FormLabel><FormControl><Input placeholder="https://example.com/data-pack.zip" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="tags" render={({ field }) => (
                        <FormItem><FormLabel>Tags (comma-separated)</FormLabel><FormControl><Input placeholder="AI, developer-tools, LLM" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />

                    {/* Rubric Builder */}
                    <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="font-display text-lg font-semibold">Custom Rubric Criteria</h2>
                                <p className="text-sm text-muted-foreground">
                                    Define how submissions will be scored. Leave empty to use the default rubric.
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => append({ name: "", maxScore: 20, description: "" })}
                            >
                                <Plus className="h-4 w-4 mr-1" />
                                Add Criterion
                            </Button>
                        </div>

                        {fields.length === 0 && (
                            <p className="text-sm text-muted-foreground italic">
                                No custom criteria defined. The default 5-criterion rubric (Technical Implementation, Problem Understanding, Innovation, Documentation, Completeness) will be used.
                            </p>
                        )}

                        {fields.map((field, index) => (
                            <Card key={field.id}>
                                <CardContent className="pt-4 space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="grid grid-cols-[1fr_100px] gap-3 flex-1">
                                            <FormField control={form.control} name={`rubricCriteria.${index}.name`} render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Criterion Name</FormLabel>
                                                    <FormControl><Input placeholder="e.g. Technical Implementation" {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name={`rubricCriteria.${index}.maxScore`} render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Max Score</FormLabel>
                                                    <FormControl><Input type="number" placeholder="20" {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="mt-6 text-destructive hover:text-destructive"
                                            onClick={() => remove(index)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <FormField control={form.control} name={`rubricCriteria.${index}.description`} render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Description</FormLabel>
                                            <FormControl><Textarea rows={2} placeholder="What should the judge look for?" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Judge Assignment */}
                    {judges && judges.length > 0 && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Assign Judges (Optional)</label>
                            <div className="space-y-1">
                                {judges.map((judge) => (
                                    <label key={judge._id} className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={selectedJudges.includes(judge._id)}
                                            onChange={(e) => {
                                                setSelectedJudges((prev) =>
                                                    e.target.checked
                                                        ? [...prev, judge._id]
                                                        : prev.filter((id) => id !== judge._id),
                                                )
                                            }}
                                        />
                                        {judge.name} ({judge.email})
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    <Button type="submit" className="w-full">Create Challenge</Button>
                </form>
            </Form>
        </div>
    )
}
