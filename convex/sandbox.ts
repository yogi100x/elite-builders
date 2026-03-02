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
            const cloneResult = await sandbox.commands.run(`git clone ${args.repoUrl} /app`)
            if (cloneResult.exitCode !== 0) {
                await sandbox.kill()
                await ctx.runMutation(internal.submissions.setTestResults, {
                    submissionId: args.submissionId,
                    testResults: {
                        passed: 0, failed: 0, total: 0,
                        details: `Failed to clone repository: ${cloneResult.stderr.slice(0, 500)}`,
                    },
                })
                return
            }

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
                                    `curl -sL "${fileUrl}" -o /app/__tests__/hidden/hidden_test_${i}.test.ts`
                                )
                            }
                        }
                        console.log(`[sandbox] Injected ${challenge.hiddenTestFileIds.length} hidden test files`)
                    }
                }
            }

            // 3. Install dependencies
            const installResult = await sandbox.commands.run("cd /app && npm install", { timeoutMs: 60000 })
            if (installResult.exitCode !== 0) {
                await sandbox.kill()
                await ctx.runMutation(internal.submissions.setTestResults, {
                    submissionId: args.submissionId,
                    testResults: {
                        passed: 0, failed: 0, total: 0,
                        details: `npm install failed: ${installResult.stderr.slice(0, 500)}`,
                    },
                })
                return
            }

            // 4. Run tests with --verbose for detailed output, and --json for structured parsing
            const result = await sandbox.commands.run(
                `cd /app && ${testCommand} -- --verbose --json 2>&1 || true`,
                { timeoutMs: 120000 },
            )

            // Also capture verbose output (without --json) for human-readable details
            const verboseResult = await sandbox.commands.run(
                `cd /app && ${testCommand} -- --verbose 2>&1 || true`,
                { timeoutMs: 120000 },
            )

            await sandbox.kill()

            // 5. Parse test results
            let testResults = { passed: 0, failed: 0, total: 0, details: "" }
            try {
                const jsonOutput = JSON.parse(result.stdout)
                testResults = {
                    passed: jsonOutput.numPassedTests ?? 0,
                    failed: jsonOutput.numFailedTests ?? 0,
                    total: jsonOutput.numTotalTests ?? 0,
                    details: verboseResult.stdout.slice(0, 4000),
                }
            } catch {
                // JSON parsing failed — fall back to parsing verbose output
                const stdout = verboseResult.stdout || result.stdout
                const stderr = verboseResult.stderr || result.stderr

                // Try to extract pass/fail counts from verbose output
                const passMatch = stdout.match(/Tests:\s+(\d+)\s+passed/)
                const failMatch = stdout.match(/Tests:\s+(\d+)\s+failed/)
                const totalMatch = stdout.match(/Tests:\s+(\d+)\s+total/)
                if (passMatch) testResults.passed = parseInt(passMatch[1])
                if (failMatch) testResults.failed = parseInt(failMatch[1])
                if (totalMatch) testResults.total = parseInt(totalMatch[1])

                // Combine stdout + stderr for full context
                const combined = [stdout, stderr].filter(Boolean).join("\n---STDERR---\n")
                testResults.details = combined.slice(0, 4000)
            }

            // 6. Store results
            await ctx.runMutation(internal.submissions.setTestResults, {
                submissionId: args.submissionId,
                testResults,
            })

            console.log(`[sandbox] Test results for ${args.submissionId}: ${testResults.passed}/${testResults.total} passed`)
        } catch (error) {
            console.error("[sandbox] Sandbox execution failed:", error)
            // Store the error so sponsors can see what happened
            await ctx.runMutation(internal.submissions.setTestResults, {
                submissionId: args.submissionId,
                testResults: {
                    passed: 0, failed: 0, total: 0,
                    details: `Sandbox execution failed: ${String(error).slice(0, 500)}`,
                },
            })
        }
    },
})
