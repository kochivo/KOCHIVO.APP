# T-157 — A row the server rejects must not block sync for ever

**Phase:** Refactor (blueprint R-03) · **Depends on:** 5515d56a · **Status:** ready (owner request 2026-11-11)

## Goal
Today `sendBatch` in `src/core/offline/sync.ts` treats every error alike: the batch is retried with backoff
for ever, and `flushOutbox` returns on the first failing table, so one permanently rejected row stops every
later table, even unrelated ones. The player keeps seeing "saved" and nothing reaches the captain. Park the
rejected row, let unrelated tables keep syncing, and tell the player.

## Files
- `src/core/offline/sync.ts`, `transport.ts`, `runner.ts`, `outbox.ts`, `tables.ts`, `db.ts` (types only),
  `index.ts`
- `src/ui/sync-pill.tsx`, `src/ui/messages.ts`
- The places that render `SyncPill` (find them; the player home is one) and the hook or query that feeds it
- Tests: `src/core/offline/sync.test.ts`, `runner.test.ts`, and a pill test in `src/ui`
- This task card

## Requirements
1. **Classify errors in the transport.** `supabaseTransport` throws an error that carries the Postgres /
   PostgREST code and a `permanent` flag. Permanent: SQLSTATE `42501`, class `22` and class `23`.
   Everything else (network failure, 5xx, `PGRST301`, `40001`, unknown) is transient. "Sync account
   changed" stays transient and must keep its current behavior.
2. **Park.** A permanently rejected outbox entry is marked parked and is not retried on its own. An entry
   that failed 12 times in a row for transient reasons is parked too. The local row is kept. Do this
   **without a Dexie schema version bump**: the outbox store's indexes do not change; a non-indexed
   `parked` field plus a far-future `next_attempt_at` is enough. State in the notes how an existing
   installed client behaves.
3. **A batch with one bad row.** The server RPC is all-or-nothing per call. When a batch fails permanently,
   retry its rows one at a time in the same flush so only the offending rows are parked and the good ones
   are sent. Keep the revision check that protects a row re-saved while a request is in flight.
4. **Table isolation.** Replace "stop at the first failing table" with a dependency map: `set_logs`
   depends on `workout_sessions`; no other table depends on another (verify against `SYNC_ORDER` and the
   migrations, and extend the map if you find a real foreign key). A failing or parked parent blocks only
   its dependants; when a parent row is parked, its dependent rows are not sent and not counted as failures
   that burn their attempts.
5. **Un-park.** Saving the row again (`saveAndQueue`) un-parks it. A `retryParked(db)` function un-parks
   everything for the current user and announces an outbox write so the runner flushes at once.
6. **Tell the player.** `SyncPill` gets an `attention` state: translated text (Egyptian Arabic, short
   English) saying some entries were not sent, with a retry button of at least 48px that calls
   `retryParked`. `pendingCount` keeps counting parked entries; add `parkedCount`. `attention` wins over
   `pending` and `synced`, not over `offline`. Tokens only, logical properties only.
7. **Report once.** When an entry is parked, report it to Sentry once through the project's existing
   capture path and scrubber, with the table name and error code only. Never the row, the message text or
   the user id. Find how other client code reports (`@/core/observability` or similar); do not import the
   Sentry SDK into `core/offline` if that grows a player route's first-load bundle — load it lazily.
8. Deterministic tests with an injected `now` and a fake transport:
   - `42501` on `workout_sessions` parks that row; `meal_logs` in the same flush is still sent;
   - `set_logs` for a parked session are held, and are sent after the session is re-saved and accepted;
   - one bad row in a batch of 50 parks only that row;
   - 12 transient failures park the entry; the 11th does not;
   - a re-save un-parks; `retryParked` un-parks and triggers a flush;
   - "Sync account changed" never parks;
   - the pill renders the attention state and its button in ar and en.
9. No behavior change for the happy path; the 30-second tick, the write-triggered flush and media sync stay
   as they are. No migration, no new dependency, no budget change.

## Acceptance
- [x] The tests above pass, with the existing offline suite unchanged and green.
- [x] `npx tsc --noEmit -p .`, `npx eslint .`, `npm run audit:release`, `npx vitest run`, `npm run build`,
  then `npx vitest run src/lib/perf-budget.test.ts` all pass.

## Out of scope
- The per-table `auth.getUser()` call in `transport.ts` (card T-158 changes it next; leave that line as is).
- Server changes, captain-side screens, any file under `src/app`.

## Implementation notes
- Transport errors preserve their code and classify only `42501`, `22*`, and `23*` as permanent.
  Permanent batches are retried individually; revision checks protect concurrent saves on both paths.
- Parking uses an optional non-indexed field and `Number.MAX_SAFE_INTEGER` as the retry time, with no
  Dexie version change. Installed clients upgrade in place; existing entries without `parked` remain
  eligible. Older running code also skips parked entries until a re-save resets the retry time, but
  cannot show attention or offer explicit retry until the updated client is loaded.
- Verified the queued tables' foreign keys: only `set_logs` references another queued table,
  `workout_sessions`. A queued parent holds only child rows referencing its ID, including during backoff;
  held entries retain their attempts. Unrelated tables continue. Remaining batches of a failed table
  stay queued for a later flush, preserving the existing partial-batch contract.
- Re-save and explicit retry clear parking and attempts; explicit retry increments revisions and
  announces the existing write event. Runner scheduling and media sync are unchanged.
- Parking reports use a lazy SDK import through the existing configured Sentry capture/scrubber path.
  Each newly parked entry produces one capture with a fixed error and table/code tags only.
- Home, nutrition and workout pills observe parked counts and offer translated retry; offline takes
  precedence. Existing pending counts include parked entries and local rows remain intact.
- Initial verification: TypeScript and ESLint exit 0; release audit 1773 tracked files, 0 findings;
  full Vitest 440 files passed, 1 skipped / 3167 tests passed, 1 skipped; production build exit 0;
  completed-build budget guard 1 test passed. The full suite ran before the successful build with
  `.next` absent. Independent read-only review found no important issues.
- Windows child-process restrictions require the documented native-loader/thread Vitest fallback,
  shell-supplied Git file-list audit workaround, and a temporary build preload enabling worker threads
  and the TypeScript API checker. Static generation used placeholder public Supabase URL/key values.
  Default commands hit `spawn EPERM`; all fallback checks passed without changing repository config.
  Temporary verification helpers were removed.
- Review follow-up: dependencies now name the child foreign key; only children referencing queued
  parent IDs are held. Regression cases cover parked, backing-off and newly failed S1 alongside an
  already synced S2. TypeScript and ESLint exit 0; offline/UI Vitest passes 30 files and 173 tests
  using the native-loader/thread fallback after the default loader hit `spawn EPERM`.
