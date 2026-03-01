"use client"
import { useAction } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ExternalLink, Star, GitFork, FileText, GitCommit, ChevronDown, ChevronRight } from "lucide-react"
import { formatRelative } from "@/lib/utils"
// import type { RepoAnalysis } from "@/lib/github/client"

interface GitHubRepoPanelProps {
    owner: string
    repo: string
    repoUrl: string
}

export function GitHubRepoPanel({ owner, repo, repoUrl }: GitHubRepoPanelProps) {
    // Use any for now until we import the type properly from the backend
    const [analysis, setAnalysis] = useState<any | null>(null)
    const [loading, setLoading] = useState(false)
    const [loaded, setLoaded] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showReadme, setShowReadme] = useState(true)
    const [showFiles, setShowFiles] = useState(false)
    const [showCommits, setShowCommits] = useState(false)

    const analyzeRepo = useAction(api.github.analyzeRepo)

    async function loadAnalysis() {
        setLoading(true)
        setError(null)
        try {
            const result = await analyzeRepo({ owner, repo })
            setAnalysis(result)
            setLoaded(true)
        } catch (err) {
            setError(String(err))
        } finally {
            setLoading(false)
        }
    }

    if (!loaded && !loading) {
        return (
            <div className="border rounded-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold font-mono">{owner}/{repo}</span>
                        <a href={repoUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink size={12} className="text-muted-foreground hover:text-foreground" />
                        </a>
                    </div>
                    <Button size="sm" variant="outline" onClick={loadAnalysis}>
                        Analyze Repository
                    </Button>
                </div>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="border rounded-card p-4 space-y-3">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-32 w-full" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="border rounded-card p-4 text-center space-y-2">
                <p className="text-sm text-muted-foreground">Failed to load repo analysis</p>
                <p className="text-xs text-destructive">{error}</p>
                <Button size="sm" variant="outline" onClick={loadAnalysis}>Retry</Button>
            </div>
        )
    }

    if (!analysis?.metadata) return null

    const m = analysis.metadata

    return (
        <div className="border rounded-card divide-y">
            {/* Header */}
            <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                    <a
                        href={repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold font-mono text-sm hover:text-brand-primary flex items-center gap-1"
                    >
                        {m.fullName} <ExternalLink size={12} />
                    </a>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-0.5"><Star size={12} /> {m.stars}</span>
                        <span className="flex items-center gap-0.5"><GitFork size={12} /> {m.forks}</span>
                    </div>
                </div>
                {m.description && <p className="text-sm text-muted-foreground">{m.description}</p>}
                <div className="flex flex-wrap gap-1">
                    {m.language && <Badge variant="secondary" className="text-[10px]">{m.language}</Badge>}
                    {m.topics?.slice(0, 5).map((t: string) => (
                        <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                    ))}
                </div>
                {m.languages?.length > 1 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                        {m.languages.slice(0, 5).map((lang: any) => (
                            <span key={lang.name} className="text-[10px] text-muted-foreground">{lang.name}</span>
                        ))}
                    </div>
                )}
                {m.pushedAt && (
                    <p className="text-[10px] text-muted-foreground">
                        Last pushed {formatRelative(new Date(m.pushedAt).getTime())}
                    </p>
                )}
            </div>

            {/* README */}
            {analysis.readme && (
                <div className="p-4">
                    <button
                        className="flex items-center gap-2 text-sm font-semibold w-full text-left"
                        onClick={() => setShowReadme(!showReadme)}
                    >
                        <FileText size={14} />
                        README
                        {showReadme ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                    {showReadme && (
                        <div className="mt-3 prose prose-sm max-w-none text-xs bg-muted/30 p-3 rounded max-h-64 overflow-y-auto">
                            <pre className="whitespace-pre-wrap font-sans block overflow-x-hidden">{analysis.readme.slice(0, 3000)}</pre>
                            {analysis.readme.length > 3000 && (
                                <p className="text-muted-foreground text-[10px] mt-2">
                                    Showing first 3,000 of {analysis.readme.length} characters.{" "}
                                    <a href={repoUrl} target="_blank" rel="noreferrer" className="text-brand-primary">View full README →</a>
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* File tree */}
            {analysis.rootFiles?.length > 0 && (
                <div className="p-4">
                    <button
                        className="flex items-center gap-2 text-sm font-semibold w-full text-left"
                        onClick={() => setShowFiles(!showFiles)}
                    >
                        <FileText size={14} />
                        Files ({analysis.rootFiles.length})
                        {showFiles ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                    {showFiles && (
                        <div className="mt-2 grid grid-cols-2 gap-x-4 max-h-40 overflow-y-auto">
                            {analysis.rootFiles.map((f: any) => (
                                <p key={f.name} className="text-[11px] font-mono text-muted-foreground truncate">
                                    {f.type === "tree" ? "📁" : "📄"} {f.name}
                                </p>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Recent commits */}
            {analysis.recentCommits?.length > 0 && (
                <div className="p-4">
                    <button
                        className="flex items-center gap-2 text-sm font-semibold w-full text-left"
                        onClick={() => setShowCommits(!showCommits)}
                    >
                        <GitCommit size={14} />
                        Recent Commits ({analysis.recentCommits.length})
                        {showCommits ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                    {showCommits && (
                        <div className="mt-2 space-y-2">
                            {analysis.recentCommits.map((c: any, i: number) => (
                                <div key={i} className="text-xs border-l-2 border-muted pl-3">
                                    <p className="font-medium line-clamp-1">{c.message}</p>
                                    <p className="text-muted-foreground">
                                        {c.author} · +{c.additions} -{c.deletions} · {formatRelative(new Date(c.date).getTime())}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* package.json highlights */}
            {analysis.packageJson?.dependencies && (
                <div className="p-4">
                    <p className="text-xs font-semibold mb-2">Key Dependencies</p>
                    <div className="flex flex-wrap gap-1">
                        {Object.keys(analysis.packageJson.dependencies as Record<string, string>)
                            .slice(0, 12)
                            .map((dep) => (
                                <Badge key={dep} variant="outline" className="text-[10px] font-mono">{dep}</Badge>
                            ))}
                    </div>
                </div>
            )}
        </div>
    )
}
