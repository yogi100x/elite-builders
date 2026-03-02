"use client"

import { Authenticated, AuthLoading } from "convex/react"
import { Skeleton } from "@/components/ui/skeleton"

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
                {children}
            </Authenticated>
        </>
    )
}
