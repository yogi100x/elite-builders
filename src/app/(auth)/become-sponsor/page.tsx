"use client"

import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Building2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

const becomeSponsorSchema = z.object({
    orgName: z
        .string()
        .min(2, "Organization name must be at least 2 characters")
        .max(100, "Organization name must be 100 characters or less"),
    logoUrl: z
        .string()
        .url("Must be a valid URL")
        .or(z.literal(""))
        .optional(),
})

type BecomeSponsorForm = z.infer<typeof becomeSponsorSchema>

export default function BecomeSponsorPage() {
    const router = useRouter()
    const becomeSponsor = useMutation(api.users.becomeSponsor)

    const form = useForm<BecomeSponsorForm>({
        resolver: zodResolver(becomeSponsorSchema),
        defaultValues: {
            orgName: "",
            logoUrl: "",
        },
    })

    const { isSubmitting } = form.formState

    async function onSubmit(values: BecomeSponsorForm) {
        try {
            await becomeSponsor({
                orgName: values.orgName,
                logoUrl: values.logoUrl && values.logoUrl.length > 0 ? values.logoUrl : undefined,
            })
            toast.success("Welcome aboard! Your sponsor account is ready.")
            router.push("/sponsor")
        } catch (error: unknown) {
            const message =
                error instanceof Error
                    ? error.message.replace(/^.*ConvexError:\s*/, "")
                    : "Something went wrong. Please try again."
            toast.error(message)
        }
    }

    return (
        <div className="flex justify-center py-12">
            <Card className="w-full max-w-lg">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary/10">
                        <Building2 className="h-6 w-6 text-brand-primary" />
                    </div>
                    <CardTitle className="font-display text-2xl">
                        Become a Sponsor
                    </CardTitle>
                    <CardDescription>
                        Create challenges, review submissions, and discover top
                        talent on EliteBuilders.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(onSubmit)}
                            className="space-y-6"
                        >
                            <FormField
                                control={form.control}
                                name="orgName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Organization Name
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Acme Corp"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            The name of your company or
                                            organization.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="logoUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Logo URL{" "}
                                            <span className="text-muted-foreground font-normal">
                                                (optional)
                                            </span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="https://example.com/logo.png"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            A public URL to your organization's
                                            logo.
                                        </FormDescription>
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
                                        Setting up...
                                    </>
                                ) : (
                                    "Create Sponsor Account"
                                )}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    )
}
