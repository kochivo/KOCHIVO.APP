# T-006 — Focus Mode: log a workout one set at a time, offline

**Phase:** 2 · **Depends on:** T-005 (merged) · **Status:** ready
**Delegate to:** Codex

## Goal
This is the most important screen in the product. A player taps «ابدأ التمرين» and gets one exercise at a time, with:
- a big weight stepper and a big reps stepper
- one lime «تمّ السِت» button
- a rest timer that stays correct even if the phone locks

Every set is saved on the phone first and synced later, so a gym with no signal changes nothing. Mockup board: **Main** (`docs/mockups/Main.dc.html`).

## Files
- `src/features/workout/` (new):
  - `index.ts`
  - `queue.ts` (pure): `buildQueue(day)` turns a `SnapshotDay` into an ordered list of steps `{ exercise, setIndex (1-based), restAfter }`:
    - Exercises run in `position` order.
    - Exercises sharing a non-null `superset_group` run as rounds (A1, B1, A2, B2, …). `restAfter` is 0 inside a round and the **last** exercise's `rest_seconds` at the end of a round.
    - A plain exercise rests its own `rest_seconds` after every set, except the very last step of the workout.
  - `rest.ts` (pure):
    - `restRemaining(endsAt, now)` returns whole seconds, never negative.
    - `formatRest(seconds)` returns `m:ss`.
    - `extendRest(endsAt, now, 30)` adds 30 seconds to the later of `endsAt` and `now`.
  - `ids.ts`:
    - `sessionId(dayId, trainingDate)` is `stableId('session', dayId, trainingDate)`.
    - `setId(sessionId, programExerciseId, setIndex)` is `stableId('set', sessionId, programExerciseId, String(setIndex))`.
    - The same set gets the same id on every device (AGENTS.md §3).
  - `data/log-set.ts`:
    - `startSession(db, day, today, now)`: if the local session for `(day, today)` is missing, `saveAndQueue` a `workout_sessions` row (`started_at = now`, `completed_at = null`).
    - `logSet(db, input, now)`: `saveAndQueue` a `set_logs` row with `completed_at = now` and `client_updated_at = now`.
    - `finishSession(db, sessionId, now)`: re-saves the session with `completed_at` set.
    - All writes go through `saveAndQueue()` from `@/core/offline`. Never call Supabase here.
  - `data/last-performance.ts`: `lastPerformance(db, exerciseId, beforeSessionId)` finds the latest local `set_logs` row for that `exercise_id` from a **different** session and returns `{ weight_kg, reps } | null`.
  - `hooks/use-rest-timer.ts`:
    - Keep `endsAt` (an epoch ms) in state and in `sessionStorage` (`kochivo:rest-ends-at`, wrapped in try/catch), and recompute from `Date.now()` on a 250 ms interval and on `visibilitychange`. The timer is a timestamp delta, so it is correct after the screen locks.
    - When the rest reaches 0, call `navigator.vibrate?.([200, 100, 200])` once.
    - Expose `flashing` as true for the last 3 seconds, for iPhone, which has no vibration.
  - `hooks/use-wake-lock.ts`: request `navigator.wakeLock` while the screen is open, re-request on `visibilitychange`, release on unmount, and stay silent where it is unsupported.
  - `hooks/use-focus-session.ts`: the state machine. It loads the snapshot day, finds the session for today, and reads the done sets for that session through `useLiveQuery` (from `@/core/offline`), so state survives a reload. It returns the current step, the done sets, the prefill values, and the actions.
  - `components/focus-screen.tsx`: composes the screen
  - `components/exercise-header.tsx`:
    - name (`name_ar`, falling back to `name_en`)
    - «الأسبوع اللي فات · 60 × 8» from `lastPerformance`, or nothing
    - the exercise GIF when `media_path` is set, using `next/image` with `unoptimized` and the URL from `exerciseMediaUrl`, plus the small caption «© Gym visual»
  - `components/set-dots.tsx`: «سِت n» chips. Done ones show `60 × 8` with a check, and the current one is outlined. Tapping a done set loads its values to edit and re-save; the id is the same, so it is an update.
  - `components/rest-panel.tsx`: «REST · راحة», a big `m:ss`, «+30 ث» and «تخطّي» buttons, and the note «الموبايل هيهتز، والشاشة هتنوّر في آخر 3 ثواني». Use `glass-strong`, with a pulse class while `flashing` (off under reduced motion).
  - `components/next-up.tsx`: «NEXT · التالي» with the next exercise name and `sets × reps`
  - `components/done-panel.tsx`: «خلصت التمرين», the subtitle «اتسجّل على موبايلك، وهيوصل للكابتن أول ما النت يرجع», and a link home
  - `workout.test.ts`
- `src/core/storage/media-url.ts` (new): `exerciseMediaUrl(path)` returns `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/exercise-media/${encodeURI(path)}` via `publicEnv()`. Add `src/core/storage/index.ts` exporting it.
- `src/features/player-home/index.ts`: also export `useProgramSnapshot` (needed here). There must be no other change in player-home.
- `src/app/(player)/player/workout/[dayId]/page.tsx` (new, thin): read `dayId` and render `FocusScreen`. If the day is not in the snapshot, show `EmptyState` «التمرين ده مش في برنامجك» with a link home.

## Requirements
1. **Steppers.** Use `Stepper` from `@/ui`.
   - Weight steps by 2.5 kg, from 0 to 500; reps step by 1, from 0 to 100. These are gym controls, so make them bigger than the 48 px minimum.
   - Prefill with the current set's saved values when editing, else the previous set in this session, else `lastPerformance`, else weight 0 and reps `reps_min`.
2. **«تمّ السِت».** This is the one lime action on screen.
   - On tap, it writes the set, then starts rest with `restAfter` (unless 0), then advances. All of it is optimistic, with no awaiting the network.
   - Disable it for 600 ms after a tap to prevent double logging.
   - On the last step, it also calls `finishSession` and shows the done panel.
3. **Header.** Show a back `IconButton` (`aria-label="رجوع"`) to `/player`, the day title, `SyncPill` with `pendingCount`, and progress «سِت 5 من 18» via `ProgressBar`.
4. **Dates.** `today` comes from `localDate(new Date())`, and the hook receives it as an argument. Pure functions take `now` and `today` as arguments.
5. **Never** use `Math.random`, `new Date().toISOString().slice(0,10)`, or direct Supabase writes.
6. Every file stays under 250 lines, with RTL logical properties, no hex, Egyptian Arabic copy, and `aria-live="polite"` on the rest countdown.

## Acceptance
- [ ] `workout.test.ts` covers:
  - `buildQueue`: plain exercises, a 2-exercise superset with rounds and rest only at round end, and no rest after the final step
  - `restRemaining`, `extendRest`, and `formatRest`
  - with fake-indexeddb:
    - `startSession` is idempotent for the same day and date
    - logging the same set twice keeps one `set_logs` row and one outbox entry with revision 2
    - `finishSession` sets `completed_at`
    - `lastPerformance` ignores the current session
- [ ] `/player/workout/[dayId]` builds, and `npm run check` and `npm run build` pass.

## Out of scope
- PR confetti (T-006d)
- The form-check camera (T-006c)
- Notes per set
- Captain views
- Migrations
