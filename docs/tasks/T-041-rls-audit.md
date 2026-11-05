# T-041 — Final RLS audit and workout-log write path

**Phase:** 3 · **Depends on:** T-030–T-040 merged · **Status:** queued

## Goal
A last check that no captain can see or change another captain's data, no player can see another player's data, and that logged sets save instantly and reliably.

## Part 1 — RLS audit
- For every table, view, RPC and storage bucket in `supabase/migrations/0001`–`0040`, list who can select, insert, update and delete, and under which condition. Put the table in the final report.
- Write PGlite tests in `supabase/tests/rls-cross-tenant.test.ts` that try, for two captains A and B and their players:
  - captain B reading or writing A's players, programs, nutrition plans, templates, packages, payments, inbox items, voice notes, custom foods and storage files;
  - player of A reading another player's sessions, set logs, meal logs, check-ins, intake and voice notes;
  - a suspended user doing any write; an anonymous demo user touching real captains' data.
- Fix any real hole in a new migration `0041_rls_hardening.sql` (never edit 0001–0040). If no hole is found, add no migration and say so.
- `SECURITY DEFINER` RPCs flagged by the Supabase advisor are intentional; check that each one checks `auth.uid()` and the caller's role or relationship inside, and fix any that does not.

## Part 2 — Set logging
- Trace the path from tapping "done" on a set to the row in `set_logs`: `saveAndQueue()` in `@/core/offline`, the sync worker, and `sync_set_logs`.
- Confirm the UI updates before any network call, the queue retries offline, and a set is never written twice or lost on reload. Add the missing tests; fix only real bugs.

## Requirements
- No new dependencies. Deterministic tests with injected `now`.

## Acceptance
- [ ] The audit table covers every object; every cross-tenant test passes.
- [ ] `npm run check`, `npm run build` and the perf budget pass.
