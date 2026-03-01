"use client"

import { useQuery, useMutation, Authenticated, Unauthenticated } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, Copy, Trash2, Mail } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function AdminInvitesPage() {
    const invites = useQuery(api.invites.listPending)
    const createInvite = useMutation(api.invites.create)
    const revokeInvite = useMutation(api.invites.revoke)

    const [isCreating, setIsCreating] = useState(false)
    const [email, setEmail] = useState("")
    const [role, setRole] = useState<"sponsor" | "judge">("sponsor")
    const [orgName, setOrgName] = useState("")
    const [generatedToken, setGeneratedToken] = useState<string | null>(null)

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email) return

        if (role === "sponsor" && !orgName) {
            toast.error("Organization name is required for sponsors")
            return
        }

        setIsCreating(true)
        try {
            const token = await createInvite({
                email,
                role,
                orgName: role === "sponsor" ? orgName : undefined,
            })

            setGeneratedToken(token)
            setEmail("")
            setOrgName("")
            toast.success("Invite generated successfully!")
        } catch (error: any) {
            toast.error(error.message || "Failed to create invite")
        } finally {
            setIsCreating(false)
        }
    }

    const handleCopy = (token: string) => {
        const url = `${window.location.origin}/invite/${token}`
        navigator.clipboard.writeText(url)
        toast.success("Invite link copied to clipboard!")
    }

    const handleRevoke = async (id: any) => {
        try {
            await revokeInvite({ id })
            toast.success("Invite revoked")
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 py-8">
            <Authenticated>
                <div>
                    <h1 className="font-display text-4xl font-bold tracking-tight">Staff Invites</h1>
                    <p className="text-muted-foreground mt-2 text-lg">
                        Generate and manage secure invite links for Sponsors & Judges.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 items-start">
                    {/* Form Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Generate New Invite</CardTitle>
                            <CardDescription>
                                Create a single-use onboarding link.
                            </CardDescription>
                        </CardHeader>
                        <form onSubmit={handleCreate}>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="role">Role</Label>
                                    <Select value={role} onValueChange={(v: "sponsor" | "judge") => setRole(v)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="sponsor">Sponsor</SelectItem>
                                            <SelectItem value="judge">Judge</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="partner@company.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>

                                {role === "sponsor" && (
                                    <div className="space-y-2">
                                        <Label htmlFor="orgName">Organization Name</Label>
                                        <Input
                                            id="orgName"
                                            placeholder="Stark Industries"
                                            value={orgName}
                                            onChange={(e) => setOrgName(e.target.value)}
                                            required={role === "sponsor"}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            This will be used to create their initial Sponsor profile.
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="flex flex-col gap-4 items-stretch border-t p-6 bg-muted/20">
                                <Button type="submit" disabled={isCreating || !email}>
                                    {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Generate Invite Link
                                </Button>

                                {generatedToken && (
                                    <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-md">
                                        <p className="text-sm font-medium mb-2 text-primary">Success! Share this link securely:</p>
                                        <div className="flex gap-2">
                                            <Input
                                                readOnly
                                                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${generatedToken}`}
                                                className="bg-background font-mono text-xs"
                                            />
                                            <Button type="button" variant="secondary" onClick={() => handleCopy(generatedToken)}>
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardFooter>
                        </form>
                    </Card>

                    {/* Pending Invites List */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Pending Invites ({invites?.length || 0})</CardTitle>
                            <CardDescription>
                                Unaccepted links that are still active.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {!invites ? (
                                <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                            ) : invites.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">No pending invites.</p>
                            ) : (
                                <div className="space-y-4">
                                    {invites.map((invite) => (
                                        <div key={invite._id} className="border p-4 rounded-md space-y-3 shadow-sm bg-card">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-semibold text-sm flex items-center gap-2">
                                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                                        {invite.email}
                                                    </p>
                                                    <div className="flex gap-2 mt-1">
                                                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize">
                                                            {invite.role}
                                                        </span>
                                                        {invite.orgName && (
                                                            <span className="text-xs text-muted-foreground px-2 py-0.5 border rounded-full">
                                                                {invite.orgName}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 pt-2 border-t mt-2">
                                                <Button size="sm" variant="outline" className="flex-1 text-xs h-8" onClick={() => handleCopy(invite.token)}>
                                                    <Copy className="h-3.5 w-3.5 mr-1" /> Copy Link
                                                </Button>
                                                <Button size="sm" variant="destructive" className="flex-1 text-xs h-8" onClick={() => handleRevoke(invite._id)}>
                                                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Revoke
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </Authenticated>
            <Unauthenticated>
                <div className="text-center py-16">
                    <h2 className="text-2xl font-bold">Admin Only</h2>
                    <p className="text-muted-foreground mt-2">You don't have permission to view this page.</p>
                </div>
            </Unauthenticated>
        </div>
    )
}
