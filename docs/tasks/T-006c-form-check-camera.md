# T-006c — Quick form-check camera from Focus Mode, with an offline upload queue

**Phase:** 2 · **Depends on:** T-006, T-012, T-013 (merged) · **Status:** ready
**Delegate to:** Codex

## Goal
After logging a set in Focus Mode, the player taps «صوّر الفورم». The phone camera opens (`capture`) and they record a short video. The app shows «اتحفظ. هيتبعت للكابتن لما النت يكون كويس» at once and the workout continues. In the background, a queue:
1. uploads the video to the private `form-videos` bucket
2. creates the `form_checks` row
3. retries with backoff, survives closing the tab, and never blocks logging

The captain then sees it in the inbox (T-012, merged).

## Schema and rules today
- Bucket `form-videos` (0009): private, max **50 MB**, mp4/quicktime/webm, path `<player_id>/<uuid>.<ext>`.
- Policy `form_checks_player_insert` (0014): requires `player_id = auth.uid()`, `player_can_write()`, the video in the caller's own folder, and `set_log_id` either null or a set log the caller owns **on the server**.
- `uploadPrivateMedia(client, bucket, playerId, file)` and its MIME→extension map already exist in `src/core/storage/private-media.ts` (they include video types).
- Dexie is at `version(3)`. The `KochivoDB` docblock says to add `version(n+1)` and never change old versions.

## Files
- `src/core/offline/db.ts`:
  - add `version(4)` with `media_queue: '++id, next_attempt_at'`
  - add the type `MediaQueueEntry { id?: number; kind: 'form_check'; blob: Blob; mime: string; exercise_id: string; set_log_id: string | null; note: string | null; created_at: number; attempts: number; next_attempt_at: number; video_path?: string; last_error?: string }`
  - Videos live in IndexedDB only, never in `localStorage`.
- `src/core/offline/index.ts`: export the new type.
- `src/core/offline/media-queue.ts` (new, framework-free like `sync.ts`):
  - `enqueueMedia(db, entry, now)`
  - `mediaPending(db)`
  - `flushMediaQueue(db, transport, now)` processes due entries oldest first:
    - **Skip** an entry whose `set_log_id` still has a row in `outbox` (`[table+row_id]` = `['set_logs', id]`), because the server set log must exist first.
    - If `video_path` is not set yet, upload and **store `video_path` on the entry before inserting**, so a retry never uploads twice.
    - Then insert `form_checks` and delete the entry.
    - On failure, set `attempts + 1` and `next_attempt_at = now + backoffDelay(attempts)` (reuse `backoff.ts`), and store a short error code, never a path.
    - A 23505 or a duplicate counts as done.
    - Returns `{ sent, failed, waiting }`.
  - `MediaTransport` interface with `upload(blob, mime) → path` and `insertFormCheck(row)`.
  - `supabaseMediaTransport(client, playerId)` uses `uploadPrivateMedia` and `client.from('form_checks').insert({ id: uuidv7(), exercise_id, set_log_id, video_path, note })`. Never send `captain_id`; the 0008 trigger sets it.
- `src/core/offline/runner.ts`: after each outbox flush, also run `flushMediaQueue`, with the same online and interval triggers. Read the file first and keep its structure. Media failures never stop outbox sync.
- `src/features/workout/components/form-check-button.tsx` (client):
  - a ghost button «صوّر الفورم» with a camera icon (`Video` from lucide) and an Arabic `aria-label`
  - a hidden `<input type="file" accept="video/*" capture="environment">`
  - validates the MIME is one of the 3 allowed types and the size is ≤ 50 MB. Otherwise it shows «الفيديو لازم يبقى أقل من 50 ميجا» or «نوع الفيديو مش مدعوم».
  - an optional note `TextField` (≤ 500) in a small sheet with «ابعته للكابتن»
  - calls `enqueueMedia` with the just-logged set's id and the exercise id
- `src/features/workout/components/focus-screen.tsx`: show `FormCheckButton` for the most recently completed set of the current exercise. This is the only change there.
- `src/features/workout/components/media-status.tsx`: a small muted line «فيديو مستني يتبعت · {n}» reading `mediaPending` via `useLiveQuery`, shown next to the existing SyncPill.
- `src/core/offline/media-queue.test.ts` (new, fake-indexeddb, with a fake transport and injected `now`):
  - waits while the set log is still in the outbox
  - uploads once across a failed insert, then a retry inserts without re-uploading
  - backoff timing
  - a duplicate counts as done
  - the version(4) upgrade keeps existing tables (open a v3 DB with a row first)

## Requirements
1. Never block or slow set logging. Every queue error is caught.
2. Never log blobs, paths, or notes.
3. Use deterministic tests only, with no real timers or network.
4. Files are under 250 lines, use tokens only, use RTL logical properties, have targets ≥ 48px, and use Egyptian Arabic.

## Acceptance
- [ ] `media-queue.test.ts` passes, and existing sync tests still pass.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Video compression or trimming
- In-app recording UI (we use the native camera)
- The captain's inbox UI
- Migrations
- Check-in photos (they stay online-only, from T-013)
