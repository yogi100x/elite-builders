export const dynamic = "force-dynamic"

import { Sidebar } from "@/components/layout/sidebar"
import { Topnav } from "@/components/layout/topnav"
import { AuthGuard } from "@/components/auth-guard"

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthGuard>
            <div className="flex min-h-screen">
                <Sidebar />
                <div className="flex-1 ml-0 md:ml-24">
                    <Topnav />
                    <main className="pt-20 px-4 pb-4 md:px-6 md:pb-6 min-w-[320px] max-w-[1400px] mx-auto">{children}</main>
                </div>
            </div>
        </AuthGuard>
    )
}
