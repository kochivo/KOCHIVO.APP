# T-013 — Weekly check-in and the player progress screen

**Phase:** 4 · **Depends on:** T-006 (merged), 0014 (merged) · **Status:** ready
**Delegate to:** Codex

## Goal
Once a week, the player sends a short update to their captain: body weight, waist, a note, and up to 3 private photos (front, side, back). The التطور tab shows:
- strength progress: the top set over time for the player's main lifts
- body weight and waist trends from check-ins
- a before/after of the first and latest front photos

Mockup board: **PlayerProgress** (`docs/mockups/PlayerProgress.dc.html`). Schema:
- `supabase/migrations/0008_inbox.sql` (`check_ins`, unique `(player_id, week_start)`)
- `0009_storage.sql` (the private bucket `checkin-photos`, path `<player_id>/<uuid>.<ext>`, max 5 MB, jpeg/png/webp)
- `0014_hardening.sql` (every photo path must sit in the player's own folder)

## Files
- `src/core/storage/private-media.ts` (new):
  - `uploadPrivateMedia(client, bucket, playerId, file)` uploads to `${playerId}/${uuidv7()}.${ext}` (the extension comes from the MIME type, not the file name) and returns the path
  - `signedMediaUrl(client, bucket, path, seconds = 600)`

  Export both from `src/core/storage/index.ts`. Use the browser client passed in; never use the service role.
- `src/features/progress/` (new):
  - `index.ts`
  - `week.ts` (pure): `weekStart(today)` returns the Saturday on or before `today` (YYYY-MM-DD), matching the Saturday-first week of the home strip
  - `trends.ts` (pure):
    - `topSets(sets, exerciseId)`: per session date, the max `weight_kg` (ties broken by reps)
    - `trendDelta(points, weeks = 4)`: change vs the closest point ≥ `weeks` ago, or null
    - `mainLifts(sets, limit = 3)`: the most-logged `exercise_id`s
  - `image.ts`: `compressImage(file, maxSide = 1600, quality = 0.8)` using `createImageBitmap` and `OffscreenCanvas` or canvas, giving a jpeg/webp `Blob`. If unsupported, return the original only when ≤ 5 MB, else throw an Arabic error.
  - `data/checkins.ts`:
    - `listCheckIns(client)`: the player's own rows, newest first, limit 26
    - `submitCheckIn(client, input)`: upload the photos first, then insert `check_ins` with `week_start`, `body_weight_kg`, `waist_cm`, `notes`, and `photo_paths`. On a unique violation (`23505`), return «بعتّ تحديث الأسبوع ده خلاص».

    This is a browser-side module (photos need the browser). Check-ins are not in the offline outbox. When offline, show «محتاج نت عشان تبعت الصور» and keep the form's values in state.
  - `data/strength.ts`: reads local `set_logs` (Dexie, via `localDb()`) joined in memory with the program snapshot names from `@/features/player-home` (its index only). No network.
  - `components/progress-screen.tsx`:
    - header «PROGRESS · تطورك»
    - lift chips for the main lifts
    - a top-set line chart as an inline SVG (no chart library), with first and last labels «أ1 … أN»
    - the weight and waist cards with deltas («−1.6 كجم في 4 أسابيع»)
    - the before/after pair using signed URLs
    - a «ابعت تحديث الأسبوع» lime button, or «اتبعت ✓» (muted) when this week's check-in exists
  - `components/checkin-sheet.tsx`:
    - weight `Stepper` (0.1 kg steps, prefilled from the latest check-in, else 75)
    - waist `Stepper` (0.5 cm, optional with a «من غير» chip)
    - notes `TextField` (≤ 1000 chars)
    - 3 photo slots (`<input type="file" accept="image/*" capture="environment">`) with previews and remove
    - submit with progress
  - `components/line-chart.tsx`: reusable inline SVG with an accessible `<title>` and a summary text for screen readers
  - `progress.test.ts`
- `src/app/(player)/player/progress/page.tsx` (new, thin)

## Requirements
1. Privacy:
   - Photos are private. Show them only via signed URLs (10 minutes).
   - Never log file names or paths.
   - Never put photos in `localStorage`.
2. Dates: `localDate()` and `weekStart(today)`. Pure functions take `today`.
3. States:
   - loading
   - error with retry
   - empty strength «سجّل أول تمرين وهتشوف تطورك هنا»
   - empty check-ins «أول تحديث هيبقى نقطة البداية»
4. Files under 250 lines, tokens only, no hex (the SVG uses `currentColor` and token classes), RTL logical properties, ≥ 48px targets, Egyptian Arabic, and `aria-label` on icon buttons.

## Acceptance
- [ ] `progress.test.ts` covers:
  - `weekStart` (a Saturday itself, the Friday before, across a month or year boundary)
  - `topSets` (ties, multiple sessions)
  - `trendDelta` (not enough history → null)
  - `mainLifts`
  - the upload path format (`<player>/<uuidv7>.jpg` from the MIME type), with a mocked client
  - the `submitCheckIn` `23505` mapping, with a mocked client
- [ ] `/player/progress` builds, and `npm run check` and `npm run build` pass.

## Out of scope
- The captain's review of check-ins (T-012)
- The offline photo queue (T-006c)
- Body-fat estimates
- Migrations
