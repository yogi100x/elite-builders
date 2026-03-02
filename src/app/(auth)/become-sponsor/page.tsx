"use client"

import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Building2, Loader2, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

const applicationSchema = z.object({
    orgName: z
        .string()
        .min(2, "Organization name must be at least 2 characters")
        .max(100, "Organization name must be 100 characters or less"),
    contactEmail: z.string().email("Must be a valid email address"),
    website: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
    description: z.string().max(500, "Description must be 500 characters or less").optional(),
    industry: z.string().optional(),
})

type ApplicationForm = z.infer<typeof applicationSchema>

const INDUSTRIES = [
    "Technology",
    "Finance",
    "Healthcare",
    "Education",
    "E-commerce",
    "AI / Machine Learning",
    "Developer Tools",
    "Cybersecurity",
    "Gaming",
    "Other",
]

export default function BecomeSponsorPage() {
    const router = useRouter()
    const myApplication = useQuery(api.sponsorApplications.getMyApplication)
    const submitApplication = useMutation(api.sponsorApplications.submit)

    // Redirect if already approved
    useEffect(() => {
        if (myApplication?.status === "approved") {
            router.push("/sponsor")
        }
    }, [myApplication, router])

    const form = useForm<ApplicationForm>({
        resolver: zodResolver(applicationSchema),
        defaultValues: {
            orgName: "",
            contactEmail: "",
            website: "",
            description: "",
            industry: "",
        },
    })

    const { isSubmitting } = form.formState

    async function onSubmit(values: ApplicationForm) {
        try {
            await submitApplication({
                orgName: values.orgName,
                contactEmail: values.contactEmail,
                website: values.website && values.website.length > 0 ? values.website : undefined,
                description: values.description && values.description.length > 0 ? values.description : undefined,
                industry: values.industry && values.industry.length > 0 ? values.industry : undefined,
            })
            toast.success("Application submitted! We'll review it shortly.")
        } catch (error: unknown) {
            const message =
                error instanceof Error
                    ? error.message.replace(/^.*ConvexError:\s*/, "")
                    : "Something went wrong. Please try again."
            toast.error(message)
        }
    }

    // Loading state
    if (myApplication === undefined) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    // Pending state
    if (myApplication?.status === "pending") {
        return (
            <div className="flex justify-center py-12">
                <Card className="w-full max-w-lg">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
                            <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                        </div>
                        <CardTitle className="font-display text-2xl">
                            Application Under Review
                        </CardTitle>
                        <CardDescription>
                            Your sponsor application for <strong>{myApplication.orgName}</strong> is being reviewed by our admin team.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <p className="text-sm text-muted-foreground">
                            You'll receive an email and notification when a decision is made.
                        </p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Rejected — show form again with message
    const wasRejected = myApplication?.status === "rejected"

    return (
        <div className="flex justify-center py-12">
            <Card className="w-full max-w-lg">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary/10">
                        <Building2 className="h-6 w-6 text-brand-primary" />
                    </div>
                    <CardTitle className="font-display text-2xl">
                        Apply to Become a Sponsor
                    </CardTitle>
                    <CardDescription>
                        Submit your application to create challenges and discover top talent on EliteBuilders.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {wasRejected && (
                        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                            Your previous application was not approved
                            {myApplication.rejectionReason && (
                                <span>: {myApplication.rejectionReason}</span>
                            )}
                            . You may reapply below.
                        </div>
                    )}
                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(onSubmit)}
                            className="space-y-4"
                        >
                            <FormField
                                control={form.control}
                                name="orgName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Organization Name *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Acme Corp" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="contactEmail"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Contact Email *</FormLabel>
                                        <FormControl>
                                            <Input type="email" placeholder="you@company.com" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            We'll use this to communicate about your application.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="website"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Website{" "}
                                            <span className="text-muted-foreground font-normal">(optional)</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input placeholder="https://company.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="industry"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Industry{" "}
                                            <span className="text-muted-foreground font-normal">(optional)</span>
                                        </FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select industry" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {INDUSTRIES.map((industry) => (
                                                    <SelectItem key={industry} value={industry}>
                                                        {industry}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            About Your Organization{" "}
                                            <span className="text-muted-foreground font-normal">(optional)</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Tell us about your organization and why you want to sponsor challenges..."
                                                rows={3}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    "Submit Application"
                                )}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    )
}
