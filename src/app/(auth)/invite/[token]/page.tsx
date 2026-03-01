"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth, SignIn } from "@clerk/nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react"

export default function InviteLandingPage({ params }: { params: { token: string } }) {
    const { token } = params
    const router = useRouter()

    // Auth state from Clerk
    const { isLoaded: isClerkLoaded, isSignedIn } = useAuth()

    // Convex query/mutation
    const inviteInfo = useQuery(api.invites.getByToken, { token })
    const acceptInvite = useMutation(api.invites.accept)

    const [status, setStatus] = useState<"loading" | "validating" | "success" | "error">("loading")
    const [errorMessage, setErrorMessage] = useState("")

    useEffect(() => {
        if (!isClerkLoaded || inviteInfo === undefined) return;

        if (inviteInfo === null) {
            setStatus("error")
            setErrorMessage("This invite link is invalid or has expired.")
            return
        }

        if (inviteInfo.status === "accepted") {
            setStatus("error")
            setErrorMessage("This invite has already been accepted.")
            return
        }

        if (inviteInfo.status === "revoked") {
            setStatus("error")
            setErrorMessage("This invite has been revoked by the administrator.")
            return
        }

        // Invite is valid. If signed in, automatically accept it.
        if (isSignedIn) {
            setStatus("validating")
            acceptInvite({ token })
                .then((res) => {
                    setStatus("success")
                    // Redirect to their new dashboard based on role
                    setTimeout(() => {
                        router.push(`/${res.role}`)
                    }, 2000)
                })
                .catch((err) => {
                    setStatus("error")
                    setErrorMessage(err.message || "Failed to accept invite.")
                })
        } else {
            // Valid invite, but user needs to sign in or create an account
            setStatus("loading")
        }
    }, [isClerkLoaded, isSignedIn, inviteInfo, token, acceptInvite, router])

    if (status === "error") {
        return (
            <div className="flex h-[calc(100vh-4rem)] items-center justify-center p-4">
                <Card className="w-full max-w-md border-destructive">
                    <CardHeader className="text-center">
                        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                        <CardTitle>Invalid Invite</CardTitle>
                        <CardDescription>{errorMessage}</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    if (status === "success") {
        return (
            <div className="flex h-[calc(100vh-4rem)] items-center justify-center p-4">
                <Card className="w-full max-w-md border-primary">
                    <CardHeader className="text-center">
                        <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-4" />
                        <CardTitle>Welcome Aboard!</CardTitle>
                        <CardDescription>
                            Your account has been successfully upgraded. Redirecting you to your dashboard...
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center pb-8">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </CardContent>
                </Card>
            </div>
        )
    }

    // If valid invite but not signed in, show sign up/in flow
    if (inviteInfo?.status === "pending" && !isSignedIn) {
        return (
            <div className="flex h-[calc(100vh-4rem)] items-center justify-center p-4 flex-col gap-8">
                <div className="text-center space-y-2">
                    <h1 className="font-display text-3xl font-bold">You've been invited!</h1>
                    <p className="text-muted-foreground">
                        You've been invited to join EliteBuilders as a
                        <span className="font-bold text-foreground capitalize ml-1">{inviteInfo.role}</span>.
                        <br /> Sign in or create an account to accept the invitation.
                    </p>
                </div>

                {/* Clerk SignIn with forced redirect back to this exact URL so the effect runs again */}
                <SignIn
                    routing="hash"
                    fallbackRedirectUrl={`/invite/${token}`}
                    signUpFallbackRedirectUrl={`/invite/${token}`}
                />
            </div>
        )
    }

    // Initial Loading/Validating state
    return (
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center p-4">
            <div className="text-center space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
                <h2 className="text-xl font-medium tracking-tight">Validating invitation...</h2>
            </div>
        </div>
    )
}
