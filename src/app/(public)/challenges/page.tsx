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
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [tagFilter, setTagFilter] = useState<string>("all")
    const [seasonFilter, setSeasonFilter] = useState<string>("all")
    const [companyFilter, setCompanyFilter] = useState<string>("all")

    const challenges = useQuery(api.challenges.listPublic, {})

    const allTags = [...new Set(challenges?.flatMap((c) => c.tags) ?? [])]
    const allSeasons = [...new Set(challenges?.map((c) => c.season).filter(Boolean) ?? [])]
    const companies = [...new Set(challenges?.map((c) => c.sponsorOrgName).filter(Boolean))]

    const filtered = challenges?.filter((c) => {
        if (difficulty !== "all" && c.difficulty !== difficulty) return false
        if (statusFilter !== "all" && c.status !== statusFilter) return false
        if (tagFilter !== "all" && !c.tags.includes(tagFilter)) return false
        if (seasonFilter !== "all" && c.season !== seasonFilter) return false
        if (companyFilter !== "all" && c.sponsorOrgName !== companyFilter) return false
        if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false
        return true
    })

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

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[140px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={tagFilter} onValueChange={setTagFilter}>
                    <SelectTrigger className="w-full sm:w-[160px]">
                        <SelectValue placeholder="Tag" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Tags</SelectItem>
                        {allTags.map((tag) => (
                            <SelectItem key={tag} value={tag}>
                                {tag}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {allSeasons.length > 0 && (
                    <Select value={seasonFilter} onValueChange={setSeasonFilter}>
                        <SelectTrigger className="w-full sm:w-[160px]">
                            <SelectValue placeholder="Season" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Seasons</SelectItem>
                            {allSeasons.map((season) => (
                                <SelectItem key={season} value={season!}>
                                    {season}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}

                <Select value={companyFilter} onValueChange={setCompanyFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="All Companies" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Companies</SelectItem>
                        {companies.map((name) => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <ChallengeGrid challenges={filtered} emptyMessage="No challenges available yet. Check back soon!" />
        </div>
    )
}
