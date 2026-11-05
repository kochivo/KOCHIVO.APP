# T-005 — Player home: week strip, today's workout, and the offline program snapshot

**Phase:** 2 · **Depends on:** T-003 (merged), T-UI-01 (merged) · **Status:** ready
**Delegate to:** Codex

## Goal
A player opens `/player` at the gym, maybe with no signal, and within one second sees:
- a greeting
- a strip for this week (Saturday to Friday) showing which days are done, today, training, or rest
- one big glowing "ابدأ التمرين" card for today's workout

The workout comes from a **local snapshot** of the player's active program, so the screen works offline after the first load. This card also builds that snapshot, which Focus Mode (T-006) will reuse.

## Files
- `src/core/offline/db.ts`:
  - add `version(2)` with a `program_snapshot` table (`'id'`, one row keyed `'active'`) holding the `ProgramSnapshot` type
  - add a `training_days` cache: an array of 0–6 values copied from `player_intake.training_days`, stored in the same snapshot row
  - never change `version(1)`
- `src/core/offline/use-live-query.ts` (new): a small React hook over Dexie's built-in `liveQuery`. It subscribes in an effect, unsubscribes on cleanup, and returns `undefined` until the first value. **Do not add `dexie-react-hooks`.** No new dependencies.
- `src/core/offline/index.ts`: export the hook, plus the new type and table access only if features need them. Keep the change minimal.
- `src/features/player-home/` (new):
  - `index.ts`
  - `data/program-snapshot.ts`: types plus `fetchProgramSnapshot(client)`. It reads the caller's single `status = 'active'` program with its days and exercises (`programs` → `program_days` → `program_exercises`, joined to `exercises` for `name_ar`, `name_en`, and the media path) and `player_intake.training_days`, then maps everything to a plain `ProgramSnapshot`.
  - `data/refresh-snapshot.ts`: a browser-side function. When online, it fetches with the browser client and writes to Dexie. When that fails or the device is offline, it keeps the existing snapshot and never deletes it.
  - `hooks/use-program-snapshot.ts`: a `useLiveQuery` (from `@/core/offline`) on Dexie plus a one-time refresh on mount and on the `online` event. It returns `{ snapshot, status: 'loading' | 'ready' | 'empty' | 'error' }`.
  - `hooks/use-week-sessions.ts`: a `useLiveQuery` (from `@/core/offline`) over local `workout_sessions` for this week's dates.
  - `next-day.ts` (pure): `pickTodayDay(snapshot, sessions, today)`. Program days have no weekday, so they rotate:
    - Today's day is the day after the most recently **completed** session's `program_day_id`, by `position`, wrapping around.
    - With no completed session, it is position 1.
    - If a session for `today` already exists, today's day is that session's day, so re-opening never skips ahead.
  - `week.ts` (pure): `buildWeek(today, trainingDays, sessions)`. It returns 7 entries starting Saturday, each with `date`, `label` (سبت … جمعة), `dayOfMonth`, and `state: 'done' | 'today' | 'train' | 'rest'`:
    - `done` means a completed session exists on that date.
    - `today` wins over `train`/`rest` but not over `done`.
    - With no `trainingDays`, every day is `train`.
  - `components/home-screen.tsx`: the client component that composes the pieces below
  - `components/greeting.tsx`: «صباح الخير يا {first name}» before 12:00 Cairo time and «مساء الخير يا …» after, plus an English date line (`TUESDAY · 3 NOV`)
  - `components/week-strip.tsx`
  - `components/today-card.tsx`:
    - day title (`DAY {position} · تمرين النهارده`) and name
    - "{n} تمارين · {sets} سِت · حوالي {minutes} دقيقة", where minutes = Σ(sets × (40 s + rest)) / 60, rounded to 5
    - the glowing lime "ابدأ التمرين" button linking to `/player/workout/{dayId}`, with `TODO(T-006)` because the route doesn't exist yet
  - `components/nutrition-slot.tsx`: a muted `GlassCard` that says «نظام الأكل هيظهر هنا قريب». `TODO(T-007)`.
  - `player-home.test.ts`
- `src/app/(player)/player/page.tsx`: replace the placeholder. Keep it thin: read the first name server-side from `profiles` (that read is allowed to fail and fall back to no name), then render `HomeScreen`. Keep the sign-out button reachable, for example as a small `IconButton` in the header with `aria-label="خروج"`.

## Requirements
1. **Match the mockup board PlayerHome** (`docs/mockups/PlayerHome.dc.html`):
   - `SyncPill` at the top, fed by `pendingCount()` (from `@/core/offline`) via `useLiveQuery` (from `@/core/offline`)
   - the week strip with done days shown as lime dots and today outlined
   - the big today card using `glass-strong` and the glow (CSS keyframes in the component or as a `globals.css` utility added at the end; off under reduced motion)
   - `BottomNav` from `@/ui` with الرئيسية, التغذية, التطور, الكابتن. Only الرئيسية is active, and the others link to `/player/...` routes that may 404 for now (add a `TODO`).
2. **States.**
   - loading: `LoadingState`
   - `empty` (no active program): `EmptyState` «الكابتن لسه بيجهز برنامجك. هيوصلك أول ما يخلص.»
   - error with no snapshot: `ErrorState` with retry
   - error with an old snapshot: show the snapshot and a muted «آخر تحديث من شوية» line, with no error
   - rest day: if today is not in `trainingDays` and nothing was logged today, the card shows «النهارده راحة» with a ghost secondary «تمرّن برضه», which links to the same day
3. **Dates.** Use `localDate()` from `@/lib/dates` for every date. Pure functions take `today` as an argument, and tests inject it. Never use `new Date().toISOString().slice(0,10)`.
4. **Security.** Read only through the user's session client. RLS already limits the rows. Never query by a `player_id` taken from the URL.
5. Files under 250 lines, RTL logical properties, ≥ 48px targets, no hex, Arabic copy, and `aria-label` on icon buttons.

## Acceptance
- [ ] `player-home.test.ts` covers:
  - `pickTodayDay`: no sessions, rotation, wrap-around, a session already logged today, and an empty program
  - `buildWeek`: Saturday start across a month boundary, done beating today, rest versus train, and no training days
  - the minutes estimate
  - the snapshot mapping from a fixture shaped like the Supabase response
- [ ] A Dexie test (with fake-indexeddb, like `src/core/offline/sync.test.ts`) shows that a failed refresh keeps the previous snapshot.
- [ ] `/player` builds, and `npm run check` and `npm run build` pass.

## Out of scope
- The Focus Mode route (T-006)
- Nutrition data (T-007)
- Install prompt (T-008b)
- Captain screens
- Any migration
