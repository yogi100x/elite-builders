import { v } from "convex/values"
import { internalAction } from "./_generated/server"
import { internal } from "./_generated/api"

export const runTests = internalAction({
    args: {
        submissionId: v.id("submissions"),
        repoUrl: v.string(),
    },
    handler: async (ctx, args) => {
        const apiKey = process.env.E2B_API_KEY
        if (!apiKey) {
            console.log("[sandbox] E2B_API_KEY not set — skipping sandbox execution")
            return
        }

        try {
            const { Sandbox } = await import("e2b")
            const sandbox = await Sandbox.create({ apiKey })

            // Clone repo and run tests
            await sandbox.commands.run(`git clone ${args.repoUrl} /app`)
            await sandbox.commands.run("cd /app && npm install", { timeout: 60000 })
            const result = await sandbox.commands.run(
                "cd /app && npm test -- --json 2>/dev/null || true",
                { timeout: 120000 },
            )

            await sandbox.kill()

            // Parse test results
            let testResults = { passed: 0, failed: 0, total: 0, details: "" }
            try {
                const jsonOutput = JSON.parse(result.stdout)
                testResults = {
                    passed: jsonOutput.numPassedTests ?? 0,
                    failed: jsonOutput.numFailedTests ?? 0,
                    total: jsonOutput.numTotalTests ?? 0,
                    details: result.stdout.slice(0, 2000),
                }
            } catch {
                // Non-JSON output — just capture stdout
                testResults.details = result.stdout.slice(0, 2000)
            }

            // Store results on submission
            await ctx.runMutation(internal.submissions.setTestResults, {
                submissionId: args.submissionId,
                testResults,
            })

            console.log(`[sandbox] Test results for ${args.submissionId}: ${testResults.passed}/${testResults.total} passed`)
        } catch (error) {
            console.error("[sandbox] Sandbox execution failed:", error)
        }
    },
})
