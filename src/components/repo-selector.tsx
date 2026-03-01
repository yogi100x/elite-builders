"use client"
import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Star, GitFork, Check, Github } from "lucide-react"
import { cn, formatRelative } from "@/lib/utils"
import type { GitHubRepo } from "@/lib/github/client"

interface RepoSelectorProps {
    onSelect: (repo: GitHubRepo | null) => void
    selectedRepo: GitHubRepo | null
}

export function RepoSelector({ onSelect, selectedRepo }: RepoSelectorProps) {
    const [repos, setRepos] = useState<GitHubRepo[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [search, setSearch] = useState("")

    useEffect(() => {
        fetch("/api/github/repos")
            .then((r) => r.json())
            .then((data) => {
                if (data.error) setError(data.error)
                else setRepos(data.repos ?? [])
            })
            .catch(() => setError("Network error — please try again"))
            .finally(() => setLoading(false))
    }, [])

    const filtered = repos.filter(
        (r) =>
            r.name.toLowerCase().includes(search.toLowerCase()) ||
            r.description?.toLowerCase().includes(search.toLowerCase()) ||
            r.topics.some((t) => t.includes(search.toLowerCase())),
    )

    if (loading) {
        return (
            <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-card" />
                ))}
            </div>
        )
    }

    if (error) {
        return (
            <div className="border rounded-card p-6 text-center space-y-3 bg-muted/30">
                <Github size={32} className="mx-auto text-muted-foreground" />
                <p className="text-sm font-medium">GitHub not connected</p>
                <p className="text-xs text-muted-foreground">{error}</p>
                <p className="text-xs text-muted-foreground">
                    Sign in with GitHub to select a repository, or paste a URL in the field below.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {selectedRepo && (
                <div className="border-2 border-brand-primary rounded-card p-3 bg-brand-primary/5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-brand-primary font-semibold mb-0.5">Selected Repository</p>
                            <p className="font-semibold text-sm">{selectedRepo.fullName}</p>
                            {selectedRepo.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1">{selectedRepo.description}</p>
                            )}
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onSelect(null)}
                            className="text-muted-foreground"
                        >
                            Change
                        </Button>
                    </div>
                </div>
            )}

            <Input
                placeholder="Search your repositories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />

            <div className="border rounded-card divide-y max-h-72 overflow-y-auto">
                {filtered.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No repositories match your search.</p>
                ) : (
                    filtered.map((repo) => {
                        const isSelected = selectedRepo?.fullName === repo.fullName
                        return (
                            <div
                                key={repo.id}
                                onClick={() => onSelect(repo)}
                                className={cn(
                                    "flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/40 transition-brand",
                                    isSelected && "bg-brand-primary/5",
                                )}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-sm truncate">{repo.name}</p>
                                        {isSelected && <Check size={14} className="text-brand-primary shrink-0" />}
                                    </div>
                                    {repo.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-1">{repo.description}</p>
                                    )}
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {repo.topics.slice(0, 3).map((t) => (
                                            <Badge key={t} variant="outline" className="text-[9px] py-0">{t}</Badge>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        {repo.language && (
                                            <Badge variant="secondary" className="text-[10px]">{repo.language}</Badge>
                                        )}
                                        <span className="flex items-center gap-0.5">
                                            <Star size={10} /> {repo.stars}
                                        </span>
                                    </div>
                                    {repo.pushedAt && (
                                        <p className="text-[10px] text-muted-foreground">{formatRelative(new Date(repo.pushedAt).getTime())}</p>
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
