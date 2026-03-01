import { auth, clerkClient } from "@clerk/nextjs/server"
import { createGitHubClient } from "@/lib/github/client"

export async function GET() {
    const { userId } = await auth()
    if (!userId) {
        return Response.json({ error: "Unauthenticated" }, { status: 401 })
    }

    // Get the GitHub OAuth token Clerk holds for this user
    try {
        const client = await clerkClient()
        const tokens = await client.users.getUserOauthAccessToken(userId, "oauth_github")

        // Check if tokens were returned, handle both clerk v5 and v6 signature formats safely
        const tokenList = (tokens as any).data || tokens;

        if (!tokenList || tokenList.length === 0) {
            return Response.json({ error: "GitHub not connected — sign in with GitHub to select a repo" }, { status: 400 })
        }

        const accessToken = tokenList[0].token
        const githubClient = createGitHubClient(accessToken)

        const repos = await githubClient.listUserRepos()
        return Response.json({ repos })
    } catch (err) {
        console.error("[github/repos] Failed to fetch repos:", err)
        return Response.json({ error: "Failed to fetch GitHub repositories" }, { status: 500 })
    }
}
