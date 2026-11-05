# T-097 — Release hygiene gate (no secrets, no debug pages, no stray files)

**Phase:** V1 ops · **Status:** ready (owner 2026-11-05: "every release must pass a real review: no hardcoded values, no passwords or credentials, no test/debug files in production")

## Audit result (reviewer, 2026-11-05)
- **Clean:**
  - no tracked `.env*` except `.env.example`
  - no secret patterns in tracked files
  - no `console.log` in `src/`
  - no public source maps; `/.env` returns 404
  - the CI env block only holds public browser values
- **Found:** the dev component gallery `src/app/[locale]/dev/ui/page.tsx` is **live in production** (`https://kochivo.site/ar/dev/ui` returns 200). It only has `robots: noindex`.

## Changes
1. **Lock dev routes.**
   - Every page under `src/app/[locale]/dev/` calls `notFound()` unless `process.env.NODE_ENV === 'development'`. Put this in a `layout.tsx` for the `dev` segment so future dev pages inherit it.
   - Add a test that the layout calls `notFound` in production and renders children in development.
2. **`scripts/release-audit.mjs`** (Node, no dependencies), with the scanning rules in a pure module `scripts/release-audit-rules.mjs` that is unit-tested from `src/lib/release-audit.test.ts` or a colocated test the vitest config picks up.
   - Runs over `git ls-files` and fails with a clear list (`file:line rule`) when it finds:
     - a tracked `.env*` other than `.env.example`, or a non-empty value in `.env.example` for a key whose name contains `SECRET`, `SERVICE_ROLE`, `PRIVATE`, `PASSWORD` or `TOKEN`
     - secret-looking strings in any tracked text file:
       - JWTs (`eyJ…` with 3 long segments)
       - `sb_secret_`, `sk_live_`, `sk_test_`
       - private key blocks (`-----BEGIN … PRIVATE KEY`)
       - AWS `AKIA…`, GitHub `ghp_`/`github_pat_`, Sentry `sntrys_`, Resend `re_` keys, Turnstile secrets (`0x4AAAAAAA` followed by a secret-length value)
       - Public values are allowed: `sb_publishable_`, `NEXT_PUBLIC_*` values in `.github/workflows/checks.yml`, and the VAPID public key.
     - in `src/` non-test files: `console.log`, `debugger`, a hex color in `.tsx` (allow-list only `src/app/[locale]/layout.tsx` theme-color), or a hardcoded Supabase project ref/URL (`*.supabase.co`)
     - in test files: `.only(` (`it.only`, `describe.only`, `test.only`)
     - an `src/app` route segment named `dev`, `debug`, `test` or `playground` without the production `notFound()` guard from step 1
     - stray tracked files: `*.log`, `*.bak`, `*.orig`, `*.tmp`, root-level images (`/*.png`, `/*.jpg`), `playwright-report/`, `test-results/`, `supabase/.temp/`
   - Add `"audit:release": "node scripts/release-audit.mjs"` to `package.json` and include it in `check` (`typecheck && lint && audit:release && test`).
   - Add a `npm run audit:release` step to `.github/workflows/checks.yml` before the tests.
   - Add `supabase/.temp/` to `.gitignore`.
   - Tests:
     - each rule catches a planted sample and passes a clean sample
     - the public allow-list values pass
     - the current repo passes (run the scanner on `git ls-files` in a test, or document that `npm run check` does)
3. **`docs/RELEASE-CHECKLIST.md`**: the manual review the reviewer does before every «انشر» ("publish"), short and ordered:
   - diff reviewed against the card
   - gates green (tsc, eslint, audit:release, vitest, build, perf)
   - new migrations: numbered, RLS + test, checked against production data first, applied before the code that needs them
   - edge functions redeployed if changed
   - Supabase security advisor has no new findings
   - after deploy: release sha live, `x-vercel-id` fra1, Sentry quiet for 15 minutes
   - no secrets pasted in chat, PRs or commits
   - Link it from `AGENTS.md` §7 in one line ("Before publish, follow docs/RELEASE-CHECKLIST.md"). AGENTS.md edits are limited to that one line.

## Out of scope
- Rotating any key.
- Rewriting git history.
- Changing CSP or security headers.

## Acceptance
- [ ] `npm run audit:release` passes on the repo and fails on planted samples (tests).
- [ ] `/ar/dev/ui` is 404 in a production build (`npm run build && npm start` locally, or a unit test of the guard).
- [ ] Gates: `npx tsc --noEmit -p .`, `npx eslint .`, `npm run audit:release`, `npm run build`, `npx vitest run --maxWorkers=2`.
