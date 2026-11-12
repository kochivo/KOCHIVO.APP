# T-213: Bring captain routes back under the first-load budget, with headroom (CI red on staging, 2026-11-13)

**Phase:** v6 fixes · **Status:** ready · **Migration:** none · **Rules:** follow AGENTS.md in full.
- No new deps. No behaviour or visual change.
- Do not raise any budget in `src/lib/perf-budget.test.ts`, and do not add an `exceptions` entry.
- No Get-Content/Set-Content. Do not commit.

## Why
GitHub `Checks` failed on staging at `498d97d2`. A clean CI-like build gives:
`/[locale]/captain/players/[playerId]/nutrition: expected 310.04 to be ≤ 310` (gzip KiB).

Last passing commit `1aa31892` vs now, measured in clean builds:

| Route | Before | Now | Budget |
|---|---|---|---|
| captain player nutrition | 308.05 | 310.04 | 310 |
| captain player programs | 304.52 | 305.81 | 310 |
| `/captain` | 297.24 | 297.91 | 310 |
| `/player` | 292.01 | 292.68 | 300 |
| `/c/[slug]` | 194.46 | 199.13 | 200 |

Commits in between: T-204 (player nutrition editor), T-207 (packages/offers screens), T-202 (captain home), T-208 (pricing, renewal requests, tier badge), and a T-202 follow-up.

T-210 (pending) adds roster nav messages, so layout-wide growth is coming. We need real headroom.

## What to do
1. Find what each route gained since `1aa31892`. Use A/B clean builds (`git stash` or a scratch checkout). Report module-level causes, not guesses.
   Usual suspects, from past fixes:
   - a client file importing a feature barrel, which pulls in the barrel's whole graph;
   - message dictionaries pulled into the captain layout (`notifications`, `roster` nav);
   - server-only data reached from client code;
   - large icon sets imported eagerly.
2. Fix the causes with the patterns this repo already uses:
   - import the leaf module instead of the barrel;
   - add a `server.ts`-style leaf;
   - use `next/dynamic` for UI that opens on demand (sheets, dialogs, rarely used panels);
   - move tiny shared pieces to `src/ui`.
3. Targets in a clean build with the CI env:
   - captain player nutrition ≤ 307 KiB;
   - `/c/[slug]` ≤ 197 KiB;
   - every other route unchanged or smaller.

## Acceptance
- [ ] Table of before and after sizes for the routes above, plus the cause of each gain.
- [ ] `npx vitest run src/lib/perf-budget.test.ts` passes after a fresh `npm run build`.
- [ ] Flag-off output unchanged. No UI or behaviour change.
- [ ] `npm run check` and `npm run build` pass; summary lines pasted.

## CI env for the build
```
NEXT_PUBLIC_SUPABASE_URL=https://hkgaercmtdmoksrhzcya.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_5XZ3UcX0qeI0RpgJ3kBcuQ_pqPEeZ3R
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BII-sbmPmyH4vMDFh8tm3VPPzQOV3H5MHt_J3zv7duLu66LNpyhvc9TsLy4Htrs8gb_W1l6b6DodnhYtBBb4cVI
NEXT_TELEMETRY_DISABLED=1
```
These are public values, already committed in `.github/workflows/checks.yml`.

## Out of scope
- Any visual or copy change.
- T-210, T-211 and T-212 work.
