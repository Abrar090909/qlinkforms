# UPI Forms: Project Guide for Claude

India-first online form builder. Any form can collect UPI, card and netbanking payments on submit. Funds settle directly into the form owner's own Razorpay account (bring your own keys). We never hold money.

I'm Ahmed, building this solo. Keep explanations short and actionable. Ask before adding a major dependency or changing the architecture below.

## Stack
- Next.js (latest stable, App Router), TypeScript strict, Tailwind
- Postgres on Supabase (Mumbai region), Prisma ORM, Supabase Auth (email + Google)
- zod for validation (shared client/server), Vitest for unit tests, Playwright for e2e
- pnpm, current Node LTS, GitHub Actions for CI
- Dev environment: native Windows (no WSL, no Docker). Repo lives at `C:\dev\qlinkforms`, outside OneDrive. Local dev uses a Supabase cloud dev project as the database.

## Non-negotiable rules
1. Money is stored as integer paise (`amount_minor`). Never use floats for money.
2. The server computes every payment amount. Never trust an amount sent by the client.
3. Payment provider secrets are encrypted at rest and never sent to the client or logged.
4. Form submissions are bound to an immutable `form_versions` row.
5. Every table with workspace data gets Row Level Security. Test it.
6. No payment code in Week 1. Create the tables only.
7. Validate all input with zod. Sanitise anything rendered or exported (XSS, CSV formula injection).
8. Never fake test results. Run the commands and show real output.

## Folder structure
```
/
├─ CLAUDE.md
├─ .github/workflows/ci.yml
├─ prisma/
│  ├─ schema.prisma
│  └─ migrations/            # Prisma SQL plus hand-written RLS, grants, triggers
├─ src/
│  ├─ app/
│  │  ├─ (marketing)/        # landing, pricing
│  │  ├─ (auth)/             # login, signup, callback
│  │  ├─ (app)/              # authenticated dashboard + builder
│  │  ├─ f/[slug]/           # public form renderer (later weeks)
│  │  └─ api/
│  ├─ components/ui/         # design system primitives
│  ├─ lib/
│  │  ├─ db.ts               # Prisma client singleton
│  │  ├─ auth.ts             # session helpers
│  │  ├─ env.ts              # zod-validated env vars
│  │  └─ money.ts            # paise helpers
│  ├─ server/                # services (workspaces, forms, payments later)
│  └─ styles/tokens.css      # design tokens
├─ tests/
│  ├─ unit/
│  └─ e2e/
└─ .env.example
```

## Week 1 goal
A deployed skeleton where a user can sign up, log in, create a workspace, and see an empty dashboard. DB schema and RLS in place, design tokens set, CI green.

## Week 1 tasks (do in order, one group at a time, wait for my OK between groups)

### A. Repo and tooling
- Init Next.js + TypeScript strict + Tailwind with pnpm. Add ESLint, Prettier, Vitest, Playwright.
- Add `.env.example` and `src/lib/env.ts` that fails fast on missing vars.
- Add scripts: `dev`, `build`, `lint`, `typecheck`, `test`, `e2e`.

### B. Database
- Set up Prisma against Supabase Postgres. Create `prisma/schema.prisma` with these models (snake_case columns, uuid ids, timestamps):
  - `profiles` (id = Supabase auth user id, email, name)
  - `workspaces` (owner_id, name, plan default 'free')
  - `memberships` (workspace_id, user_id, role: owner|admin|member)
  - `forms` (workspace_id, slug unique, title, status draft|published|archived, current_version_id, theme_id)
  - `form_versions` (form_id, schema_json, created_at; immutable)
  - `submissions` (form_id, form_version_id, answers_json, status, amount_minor, currency default 'INR')
  - `payments` (submission_id, provider, provider_order_id, provider_payment_id, status, amount_minor, fee_minor, raw_json)
  - `payment_accounts` (workspace_id, provider, key_id, secret_encrypted, webhook_secret_encrypted, status)
  - `webhook_events` (provider, event_id unique, payload_json, processed_at)
  - `coupons` (form_id, code, type, value, max_uses, used, expires_at)
  - `files` (submission_id, path, size, mime)
  - `audit_log` (workspace_id, actor_id, action, meta_json)
- Indexes: submissions(form_id, created_at), payments(provider_order_id), forms(workspace_id).
- Write RLS policies as hand-written SQL migrations in `prisma/migrations/` so users only access workspaces they belong to. Add tests that prove isolation between two users.

### C. Auth and workspaces
- Supabase Auth with email + Google. Pages: login, signup, callback, logout.
- On first login, create the `profiles` row and a default workspace + owner membership.
- Proxy (`src/proxy.ts`, Next 16's name for middleware) protects `(app)` routes. Workspace name shown in the header (a single workspace is fine for now).

### D. Design system
- `src/styles/tokens.css`: color, type scale, spacing, radius, shadow tokens. Light and dark via `prefers-color-scheme`.
- Primitives in `components/ui`: Button, Input, Select, Card, Dialog, Toast, EmptyState. Mobile-first, keyboard accessible, WCAG AA contrast.
- Follow `DESIGN.md` in the repo root for all colors, fonts, radii and components. Do not invent design values from memory; if something is missing from `DESIGN.md`, ask me. Take patterns from Typeform, Jotform and Paperform, never their assets, copy or proprietary fonts.

### E. App shell
- Marketing landing placeholder, authenticated dashboard with an empty state ("Create your first form"), and a "New form" button that creates a draft form and routes to a placeholder editor page.

### F. CI and deploy
- GitHub Actions: install, lint, typecheck, unit tests, Prisma validate. Run on every PR.
- Deploy to Vercel (preview per PR). Document env vars in the README.

## Definition of done for Week 1
- `pnpm lint && pnpm typecheck && pnpm test` pass, with real output shown
- RLS isolation tests pass
- Sign up, log in, workspace creation and logout work on the deployed URL, including on a phone viewport
- README has setup steps that work from a clean clone

## How to work with me
- Before each task group: state the plan in a few lines.
- After each task group: list files changed, the commands you ran with real output, and anything I must do manually (Supabase project setup, Google OAuth credentials, Vercel env vars). Give me exact click-by-click steps for those.
- Keep commits small with clear messages.
- If something in this file is wrong or risky, say so instead of working around it.
