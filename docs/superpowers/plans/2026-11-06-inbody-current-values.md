# InBody Current Values Implementation Plan

**Goal:** Show the latest recorded metrics immediately and keep comparisons secondary.
**Architecture:** Fix `ScanMetrics` display selection; preserve existing delta functions and player-scoped query. Supply the existing production-compatible RLS predicate as a tested reference SQL file.
**Tech Stack:** React, Vitest SSR, Supabase JS, Postgres RLS, PGlite.
**Spec:** `docs/tasks/T-109-inbody-current-values.md`.

## Review focus

One measurement; missing individual metrics; equal measurements; first-to-latest versus adjacent comparison; captain isolation and pre-relationship history.

- [x] Write and run failing SSR regressions for current metric values with one/multiple records.
- [x] Make primary values use the latest record and label the captain block as latest measurements; leave comparison thresholds unchanged.
- [x] Verify the query returns the selected player's records/target even when the authenticated user is the captain, and retains self fallback for players.
- [x] Supply SQL for `public.body_scans`, preserving `captain_since` and restrictive suspension policy. Run it twice in a local test database and verify coach isolation/history restrictions.
- [x] Run focused tests, full `npm run check`, production build, visual check, and independent review.

Hosted inspection confirmed `body_scans` exists (not `inbody_records`), RLS and authenticated SELECT are enabled, and `body_scans_coach` uses the relationship-start predicate. No hosted mutation.

## Verification record

- RED: five real SSR assertions failed against the original captain view, including a first scan showing `—` rather than `90` and two scans showing `-2` rather than `88` as the primary weight.
- GREEN: 44 focused tests passed across metrics, selected-player loading, deltas, picker behavior, SQL snippet, existing body-scan policies, and historical access boundaries.
- Browser: one sample scan shows 82.4kg, 35.2kg muscle, and 18.5% fat; only comparison text requests another measurement. Preview fixture removed afterward.
- SQL snippet was applied twice only to an isolated PGlite database; no hosted mutation.
- Independent review: no Important/Critical findings. Existing suspension policies are preserved; existing full-suite RLS tests cover that protection.
- `npm run check`: passed, 375 test files / 2585 tests; typecheck, lint, and release audit passed. `npm run build`: passed, 49 static pages. `git diff --check`: passed.
- Temporary preview is absent from source and the production route table. Owner subsequently approved commit and publication on 2026-11-06. No hosted SQL mutation is needed: the verified coach policy already exists.
