# EliteBuilders

A developer competition and hiring platform where candidates solve sponsor-posted coding challenges, receive AI-powered scoring via Gemini, earn badges, climb leaderboards, and get recognized by employers. Think "LeetCode meets portfolio builder" with real-world challenges sponsored by companies.

## Tech Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Runtime | Node.js | 20.x | Development and build |
| Framework | Next.js | 16.x | App Router, RSC, proxy middleware |
| Language | TypeScript | 5.x | Strict mode enabled |
| Backend | Convex | 1.x | Reactive database, serverless functions, file storage |
| Auth | Clerk | 6.x | Authentication, user management, webhooks |
| AI | Google Gemini | — | Automated submission scoring via `@google/generative-ai` |
| UI | shadcn/ui (New York) | — | Radix primitives + Tailwind v4 |
| Styling | Tailwind CSS | 4.x | Utility-first, CSS variables theming |
| Forms | React Hook Form + Zod | — | Validation and form state |
| Charts | Recharts | 3.x | Sponsor analytics |
| Toasts | Sonner | 2.x | **Not** shadcn useToast — use `toast()` from `sonner` |
| Icons | Lucide React | — | Icon library |

## Quick Start

```bash
# Prerequisites: Node 20+, npm

# Install dependencies
npm install

# Set environment variables (copy and fill in values)
cp .env.example .env.local

# Start Convex backend + Next.js dev server
npx convex dev    # Terminal 1: Convex backend
npm run dev       # Terminal 2: Next.js frontend

# Seed challenge data (run in Convex dashboard or CLI)
# Navigate to Convex dashboard → Functions → seed.seedChallenges → Run
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk frontend key |
| `CLERK_SECRET_KEY` | Yes | Clerk backend key |
| `CLERK_WEBHOOK_SECRET` | Yes | Svix verification for Clerk webhooks |
| `NEXT_PUBLIC_CONVEX_URL` | Yes | Convex deployment URL |
| `CONVEX_DEPLOY_KEY` | Yes | Convex production deploy key |
| `GITHUB_TOKEN` | Yes | GitHub API access for repo analysis |
| `GEMINI_API_KEY` | Convex env | Set in Convex dashboard, not `.env.local` |
| `GEMINI_SCORING_MODEL` | Convex env | Optional override (default: `gemini-3-flash`) |
| `RESEND_API_KEY` | Convex env | Email delivery via Resend |

## Project Structure

```
elitebuilders/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout (fonts, Providers wrapper)
│   │   ├── providers.tsx           # Clerk + Convex + ThemeProvider + Toaster
│   │   ├── globals.css             # Tailwind v4 theme (brand colors, fonts)
│   │   ├── (public)/               # Unauthenticated pages
│   │   │   ├── layout.tsx          # PublicNav (horizontal nav)
│   │   │   ├── page.tsx            # Landing page (hero + top challenges)
│   │   │   ├── challenges/         # Browse & filter challenges
│   │   │   └── leaderboard/        # Public leaderboard
│   │   ├── (auth)/                 # Authenticated pages (sidebar + topnav)
│   │   │   ├── layout.tsx          # Sidebar + Topnav shell
│   │   │   ├── dashboard/          # Candidate dashboard
│   │   │   ├── judge/              # Judge review console
│   │   │   ├── sponsor/            # Sponsor portal (challenges, submissions)
│   │   │   ├── admin/              # Admin invite management
│   │   │   ├── onboarding/         # Post-signup onboarding
│   │   │   └── login/              # Login page
│   │   └── api/
│   │       ├── webhooks/clerk/     # Clerk webhook handler (user sync)
│   │       ├── github/repos/       # GitHub repo listing proxy
│   │       └── sponsor/            # Sponsor packet download
│   ├── components/
│   │   ├── ui/                     # shadcn/ui primitives (do not edit directly)
│   │   ├── layout/                 # Navigation: public-nav, sidebar, topnav
│   │   ├── challenge-card.tsx      # Challenge display card
│   │   ├── challenge-grid.tsx      # Grid with preloaded query support
│   │   ├── submission-form.tsx     # Submission with GitHub repo selector
│   │   ├── judge-panel.tsx         # Judge scoring interface
│   │   ├── badge-display.tsx       # Badge grid with confetti animation
│   │   ├── leaderboard-table.tsx   # Ranked table with podium highlighting
│   │   └── sponsor-chart.tsx       # Recharts analytics
│   ├── lib/
│   │   ├── utils.ts                # cn(), formatDeadline(), formatScore()
│   │   ├── constants.ts            # Difficulty colors, badge levels, upload limits
│   │   ├── email.ts                # Client-side email helpers
│   │   └── github/                 # GitHub API client + GraphQL queries
│   └── proxy.ts                    # Clerk middleware (route protection)
├── convex/
│   ├── schema.ts                   # Database schema (7 tables)
│   ├── users.ts                    # User CRUD, role management, Clerk sync
│   ├── challenges.ts               # Challenge CRUD, sponsor-scoped queries
│   ├── submissions.ts              # Submission pipeline, judge award/reject
│   ├── badges.ts                   # Badge system, leaderboard queries
│   ├── autoBadges.ts               # Automated rank-based badge awarding
│   ├── aiScoring.ts                # Gemini-powered submission evaluation
│   ├── invites.ts                  # Admin invite system (sponsor/judge)
│   ├── notifications.ts            # In-app notification management
│   ├── sponsors.ts                 # Sponsor profile management
│   ├── email.ts                    # Email actions (award, rejection notices)
│   ├── github.ts                   # GitHub repo analysis action
│   ├── seed.ts                     # Challenge seeding for development
│   └── lib/
│       ├── auth.ts                 # requireAuth() helper with role checking
│       ├── email.ts                # Convex-compatible Resend via fetch()
│       └── github.ts               # Convex-compatible GitHub API via fetch()
├── public/                         # Static assets
└── [config files]                  # tsconfig, eslint, next.config, etc.
```

## Architecture Overview

EliteBuilders follows a **three-layer architecture**: Next.js frontend (App Router) → Convex reactive backend → external services (Clerk, Gemini, GitHub, Resend).

**Authentication flow:** Clerk handles all auth. A Svix-verified webhook at `/api/webhooks/clerk` syncs user records to Convex on `user.created`/`user.updated`. The `src/proxy.ts` file (Next.js 16 middleware) protects authenticated routes using `clerkMiddleware` with a public route allowlist.

**Data flow:** Public pages use `preloadQuery()` for server-side data fetching (RSC). Authenticated pages use `useQuery()` and `useMutation()` from `convex/react` for real-time reactivity. All Convex mutations validate auth via `requireAuth()` in `convex/lib/auth.ts`.

**Submission pipeline:** Candidate submits → Convex `submissions.create` → schedules `aiScoring.scoreSubmission` (Gemini evaluates against rubric) → schedules `badges.grantFirstBuild` (first submission badge) → judge reviews and awards/rejects.

```
┌──────────┐   Clerk Auth   ┌───────────┐   Reactive   ┌──────────┐
│  Next.js │ ─────────────▶ │  Convex   │ ───────────▶ │  Gemini  │
│  App     │ ◀───────────── │  Backend  │ ◀─────────── │  AI      │
└──────────┘   Real-time    └───────────┘   Scoring    └──────────┘
                              │       │
                         ┌────┘       └────┐
                    ┌────▼───┐       ┌─────▼───┐
                    │ GitHub │       │ Resend  │
                    │ API    │       │ Email   │
                    └────────┘       └─────────┘
```

### User Roles

| Role | Access | Key Pages |
|------|--------|-----------|
| `candidate` | Browse challenges, submit solutions, view dashboard | `/dashboard`, `/challenges/[id]/submit` |
| `sponsor` | Create challenges, view submissions, award badges | `/sponsor`, `/sponsor/challenges/[id]/submissions` |
| `judge` | Review submissions, score and award/reject | `/judge` |
| `admin` | Manage invites, assign roles | `/admin/invites` |

### Database Tables

7 tables in `convex/schema.ts`: `users`, `sponsors`, `challenges`, `submissions`, `badges`, `notifications`, `invites`.

## Development Guidelines

### File Naming
- Component files: **kebab-case** (`challenge-card.tsx`, `badge-display.tsx`, `public-nav.tsx`)
- UI primitives: **kebab-case** in `src/components/ui/` (shadcn convention)
- Convex modules: **camelCase** (`aiScoring.ts`, `autoBadges.ts`)
- Lib utilities: **camelCase** (`utils.ts`, `constants.ts`)
- Next.js special files: **lowercase** (`page.tsx`, `layout.tsx`, `route.ts`)

### Code Naming
- React components: **PascalCase** (`export function ChallengeCard()`)
- Functions/variables: **camelCase** (`requireAuth`, `formatDeadline`, `listByUser`)
- Constants: **SCREAMING_SNAKE_CASE** (`MAX_UPLOAD_SIZE_BYTES`, `DIFFICULTY_COLORS`)
- Convex exports: **camelCase** (`export const listPublic = query({...})`)
- Types: use `Doc<"tableName">` from Convex, `Id<"tableName">` for IDs

### Import Order
1. React/Next.js imports (`"use client"` directive first if present)
2. External packages (`convex/react`, `sonner`, `zod`, `lucide-react`)
3. Internal absolute imports (`@/components/...`, `@/lib/...`, `@/convex/...`)
4. Relative imports (`./repo-selector`)
5. Type imports (`import type { Doc } from ...`)

### Path Aliases
- `@/*` → `./src/*`
- `@/convex/*` → `./convex/*`

### Convex Runtime Constraints
- **Cannot import from `src/`** — Convex runs in its own V8 isolate
- All backend utilities must live in `convex/` or use npm packages
- `convex/lib/email.ts` uses raw `fetch()` against Resend API (no SDK)
- `convex/lib/github.ts` uses raw `fetch()` against GitHub REST API (no Octokit)
- External API calls must be in `action` or `internalAction` (not `mutation`/`query`)

### Auth Pattern
- All Convex mutations/queries use `requireAuth(ctx)` or `requireAuth(ctx, "role")`
- Admin role bypasses role checks (admin can access sponsor/judge endpoints)
- Clerk webhook at `/api/webhooks/clerk/route.ts` syncs users to Convex

### Toast Notifications
- Use `import { toast } from "sonner"` — **never** use shadcn `useToast`
- Toaster component is in `src/app/providers.tsx`

### Middleware
- Next.js 16 uses `src/proxy.ts` (not `middleware.ts`)
- Public routes defined via `createRouteMatcher` allowlist

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server (port 3000) |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npx convex dev` | Start Convex backend (watches for changes) |
| `npx convex deploy` | Deploy Convex to production |

## Deployment

- **Frontend:** Vercel (Next.js)
- **Backend:** Convex Cloud (auto-deployed on `npx convex deploy`)
- **Convex env vars** (GEMINI_API_KEY, RESEND_API_KEY) are set in the Convex dashboard, not in `.env.local`

### Design System
- **Fonts:** Inter (body/`--font-sans`), Space Grotesk (headings/`--font-display`), JetBrains Mono (code/`--font-mono`)
- **Brand colors:** primary `#2563EB`, success `#10B981`, warning `#F59E0B`, error `#EF4444`, achievement `hsl(258 90% 66%)`
- **Dark mode:** Supported via `next-themes` with `class` strategy and CSS variable swap in `globals.css`
- **shadcn style:** `new-york` variant, base color `neutral`, Radix primitives
- **Transitions:** Custom easing `cubic-bezier(0.4, 0, 0.2, 1)` and `--radius-card: 8px`

### Component Patterns
- Props interfaces follow `[ComponentName]Props` naming (`ChallengeCardProps`, `JudgePanel` `Props`)
- Components use named exports (`export function ChallengeCard`), not default exports
- `"use client"` directive only on components that need interactivity; pages default to RSC
- Convex data fetched via `preloadQuery()` in RSC pages, `useQuery()` in client components

## Git Conventions
- **Never add co-author lines** to commit messages
- Prefer concise commit messages describing the "why"

## Key Design Decisions

1. **Convex over Supabase/Prisma:** Chosen for real-time reactivity (live leaderboards, instant submission status updates) and serverless simplicity (no infrastructure management).
2. **AI scoring is provisional:** Gemini evaluates 5 rubric criteria (Technical Implementation 40pts, Problem Understanding 20pts, Innovation 20pts, Documentation 10pts, Completeness 10pts). Scores are provisional until a human judge overrides.
3. **Invite-only sponsor/judge roles:** Admins create invite tokens; accepting an invite promotes the user's role and creates sponsor profiles automatically.
4. **Route groups `(public)` vs `(auth)`:** Clean separation of layout shells — public pages get horizontal nav, authenticated pages get sidebar + topnav.
5. **React Compiler enabled:** `next.config.ts` has `reactCompiler: true` for automatic memoization (Next.js 16 feature).
