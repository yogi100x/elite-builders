import { PublicNav } from "@/components/layout/public-nav"

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen">
            <PublicNav />
            <main className="pt-20 px-4 pb-4 md:px-6 md:pb-6 min-w-[320px] max-w-[1400px] mx-auto">
                {children}
            </main>
        </div>
    )
}
