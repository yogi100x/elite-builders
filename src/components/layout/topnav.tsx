"use client"
import { useState, useEffect } from "react"
import { UserButton, SignInButton, SignUpButton, SignedIn, SignedOut } from "@clerk/nextjs"
import { useTheme } from "next-themes"
import { Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NotificationDropdown } from "@/components/notification-dropdown"

export function Topnav() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    // Avoid hydration mismatch for theme toggle
    useEffect(() => {
        setMounted(true)
    }, [])

    const isDark = theme === "dark" || theme === "system"

    return (
        <header className="fixed top-0 right-0 h-14 flex items-center gap-3 px-6 z-40 border-b bg-background" style={{ left: "6rem" }}>
            <div className="ml-auto flex items-center gap-3">
                {/* Notification dropdown */}
                <NotificationDropdown />

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
