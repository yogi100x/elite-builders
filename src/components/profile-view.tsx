"use client";

import { usePreloadedQuery } from "convex/react";
import type { Preloaded } from "convex/react";
import type { api } from "@/convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Github, Globe, Linkedin, Twitter, Trophy } from "lucide-react";

interface ProfileViewProps {
    preloaded: Preloaded<typeof api.users.getPublicProfile>;
}

export function ProfileView({ preloaded }: ProfileViewProps) {
    const profile = usePreloadedQuery(preloaded);

    if (!profile) {
        return (
            <div className="mx-auto max-w-2xl p-6 text-center text-muted-foreground">
                Profile not found.
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-2xl space-y-6 p-6">
            {/* Header */}
            <div className="flex items-start gap-6">
                <Avatar className="h-20 w-20">
                    <AvatarImage src={profile.profileImageUrl ?? undefined} />
                    <AvatarFallback className="text-2xl">
                        {profile.name?.charAt(0) ?? "?"}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                    <h1 className="text-2xl font-bold font-display">{profile.name}</h1>
                    {profile.bio && (
                        <p className="text-muted-foreground">{profile.bio}</p>
                    )}
                    <div className="flex flex-wrap gap-3 text-sm">
                        {profile.githubUsername && (
                            <a
                                href={`https://github.com/${profile.githubUsername}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                            >
                                <Github className="h-4 w-4" />
                                {profile.githubUsername}
                            </a>
                        )}
                        {profile.portfolioUrl && (
                            <a
                                href={profile.portfolioUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                            >
                                <Globe className="h-4 w-4" />
                                Portfolio
                            </a>
                        )}
                        {profile.linkedinUrl && (
                            <a
                                href={profile.linkedinUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                            >
                                <Linkedin className="h-4 w-4" />
                                LinkedIn
                            </a>
                        )}
                        {profile.twitterUrl && (
                            <a
                                href={profile.twitterUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                            >
                                <Twitter className="h-4 w-4" />
                                Twitter
                            </a>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold font-mono text-brand-primary">
                            {profile.points}
                        </p>
                        <p className="text-sm text-muted-foreground">Points</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold font-mono">
                            {profile.totalSubmissions}
                        </p>
                        <p className="text-sm text-muted-foreground">Submissions</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold font-mono text-green-600">
                            {profile.awardedSubmissions}
                        </p>
                        <p className="text-sm text-muted-foreground">Awards</p>
                    </CardContent>
                </Card>
            </div>

            {/* Skills */}
            {profile.skills && profile.skills.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Skills</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {profile.skills.map((skill) => (
                                <Badge key={skill} variant="secondary">
                                    {skill}
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Badges */}
            {profile.badges.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">
                            <Trophy className="mr-2 inline h-5 w-5" />
                            Badges ({profile.badges.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-3">
                            {profile.badges.map((badge) => (
                                <div
                                    key={badge._id}
                                    className="flex flex-col items-center gap-1"
                                >
                                    <div
                                        className="flex h-12 w-12 items-center justify-center rounded-full text-white font-bold"
                                        style={{ backgroundColor: badge.color }}
                                    >
                                        {badge.level}
                                    </div>
                                    <span className="max-w-[60px] text-center text-[10px] text-muted-foreground">
                                        {badge.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
