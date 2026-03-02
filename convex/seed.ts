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
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;

        const challengeDefinitions = [
            {
                title: "Build an AI Code Reviewer",
                summary: "Create a tool that reviews PRs using an LLM and posts structured feedback as inline comments.",
                difficulty: "advanced" as const,
                tags: ["AI", "developer-tools", "LLM"],
                prize: "$2,000 + Badge",
                overview: `We're looking for developers to build an intelligent code review tool that integrates with GitHub Pull Requests. The tool should analyze diffs, understand context from the broader codebase, and post helpful, structured feedback as inline PR comments.

This is a real problem we face at BuildFast — our engineering team spends 30% of their time on code reviews, and much of that is catching patterns that an LLM could flag automatically. The winning submission will ship as an internal tool.

**What we're looking for:**
- GitHub App or Action that triggers on PR events
- LLM-powered analysis of code diffs with context awareness
- Structured feedback posted as inline comments (not just a wall of text)
- Support for at least 3 languages (TypeScript, Python, Go)
- Configurable review rules (security, performance, style)`,
                problemStatement: `Build a GitHub integration that automatically reviews Pull Requests using a Large Language Model. Your solution must:

1. **Trigger on PR events** — new PR, updated PR, or review requested
2. **Analyze the diff** — parse changed files, understand additions/deletions in context
3. **Generate structured feedback** — produce per-file, per-line comments with severity levels (info, warning, error)
4. **Post as inline comments** — use the GitHub API to post review comments at specific line positions
5. **Be configurable** — allow repo owners to set rules, ignored paths, and review focus areas via a config file

**Evaluation criteria:**
- Quality and relevance of generated feedback (40%)
- Code architecture and maintainability (25%)
- GitHub integration robustness (20%)
- Documentation and setup experience (15%)

**Constraints:**
- Must work with any OpenAI-compatible API (OpenAI, Anthropic, local models)
- Must handle repos up to 10,000 lines changed per PR
- Must complete review within 60 seconds for typical PRs`,
                sponsorId: sponsor1Id,
                deadline: now + 14 * oneDay, // 2 weeks
            },
            {
                title: "Real-Time Collaboration Editor",
                summary: "Build a Google Docs-style collaborative text editor with CRDTs, rich text, and live cursors.",
                difficulty: "expert" as const,
                tags: ["real-time", "algorithms", "collaboration"],
                prize: "$3,000 + Badge",
                overview: `Collaborative editing is one of the hardest problems in distributed systems. We want you to build a real-time collaborative text editor that multiple users can edit simultaneously — think Google Docs, but open source and self-hostable.

This challenge tests your understanding of conflict-free replicated data types (CRDTs), WebSocket communication, rich text editing, and presence awareness. The winning submission will demonstrate mastery of distributed systems fundamentals.

**What we're looking for:**
- Rich text editing (bold, italic, headings, lists, code blocks)
- Real-time collaboration with < 100ms perceived latency
- Live cursor and selection indicators for each collaborator
- Offline support with automatic sync on reconnection
- Clean, well-documented architecture`,
                problemStatement: `Build a collaborative rich text editor that supports real-time multi-user editing. Your solution must:

1. **Rich text support** — bold, italic, headings (H1-H3), bullet/numbered lists, code blocks, and links
2. **Real-time sync** — changes from any user appear on all other users' screens within 100ms on LAN
3. **Conflict resolution** — use CRDTs (Yjs, Automerge) or OT to handle concurrent edits without data loss
4. **Presence indicators** — show each user's cursor position and selection with a unique color and name label
5. **Offline resilience** — queue changes when disconnected, merge cleanly on reconnection

**Evaluation criteria:**
- Correctness of conflict resolution under concurrent edits (35%)
- Quality of the editing experience and rich text support (25%)
- Architecture and code quality (20%)
- Performance with 10+ concurrent users (10%)
- Documentation and demo quality (10%)

**Constraints:**
- Must use WebSockets (not polling) for real-time communication
- Must handle documents up to 50,000 words
- Frontend must work in Chrome, Firefox, and Safari
- No Firebase or other managed real-time databases — build the sync layer yourself`,
                sponsorId: sponsor1Id,
                deadline: now + 45 * oneDay, // 6.5 weeks
            },
            {
                title: "Accessibility Audit Dashboard",
                summary: "Design a WCAG audit tool with visual score breakdowns, trend tracking, and actionable fix suggestions.",
                difficulty: "intermediate" as const,
                tags: ["design", "accessibility", "UX"],
                prize: "$1,500 + Badge",
                overview: `Web accessibility is a legal requirement and a moral imperative, yet most teams don't have visibility into their compliance status. We want a dashboard that scans websites, generates WCAG compliance reports, and provides actionable guidance.

BuildFast serves enterprise clients who require WCAG 2.1 AA compliance. We need a tool our QA team can use to audit pages, track compliance over time, and generate reports for stakeholders.

**What we're looking for:**
- URL-based scanning with WCAG 2.1 AA/AAA rule checks
- Visual score breakdown by category (perceivable, operable, understandable, robust)
- Issue list with severity, affected element, and fix suggestion
- Historical trend tracking (score over time)
- Export to PDF or CSV for stakeholder reports`,
                problemStatement: `Build a web accessibility audit dashboard. Your solution must:

1. **URL scanning** — accept a URL, crawl the page, and run automated WCAG 2.1 checks
2. **Score breakdown** — display an overall accessibility score (0-100) with category-level breakdowns
3. **Issue details** — list each violation with its WCAG criterion, severity (critical/serious/moderate/minor), the affected HTML element, and a plain-English fix suggestion
4. **Trend tracking** — store scan history and show a line chart of score changes over time
5. **Beautiful UI** — the dashboard itself must be fully accessible (practice what you preach)

**Evaluation criteria:**
- Accuracy and coverage of WCAG rule checks (30%)
- Quality of fix suggestions and developer experience (25%)
- UI/UX design and data visualization (25%)
- Accessibility of the dashboard itself (20%)

**Constraints:**
- Use axe-core, Lighthouse, or Pa11y as the scanning engine (don't reinvent the wheel)
- Must handle pages with JavaScript-rendered content (SPA support)
- Dashboard must score 95+ on its own audit
- Must work for at least 5 pages per scan`,
                sponsorId: sponsor1Id,
                deadline: now + 21 * oneDay, // 3 weeks
            },
            {
                title: "CLI Task Manager with AI",
                summary: "Build a terminal-native task manager that uses AI to auto-prioritize, estimate effort, and suggest next actions.",
                difficulty: "beginner" as const,
                tags: ["CLI", "AI", "productivity"],
                prize: "$500 + Badge",
                overview: `We believe the best productivity tools meet developers where they already work — the terminal. Build a CLI task manager that goes beyond simple todo lists by using AI to help developers prioritize their work and estimate time.

This is a beginner-friendly challenge, but don't let that fool you — a polished CLI tool with thoughtful AI integration can be incredibly impressive. We want something developers would actually install and use daily.

**What we're looking for:**
- Fast, responsive terminal UI (TUI) or clean command-line interface
- Task CRUD with projects, tags, priorities, and due dates
- AI-powered features: auto-prioritization, effort estimation, or smart suggestions
- Local-first data storage (SQLite, JSON, or similar)
- Thoughtful UX: keyboard shortcuts, color coding, tab completion`,
                problemStatement: `Build a CLI task manager with AI-powered features. Your solution must:

1. **Task management** — create, list, update, complete, and delete tasks with title, description, priority, tags, and due date
2. **Project organization** — group tasks into projects, filter and sort by any field
3. **AI integration** — at least ONE of the following:
   - Auto-prioritize tasks based on due date, dependencies, and context
   - Estimate effort/time for tasks based on description
   - Suggest what to work on next based on current context
4. **Persistent storage** — tasks survive terminal restarts (use SQLite, JSON file, etc.)
5. **Good DX** — helpful error messages, --help flags, and ideally shell completions

**Evaluation criteria:**
- Usefulness and daily-driver potential (30%)
- Quality of AI integration (25%)
- Code quality and project structure (25%)
- Documentation and ease of installation (20%)

**Constraints:**
- Must be installable via npm, pip, cargo, or go install (one command)
- Must work on macOS and Linux
- AI features must work with at least one free API (OpenAI free tier, Ollama, etc.)
- Response time for non-AI commands must be under 200ms`,
                sponsorId: sponsor2Id,
                deadline: now + 10 * oneDay, // 10 days
            },
            {
                title: "AI-Powered Resume Parser",
                summary: "Parse unstructured resumes (PDF/DOCX) into structured JSON with skill extraction, experience mapping, and confidence scores.",
                difficulty: "intermediate" as const,
                tags: ["AI", "NLP", "data"],
                prize: "$1,000 + Badge",
                overview: `Acme Corp processes thousands of resumes monthly. Our recruiters waste hours manually extracting information from inconsistently formatted documents. We need an AI-powered parser that can turn any resume into clean, structured data.

The key challenge is handling the massive variety of resume formats — multi-column layouts, creative designs, international formats, and various file types. Your parser should handle them all gracefully.

**What we're looking for:**
- PDF and DOCX file upload support
- Structured JSON output with contact info, education, experience, skills, and certifications
- Confidence scores for each extracted field
- Handling of non-standard layouts (multi-column, creative, international)
- Batch processing capability`,
                problemStatement: `Build an AI-powered resume parser that converts unstructured resumes into structured JSON. Your solution must:

1. **File support** — accept PDF and DOCX files, handle scanned PDFs (OCR)
2. **Structured extraction** — output JSON with these fields:
   - Contact: name, email, phone, location, LinkedIn, GitHub
   - Experience: array of {company, title, startDate, endDate, description, skills_used}
   - Education: array of {institution, degree, field, graduationDate, GPA}
   - Skills: array of {name, category, proficiency_level}
   - Certifications: array of {name, issuer, date}
3. **Confidence scores** — each extracted field should have a 0-1 confidence score
4. **Batch API** — support processing multiple resumes via a REST API endpoint
5. **Accuracy** — achieve 85%+ extraction accuracy on a provided test set of 20 resumes

**Evaluation criteria:**
- Extraction accuracy across diverse resume formats (40%)
- Code architecture and API design (25%)
- Handling of edge cases (gaps, international formats, creative layouts) (20%)
- Documentation and test coverage (15%)

**Constraints:**
- Must use an LLM for extraction (not regex-based)
- Must process a single resume in under 10 seconds
- Must handle resumes in English (bonus: other languages)
- API must return valid JSON conforming to the provided schema`,
                sponsorId: sponsor2Id,
                deadline: now + 30 * oneDay, // 1 month
            },
            {
                title: "Design System Tokenizer",
                summary: "Build a Figma plugin that extracts design tokens and exports them to Tailwind config, CSS custom properties, and SCSS variables.",
                difficulty: "advanced" as const,
                tags: ["design", "developer-tools", "Figma"],
                prize: "$2,500 + Badge",
                overview: `The gap between design and code is one of the biggest sources of friction in product development. Designers define colors, spacing, typography, and shadows in Figma — but developers have to manually translate those into code. This challenge is about bridging that gap automatically.

Acme Corp maintains a design system used by 12 product teams. Every time our design team updates tokens in Figma, developers spend days updating code. We want a Figma plugin that exports tokens directly to the formats our engineers use.

**What we're looking for:**
- Figma plugin that reads styles, variables, and components
- Export to multiple formats: Tailwind config, CSS custom properties, SCSS variables
- Preview panel showing generated code before export
- Diff view showing what changed since last export
- Support for theming (light/dark mode token sets)`,
                problemStatement: `Build a Figma plugin that extracts design tokens and exports them to developer-ready formats. Your solution must:

1. **Token extraction** — read from Figma:
   - Colors (fills, strokes) → color tokens
   - Text styles (font family, size, weight, line height) → typography tokens
   - Effects (shadows, blurs) → shadow tokens
   - Spacing (auto layout gaps and padding) → spacing tokens
2. **Multi-format export** — generate valid output for:
   - Tailwind CSS config (tailwind.config.js theme extension)
   - CSS custom properties (:root { --color-primary: ... })
   - SCSS variables ($color-primary: ...)
3. **Preview panel** — show generated code in-plugin before exporting
4. **Change detection** — highlight tokens that changed since last export
5. **Theme support** — handle light/dark mode as separate token sets

**Evaluation criteria:**
- Completeness of token extraction (30%)
- Quality of generated code output (25%)
- Plugin UX and preview experience (25%)
- Architecture and extensibility (20%)

**Constraints:**
- Must use the Figma Plugin API (not REST API)
- Must handle files with 500+ styles without crashing
- Generated Tailwind config must be valid and directly usable
- Must work with Figma's new Variables feature (not just legacy styles)`,
                sponsorId: sponsor2Id,
                deadline: now + 60 * oneDay, // 2 months
            },
        ];

        const challengeIds: Id<"challenges">[] = [];

        for (const { sponsorId, deadline, ...challenge } of challengeDefinitions) {
            const existing = await ctx.db
                .query("challenges")
                .filter((q) => q.eq(q.field("title"), challenge.title))
                .first();

            if (existing) {
                // Update existing challenge with new content
                await ctx.db.patch(existing._id, { ...challenge, deadline });
                challengeIds.push(existing._id);
            } else {
                const id = await ctx.db.insert("challenges", {
                    ...challenge,
                    sponsorId,
                    status: "open",
                    deadline,
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
