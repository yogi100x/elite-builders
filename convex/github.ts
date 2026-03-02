import { action, internalAction } from "./_generated/server"
import { v } from "convex/values"
import { internal } from "./_generated/api"
import { analyzeRepo as analyzeRepoImpl, listUserRepos } from "./lib/github"

/**
 * Internal action that checks the 1hr cache before hitting the GitHub API.
 * Used by aiScoring and other internal callers.
 */
export const analyzeRepoInternal = internalAction({
    args: {
        owner: v.string(),
        repo: v.string(),
    },
    handler: async (ctx, { owner, repo }) => {
        // Check cache first (1hr TTL enforced in getCached)
        const cached = await ctx.runQuery(internal.githubCache.getCached, { owner, repo })
        if (cached) {
            return JSON.parse(cached)
        }

        const token = process.env.GITHUB_TOKEN
        if (!token) {
            throw new Error("GITHUB_TOKEN not configured — add to Convex environment variables")
        }

        try {
            const analysis = await analyzeRepoImpl(owner, repo, token)

            // Cache the result
            await ctx.runMutation(internal.githubCache.setCache, {
                owner,
                repo,
                analysis: JSON.stringify(analysis),
            })

            return analysis
        } catch (err) {
            console.error("[convex/github.analyzeRepoInternal] GitHub API error:", { owner, repo, error: err })
            throw new Error(`Failed to analyze repository ${owner}/${repo}`)
        }
    },
})

/**
 * Public action for backward compatibility (e.g. client-side calls).
 * Delegates to the internal action which handles caching.
 */
export const analyzeRepo = action({
    args: {
        owner: v.string(),
        repo: v.string(),
    },
    handler: async (ctx, { owner, repo }) => {
        return await ctx.runAction(internal.github.analyzeRepoInternal, { owner, repo })
    },
})

/**
 * Analyzes a candidate's GitHub profile by examining their 10 most recent repos.
 * Produces a structured skill profile via Gemini and stores it on the user record.
 */
export const analyzeUserProfile = internalAction({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        const user: any = await ctx.runQuery(internal.users.getById, { userId })
        if (!user?.githubUsername) {
            console.log("[github] No GitHub username for user, skipping profile analysis")
            return
        }

        const token = process.env.GITHUB_TOKEN
        if (!token) {
            console.error("[github] GITHUB_TOKEN not configured")
            return
        }

        // 1. Fetch 10 most recent repos
        const repos = await listUserRepos(user.githubUsername, token)
        if (repos.length === 0) {
            console.log("[github] No public repos found for", user.githubUsername)
            return
        }

        // 2. Analyze each repo (reuses existing cached analysis)
        const repoAnalyses = await Promise.all(
            repos.map(async (repo) => {
                try {
                    const [owner, name] = repo.fullName.split("/")
                    return await ctx.runAction(internal.github.analyzeRepoInternal, {
                        owner,
                        repo: name,
                    })
                } catch {
                    return null
                }
            }),
        )

        const validAnalyses = repoAnalyses.filter(Boolean)
        if (validAnalyses.length === 0) return

        // 3. Build summary for Gemini
        const repoSummaries = validAnalyses.map((a: any, i: number) => {
            const langs = a.metadata?.languages?.map((l: any) => l.name).join(", ") ?? "unknown"
            const deps = Object.keys(a.packageJson?.dependencies ?? {}).slice(0, 15).join(", ")
            const topics = a.metadata?.topics?.join(", ") ?? ""
            return `Repo ${i + 1}: ${a.metadata?.fullName ?? repos[i]?.fullName}
  Languages: ${langs}
  Dependencies: ${deps}
  Topics: ${topics}
  Description: ${a.metadata?.description ?? "none"}
  Stars: ${a.metadata?.stars ?? 0}`
        }).join("\n\n")

        // 4. Call Gemini to produce structured profile
        const { GoogleGenerativeAI } = await import("@google/generative-ai")
        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey) {
            console.error("[github] GEMINI_API_KEY not set")
            return
        }

        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({
            model: process.env.GEMINI_SCORING_MODEL ?? "gemini-3-flash",
        })

        const prompt = `Analyze this developer's GitHub repositories and produce a structured skill profile.

Self-reported skills: ${(user.skills ?? []).join(", ") || "none provided"}
Bio: ${user.bio ?? "none provided"}

GitHub Repositories (10 most recent):
${repoSummaries}

Return ONLY valid JSON in this exact format:
{
  "primaryLanguages": ["language1", "language2"],
  "frameworks": ["framework1", "framework2"],
  "domains": ["domain1", "domain2"],
  "experienceLevel": "beginner|intermediate|advanced|expert",
  "projectTypes": ["type1", "type2"],
  "summary": "2-3 sentence summary of this developer's strengths and focus areas"
}`

        try {
            const result = await model.generateContent(prompt)
            const rawText = result.response.text().trim()
            const cleanedText = rawText.replace(/^```json/m, "").replace(/^```/m, "").trim()
            const profile = JSON.parse(cleanedText)

            // 5. Store on user record
            await ctx.runMutation(internal.users.setGithubProfile, {
                userId,
                githubProfile: JSON.stringify(profile),
            })

            console.log(`[github] Profile analyzed for ${user.githubUsername}: ${profile.summary}`)
        } catch (error) {
            console.error("[github] Profile analysis failed:", error)
        }
    },
})
