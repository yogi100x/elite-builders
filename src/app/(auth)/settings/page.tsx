"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

const EMAIL_PREFS = [
    { key: "awardNotifications", label: "Award Notifications", desc: "When your submission receives a badge" },
    { key: "rejectionNotifications", label: "Review Notifications", desc: "When your submission is reviewed" },
    { key: "scoringNotifications", label: "Scoring Notifications", desc: "When AI scoring completes" },
    { key: "sponsorInterest", label: "Sponsor Interest", desc: "When a sponsor expresses interest" },
    { key: "weeklyDigest", label: "Weekly Digest", desc: "Weekly summary of activity" },
] as const

export default function SettingsPage() {
    const me = useQuery(api.users.getMe)
    const updatePrefs = useMutation(api.users.updateEmailPreferences)
    const [prefs, setPrefs] = useState({
        awardNotifications: true,
        rejectionNotifications: true,
        scoringNotifications: true,
        sponsorInterest: true,
        weeklyDigest: true,
    })
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (me?.emailPreferences) {
            setPrefs(me.emailPreferences)
        }
    }, [me])

    async function handleSave() {
        setSaving(true)
        try {
            await updatePrefs(prefs)
            toast.success("Email preferences saved")
        } catch {
            toast.error("Failed to save preferences")
        } finally {
            setSaving(false)
        }
    }

    if (!me) return <Skeleton className="h-64" />

    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-display text-3xl font-bold">Settings</h1>
                <p className="text-muted-foreground mt-1">Manage your email notification preferences.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Email Notifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {EMAIL_PREFS.map((pref) => (
                        <div key={pref.key} className="flex items-center justify-between">
                            <div>
                                <Label htmlFor={pref.key}>{pref.label}</Label>
                                <p className="text-sm text-muted-foreground">{pref.desc}</p>
                            </div>
                            <Switch
                                id={pref.key}
                                checked={prefs[pref.key]}
                                onCheckedChange={(checked) =>
                                    setPrefs((prev) => ({ ...prev, [pref.key]: checked }))
                                }
                            />
                        </div>
                    ))}
                    <Button onClick={handleSave} disabled={saving} className="mt-4">
                        {saving ? "Saving..." : "Save Preferences"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
