"use client"

import { Authenticated, AuthLoading, useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Skeleton } from "@/components/ui/skeleton"
import { useEffect } from "react"

/** Ensures user record exists in Convex before rendering children */
function EnsureUser({ children }: { children: React.ReactNode }) {
    const ensureUser = useMutation(api.users.ensureUser)
    const me = useQuery(api.users.getMe)

    // Create user record if webhook hasn't synced yet
    useEffect(() => {
        if (me === null) {
            ensureUser().catch(() => {
                // Non-critical — webhook will eventually sync
            })
        }
    }, [me]) // eslint-disable-line react-hooks/exhaustive-deps

    if (me === undefined) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="space-y-4 w-full max-w-md">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-32 w-full" />
                </div>
            </div>
        )
    }

    // me === null means ensureUser is creating the record — show loading
    if (me === null) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="space-y-4 w-full max-w-md">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-full" />
                </div>
            </div>
        )
    }

    return <>{children}</>
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
    return (
        <>
            <AuthLoading>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="space-y-4 w-full max-w-md">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-32 w-full" />
                    </div>
                </div>
            </AuthLoading>
            <Authenticated>
                <EnsureUser>{children}</EnsureUser>
            </Authenticated>
        </>
    )
}
