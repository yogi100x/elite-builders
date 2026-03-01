import { action, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Run with: npx convex run seed:seedAll
export const seedAll = action({
    args: {},
    handler: async (ctx) => {
        // Upsert demo users with pre-assigned roles
        const adminId = await ctx.runMutation(api.users.upsertFromClerk, {
            clerkId: "demo_admin",
            email: "admin@demo.elitebuilders.com",
            name: "Demo Admin",
            role: "admin",
        });

        const sponsorUserId = await ctx.runMutation(api.users.upsertFromClerk, {
            clerkId: "demo_sponsor",
            email: "sponsor@demo.elitebuilders.com",
            name: "Demo Sponsor",
            role: "sponsor",
        });

        const sponsor2UserId = await ctx.runMutation(api.users.upsertFromClerk, {
            clerkId: "demo_sponsor2",
            email: "sponsor2@demo.elitebuilders.com",
            name: "Acme Corp Sponsor",
            role: "sponsor",
        });

        const judgeId = await ctx.runMutation(api.users.upsertFromClerk, {
            clerkId: "demo_judge",
            email: "judge@demo.elitebuilders.com",
            name: "Demo Judge",
            role: "judge",
        });

        const candidateId = await ctx.runMutation(api.users.upsertFromClerk, {
            clerkId: "demo_candidate",
            email: "candidate@demo.elitebuilders.com",
            name: "Alex Chen",
            role: "candidate",
        });

        // Create sponsor profiles and challenges via internal mutation
        const challengeIds = await ctx.runMutation(internal.seed.seedChallenges, {
            adminUserId: adminId,
            sponsorUserId,
            sponsor2UserId,
        });

        // Create submissions and badges
        await ctx.runMutation(internal.seed.seedSubmissionsAndBadges, {
            candidateId,
            judgeId,
            challengeIds,
        });

        console.log("[seed] Seed complete. See README for demo credentials.");
    },
});

export const seedChallenges = internalMutation({
    args: {
        adminUserId: v.id("users"),
        sponsorUserId: v.id("users"),
        sponsor2UserId: v.id("users"),
    },
    handler: async (ctx, args): Promise<Id<"challenges">[]> => {
        // --- Sponsor 1: BuildFast Inc ---
        const existingSponsor1 = await ctx.db
            .query("sponsors")
            .withIndex("by_user", (q) => q.eq("userId", args.sponsorUserId))
            .unique();

        let sponsor1Id = existingSponsor1?._id;

        if (!existingSponsor1) {
            sponsor1Id = await ctx.db.insert("sponsors", {
                userId: args.sponsorUserId,
                orgName: "BuildFast Inc",
                logoUrl: "https://logo.dev/buildfast.io?token=pk_demo",
            });
        }

        if (!sponsor1Id) throw new Error("Could not create sponsor 1");

        // --- Sponsor 2: Acme Corp ---
        const existingSponsor2 = await ctx.db
            .query("sponsors")
            .withIndex("by_user", (q) => q.eq("userId", args.sponsor2UserId))
            .unique();

        let sponsor2Id = existingSponsor2?._id;

        if (!existingSponsor2) {
            sponsor2Id = await ctx.db.insert("sponsors", {
                userId: args.sponsor2UserId,
                orgName: "Acme Corp",
                logoUrl: "https://logo.dev/acme.com?token=pk_demo",
            });
        }

        if (!sponsor2Id) throw new Error("Could not create sponsor 2");

        // Create 6 challenges: 1-3 for BuildFast Inc, 4-6 for Acme Corp
        const challengeDefinitions = [
            {
                title: "Build an AI Code Reviewer",
                summary: "Create a tool that reviews PRs using an LLM and posts structured feedback.",
                difficulty: "advanced" as const,
                tags: ["AI", "developer-tools", "LLM"],
                prize: "$2,000 + Badge",
                overview: "Detailed overview...",
                problemStatement: "Detailed problem statement...",
                sponsorId: sponsor1Id,
            },
            {
                title: "Real-Time Collaboration Editor",
                summary: "Build a Google Docs-style collaborative text editor with OT or CRDTs.",
                difficulty: "expert" as const,
                tags: ["real-time", "algorithms", "collaboration"],
                prize: "$3,000 + Badge",
                overview: "Detailed overview...",
                problemStatement: "Detailed problem statement...",
                sponsorId: sponsor1Id,
            },
            {
                title: "Accessibility Audit Dashboard",
                summary: "Design a WCAG audit tool with visual score breakdowns and fix suggestions.",
                difficulty: "intermediate" as const,
                tags: ["design", "accessibility", "UX"],
                prize: "$1,500 + Badge",
                overview: "Detailed overview...",
                problemStatement: "Detailed problem statement...",
                sponsorId: sponsor1Id,
            },
            {
                title: "CLI Task Manager with AI",
                summary: "Build a terminal-native task manager that uses AI to prioritize and estimate.",
                difficulty: "beginner" as const,
                tags: ["CLI", "AI", "productivity"],
                prize: "$500 + Badge",
                overview: "Detailed overview...",
                problemStatement: "Detailed problem statement...",
                sponsorId: sponsor2Id,
            },
            {
                title: "AI-Powered Resume Parser",
                summary: "Parse unstructured resumes into structured JSON with skill + experience extraction.",
                difficulty: "intermediate" as const,
                tags: ["AI", "NLP", "data"],
                prize: "$1,000 + Badge",
                overview: "Detailed overview...",
                problemStatement: "Detailed problem statement...",
                sponsorId: sponsor2Id,
            },
            {
                title: "Design System Tokenizer",
                summary: "Build a Figma plugin that exports design tokens to Tailwind/CSS variables.",
                difficulty: "advanced" as const,
                tags: ["design", "developer-tools", "Figma"],
                prize: "$2,500 + Badge",
                overview: "Detailed overview...",
                problemStatement: "Detailed problem statement...",
                sponsorId: sponsor2Id,
            },
        ];

        const now = Date.now();
        const oneMonth = 30 * 24 * 60 * 60 * 1000;
        const challengeIds: Id<"challenges">[] = [];

        for (const { sponsorId, ...challenge } of challengeDefinitions) {
            const existing = await ctx.db
                .query("challenges")
                .withSearchIndex("search_challenges", (q) => q.search("title", challenge.title))
                .first();

            if (existing) {
                challengeIds.push(existing._id);
            } else {
                const id = await ctx.db.insert("challenges", {
                    ...challenge,
                    sponsorId,
                    status: "open",
                    deadline: now + oneMonth,
                });
                challengeIds.push(id);
            }
        }

        return challengeIds;
    },
});

export const seedSubmissionsAndBadges = internalMutation({
    args: {
        candidateId: v.id("users"),
        judgeId: v.id("users"),
        challengeIds: v.array(v.id("challenges")),
    },
    handler: async (ctx, args) => {
        const { candidateId, judgeId, challengeIds } = args;
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;

        // 8 submissions across 6 challenges (some challenges get multiple submissions)
        // Challenges: [0] AI Code Reviewer, [1] Collaboration Editor, [2] Accessibility Dashboard,
        //             [3] CLI Task Manager, [4] Resume Parser, [5] Design System Tokenizer
        const submissionDefinitions = [
            // --- 3 Awarded ---
            {
                challengeIdx: 0, // AI Code Reviewer
                repoUrl: "https://github.com/alexchen/ai-code-reviewer",
                notes: "Built with GPT-4 API and GitHub Actions integration. Supports inline comments.",
                status: "awarded" as const,
                score: 92,
                provisionalScore: 88,
                aiRubricFeedback: JSON.stringify({
                    criteria: [
                        { name: "Code Quality", score: 9, maxScore: 10, feedback: "Well-structured codebase with clean separation of concerns." },
                        { name: "Functionality", score: 9, maxScore: 10, feedback: "All core features implemented and working." },
                        { name: "Innovation", score: 8, maxScore: 10, feedback: "Good use of streaming for real-time feedback." },
                    ],
                }),
                aiScoredAt: now - 10 * oneDay,
                feedback: "Excellent implementation with clean architecture. The streaming review feature is a standout. Minor improvement possible in error handling.",
                judgedBy: judgeId,
                badge: { name: "First Build", color: "#10B981", level: 1 },
            },
            {
                challengeIdx: 2, // Accessibility Dashboard
                repoUrl: "https://github.com/alexchen/a11y-audit-dashboard",
                notes: "React + Lighthouse integration. Real-time WCAG scoring with fix recommendations.",
                status: "awarded" as const,
                score: 87,
                provisionalScore: 84,
                aiRubricFeedback: JSON.stringify({
                    criteria: [
                        { name: "Code Quality", score: 8, maxScore: 10, feedback: "Good component structure, some duplication in utility functions." },
                        { name: "Functionality", score: 9, maxScore: 10, feedback: "Comprehensive audit coverage with actionable suggestions." },
                        { name: "Design", score: 9, maxScore: 10, feedback: "Beautiful dashboard with intuitive data visualization." },
                    ],
                }),
                aiScoredAt: now - 8 * oneDay,
                feedback: "Strong dashboard design with excellent visual breakdowns. WCAG compliance checks are thorough. Good work on the fix suggestion engine.",
                judgedBy: judgeId,
                badge: { name: "Builder", color: "#2563EB", level: 2 },
            },
            {
                challengeIdx: 3, // CLI Task Manager
                repoUrl: "https://github.com/alexchen/cli-task-ai",
                notes: "Built with Ink (React for CLI). AI prioritization via local LLM for privacy.",
                status: "awarded" as const,
                score: 95,
                provisionalScore: 91,
                aiRubricFeedback: JSON.stringify({
                    criteria: [
                        { name: "Code Quality", score: 10, maxScore: 10, feedback: "Exceptional code quality with full test coverage." },
                        { name: "Functionality", score: 9, maxScore: 10, feedback: "All features working, including offline mode." },
                        { name: "Innovation", score: 10, maxScore: 10, feedback: "Local LLM approach for privacy is innovative and well-executed." },
                    ],
                }),
                aiScoredAt: now - 5 * oneDay,
                feedback: "Outstanding submission. The local LLM approach for privacy is brilliant. Full test coverage and excellent DX. Best in class.",
                judgedBy: judgeId,
                badge: { name: "Expert", color: "#F59E0B", level: 3 },
            },
            // --- 2 Not Selected ---
            {
                challengeIdx: 1, // Collaboration Editor
                repoUrl: "https://github.com/alexchen/collab-editor-v1",
                notes: "CRDT-based editor using Yjs. Basic text editing with cursor sharing.",
                status: "not-selected" as const,
                score: 58,
                provisionalScore: 62,
                aiRubricFeedback: JSON.stringify({
                    criteria: [
                        { name: "Code Quality", score: 6, maxScore: 10, feedback: "Some code organization issues and missing error boundaries." },
                        { name: "Functionality", score: 5, maxScore: 10, feedback: "Basic editing works but rich text and image support missing." },
                        { name: "Performance", score: 6, maxScore: 10, feedback: "Latency spikes with more than 3 concurrent users." },
                    ],
                }),
                aiScoredAt: now - 12 * oneDay,
                feedback: "Good foundation with Yjs integration, but the submission lacks rich text support and struggles with concurrent users. Needs more work on conflict resolution edge cases.",
                judgedBy: judgeId,
            },
            {
                challengeIdx: 5, // Design System Tokenizer
                repoUrl: "https://github.com/alexchen/token-extractor",
                notes: "Figma plugin that reads styles and exports to JSON. Tailwind config generation WIP.",
                status: "not-selected" as const,
                score: 52,
                provisionalScore: 55,
                aiRubricFeedback: JSON.stringify({
                    criteria: [
                        { name: "Code Quality", score: 5, maxScore: 10, feedback: "Incomplete implementation with TODO comments throughout." },
                        { name: "Functionality", score: 5, maxScore: 10, feedback: "JSON export works, but Tailwind/CSS variable output is incomplete." },
                        { name: "Documentation", score: 6, maxScore: 10, feedback: "README is clear but API docs are missing." },
                    ],
                }),
                aiScoredAt: now - 7 * oneDay,
                feedback: "The Figma integration foundation is solid, but the Tailwind config generation is incomplete. Several TODO items remain. Needs more polish to meet the challenge requirements.",
                judgedBy: judgeId,
            },
            // --- 3 In Review ---
            {
                challengeIdx: 4, // Resume Parser
                repoUrl: "https://github.com/alexchen/resume-parser-ai",
                notes: "Uses OpenAI function calling for structured extraction. Supports PDF and DOCX.",
                status: "in-review" as const,
                provisionalScore: 79,
                aiRubricFeedback: JSON.stringify({
                    criteria: [
                        { name: "Code Quality", score: 8, maxScore: 10, feedback: "Clean architecture with good separation of parsing and extraction logic." },
                        { name: "Functionality", score: 7, maxScore: 10, feedback: "PDF parsing works well, DOCX has some formatting edge cases." },
                        { name: "Accuracy", score: 8, maxScore: 10, feedback: "Skill extraction is accurate for most resume formats." },
                    ],
                }),
                aiScoredAt: now - 2 * oneDay,
            },
            {
                challengeIdx: 1, // Collaboration Editor (second attempt)
                repoUrl: "https://github.com/alexchen/collab-editor-v2",
                notes: "V2 rewrite with Automerge. Added rich text, image support, and presence indicators.",
                status: "in-review" as const,
                provisionalScore: 85,
                aiRubricFeedback: JSON.stringify({
                    criteria: [
                        { name: "Code Quality", score: 8, maxScore: 10, feedback: "Significant improvement over v1. Clean React hooks abstraction." },
                        { name: "Functionality", score: 9, maxScore: 10, feedback: "Rich text, images, and presence all working." },
                        { name: "Performance", score: 8, maxScore: 10, feedback: "Handles 10+ concurrent users smoothly." },
                    ],
                }),
                aiScoredAt: now - 1 * oneDay,
            },
            {
                challengeIdx: 5, // Design System Tokenizer (second attempt)
                repoUrl: "https://github.com/alexchen/design-token-suite",
                notes: "Complete rewrite. Now supports Tailwind, CSS vars, and SCSS. Includes a preview panel.",
                status: "in-review" as const,
                provisionalScore: 82,
                aiRubricFeedback: JSON.stringify({
                    criteria: [
                        { name: "Code Quality", score: 8, maxScore: 10, feedback: "Well-organized plugin with proper TypeScript types." },
                        { name: "Functionality", score: 8, maxScore: 10, feedback: "Full export pipeline working for all three formats." },
                        { name: "UX", score: 9, maxScore: 10, feedback: "Preview panel is a great addition for validating token output." },
                    ],
                }),
                aiScoredAt: now - 1 * oneDay,
            },
        ];

        const submissionIds: Id<"submissions">[] = [];
        const awardedIndices: number[] = [];

        for (let i = 0; i < submissionDefinitions.length; i++) {
            const def = submissionDefinitions[i];
            const challengeId = challengeIds[def.challengeIdx];

            // Idempotency: check if a submission from this user for this challenge with this repoUrl already exists
            const existingSubmissions = await ctx.db
                .query("submissions")
                .withIndex("by_user", (q) => q.eq("userId", candidateId))
                .collect();

            const existing = existingSubmissions.find(
                (s) => s.challengeId === challengeId && s.repoUrl === def.repoUrl
            );

            if (existing) {
                submissionIds.push(existing._id);
                if (def.status === "awarded") {
                    awardedIndices.push(i);
                }
                continue;
            }

            const submissionData: {
                userId: Id<"users">;
                challengeId: Id<"challenges">;
                repoUrl: string;
                notes: string;
                fileStorageIds: Id<"_storage">[];
                status: "in-review" | "awarded" | "not-selected";
                provisionalScore?: number;
                aiRubricFeedback?: string;
                aiScoredAt?: number;
                score?: number;
                feedback?: string;
                judgedBy?: Id<"users">;
            } = {
                userId: candidateId,
                challengeId,
                repoUrl: def.repoUrl,
                notes: def.notes,
                fileStorageIds: [],
                status: def.status,
            };

            // AI scoring fields (all submissions have these)
            if (def.provisionalScore !== undefined) {
                submissionData.provisionalScore = def.provisionalScore;
            }
            if (def.aiRubricFeedback !== undefined) {
                submissionData.aiRubricFeedback = def.aiRubricFeedback;
            }
            if (def.aiScoredAt !== undefined) {
                submissionData.aiScoredAt = def.aiScoredAt;
            }

            // Judge fields (awarded and not-selected)
            if (def.score !== undefined) {
                submissionData.score = def.score;
            }
            if (def.feedback !== undefined) {
                submissionData.feedback = def.feedback;
            }
            if (def.judgedBy !== undefined) {
                submissionData.judgedBy = def.judgedBy;
            }

            const submissionId = await ctx.db.insert("submissions", submissionData);
            submissionIds.push(submissionId);

            if (def.status === "awarded") {
                awardedIndices.push(i);
            }
        }

        // --- Create 3 badges for the 3 awarded submissions ---
        let totalAwardedScore = 0;

        for (const idx of awardedIndices) {
            const def = submissionDefinitions[idx];
            const submissionId = submissionIds[idx];
            const challengeId = challengeIds[def.challengeIdx];
            const badge = (def as { badge: { name: string; color: string; level: number } }).badge;

            // Idempotency: check if badge already exists for this submission
            const existingBadges = await ctx.db
                .query("badges")
                .withIndex("by_user", (q) => q.eq("userId", candidateId))
                .collect();

            const existingBadge = existingBadges.find(
                (b) => b.submissionId === submissionId
            );

            if (!existingBadge) {
                await ctx.db.insert("badges", {
                    userId: candidateId,
                    submissionId,
                    challengeId,
                    name: badge.name,
                    color: badge.color,
                    level: badge.level,
                    awardedAt: now,
                });
            }

            // Accumulate score from awarded submissions
            if (def.score !== undefined) {
                totalAwardedScore += def.score;
            }
        }

        // --- Update candidate's points to total awarded score ---
        await ctx.db.patch(candidateId, { points: totalAwardedScore });
    },
});
