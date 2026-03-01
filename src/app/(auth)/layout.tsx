import { Sidebar } from "@/components/layout/sidebar"
import { Topnav } from "@/components/layout/topnav"

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 ml-0 md:ml-24">
                <Topnav />
                <main className="pt-14 p-4 md:p-6 min-w-[320px] max-w-[1400px] mx-auto">{children}</main>
            </div>
        </div>
    )
}
