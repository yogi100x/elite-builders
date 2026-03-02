"use client"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Props {
    entries: Array<{
        _id: string;
        name: string;
        profileImageUrl?: string;
        points: number;
        badges: Array<{ _id: string; name: string; color: string }>;
        skills?: string[];
    }>;
    rankOffset?: number;
}

export function LeaderboardTable({ entries, rankOffset = 0 }: Props) {
    const users = entries

    if (!users || users.length === 0) {
        return <p className="text-center py-16 text-muted-foreground">No badge winners yet — be the first!</p>
    }

    return (
        <div className="border rounded-card overflow-hidden">
            {users.map((user, index) => {
                const rank = rankOffset + index + 1
                const isTop3 = rank <= 3
                return (
                    <div
                        key={user._id}
                        className={cn(
                            "flex items-center gap-4 p-4 border-b last:border-b-0 transition-brand",
                            isTop3 && "bg-achievement/5",
                        )}
                    >
                        <span
                            className={cn(
                                "font-mono font-bold text-lg w-8 text-center",
                                rank === 1 && "text-amber-500",
                                rank === 2 && "text-slate-400",
                                rank === 3 && "text-orange-600",
                                rank > 3 && "text-muted-foreground",
                            )}
                        >
                            {rank}
                        </span>
                        <Avatar>
                            <AvatarImage src={user.profileImageUrl} />
                            <AvatarFallback>{user.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <p className="font-semibold"><Link href={`/profile/${user._id}`} className="hover:underline">{user.name}</Link></p>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {user.badges.slice(0, 4).map((badge) => (
                                    <Badge
                                        key={badge._id}
                                        className="text-[10px]"
                                        style={{ backgroundColor: badge.color, color: "white" }}
                                    >
                                        {badge.name}
                                    </Badge>
                                ))}
                            </div>
                            {user.skills && user.skills.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {user.skills.slice(0, 3).map((skill) => (
                                        <Badge key={skill} variant="outline" className="text-[10px]">
                                            {skill}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                        <span className="font-mono font-bold text-brand-primary">{user.points} pts</span>
                    </div>
                )
            })}
        </div>
    )
}
