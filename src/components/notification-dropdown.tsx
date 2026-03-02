"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Bell, Award, FileText, XCircle, Handshake } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"

import type { Doc } from "@/convex/_generated/dataModel"

const typeIcons: Record<Doc<"notifications">["type"], React.ReactNode> = {
    award: <Award size={16} className="text-green-500 shrink-0" />,
    submission: <FileText size={16} className="text-blue-500 shrink-0" />,
    "not-selected": <XCircle size={16} className="text-red-500 shrink-0" />,
    engagement: <Handshake size={16} className="text-purple-500 shrink-0" />,
}

export function NotificationDropdown() {
    const notifications = useQuery(api.notifications.listByUser)
    const unreadCount = useQuery(api.notifications.countUnread)
    const markRead = useMutation(api.notifications.markRead)

    const recentNotifications = notifications?.slice(0, 5)

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell size={18} />
                    {unreadCount != null && unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-destructive text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {recentNotifications === undefined ? (
                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                        Loading...
                    </div>
                ) : recentNotifications.length === 0 ? (
                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                        No notifications yet
                    </div>
                ) : (
                    recentNotifications.map((notification) => (
                        <DropdownMenuItem
                            key={notification._id}
                            className={`flex items-start gap-3 p-3 cursor-pointer ${
                                !notification.read ? "bg-muted/50" : ""
                            }`}
                            onSelect={() => {
                                if (!notification.read) {
                                    markRead({ id: notification._id })
                                }
                            }}
                        >
                            <div className="mt-0.5">
                                {typeIcons[notification.type]}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm leading-snug line-clamp-2">
                                    {notification.content}
                                </p>
                                <div className="mt-1">
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                        {notification.type}
                                    </Badge>
                                </div>
                            </div>
                            {!notification.read && (
                                <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                            )}
                        </DropdownMenuItem>
                    ))
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="justify-center cursor-pointer">
                    <Link href="/notifications" className="text-sm text-primary font-medium">
                        View all notifications
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
