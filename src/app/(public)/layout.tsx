import { PublicNav } from "@/components/layout/public-nav"

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen">
            <PublicNav />
            <main className="pt-14 p-4 md:p-6 min-w-[320px] max-w-[1400px] mx-auto">
                {children}
            </main>
        </div>
    )
}
