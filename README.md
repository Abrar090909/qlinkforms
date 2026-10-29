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

Documented in `.env.example`. Full deploy notes come in Week 1, group F.
