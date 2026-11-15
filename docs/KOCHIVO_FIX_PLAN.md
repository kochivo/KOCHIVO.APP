# KOCHIVO — fix plan (from KOCHIVO_FULL_AUDIT.md)

Rules for every fix:

- the smallest targeted change;
- a regression test that fails before the fix;
- additive migrations only;
- no production data changes.

No migration goes to production without the owner's yes. Code-only fixes ship with the next staging push, also on the owner's yes.

## Wave 1 — HIGH (in progress)

| Card | Finding | Change | Migration | Needs owner approval for |
|---|---|---|---|---|
| T-289 | DB-01 purge blocked by forms | Purge cleans the forms graph before deleting users | 0112 (function replace) | Applying 0112 to production |
| T-290 | SEC-06 old chat audio readable by new captain; SEC-07 answers after transfer | Narrow `voice_notes_read` to exact chat or voice rows; current-link check on answers and photos; start gate scoped to current captain | 0113 (policy and function replace) | Applying 0113 (it changes who can read storage) |
| T-291 | BL-01 player sees both day types | Snapshot carries `day_type`, time and unit; screen filters by day type | none | The staging push |

## Wave 2 — MEDIUM with live impact (next, after wave 1 lands)

| Card | Finding | Change | Migration |
|---|---|---|---|
| T-292 | DB-02 / BL-02 template copy drops metadata | Replace the 3 nutrition copy functions with full column lists | 0114 |
| T-293 | BUG-01 KO edits vs `set_plan` | Resize or update `set_plan` with sets and reps; include it in the stale check | 0115 |
| T-294 | BUG-02 dangling alternatives | Delete guard raises 23503 so the archive fallback runs | 0115 (same file as T-293 or its own) |
| T-295 | BL-04 assessments missing from Home and Tasks | Load requests in `loadTasks()` and keep kind `request` | none |
| T-296 | DB-03 duplicate logical sessions vs PT credits | Deduplicate the PT deduction on `(player, day, date)` inside the RPC | 0116 |

## Wave 3 — needs a design decision (ask the owner first)

| Finding | Why it waits |
|---|---|
| DB-04 form save not atomic | Architectural: a new `save_form` RPC replaces the multi-request action |
| BL-03 cardio-only day completion | New player action and UI |
| PERF-01 inbox N+1 | A new batch RPC; worth it when rosters pass about 30 players |
| PERF-02 forms library | Batching; low urgency at 11 forms |
| BUG-03 export completeness | Product decision on what the export must contain |
| DB-05 history name snapshot | Schema design change |

## Wave 4 — LOW and configuration

| Item | Owner action or card |
|---|---|
| CFG-01 leaked password protection | **Owner:** Supabase dashboard → Auth → enable it (one toggle) |
| SEC-08 timezone helper | Card: checked wrapper plus internal function |
| PERF-03 duplicate indexes | Card: drop 2 indexes |
| PERF-04 advisor items | Review the 16 FKs and 4 initplan policies in one card |
| CFG-03 `pg_net` in public | Leave it; moving it can break cron calls. Note only |
| DEP-01 Sentry tooling advisories | Upgrade with the next Sentry major (owner decision pending) |
| e2e drift | Update `e2e/public.spec.ts` selectors after T-284 |

## Status log

| Date | Card | Status |
|---|---|---|
| 2026-11-15 | T-289, T-290, T-291 | Dispatched to Codex (C, D, E) |
| 2026-11-15 | T-289 | Committed c0177132. Migration 0112 written and tested, **not applied** |
| 2026-11-15 | T-291 | Committed 045828e3. Code only; ships with the next staging push |
| 2026-11-15 | T-290 | Committed 47289225. Migration 0113 written and tested, **not applied**. Review also closed an audio re-attach gap: a new voice-note or chat row must point at the sender's own upload. Live check: all 7 private objects have `owner_id` set, so the rule holds on production |
