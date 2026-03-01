import { internalAction } from "./_generated/server"
import { v } from "convex/values"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { api, internal } from "./_generated/api"

const RUBRIC_SCORING_SYSTEM_PROMPT = `You are an expert technical judge evaluating AI/software competition submissions.
Score each rubric criterion from 0-100 and provide specific, actionable feedback.
Return ONLY valid JSON — no markdown, no prose outside the JSON object.`

interface RubricScore {
    criterion: string
    score: number       // 0-100
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

        const challenge = await ctx.runQuery(internal.challenges.getByIdInternal, { id: submission.challengeId })
        if (!challenge) throw new Error("Challenge not found")

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
        const scoringModel = process.env.GEMINI_SCORING_MODEL ?? "gemini-2.5-flash"
        const fallbackModel = process.env.GEMINI_FALLBACK_MODEL ?? "gemini-2.0-flash"
        const model = genAI.getGenerativeModel({ model: scoringModel })

        const prompt = `
Challenge: ${challenge.title}

Problem Statement:
${challenge.problemStatement}

Evaluation Rubric (score each 0-100):
1. Technical Implementation (40 pts): Quality of code, architecture, use of AI/ML techniques
2. Problem Understanding (20 pts): How well the submission addresses the stated problem
3. Innovation (20 pts): Creative use of AI, novel approach, differentiated solution
4. Documentation & Clarity (10 pts): README quality, pitch clarity, demo explanation
5. Completeness (10 pts): End-to-end functionality, working demo

Candidate Submission:
- Repo: ${submission.githubRepoUrl ?? submission.repoUrl ?? "not provided"}
- Description: ${repoDescription}
- Tech Stack: ${techStack || "unknown"}
- Candidate's pitch: ${submission.notes ?? "none provided"}

README Content (first 2000 chars):
${readmeContent.slice(0, 2000)}

Return JSON in this exact format:
{
  "overallScore": <0-100 number>,
  "rubricScores": [
    { "criterion": "Technical Implementation", "score": <0-40>, "maxScore": 40, "feedback": "<specific feedback>" },
    { "criterion": "Problem Understanding", "score": <0-20>, "maxScore": 20, "feedback": "<specific feedback>" },
    { "criterion": "Innovation", "score": <0-20>, "maxScore": 20, "feedback": "<specific feedback>" },
    { "criterion": "Documentation & Clarity", "score": <0-10>, "maxScore": 10, "feedback": "<specific feedback>" },
    { "criterion": "Completeness", "score": <0-10>, "maxScore": 10, "feedback": "<specific feedback>" }
  ],
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>"],
  "summary": "<2-3 sentence overall assessment>"
}
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

        console.log(`[ai-scoring] Scored submission ${submissionId}: ${overallScore}/100`)
        return { overallScore, rubricScores: scoringResult.rubricScores }
    },
})
