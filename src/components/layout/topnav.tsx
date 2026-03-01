"use client"
import { useState, useEffect } from "react"
import { UserButton, SignInButton, SignUpButton, SignedIn, SignedOut } from "@clerk/nextjs"
import { useTheme } from "next-themes"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Sun, Moon, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Topnav() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)
    const unreadCount = useQuery(api.notifications.countUnread)

    // Avoid hydration mismatch for theme toggle
    useEffect(() => {
        setMounted(true)
    }, [])

    const isDark = theme === "dark" || theme === "system"

    return (
        <header className="fixed top-0 right-0 h-14 flex items-center gap-3 px-6 z-40 border-b bg-background" style={{ left: "6rem" }}>
            <div className="ml-auto flex items-center gap-3">
                {/* Notification bell */}
                <div className="relative">
                    <Button variant="ghost" size="icon" asChild>
                        <a href="/dashboard">
                            <Bell size={18} />
                        </a>
                    </Button>
                    {unreadCount != null && unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-destructive text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </div>

                {/* Dark mode toggle */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    aria-label="Toggle theme"
                >
                    {mounted ? (isDark ? <Sun size={18} /> : <Moon size={18} />) : <Sun size={18} className="opacity-0" />}
                </Button>

                <SignedIn>
                    <UserButton afterSignOutUrl="/" />
                </SignedIn>
                <SignedOut>
                    <SignInButton mode="modal">
                        <Button variant="ghost">Sign In</Button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                        <Button>Sign Up</Button>
                    </SignUpButton>
                </SignedOut>
            </div>
        </header>
    )
}
