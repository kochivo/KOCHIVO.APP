# T-421 — Weekly check-in survives offline (offline queue)

**Phase:** fix · **Depends on:** none · **Status:** ready

## Goal
A player can fill in the weekly check-in in the gym with no signal and never lose it: the check-in is saved on the device at once, its photos are kept on the device and uploaded when the player is back online, and the captain receives it exactly once. Today `submitCheckIn()` refuses offline outright and a failed insert after photo upload orphans the photos and forces the player to re-enter everything.

## Design decisions (read first — they are load-bearing)
1. **Stable id, insert-only sync.** The check-in id is `stableId('checkin', playerId, week_start)`, so the same (player, week) is one row on every device. `sync_check_ins` is insert-only: `on conflict (player_id, week_start) do nothing`. This is forced by `supabase/migrations/0008_inbox.sql`: the `guard_review_update()` trigger raises 42501 on any player update of `check_ins`, and there is no player UPDATE policy. Check-ins are never edited after sending, so insert-only is correct; a re-send is a no-op and a legacy online row for the same week (old uuidv7 id) stands.
2. **Row after photos.** Photos must be uploaded *before* the row syncs, because the row can never be updated afterwards (see 1). Flow: submit compresses the photos, saves the local row with `photo_paths` placeholders, enqueues one media entry per photo; the media flush uploads each photo, writes its path into the local row, and only when every photo for that check-in is uploaded does it queue the row with `saveAndQueue()`. A check-in with no photos is queued at once. The background runner already flushes the media queue after every outbox flush and on `online`/foreground events, so no runner change is needed.
3. **Photo-count guard against a mid-submit flush.** The local row carries `photo_total` (how many photos were attached). The row is queued only when the uploaded-path count equals `photo_total` AND no media entries remain for that check-in. A flush that runs while submit is still enqueueing photos must never queue the row early.
4. **No new sync mechanism.** Reuse `saveAndQueue()` / outbox / `flushOutbox()` / `supabaseTransport()` and the media queue. Do not invent a second queue.
5. **Submit does not await a flush.** `submitCheckIn` returns `{ error, status }` with status `'sent' | 'queued' | 'already-sent'`. Online, the runner sends the queued row within seconds in the background; the history shows the pending row immediately (see 6) and the badge clears on the next load of the Progress screen. Do not add a second flush path in submit (concurrent flushes race the media completion check).
6. **Pending is visible, not silent.** `listCheckIns()` merges local pending rows with server rows (server wins per week) and marks local rows `pending: true`. `progress-screen.tsx` needs no change: `onSent` already reloads the list and `canOpenCheckin` already blocks a week that is in the list, so a queued week cannot be re-entered.

## Files
Create or modify only these:
- `docs/tasks/T-421-checkin-offline-queue.md`: this card
- `src/core/offline/db.ts`: Dexie version 10 adds the `check_ins` table (`id, week_start`); `MediaQueueEntry` gains kind `'checkin_photo'` plus optional `checkin_id` / `position`, and `form_check_id` / `exercise_id` become optional (form_check-only). Never change an existing version's schema.
- `src/core/offline/tables.ts`: `CheckInRow` (player-owned columns only: `id`, `week_start`, `body_weight_kg`, `waist_cm`, `notes`, `photo_paths: (string | null)[]`, `body_fat_pct`, `photo_poses`, plus local-only `photo_total: number`); add `check_ins` to `SyncRows` / `SyncTable` and append it to `SYNC_ORDER`. No `SYNC_DEPENDENCIES` entry for it.
- `src/core/offline/media-queue.ts`: `checkin_photo` branch in `flushMediaQueue` (upload, patch the local row's `photo_paths[position]`, queue the row via `saveAndQueue()` only when complete per decision 3); `MediaTransport` gains `uploadCheckinPhoto(blob, mime)` using bucket `checkin-photos`; `enqueueMedia` accepts the discriminated union input (form_check / checkin_photo). Form_check behaviour must not change.
- `src/core/offline/media-queue.test.ts`: checkin_photo cases (upload, local patch, queue-when-complete, incomplete waits, failure retries with backoff).
- `src/core/offline/sync.test.ts`: add a `check_ins` flush case (send once, idempotent re-send).
- `src/features/progress/data/checkins.ts`: rewrite `submitCheckIn` and `listCheckIns` per Requirements; add `pending?: boolean` to the `CheckIn` type. Validation stays exactly as today.
- `src/features/progress/components/checkin-sheet.tsx`: remove the offline blocker (the `offline` listener and its `goOnlineToSendPhotos` error); handle the three statuses (`sent` and `queued` both close via `onSent(today)`; `already-sent` shows the existing error string).
- `src/features/progress/components/checkin-history.tsx`: pending rows show the new pending badge/label under the week date. No other change (voice-note fetch already only runs for reviewed rows).
- `src/features/progress/messages.ts` and `src/features/progress/standard/messages.ts`: add `checkinSavedOnDevice` and `checkinPending` in `ar`, `arStd` and `en`; remove `goOnlineToSendPhotos` from both files and the sheet (verify with a repo-wide grep that nothing else uses it first).
- `src/features/progress/checkin-duplicate.test.ts`: update the `submitCheckIn` mock for the new `{ error, status }` return.
- `src/features/progress/progress.test.ts`: keep the validation cases passing; extend for the merged `listCheckIns` (pending row shown, server row wins per week, server failure with local rows does not throw).
- `src/features/progress/data/checkin-offline.test.ts`: new focused tests (see Tests).
- `supabase/migrations/0164_checkin_sync.sql`: new additive migration, `sync_check_ins(p_rows jsonb)` only (see Requirements). Never edit an applied migration.
- `supabase/tests/sync-check-ins.test.ts`: PGlite test for the RPC (see Tests).

## Requirements
1. `submitCheckIn(client, input, t)` returns `{ error: string | null; status: 'sent' | 'queued' | 'already-sent' }`.
   - Validation identical to today (weight, waist, notes ≤ 1000, ≤ 3 photos, body-fat range, poses match photos). Invalid input returns an error and writes nothing locally.
   - Id is `stableId('checkin', playerId, weekStart(input.today))`. A local row for the same week that is already sent (no outbox entry and no pending media) returns `{ error: t('youveAlreadySentThisWeeksCheckin'), status: 'already-sent' }` without touching the server. A local row for the same week that is still queued is updated in place (new values, new photos) and returns `status: 'queued'`.
   - Photos are compressed exactly as today (`compressImage`, 1600 / 0.8). The row put and all media enqueues happen in ONE Dexie transaction, so a crash can never leave a row without its photos or photos without a row.
   - Zero photos: `saveAndQueue(db, 'check_ins', row)` at once, return `status: 'queued'`.
   - With photos: put the row locally (`photo_paths` as `photo_total` nulls, `photo_total` = photos taken) and enqueue one `checkin_photo` media entry per photo (position = the photo's index, same order as `photo_poses`); return `status: 'queued'`. Never call `client.from('check_ins').insert` and never call `uploadPrivateMedia` directly from this function.
   - If `localDb()` is unavailable, keep the previous online-only behaviour (upload then direct insert; offline returns `couldntSendTheCheckinTryAgain`). This is a fallback for a player shell that has not set the local user yet, not a second code path for normal use.
   - `status: 'sent'` is returned only when the row is already on the server — i.e. never by the new submit path itself; the sheet treats `queued` as success (closes, history shows the pending row). Keep the `'sent'` value in the type for callers that already know the row is on the server.
2. `listCheckIns(client, t)` returns server rows merged with local pending rows, newest first, at most 26. Rules: server rows win per `week_start`; a local row with an outbox entry or pending media entries is included with `pending: true`; a local row that is already sent and also on the server is dropped. If the server query fails and local rows exist, return the local rows (do not throw). If the server query fails and there are no local rows, throw as today (`couldntLoadYourCheckins`). If `localDb()` is unavailable, behave exactly as today.
3. Media flush for `checkin_photo` (in `flushMediaQueue`): upload with `transport.uploadCheckinPhoto`; on success write the path into the local row's `photo_paths[position]`; then, only if no media entries remain for that `checkin_id` AND the count of non-null `photo_paths` equals `photo_total`, fetch the fresh local row and `saveAndQueue()` it with `photo_paths` compacted to `string[]`. On upload failure, retry with the existing backoff (same as the form_check branch). If the local row is gone, drop the entry (with `console.warn`, real failure only) — a photo without a check-in must never block the queue.
4. `sync_check_ins(p_rows jsonb)` (migration 0164, `language sql security invoker set search_path = ''`, following the `sync_meal_logs` header style in `0007_nutrition.sql`): inserts one row per element with columns `id, week_start, body_weight_kg, waist_cm, notes, photo_paths, body_fat_pct, photo_poses` (both `body_fat_pct` and `photo_poses` exist since `0048_body_fat.sql`); `player_id` defaults to `auth.uid()` and `captain_id` is set by the existing `set_inbox_captain()` trigger. Conflict: `on conflict (player_id, week_start) do nothing` — this also covers re-sends, because the stable id implies the same (player, week). Grants: `revoke all on function public.sync_check_ins(jsonb) from public, anon; grant execute on function public.sync_check_ins(jsonb) to authenticated;` (same as `sync_daily_checks` / `sync_pain_reports`). No other function in this migration.
5. New strings in `messages.ts` for `ar`, `arStd` and `en` (no inline UI text, no emoji):
   - `checkinSavedOnDevice`: ar "اتحفظ على جهازك وهيتبعت أول ما النت يرجع" · arStd "تم الحفظ على جهازك وسيُرسل عند عودة الاتصال" · en "Saved on your device. It will send when you're back online."
   - `checkinPending`: ar "محفوظ على الجهاز، مستني النت" · arStd "محفوظ على الجهاز، بانتظار الاتصال" · en "Saved on this device, waiting for connection"
6. Rules that still apply: files ≤ 250 lines, one component per file, kebab-case, import direction `app → features → (ui, core, lib)`, no `any`, no `console.log`, dates via `localDate()` (Africa/Cairo), ids via `stableId()` / `uuidv7()` (never `Math.random`), tokens only, logical RTL properties only, touch targets ≥ 48px.

## Acceptance
- [ ] Offline submit (no signal) saves locally, queues, returns `queued`, and the player never re-enters the week; history shows it with the pending label.
- [ ] A failed row sync does not lose the entry: the outbox entry stays and a later flush sends it.
- [ ] Re-submit of an already-sent week returns `already-sent` without a server write.
- [ ] Photos survive offline and upload on flush; the server row ends up with the right `photo_paths` in the right order (poses aligned by index).
- [ ] `sync_check_ins` is idempotent (same payload twice = one row) and a second player cannot touch the first player's week.
- [ ] `npm run check`, `npm run build` and `npx vitest run src/lib/perf-budget.test.ts` pass.
- [ ] No change to cycle settings, voice notes, parked-row retry, KO, billing, or the captain review flow.

## Tests (deterministic, inject `now`, no real timers, no network — fake-indexeddb like `src/core/offline/sync.test.ts`)
- `src/features/progress/data/checkin-offline.test.ts`: offline submit queues the local row + media entries and returns `queued` (mock client performs no insert); a failing row flush keeps the outbox entry and a retry succeeds; re-submit after send returns `already-sent`; photos: submit offline with photos, flush media with a mock transport, assert the local row is queued with the uploaded paths in order, then flush the outbox with a mock RPC and assert the payload carries those paths; a flush that runs while photos are still uploading does not queue the row early.
- `supabase/tests/sync-check-ins.test.ts` (PGlite, following `supabase/tests/rls-set-sync.test.ts`): insert via the RPC as the player; call twice with the same payload (one row, no duplicate); a legacy row for the same week plus the new payload still leaves one row; another player inserting the same `week_start` gets their own row only; anon cannot execute; a lapsed-subscription player gets 42501.
- Extend `media-queue.test.ts` and `sync.test.ts` as listed in Files; keep `progress.test.ts` validation cases green.

## Out of scope
- Cycle settings, voice notes, parked-row auto-retry, KO, billing, captain review flow.
- Editing or deleting a sent check-in; removing a photo from a sent check-in.
- A live refresh of the pending badge after the background flush (it clears on the next load of the Progress screen).
- Do not apply the migration to any real database.
- No new dependency.

## Notes for reviewer
- The legacy-week edge: a player who sent week W with the old app (uuidv7 id) and then queues week W with the new app ends up with the legacy row standing and the new photos orphaned in storage (same orphan risk the old code already had on failed inserts). The week is still represented exactly once; no duplicate is ever shown because `listCheckIns` dedupes by week with the server row winning.
- `sync_check_ins` deliberately has no `client_updated_at` conflict rule: `check_ins` has no such column, and the review trigger forbids player updates, so insert-only is the only honest semantics.
- The `checkinSavedOnDevice` string is currently only used as the history pending label's companion text; the sheet closes on `queued` and the pending badge is the confirmation. If the owner wants a toast on queue, that is a follow-up, not this card.

## References
- `docs/ARCHITECTURE.md` §3 (feature layout), §6 (offline engine)
- `src/core/offline/sync.ts`, `transport.ts`, `media-queue.ts`, `runner.ts`
- `supabase/migrations/0008_inbox.sql` (check_ins table, `guard_review_update`, RLS)
- `supabase/migrations/0007_nutrition.sql` (`sync_meal_logs` header/grants to copy)
