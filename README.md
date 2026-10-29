# UPI Forms

India-first form builder that collects UPI, card and netbanking payments on submit. See `CLAUDE.md` for the project guide, `DESIGN.md` for the design system and `docs/technical-plan.md` for the plan.

## Setup

Needs Node 24+ and pnpm 10 (`npm install -g pnpm`). Works on Windows, macOS and Linux. On Windows, keep the repo outside OneDrive (for example `C:\dev\qlinkforms`).

```bash
pnpm install
cp .env.example .env.local   # then fill in real values
pnpm db:migrate               # apply migrations to your Supabase database
pnpm dev                     # http://localhost:3000
```

The server refuses to start if a required env var is missing and lists which ones (see `src/lib/env.ts`).

## Scripts

| Script             | What it does                                            |
| ------------------ | ------------------------------------------------------- |
| `pnpm dev`         | Dev server                                              |
| `pnpm build`       | Production build                                        |
| `pnpm lint`        | ESLint                                                  |
| `pnpm typecheck`   | Generate route types, then `tsc --noEmit`               |
| `pnpm test`        | Vitest unit tests (`tests/unit`)                        |
| `pnpm test:db`     | RLS and DB tests against the real database (`tests/db`) |
| `pnpm e2e`         | Playwright, mobile + desktop (`tests/e2e`)              |
| `pnpm db:migrate`  | Apply pending migrations (`prisma migrate deploy`)      |
| `pnpm db:status`   | Show which migrations are applied                       |
| `pnpm db:validate` | Validate `prisma/schema.prisma`                         |
| `pnpm format`      | Prettier write                                          |

## Database

Schema: `prisma/schema.prisma`. Migrations: `prisma/migrations/`. Prisma generates SQL for tables; Row Level Security, grants, triggers and check constraints are hand-written SQL migrations in the same folder, so one command (`pnpm db:migrate`) applies everything in order.

Changing the schema:

1. Edit `prisma/schema.prisma`.
2. `pnpm exec prisma migrate dev --create-only --name <change>` and review the SQL. New tables get no Data API access until you add `grant` statements and RLS policies to that migration.
3. `pnpm db:migrate`, then `pnpm test:db`.

Prisma connects as the table owner and bypasses RLS, so server code must always scope queries to a workspace the user belongs to. `pnpm test:db` runs inside a transaction that is rolled back; it leaves no data behind.

First-time e2e setup: `pnpm exec playwright install chromium`.

## Environment variables

All variables are server-only (none has a `NEXT_PUBLIC_` prefix), so nothing is bundled into the browser. The app refuses to start if a required one is missing.

| Variable                    | Where it comes from                                                                                                                                                                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SITE_URL`                  | The app's own URL, no trailing slash, for auth redirect links. `http://localhost:3000` locally. **Don't set it on Vercel**: production uses the project's production domain and previews their branch URL (`resolveSiteUrl` in `src/lib/env.ts`). |
| `SUPABASE_URL`              | Supabase > Project Settings > Data API > Project URL                                                                                                                                                                                              |
| `SUPABASE_PUBLISHABLE_KEY`  | Supabase > Project Settings > API Keys > `sb_publishable_...`                                                                                                                                                                                     |
| `DATABASE_URL`              | Supabase > Connect > ORMs > Prisma, the port **6543** line (pooled)                                                                                                                                                                               |
| `DIRECT_URL`                | Same screen, the port **5432** line. Used by migrations.                                                                                                                                                                                          |
| `E2E_EMAIL`, `E2E_PASSWORD` | Optional, local only: a confirmed test user for the signed-in e2e tests (see below).                                                                                                                                                              |

## End-to-end tests

`pnpm e2e` starts the dev server and runs every test on a phone and a desktop viewport. The signed-in tests (`tests/e2e/app.spec.ts`) skip unless `E2E_EMAIL` and `E2E_PASSWORD` are set:

1. Supabase > Authentication > Users > **Add user** > **Create new user**.
2. Enter an email and password, tick **Auto Confirm User**, click **Create user**.
3. Add `E2E_EMAIL=...` and `E2E_PASSWORD=...` to `.env.local`.

Against a deployed URL: `E2E_BASE_URL=https://your-app.vercel.app pnpm e2e`.

## CI

`.github/workflows/ci.yml` runs on every pull request and every push to `main`: format check, lint, typecheck, unit tests and `prisma validate`. It needs no secrets.

The `Database and RLS tests` job runs `pnpm test:db` too when the repository has `DATABASE_URL` and `DIRECT_URL` secrets (GitHub > repo > Settings > Secrets and variables > Actions). Without them it skips with a notice.

## Deploy (Vercel)

Pushes to `main` deploy to production; every pull request gets a preview URL. Functions run in `dub1` (`vercel.json`), next to the current Supabase project in eu-west-1. Move both to Mumbai (`bom1` and ap-south-1) when the production database is created.

First-time setup:

1. vercel.com > **Add New** > **Project** > import the `qlinkforms` GitHub repo. Framework: Next.js (auto-detected). Leave build settings as they are.
2. Add `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `DATABASE_URL` and `DIRECT_URL` in one go: Settings > Environment Variables, paste the four lines from `.env.local`, environments **Production** and **Preview**, mark them **Sensitive**, Save. Then redeploy.
3. Supabase > Authentication > URL Configuration:
   - **Site URL**: the production URL, for example `https://qlinkforms.vercel.app`.
   - **Redirect URLs**: add `https://qlinkforms.vercel.app/**` and, for previews, `https://qlinkforms-*-<your-vercel-team>.vercel.app/**`.
4. Database migrations are not run by the deploy. Run `pnpm db:migrate` against the target database before merging a change that adds one.

Google sign-in needs no change per deploy: Google redirects to Supabase, and Supabase redirects to the app.
