# EliteBuilders

**Build. Ship. Get Recognized.**

EliteBuilders is a developer competition and hiring platform where candidates solve real-world coding challenges posted by companies, receive AI-powered scoring, earn badges, climb leaderboards, and get recognized by employers. Think **LeetCode meets portfolio builder** with real-world challenges sponsored by companies.

---

## Features

### For Candidates
- **Browse & Filter Challenges** — search by difficulty, company, season, and tags
- **GitHub Integration** — connect GitHub, select repos, auto-analyze your profile
- **AI-Powered Scoring** — submissions scored automatically by Gemini AI against rubric criteria
- **Personalized Recommendations** — AI matches your GitHub profile to challenges you'd excel at
- **Badges & Leaderboard** — earn badges, track your career score, compete on seasonal leaderboards
- **Save for Later** — bookmark challenges to revisit them
- **Public Profile** — showcase badges, skills, and submission history
- **Real-time Updates** — see scoring status, notifications, and rankings update live

### For Sponsors (Companies)
- **Apply to Become a Sponsor** — submit an application reviewed by platform admins
- **Create Challenges** — post coding challenges with custom rubrics and prizes
- **Standardized Testing** — link a GitHub template repo + upload hidden test files for automated grading
- **Draft & Publish Workflow** — save drafts, iterate, then publish when ready
- **Assign Judges** — select from available judges at challenge creation
- **View Submissions** — see candidate profiles, AI scores, and detailed test results (pass/fail per test, output logs)
- **Express Interest** — reach out to top candidates directly
- **Analytics** — track challenge engagement and submission quality

### For Judges
- **Review Console** — dedicated queue of submissions assigned to you
- **Score & Award** — review AI feedback, run tests, then award badges or provide feedback
- **Test Results** — see automated test execution results alongside code

### For Admins
- **Sponsor Application Review** — approve or reject sponsor applications with email notifications
- **Invite System** — generate secure invite tokens for sponsors and judges (auto-emails invite links)
- **Platform Challenges** — create challenges as the EliteBuilders platform itself
- **Role Management** — promote users to sponsor/judge/admin roles

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 16 (App Router) | Server Components, React Compiler, proxy middleware |
| **Language** | TypeScript (strict mode) | End-to-end type safety |
| **Backend** | Convex | Reactive database, serverless functions, real-time subscriptions |
| **Auth** | Clerk | Authentication, user management, webhook sync |
| **AI** | Google Gemini | Automated scoring, profile analysis, challenge recommendations |
| **Sandbox** | E2B | Automated test execution with hidden test injection |
| **UI** | shadcn/ui (New York) | Radix primitives + Tailwind CSS v4 |
| **Email** | Resend | Transactional emails (awards, scoring, weekly digest) |
| **Charts** | Recharts | Sponsor analytics and dashboards |
| **Icons** | Lucide React | Consistent icon system |

---

## Architecture

```
                          ┌──────────────────────┐
                          │     Clerk Auth       │
                          │  (Webhooks + JWT)    │
                          └──────────┬───────────┘
                                     │
┌──────────────────┐     ┌───────────▼───────────┐     ┌──────────────────┐
│                  │     │                       │     │                  │
│   Next.js 16    │◄───►│    Convex Backend     │◄───►│   Gemini AI      │
│   App Router    │     │   (Reactive DB +      │     │   (Scoring +     │
│   + React       │     │    Serverless Fns)    │     │    Recommendations│
│   Compiler      │     │                       │     │    + Analysis)   │
│                  │     └───┬───────────┬───────┘     └──────────────────┘
└──────────────────┘         │           │
                        ┌────▼──┐   ┌────▼────┐   ┌──────────┐
                        │GitHub │   │ Resend  │   │   E2B    │
                        │ API   │   │ Email   │   │ Sandbox  │
                        └───────┘   └─────────┘   └──────────┘
```

**Key architectural decisions:**

1. **Convex for real-time** — live leaderboards, instant submission status, reactive queries
2. **AI scoring is provisional** — Gemini evaluates 5 rubric criteria; scores are provisional until a human judge reviews
3. **Hybrid testing** — visible tests in public template repos + hidden tests injected during sandbox execution
4. **Sponsor applications** — candidates apply to become sponsors; admins approve/reject with email notifications
5. **Invite-only judge roles** — judges join via admin-generated invite tokens (auto-emailed)
6. **Route groups** — `(public)` pages get horizontal nav; `(auth)` pages get sidebar + topnav
7. **React Compiler** — automatic memoization, no manual `useMemo`/`useCallback`

---

## Getting Started

### Prerequisites

- **Node.js 20+** and npm
- **Clerk account** — [clerk.com](https://clerk.com)
- **Convex account** — [convex.dev](https://convex.dev)

### Installation

```bash
# Clone the repository
git clone https://github.com/yogi100x/elite-builders.git
cd elitebuilders

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
```

### Environment Variables

Create `.env.local` with:

```env
# Clerk (required)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
CLERK_WEBHOOK_SECRET=whsec_...

# Convex (required)
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud

# GitHub (required for repo analysis)
GITHUB_TOKEN=ghp_...
```

Set these in the **Convex dashboard** (not `.env.local`):

```
GEMINI_API_KEY=...           # Google AI Studio API key
GEMINI_SCORING_MODEL=...     # Optional, defaults to gemini-3-flash
RESEND_API_KEY=re_...        # Resend email API key
E2B_API_KEY=...              # Optional, enables sandbox test execution
```

### Running Locally

```bash
# Terminal 1: Start Convex backend (watches for changes)
npx convex dev

# Terminal 2: Start Next.js dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Seeding Data

To populate initial challenges for development:

1. Open the Convex dashboard at [dashboard.convex.dev](https://dashboard.convex.dev)
2. Navigate to **Functions** > **seed** > **seedChallenges**
3. Click **Run**

### Related Repositories

| Repository | Purpose | Link |
|---|---|---|
| **Challenge Template** | Reference template for sponsors to set up standardized testing (visible + hidden tests) | [elitebuilders-challenge-template](https://github.com/yogi100x/elitebuilders-challenge-template) |
| **Example Submission** | Sample candidate submission for the User API Design Challenge (used for end-to-end testing) | [api-challenge-submission-test](https://github.com/yogi100x/api-challenge-submission-test) |

---

## Project Structure

```
elitebuilders/
├── src/
│   ├── app/
│   │   ├── (public)/              # Unauthenticated pages
│   │   │   ├── page.tsx           # Landing page (hero + top challenges)
│   │   │   ├── challenges/        # Browse & filter challenges
│   │   │   │   └── [id]/          # Challenge detail + leaderboard
│   │   │   └── leaderboard/       # Global leaderboard with period + season filters
│   │   ├── (auth)/                # Authenticated pages (sidebar layout)
│   │   │   ├── dashboard/         # Candidate dashboard + AI recommendations
│   │   │   ├── judge/             # Judge review console
│   │   │   ├── sponsor/           # Sponsor portal (create challenges, view subs)
│   │   │   ├── admin/             # Admin invite management
│   │   │   └── onboarding/        # Post-signup profile setup
│   │   └── api/                   # Route handlers (webhooks, proxies)
│   ├── components/                # Shared React components
│   ├── lib/                       # Utilities, constants, GitHub client
│   └── proxy.ts                   # Clerk auth middleware
├── convex/                        # Backend (reactive DB + serverless functions)
│   ├── schema.ts                  # Database schema (9 tables)
│   ├── users.ts                   # User CRUD, role management
│   ├── challenges.ts              # Challenge lifecycle
│   ├── submissions.ts             # Submission pipeline, judge workflow
│   ├── badges.ts                  # Badge system, leaderboards
│   ├── aiScoring.ts               # Gemini-powered scoring pipeline
│   ├── recommendations.ts         # AI challenge recommendations
│   ├── email.ts                   # Email actions (awards, digest)
│   ├── crons.ts                   # Weekly digest cron job
│   └── lib/                       # Backend utilities (auth, email, GitHub)
└── public/                        # Static assets
```

---

## User Roles & Flows

### Candidate Journey
1. **Sign up** via Clerk → complete onboarding (GitHub connect, skills, bio)
2. **Browse challenges** → filter by difficulty, company, season
3. **Submit solution** → select GitHub repo, add deck/video links
4. **AI scores submission** → provisional score + rubric feedback within minutes
5. **Judge reviews** → final score, badge awarded or feedback provided
6. **Earn badges** → climb leaderboard, build public profile
7. **Get noticed** → sponsors express interest, download candidate packets

### Sponsor Journey
1. **Receive admin invite** → accept token, complete sponsor profile
2. **Create challenge** → define rubric, set prize, assign judges
3. **Review submissions** → view AI scores, candidate profiles, test results
4. **Express interest** → reach out to top candidates

### Submission Pipeline

```
Candidate submits
    ↓
convex/submissions.create
    ↓
Schedule: aiScoring.scoreSubmission (Gemini)
    ├── Analyzes README, file tree, commits, topics
    ├── Produces provisional score + rubric feedback
    ├── Schedule: sandbox.runTests (E2B)
    │   ├── Clone repo, inject hidden tests
    │   ├── Run npm test, parse results
    │   └── Store pass/fail counts + verbose output
    ├── Send scoring email notification
    └── Schedule: badges.grantFirstBuild
    ↓
Judge reviews (award or reject)
    ├── Award: create badge, send email, update points
    └── Reject: send feedback email
    ↓
Auto-badges: checkMilestones (Active Builder, etc.)
```

### Standardized Testing

Sponsors can set up automated test execution for their challenges using the **hybrid testing system**:

1. **Create a template repo** — fork the [EliteBuilders Challenge Template](https://github.com/yogi100x/elitebuilders-challenge-template) on GitHub
2. **Add visible tests** — basic functionality tests candidates can see and run locally
3. **Write hidden tests** — edge cases and validation tests uploaded to EliteBuilders (not in the repo)
4. **Link in challenge form** — paste template repo URL, upload hidden test files, set custom test command
5. **Automated scoring** — sandbox clones candidate repo, injects hidden tests, runs test suite, reports results

---

## Database Schema

| Table | Purpose | Key Indexes |
|-------|---------|-------------|
| `users` | All platform users with roles and profiles | `by_clerk_id`, `by_email` |
| `sponsors` | Company profiles linked to sponsor users | `by_user` |
| `challenges` | Coding challenges with rubrics and seasons | `by_sponsor`, `by_status`, `search_challenges` |
| `submissions` | Candidate solutions with AI + judge scores | `by_challenge`, `by_user`, `by_status` |
| `badges` | Earned badges with levels and colors | `by_user`, `by_challenge` |
| `notifications` | In-app notification system | `by_user`, `by_user_unread` |
| `invites` | Admin-generated invite tokens | `by_email`, `by_token` |
| `recommendationCache` | Cached AI recommendations (24h TTL) | `by_user` |
| `challengeBookmarks` | Saved/bookmarked challenges | `by_user`, `by_user_challenge` |

---

## AI Integration

### Scoring Pipeline (`convex/aiScoring.ts`)
- Evaluates submissions against 5 rubric criteria (or custom sponsor rubric)
- Default criteria: Technical Implementation (40pts), Problem Understanding (20pts), Innovation (20pts), Documentation (10pts), Completeness (10pts)
- Enhanced context: passes file tree, recent commits, repo topics, and stars/forks to Gemini alongside README and description
- Produces a provisional 0-100 score with per-criterion JSON feedback
- Real-time status tracking: `pending` → `scoring` → `scored`/`failed`

### Sandbox Test Execution (`convex/sandbox.ts`)
- Runs candidate code in an isolated E2B sandbox with 2-minute timeout
- Clones candidate repo, installs dependencies, injects sponsor's hidden tests into `__tests__/hidden/`
- Parses test results via JSON output (with fallback regex parsing for non-JSON runners)
- Captures verbose test output + stderr for full diagnostics
- Results (pass/fail counts + detailed output) stored on the submission record and visible to sponsors/judges

### Challenge Recommendations (`convex/recommendations.ts`)
- Analyzes candidate's GitHub repos via Gemini at onboarding
- Matches candidate profile (languages, frameworks, domains) to open challenges
- 24-hour cache with background refresh
- Returns top 3-5 matches with match score and reasoning

### GitHub Profile Analysis (`convex/github.ts`)
- Analyzes 10 most recent repos for language/framework detection
- Generates structured skill profile via Gemini
- Stored as `users.githubProfile` JSON string

---

## Email Notifications

| Event | Template | Preference Toggle |
|-------|----------|-------------------|
| Badge awarded | Award congratulations with score | `awardNotifications` |
| Submission rejected | Feedback from judge | `rejectionNotifications` |
| AI scoring complete | Provisional score notification | `scoringNotifications` |
| Sponsor interest | Company reached out | `sponsorInterest` |
| Weekly digest | New challenges, badges, rank | `weeklyDigest` |

Weekly digest runs every **Monday at 9:00 AM UTC** via Convex cron job.

---

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server (port 3000) |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npx convex dev` | Start Convex backend (watches for changes) |
| `npx convex deploy` | Deploy Convex to production |

---

## Deployment

### Frontend — Vercel
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to `main`

### Backend — Convex Cloud
1. Set environment variables in [Convex dashboard](https://dashboard.convex.dev)
2. Deploy: `npx convex deploy`
3. Auto-deploys when `npx convex dev` detects changes locally

### Clerk Webhooks
Configure a Svix webhook endpoint in Clerk dashboard pointing to:
```
https://your-domain.vercel.app/api/webhooks/clerk
```
Subscribe to events: `user.created`, `user.updated`

---

## Design System

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#2563EB` | Buttons, links, brand accents |
| Success | `#10B981` | Awards, positive states |
| Warning | `#F59E0B` | Deadlines, caution states |
| Error | `#EF4444` | Errors, rejections |
| Achievement | `hsl(258, 90%, 66%)` | Badge highlights |

**Fonts:** Inter (body), Space Grotesk (headings), JetBrains Mono (code)

**Dark mode:** Supported via `next-themes` with CSS variable swap.

---

## Recent Changes

### Sponsor Applications & Admin Approval
- Candidates now apply to become sponsors via `/become-sponsor` (org name, website, industry, description)
- Admins review pending applications in the Invites page (tabbed: Applications + Invites)
- Approve → auto-promotes role, creates sponsor profile, sends approval email + in-app notification
- Reject → sends rejection email with reason + in-app notification

### Invite Emails
- Admin-created invites now auto-send email with the invite link (no more manual copy-paste)
- Emails include role, organization name, and direct accept link

### Enhanced AI Scoring
- Gemini now receives expanded context: file tree structure, recent commits with messages, repo topics, stars/forks
- README context increased from 2000 to 4000 characters
- Added scoring guidance section in prompt for more consistent evaluations

### Hybrid Standardized Testing
- Sponsors can link a GitHub template repo with visible tests for candidates
- Hidden test files uploaded to Convex storage and injected during sandbox scoring
- Sandbox captures verbose test output, stderr, and parses JSON or regex-based results
- Test results (pass/fail counts + detailed logs) visible to sponsors and judges
- Candidates see only processing status and final judge-approved score
- Challenge seed includes a fully configured "User API Design Challenge" with template and hidden tests

### Template Repository
- Published [elitebuilders-challenge-template](https://github.com/yogi100x/elitebuilders-challenge-template) as a GitHub template
- Includes visible tests, hidden test examples, reference solution, and comprehensive sponsor guide
- Sponsor dashboard links to the template with setup instructions

---

## License

This project is proprietary. All rights reserved.
