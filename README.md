# UPI Forms

India-first form builder that collects UPI, card and netbanking payments on submit. See `CLAUDE.md` for the project guide, `DESIGN.md` for the design system and `docs/technical-plan.md` for the plan.

## Setup (WSL2)

Keep the repo inside the Linux filesystem (for example `~/qlinkforms`), not under `/mnt/c`.

```bash
# Node LTS via nvm, pnpm via corepack
nvm install        # reads .nvmrc
corepack enable
pnpm install

cp .env.example .env.local   # then fill in real values
pnpm dev                     # http://localhost:3000
```

The server refuses to start if a required env var is missing and lists which ones (see `src/lib/env.ts`).

## Scripts

| Script           | What it does                               |
| ---------------- | ------------------------------------------ |
| `pnpm dev`       | Dev server                                 |
| `pnpm build`     | Production build                           |
| `pnpm lint`      | ESLint                                     |
| `pnpm typecheck` | Generate route types, then `tsc --noEmit`  |
| `pnpm test`      | Vitest unit tests (`tests/unit`)           |
| `pnpm e2e`       | Playwright, mobile + desktop (`tests/e2e`) |
| `pnpm format`    | Prettier write                             |

First-time e2e setup: `pnpm exec playwright install chromium` and `sudo pnpm exec playwright install-deps chromium`.

## Environment variables

Documented in `.env.example`. Full deploy notes come in Week 1, group F.
