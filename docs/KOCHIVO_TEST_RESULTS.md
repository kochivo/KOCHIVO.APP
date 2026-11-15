# KOCHIVO — test results (production-readiness audit, 2026-11-15)

Only checks that actually ran are marked passed or failed. Everything else is BLOCKED or NOT TESTED, with the reason.

## 1. Project gates (local, commit 76bed9c0)

| Check | Result |
|---|---|
| `npm run build` (Next 16.4 Turbopack, Google fonts mocked offline) | PASSED |
| `npm run check` (typecheck + lint + Vitest + PGlite + perf budgets) | PASSED: 867 test files, 5336 tests |
| Route bundle budgets (public 200 KB, player 300, captain 310, demo 280) | PASSED (part of `check`) |

## 2. Audit test runs

| Run | Scope | Result |
|---|---|---|
| Security audit, targeted Vitest | 19 files: cross-tenant, content ownership, auth roles, captain approval, suspension, storage, history, forms, assessments, invites, notifications, body scans, chat, receipts, money owed | PASSED: 137 tests |
| Database audit, targeted Vitest | 9 files: settings, custom forms, nutrition, receipts, security fixes, suspension, content isolation, points, PT packages | PASSED: 82 tests |
| Full migration replay 0001–0110 in PGlite | Final schema built in order | PASSED |
| PGlite reproduction probes (inline, no files) | DB-01, DB-02, DB-03, SEC-06, SEC-07, SEC-08, PERF-03 | 7 defects REPRODUCED |
| A full `supabase/tests` run inside the security audit | — | INTERRUPTED; not counted (the full suite passes inside `npm run check` above) |

## 3. Live production checks (read-only)

All were run as `begin; set local role authenticated; set request.jwt.claims …; select …; rollback;`, or as plain catalog reads. Nothing was written.

| Check | Result |
|---|---|
| Captain A reads captain B's data (about 25 tables) | PASSED: 0 rows |
| Player reads only their own rows | PASSED |
| Anon reads only the published package catalog | PASSED |
| Anon cannot call `save_nutrition_plan` | PASSED |
| Migration 0110 applied (2 new columns, 3 savers, `ko_feed` +7 days) | PASSED |
| pg_cron: 10 jobs, failures in the last 7 days | PASSED: 0 failures |
| Accounts waiting for deletion / overdue | 0 / 0 (DB-01 not triggered yet) |
| Duplicate logical workout sessions | 0 (DB-03 not triggered yet) |
| Players with more than one captain | 0 (SEC-06/07 not triggered yet) |
| `voice_notes_read` policy text | Matches the SEC-06 finding |
| Supabase security and performance advisors | See audit section 3 (leaked password protection off, `pg_net` in public, anon sign-in on, 16 unindexed FKs, 13 unused indexes, 29 multi-policy tables, 4 initplan) |
| **Write isolation on production** (rolled-back UPDATE/DELETE as another user) | **BLOCKED**: refused by the session safety policy. Covered in PGlite instead |
| Multi-captain player isolation on production | **BLOCKED**: no such player exists. Covered in PGlite |

## 4. Dependencies

| Check | Result |
|---|---|
| `npm audit` | 5 moderate, 0 high, 0 critical. All in Sentry build tooling (not shipped to the browser) |

## 5. End-to-end (Playwright, local dev server)

| Spec | Result |
|---|---|
| `e2e/public.spec.ts` | 5 PASSED, 3 FAILED. The 3 failures are stale selectors written before the T-284 landing redesign (the language switch and hero text moved); the features exist. Test drift, not a product bug |
| Captain, player, offline-sync and demo specs | **BLOCKED**: they need signed-in test accounts or anon demo users in the real database. Creating accounts needs the owner's permission |

## 6. Not tested

- **Hosted Supabase Auth settings:** OAuth allowlist, email/OTP templates and Auth rate limits. They are dashboard-only.
- **Real-device push notifications and offline replay on a phone.**
- **Load testing:** not run against production, by rule.
- **Distributed rate limiting on the KO endpoint across Vercel instances.**

## 7. Regression tests added by the fixes

Filled in when each fix lands (see `docs/KOCHIVO_FIX_PLAN.md`).
