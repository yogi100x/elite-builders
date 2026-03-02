/// <reference types="node" />
"use node"

import { v } from "convex/values"
import { internalAction } from "./_generated/server"
import { internal } from "./_generated/api"

export const runTests = internalAction({
    args: {
        submissionId: v.id("submissions"),
        repoUrl: v.string(),
        challengeId: v.optional(v.id("challenges")),
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

            // 1. Clone candidate repo
            await sandbox.commands.run(`git clone ${args.repoUrl} /app`)

            // 2. Look up challenge config (hidden tests + custom test command)
            let testCommand = "npm test"
            if (args.challengeId) {
                const challenge = await ctx.runQuery(internal.challenges.getByIdInternal, { id: args.challengeId })
                if (challenge) {
                    if (challenge.testRunCommand) {
                        testCommand = challenge.testRunCommand
                    }
                    if (challenge.hiddenTestFileIds && challenge.hiddenTestFileIds.length > 0) {
                        await sandbox.commands.run("mkdir -p /app/__tests__/hidden")
                        for (let i = 0; i < challenge.hiddenTestFileIds.length; i++) {
                            const fileUrl = await ctx.runQuery(internal.submissions.getStorageUrl, {
                                storageId: challenge.hiddenTestFileIds[i],
                            })
                            if (fileUrl) {
                                await sandbox.commands.run(
                                    `curl -sL "${fileUrl}" -o /app/__tests__/hidden/hidden_test_${i}.test.js`
                                )
                            }
                        }
                        console.log(`[sandbox] Injected ${challenge.hiddenTestFileIds.length} hidden test files`)
                    }
                }
            }

            // 3. Install dependencies
            await sandbox.commands.run("cd /app && npm install", { timeoutMs: 60000 })

            // 5. Run tests
            const result = await sandbox.commands.run(
                `cd /app && ${testCommand} -- --json 2>/dev/null || true`,
                { timeoutMs: 120000 },
            )

            await sandbox.kill()

            // 6. Parse test results
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
                testResults.details = result.stdout.slice(0, 2000)
            }

            // 7. Store results
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
