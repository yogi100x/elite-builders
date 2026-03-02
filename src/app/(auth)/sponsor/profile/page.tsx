"use client"

import { useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

const sponsorSchema = z.object({
    orgName: z.string().min(1, "Organization name is required"),
    logoUrl: z.string().url().optional().or(z.literal("")),
    website: z.string().url().optional().or(z.literal("")),
    description: z.string().max(500).optional().or(z.literal("")),
    industry: z.string().optional().or(z.literal("")),
})

type SponsorForm = z.infer<typeof sponsorSchema>

export default function SponsorProfilePage() {
    const sponsor = useQuery(api.sponsors.getMyProfile)
    const updateProfile = useMutation(api.sponsors.updateProfile)

    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<SponsorForm>({
        resolver: zodResolver(sponsorSchema),
    })

    useEffect(() => {
        if (sponsor) {
            reset({
                orgName: sponsor.orgName,
                logoUrl: sponsor.logoUrl ?? "",
                website: sponsor.website ?? "",
                description: sponsor.description ?? "",
                industry: sponsor.industry ?? "",
            })
        }
    }, [sponsor, reset])

    async function onSubmit(data: SponsorForm) {
        try {
            await updateProfile({
                orgName: data.orgName,
                logoUrl: data.logoUrl || undefined,
                website: data.website || undefined,
                description: data.description || undefined,
                industry: data.industry || undefined,
            })
            toast.success("Profile updated")
        } catch (error: unknown) {
            const msg = error instanceof Error
                ? error.message.replace(/^.*ConvexError:\s*/, "")
                : "Something went wrong"
            toast.error(msg)
        }
    }

    if (!sponsor) return <Skeleton className="h-64" />

    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-display text-3xl font-bold">Sponsor Profile</h1>
                <p className="text-muted-foreground mt-1">Manage your organization details and branding.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Organization Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="orgName">Organization Name *</Label>
                            <Input id="orgName" {...register("orgName")} />
                            {errors.orgName && <p className="text-sm text-destructive">{errors.orgName.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="website">Website</Label>
                            <Input id="website" placeholder="https://example.com" {...register("website")} />
                            {errors.website && <p className="text-sm text-destructive">{errors.website.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="industry">Industry</Label>
                            <Input id="industry" placeholder="e.g., Fintech, Healthcare, AI" {...register("industry")} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                placeholder="Tell candidates about your organization..."
                                rows={4}
                                {...register("description")}
                            />
                            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="logoUrl">Logo URL</Label>
                            <Input id="logoUrl" placeholder="https://..." {...register("logoUrl")} />
                            {errors.logoUrl && <p className="text-sm text-destructive">{errors.logoUrl.message}</p>}
                        </div>

                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Saving..." : "Save Profile"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
