# T-158 — One identity check per sync flush

**Phase:** Refactor (blueprint R-04) · **Depends on:** T-157 · **Status:** ready (owner request 2026-11-11)

## Goal
`supabaseTransport` (`src/core/offline/transport.ts`) calls `supabase.auth.getUser()`, a network round trip
to Auth, once per table per flush. Since 5515d56a a flush runs on every save, so a player tapping through a
workout makes several Auth calls per tap. Check the identity once per flush.

## Files
- `src/core/offline/transport.ts`, `sync.ts`, `runner.ts`, `index.ts`
- `src/features/player-shell/components/sync-runner.tsx` and any other caller of `supabaseTransport`
- Tests in `src/core/offline`
- This task card

## Requirements
1. One identity check per `flushOutbox` run, made before the first table is sent and only when there is
   something to send. Keep `auth.getUser()` as the check (do not switch to `getClaims()`: whether the
   project uses asymmetric signing keys is not verified).
2. Keep both local guards exactly as strict as today: `localDb().userId === owner` is still checked before
   every table is sent, and a mismatch still throws "Sync account changed" and sends nothing.
3. If the identity check fails or returns another user, nothing is sent in that flush and no entry is
   parked or has its attempts burned beyond what happens today.
4. The media queue's own identity check in `runner.ts` is unchanged.
5. Tests: a three-table flush makes exactly one auth call; a flush with an empty outbox makes none; an
   account change between flushes is still caught; the existing account-change tests pass unchanged.
6. No behavior change otherwise; no new dependency, no migration, no budget change.

## Acceptance
- [x] The tests above pass with the existing offline suite green.
- [ ] `npx tsc --noEmit -p .`, `npx eslint .`, `npm run audit:release`, `npx vitest run`, `npm run build`,
  then `npx vitest run src/lib/perf-budget.test.ts` all pass.

## Out of scope
- Parking and table isolation (T-157), server changes.

## Implementation notes
- The callable transport exposes an optional `beforeSend` identity check. `flushOutbox` caches
  its promise for that run, including rejection, and starts it only for a nonempty send.
- Per-table local ownership checks and the media queue identity check are retained.
- Offline verification: 7 files, 69 tests pass using native config loading and thread workers.
- Full suite with the same runner options: 441 files pass, 3178 tests pass; the sole failure
  is `src/lib/perf-budget.test.ts` reading a missing build chunk. Typecheck and ESLint pass.
- Release acceptance remains unchecked: this environment blocks child processes with `EPERM`
  (release audit's Git subprocess and the build's TypeScript worker). The interrupted build
  also leaves bundle statistics referring to missing chunks, so the performance gate cannot pass.
