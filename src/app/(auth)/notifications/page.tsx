"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Bell, Award, FileText, XCircle, CheckCheck } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

import type { Doc } from "@/convex/_generated/dataModel"

const typeIcons: Record<Doc<"notifications">["type"], React.ReactNode> = {
    award: <Award size={20} className="text-green-500 shrink-0" />,
    submission: <FileText size={20} className="text-blue-500 shrink-0" />,
    "not-selected": <XCircle size={20} className="text-red-500 shrink-0" />,
}

const typeLabels: Record<Doc<"notifications">["type"], string> = {
    award: "Award",
    submission: "Submission",
    "not-selected": "Not Selected",
}

export default function NotificationsPage() {
    const notifications = useQuery(api.notifications.listByUser)
    const markRead = useMutation(api.notifications.markRead)

    if (notifications === undefined) {
        return (
            <div className="space-y-4">
                <h1 className="font-display text-3xl font-bold">Notifications</h1>
                <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-20 w-full" />
                    ))}
                </div>
            </div>
        )
    }

    if (notifications.length === 0) {
        return (
            <div className="space-y-4">
                <h1 className="font-display text-3xl font-bold">Notifications</h1>
                <Card>
                    <CardContent>
                        <div className="text-center py-12 space-y-3">
                            <Bell size={48} className="mx-auto text-muted-foreground/50" />
                            <h2 className="text-lg font-semibold">No notifications yet</h2>
                            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                                When you receive awards, submission updates, or other activity,
                                they will appear here.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <h1 className="font-display text-3xl font-bold">Notifications</h1>
            <div className="space-y-3">
                {notifications.map((notification) => (
                    <Card
                        key={notification._id}
                        className={!notification.read ? "bg-muted/50" : ""}
                    >
                        <CardContent>
                            <div className="flex items-start gap-4">
                                <div className="mt-0.5">
                                    {typeIcons[notification.type]}
                                </div>
                                <div className="flex-1 min-w-0 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs">
                                            {typeLabels[notification.type]}
                                        </Badge>
                                        {!notification.read && (
                                            <span className="w-2 h-2 rounded-full bg-primary" />
                                        )}
                                    </div>
                                    <p className="text-sm">{notification.content}</p>
                                </div>
                                {!notification.read && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="shrink-0 text-xs"
                                        onClick={() => markRead({ id: notification._id })}
                                    >
                                        <CheckCheck size={14} className="mr-1" />
                                        Mark read
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
