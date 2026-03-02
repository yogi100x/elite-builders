"use client"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { Home, Trophy, LayoutDashboard, Briefcase, Gavel, Menu, Shield } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/challenges", icon: Trophy, label: "Challenges" },
    { href: "/leaderboard", icon: Trophy, label: "Leaderboard" },
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", authRequired: true },
    { href: "/sponsor", icon: Briefcase, label: "Sponsor", role: "sponsor" },
    { href: "/judge", icon: Gavel, label: "Judge", role: "judge" },
    { href: "/admin/invites", icon: Shield, label: "Admin", role: "admin" },
]

export function Sidebar() {
    const pathname = usePathname()
    const { user } = useUser()
    const role = user?.publicMetadata?.role as string | undefined
    const [mobileOpen, setMobileOpen] = useState(false)

    const visibleItems = NAV_ITEMS.filter((item) => {
        if (item.role && item.role !== role && role !== "admin") return false
        if (item.authRequired && !user) return false
        return true
    })

    const sidebarContent = (
        <>
            <Link href="/" className="mb-4" onClick={() => setMobileOpen(false)}>
                <span className="font-display font-bold text-white text-xs text-center leading-tight">
                    Elite<br />Builders
                </span>
            </Link>
            {visibleItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                            "flex flex-col items-center gap-1 px-2 py-2 rounded-lg w-20 transition-brand",
                            isActive
                                ? "bg-brand-primary text-white"
                                : "text-slate-400 hover:text-white hover:bg-white/10",
                        )}
                    >
                        <Icon size={20} />
                        <span className="text-[10px] text-center">{item.label}</span>
                    </Link>
                )
            })}
        </>
    )

    return (
        <>
            {/* Desktop sidebar — hidden on mobile */}
            <aside className="hidden md:flex fixed left-0 top-0 h-full w-24 bg-sidebar flex-col items-center py-6 gap-2 z-50">
                {sidebarContent}
            </aside>

            {/* Mobile hamburger button — visible on mobile only */}
            <button
                className="md:hidden fixed top-3 left-3 z-50 p-2 bg-sidebar text-white rounded-lg"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
            >
                <Menu size={20} />
            </button>

            {/* Mobile overlay drawer */}
            {mobileOpen && (
                <>
                    <div
                        className="md:hidden fixed inset-0 bg-black/50 z-40"
                        onClick={() => setMobileOpen(false)}
                    />
                    <aside className="md:hidden fixed left-0 top-0 h-full w-24 bg-sidebar flex flex-col items-center py-6 gap-2 z-50">
                        {sidebarContent}
                    </aside>
                </>
            )}
        </>
    )
}
