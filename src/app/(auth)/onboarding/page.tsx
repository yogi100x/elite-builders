"use client"
import { useUser } from "@clerk/nextjs"
import { useQuery, useMutation, useAction } from "convex/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Github, CheckCircle, ArrowRight, User } from "lucide-react"
import Link from "next/link"
import { SignInButton } from "@clerk/nextjs"
import { useEffect } from "react"

const profileSchema = z.object({
    bio: z.string().max(300).optional(),
    portfolioUrl: z.string().url().optional().or(z.literal("")),
    skills: z.string().optional(),
})

export default function OnboardingPage() {
    const { user, isLoaded } = useUser()
    const challenges = useQuery(api.challenges.listTopSix)
    const updateProfile = useMutation(api.users.updateProfile)
    const generateUploadUrl = useMutation(api.submissions.generateUploadUrl)

    const hasGitHub = user?.externalAccounts?.some((a) => a.provider === "github")

    const profileForm = useForm({
        resolver: zodResolver(profileSchema),
        defaultValues: { bio: "", portfolioUrl: "", skills: "" },
    })

    // Set the onboarded cookie when GitHub is connected, but don't auto-redirect
    useEffect(() => {
        if (isLoaded && hasGitHub) {
            document.cookie = "eb_onboarded=true; path=/; max-age=31536000" // 1 year expiry
        }
    }, [isLoaded, hasGitHub])

    const triggerAnalysis = useAction(api.users.triggerProfileAnalysis)

    // Trigger GitHub profile analysis when GitHub is connected
    useEffect(() => {
        if (isLoaded && hasGitHub) {
            triggerAnalysis().catch(() => {
                // Non-critical — don't show error to user
            })
        }
    }, [isLoaded, hasGitHub]) // eslint-disable-line react-hooks/exhaustive-deps

    if (!isLoaded) return null

    return (
        <div className="max-w-xl mx-auto space-y-8 py-8">
            <div>
                <h1 className="font-display text-3xl font-bold">Welcome to EliteBuilders</h1>
                <p className="text-muted-foreground mt-1">
                    Complete your profile to start submitting to challenges.
                </p>
            </div>

            {/* Step 1: GitHub */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        {hasGitHub ? (
                            <CheckCircle size={20} className="text-brand-success" />
                        ) : (
                            <Github size={20} className="text-muted-foreground" />
                        )}
                        <CardTitle className="text-base">
                            {hasGitHub ? "GitHub Connected" : "Connect Your GitHub"}
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    {hasGitHub ? (
                        <p className="text-sm text-muted-foreground">
                            Connected as <span className="font-semibold">@{user?.externalAccounts?.find((a) => a.provider === "github")?.username}</span>
                        </p>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                                Connect GitHub to select your repositories when submitting solutions. Public repos only for competition submissions.
                            </p>
                            <SignInButton mode="modal" forceRedirectUrl="/onboarding">
                                <Button variant="outline" className="gap-2">
                                    <Github size={16} />
                                    Connect GitHub
                                </Button>
                            </SignInButton>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Step 2: Profile */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <User size={20} className="text-muted-foreground" />
                        <CardTitle className="text-base">Complete Your Profile</CardTitle>
                    </div>
                    <CardDescription>Optional — helps sponsors find you.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...profileForm}>
                        <form
                            onSubmit={profileForm.handleSubmit(async (data) => {
                                await updateProfile({
                                    bio: data.bio || undefined,
                                    portfolioUrl: data.portfolioUrl || undefined,
                                    skills: data.skills
                                        ? data.skills.split(",").map((s) => s.trim()).filter(Boolean)
                                        : undefined,
                                });
                                toast.success("Profile updated!");
                            })}
                            className="space-y-4"
                        >
                            <FormField
                                control={profileForm.control}
                                name="bio"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Short Bio</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Full-stack developer passionate about..."
                                                rows={3}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={profileForm.control}
                                name="portfolioUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Portfolio URL</FormLabel>
                                        <FormControl>
                                            <Input placeholder="https://yoursite.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={profileForm.control}
                                name="skills"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Skills</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="React, TypeScript, Node.js, Python"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormDescription>Comma-separated</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Resume Upload */}
                            <div className="space-y-2">
                                <Label>Resume (Optional)</Label>
                                <Input
                                    type="file"
                                    accept=".pdf"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const url = await generateUploadUrl();
                                        await fetch(url, {
                                            method: "POST",
                                            headers: { "Content-Type": file.type },
                                            body: file,
                                        });
                                        toast.success("Resume uploaded!");
                                    }}
                                />
                                <p className="text-xs text-muted-foreground">PDF only, max 10MB</p>
                            </div>

                            <Button type="submit" variant="outline" className="w-full">
                                Save Profile
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            {/* Suggested first challenge */}
            {challenges && challenges.length > 0 && (
                <div>
                    <h2 className="font-display font-semibold mb-3">Try your first challenge</h2>
                    <div className="space-y-2">
                        {challenges.slice(0, 3).map((c) => (
                            <Link key={c._id} href={`/challenges/${c._id}`} className="block">
                                <Card className="hover:border-brand-primary transition-brand cursor-pointer">
                                    <CardContent className="py-3 px-4 flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold text-sm">{c.title}</p>
                                            <p className="text-xs text-muted-foreground">{c.prize}</p>
                                        </div>
                                        <ArrowRight size={16} className="text-muted-foreground" />
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            <Button asChild className="w-full">
                <Link href="/challenges">Browse All Challenges <ArrowRight size={16} className="ml-2" /></Link>
            </Button>
        </div>
    )
}
