"use client"
import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { ChallengeGrid } from "@/components/challenge-grid"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DIFFICULTY_LABELS } from "@/lib/constants"
import { Search } from "lucide-react"

export default function ChallengesPage() {
    const [search, setSearch] = useState("")
    const [difficulty, setDifficulty] = useState<string>("all")

    const challenges = useQuery(api.challenges.listPublic, difficulty !== "all" ? { difficulty } : {})

    const filtered = challenges?.filter((c) =>
        search === "" || c.title.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-display text-3xl font-bold">Challenges</h1>
                <p className="text-muted-foreground mt-1">Browse open competitions and submit your solution.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search challenges..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Difficulties</SelectItem>
                        {Object.entries(DIFFICULTY_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                                {label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <ChallengeGrid challenges={filtered} emptyMessage="No challenges available yet. Check back soon!" />
        </div>
    )
}
