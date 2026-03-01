"use client"
import {
    AreaChart, Area, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid,
} from "recharts"

interface Props {
    data: { week: string; count: number }[]
}

/**
 * Line/area chart of submissions per week.
 * Uses brand primary (#2563EB) fill — spec requires brand chart palette.
 */
export function SponsorChart({ data }: Props) {
    if (data.length === 0 || data.every((d) => d.count === 0)) {
        return (
            <p className="text-sm text-muted-foreground text-center py-8">
                No submissions yet — share your challenge to get started.
            </p>
        )
    }

    return (
        <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <defs>
                    <linearGradient id="subGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip
                    contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 6,
                        fontSize: 12,
                    }}
                />
                <Area
                    type="monotone"
                    dataKey="count"
                    name="Submissions"
                    stroke="#2563EB"
                    strokeWidth={2}
                    fill="url(#subGradient)"
                />
            </AreaChart>
        </ResponsiveContainer>
    )
}
