"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    UserButton,
    SignInButton,
    SignUpButton,
    SignedIn,
    SignedOut,
} from "@clerk/nextjs"
import { useTheme } from "next-themes"
import { Sun, Moon, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const NAV_LINKS = [
    { href: "/challenges", label: "Challenges" },
    { href: "/leaderboard", label: "Leaderboard" },
]

export function PublicNav() {
    const pathname = usePathname()
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Close mobile menu on route change
    useEffect(() => {
        setMobileOpen(false)
    }, [pathname])

    const isDark = theme === "dark" || theme === "system"

    return (
        <header className="fixed top-0 left-0 right-0 h-14 z-40 border-b bg-background">
            <nav className="mx-auto flex h-full max-w-[1400px] items-center justify-between px-4 md:px-6">
                {/* Left: brand + nav links */}
                <div className="flex items-center gap-6">
                    <Link href="/" className="flex items-center gap-1">
                        <span className="font-display text-lg font-bold text-brand-primary">
                            EliteBuilders
                        </span>
                    </Link>

                    {/* Desktop nav links */}
                    <div className="hidden sm:flex items-center gap-1">
                        {NAV_LINKS.map((link) => {
                            const isActive =
                                pathname === link.href ||
                                pathname.startsWith(link.href + "/")
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                                        isActive
                                            ? "bg-brand-primary/10 text-brand-primary"
                                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                    )}
                                >
                                    {link.label}
                                </Link>
                            )
                        })}
                    </div>
                </div>

                {/* Right: theme toggle + auth */}
                <div className="flex items-center gap-2">
                    {/* Theme toggle */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                            setTheme(theme === "dark" ? "light" : "dark")
                        }
                        aria-label="Toggle theme"
                    >
                        {mounted ? (
                            isDark ? (
                                <Sun size={18} />
                            ) : (
                                <Moon size={18} />
                            )
                        ) : (
                            <Sun size={18} className="opacity-0" />
                        )}
                    </Button>

                    {/* Auth buttons — desktop */}
                    <div className="hidden sm:flex items-center gap-2">
                        <SignedIn>
                            <UserButton afterSignOutUrl="/" />
                        </SignedIn>
                        <SignedOut>
                            <SignInButton mode="modal">
                                <Button variant="ghost" size="sm">
                                    Sign In
                                </Button>
                            </SignInButton>
                            <SignUpButton mode="modal">
                                <Button size="sm">Sign Up</Button>
                            </SignUpButton>
                        </SignedOut>
                    </div>

                    {/* Mobile hamburger */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="sm:hidden"
                        onClick={() => setMobileOpen((prev) => !prev)}
                        aria-label={mobileOpen ? "Close menu" : "Open menu"}
                    >
                        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                    </Button>
                </div>
            </nav>

            {/* Mobile dropdown menu */}
            {mobileOpen && (
                <div className="sm:hidden border-b bg-background px-4 pb-4 pt-2 shadow-md">
                    <div className="flex flex-col gap-1">
                        {NAV_LINKS.map((link) => {
                            const isActive =
                                pathname === link.href ||
                                pathname.startsWith(link.href + "/")
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={cn(
                                        "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                        isActive
                                            ? "bg-brand-primary/10 text-brand-primary"
                                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                    )}
                                >
                                    {link.label}
                                </Link>
                            )
                        })}
                    </div>
                    <div className="mt-3 flex items-center gap-2 border-t pt-3">
                        <SignedIn>
                            <UserButton afterSignOutUrl="/" />
                        </SignedIn>
                        <SignedOut>
                            <SignInButton mode="modal">
                                <Button variant="ghost" size="sm">
                                    Sign In
                                </Button>
                            </SignInButton>
                            <SignUpButton mode="modal">
                                <Button size="sm">Sign Up</Button>
                            </SignUpButton>
                        </SignedOut>
                    </div>
                </div>
            )}
        </header>
    )
}
