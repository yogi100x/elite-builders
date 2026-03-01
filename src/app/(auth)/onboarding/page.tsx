"use client"
import { useUser } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Github, CheckCircle, ArrowRight } from "lucide-react"
import Link from "next/link"
import { SignInButton } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function OnboardingPage() {
    const { user, isLoaded } = useUser()
    const router = useRouter()
    const challenges = useQuery(api.challenges.listTopSix)

    const hasGitHub = user?.externalAccounts?.some((a) => a.provider === "github")

    // Redirect to dashboard if onboarding complete
    useEffect(() => {
        if (isLoaded && hasGitHub) {
            // User has GitHub connected — onboarding done, go to challenges
            document.cookie = "eb_onboarded=true; path=/; max-age=31536000" // 1 year expiry
            router.push("/challenges")
        }
    }, [isLoaded, hasGitHub, router])

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
