import { internalAction } from "./_generated/server"
import { v } from "convex/values"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { api, internal } from "./_generated/api"

const RUBRIC_SCORING_SYSTEM_PROMPT = `You are an expert technical judge evaluating AI/software competition submissions.
Score each rubric criterion and provide specific, actionable feedback.
Return ONLY valid JSON — no markdown, no prose outside the JSON object.`

const DEFAULT_RUBRIC_CRITERIA = [
    { name: "Technical Implementation", maxScore: 40, description: "Quality of code, architecture, use of AI/ML techniques" },
    { name: "Problem Understanding", maxScore: 20, description: "How well the submission addresses the stated problem" },
    { name: "Innovation", maxScore: 20, description: "Creative use of AI, novel approach, differentiated solution" },
    { name: "Documentation & Clarity", maxScore: 10, description: "README quality, pitch clarity, demo explanation" },
    { name: "Completeness", maxScore: 10, description: "End-to-end functionality, working demo" },
]

interface RubricCriterion {
    name: string
    maxScore: number
    description: string
}

interface RubricScore {
    criterion: string
    score: number
    maxScore: number
    feedback: string
}

interface AIScoringResult {
    overallScore: number
    rubricScores: RubricScore[]
    strengths: string[]
    improvements: string[]
    summary: string
}

function buildRubricPromptSection(criteria: RubricCriterion[]): string {
    return criteria
        .map((c, i) => `${i + 1}. ${c.name} (${c.maxScore} pts): ${c.description}`)
        .join("\n")
}

function buildExpectedJsonSection(criteria: RubricCriterion[]): string {
    const rubricEntries = criteria
        .map((c) => `    { "criterion": "${c.name}", "score": <0-${c.maxScore}>, "maxScore": ${c.maxScore}, "feedback": "<specific feedback>" }`)
        .join(",\n")
    return `{
  "overallScore": <0-100 number>,
  "rubricScores": [
${rubricEntries}
  ],
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>"],
  "summary": "<2-3 sentence overall assessment>"
}`
}

/**
 * Evaluates a submission against the challenge rubric using Gemini.
 * Called automatically after submission creation via scoreSubmission action.
 */
export const scoreSubmission = internalAction({
    args: {
        submissionId: v.id("submissions"),
    },
    handler: async (ctx, { submissionId }) => {
        const submission = await ctx.runQuery(internal.submissions.getById, { submissionId })
        if (!submission) throw new Error("Submission not found")

        // Mark scoring as in-progress
        await ctx.runMutation(internal.submissions.setScoringStatus, {
            submissionId,
            scoringStatus: "scoring",
        })

        const challenge = await ctx.runQuery(internal.challenges.getByIdInternal, { id: submission.challengeId })
        if (!challenge) throw new Error("Challenge not found")

        try {
            // Fetch GitHub repo data for context
            let readmeContent = ""
            let repoDescription = ""
            let techStack = ""

            if (submission.githubOwner && submission.githubRepo) {
                try {
                    const analysis = await ctx.runAction(api.github.analyzeRepo, {
                        owner: submission.githubOwner,
                        repo: submission.githubRepo,
                    })
                    readmeContent = analysis.readme ?? ""
                    repoDescription = analysis.metadata?.description ?? ""
                    const languages = analysis.metadata?.languages?.map((l: any) => l.name).join(", ") ?? ""
                    const deps = Object.keys(analysis.packageJson?.dependencies ?? {}).slice(0, 10).join(", ")
                    techStack = [languages, deps].filter(Boolean).join(" | ")
                } catch (err) {
                    console.error("[ai-scoring] GitHub fetch failed, scoring from notes only:", { error: err })
                }
            }

            const apiKey = process.env.GEMINI_API_KEY
            if (!apiKey) throw new Error("GEMINI_API_KEY not set in Convex environment")

            const genAI = new GoogleGenerativeAI(apiKey)
            // Model configurable via env var — swap without redeploy if preview model is deprecated
            const scoringModel = process.env.GEMINI_SCORING_MODEL ?? "gemini-3-flash"
            const fallbackModel = process.env.GEMINI_FALLBACK_MODEL ?? "gemini-2.5-flash"
            const model = genAI.getGenerativeModel({ model: scoringModel })

            // Build rubric dynamically from challenge or fall back to default
            const rubricCriteria: RubricCriterion[] = challenge.rubricCriteria && challenge.rubricCriteria.length > 0
                ? challenge.rubricCriteria
                : DEFAULT_RUBRIC_CRITERIA
            const totalPoints = rubricCriteria.reduce((sum, c) => sum + c.maxScore, 0)

            const prompt = `
Challenge: ${challenge.title}

Problem Statement:
${challenge.problemStatement}

Evaluation Rubric (total ${totalPoints} pts — score each criterion from 0 up to its max):
${buildRubricPromptSection(rubricCriteria)}

Candidate Submission:
- Repo: ${submission.githubRepoUrl ?? submission.repoUrl ?? "not provided"}
- Description: ${repoDescription}
- Tech Stack: ${techStack || "unknown"}
- Candidate's pitch: ${submission.notes ?? "none provided"}

README Content (first 2000 chars):
${readmeContent.slice(0, 2000)}

Return JSON in this exact format:
${buildExpectedJsonSection(rubricCriteria)}
`

            let result
            try {
                result = await model.generateContent([
                    { text: RUBRIC_SCORING_SYSTEM_PROMPT },
                    { text: prompt },
                ])
            } catch (modelErr) {
                const isUnavailable = String(modelErr).includes("deprecated") || String(modelErr).includes("not found") || String(modelErr).includes("404")
                if (!isUnavailable) throw modelErr
                console.warn("[ai-scoring] Primary model unavailable, falling back:", { scoringModel, fallbackModel })
                const fallback = genAI.getGenerativeModel({ model: fallbackModel })
                result = await fallback.generateContent([
                    { text: RUBRIC_SCORING_SYSTEM_PROMPT },
                    { text: prompt },
                ])
            }

            const rawText = result.response.text().trim()
            let scoringResult: AIScoringResult

            try {
                // Strip markdown code blocks if the AI sneaks them in
                const cleanedText = rawText.replace(/^\`\`\`json/m, "").replace(/^\`\`\`/m, "").trim();
                scoringResult = JSON.parse(cleanedText)
            } catch {
                console.error("[ai-scoring] Failed to parse Gemini response:", { rawText })
                throw new Error("AI scoring failed — invalid JSON response from Gemini")
            }

            // Clamp overall score to 0-100
            const overallScore = Math.max(0, Math.min(100, Math.round(scoringResult.overallScore)))

            // Persist provisional score to submission
            await ctx.runMutation(internal.submissions.setProvisionalScore, {
                submissionId,
                provisionalScore: overallScore,
                aiRubricFeedback: JSON.stringify(scoringResult),
            })

            // Mark scoring as complete
            await ctx.runMutation(internal.submissions.setScoringStatus, {
                submissionId,
                scoringStatus: "scored",
            })

            console.log(`[ai-scoring] Scored submission ${submissionId}: ${overallScore}/100`)
            return { overallScore, rubricScores: scoringResult.rubricScores }
        } catch (error) {
            // Mark scoring as failed so the UI can reflect the error
            await ctx.runMutation(internal.submissions.setScoringStatus, {
                submissionId,
                scoringStatus: "failed",
            })
            console.error("[ai-scoring] Scoring failed for submission:", { submissionId, error })
            throw error
        }
    },
})
