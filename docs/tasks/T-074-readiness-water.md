# T-074 — Rest-day mode, daily readiness questions, water tracker, coach readiness tab

**Phase:** 3 · **Status:** ready (owner request, 2026-11-04). The owner approved the mockup `kochivo_player_home_rest_vs_training`:
- calm blue rest-day theme
- water on every day
- coach rings plus a "today's decision" card

## Goal
1. **Player, rest day.** The whole player app (home, nav, cards; every route under the player shell except the workout focus screen) switches to a calm deep-blue "rest mood".
   - Home's hero becomes «النهارده يوم راحة» ("today is a rest day"), with a breathing circle and one short calming line.
   - Below the hero:
     - the two morning questions (sleep and soreness)
     - the water glass
     - an optional light-stretch row
     - a line naming tomorrow's workout
2. **Player, training day.** The home stays lime with the workout card as hero.
   - Directly under the workout card (`TodayCard` / `NextTaskSlot`), add a slim **water strip**:
     - a droplet icon
     - «مية النهارده» ("today's water") with `x / goal L`
     - 12 small segments filling per 250 ml
     - one 48 px «+» button (+250 ml)
     - one short hint «اشرب كوبايتين قبل التمرين بساعة» ("drink two glasses an hour before your workout")
   - Under the strip, a compact readiness row: «جاهزيتك النهارده {n}» ("your readiness today {n}") plus «عدّل» ("edit"). Tapping it opens the same two questions in a `sheet` dialog.
   - If the questions are not answered yet, the row reads «جاوب على سؤالين الصبح» ("answer the two morning questions").
3. **Coach.** A new tab «الجاهزية» ("readiness") in the player profile (`src/features/player-profile`, next to «التحليل» "analysis").
   - Score rings (sleep, water, soreness) with today's score in the middle.
   - A red flag when sleep < 5 h or soreness ≥ 4.
   - A «قرار النهارده» ("today's decision") card:
     - the suggested decision with the original vs suggested set count
     - one apply button, plus a two-choice override (keep / reduce / rest)
   - A 7-day strip (Saturday-start week, Cairo): mini score ring, barbell or moon icon, and litres of water per day.

## Data: new migration `supabase/migrations/0056_readiness.sql`

### `public.daily_checks` (player-owned, offline-synced)
| Column | Type and rule |
|---|---|
| `id` | uuid pk, from `stableId('daily_check', playerId, log_date)` |
| `player_id` | uuid, default `auth.uid()`, references profiles, on delete cascade |
| `log_date` | date |
| `sleep_hours` | smallint, null or 4..9 (4 means "4 or less", 9 means "9+") |
| `soreness` | smallint, null or 1..5 (1 «فريش» "fresh", 2 «خفيف» "light", 3 «متوسط» "medium", 4 «جامد» "heavy", 5 «مكسّر» "wrecked") |
| `water_ml` | integer, not null default 0, 0..10000 |
| `client_updated_at` | timestamptz, not null |
| `deleted_at` | timestamptz |

- Add `unique (player_id, log_date)` and an index on `(player_id, log_date)`.

**RLS.** Copy the `supplement_logs` pattern from 0051 exactly:
- restrictive `active_caller`
- read by the player or `is_captain_of(player_id)`
- insert, update and delete only by the player with `player_can_write()`
- column-level update grant

**Sync RPC.** Add `sync_daily_checks(p_rows jsonb)` as security invoker, with last-writer-wins on `client_updated_at` (same shape as `sync_supplement_logs`).

### `public.readiness_decisions` (captain-owned)
| Column | Type and rule |
|---|---|
| `id` | uuid pk (`uuidv7`) |
| `captain_id` | uuid |
| `player_id` | uuid |
| `decision_date` | date |
| `decision` | text, one of `keep`, `reduce`, `rest` |
| `created_at` | timestamptz |

- Add `unique (player_id, decision_date)`.

**RLS.**
- Insert and update only when `captain_id = auth.uid() and is_captain_of(player_id)`.
- Readable by that captain and by the player when `player_id = auth.uid() and player_can_read_from(captain_id)`.
- Keep the restrictive `active_caller`.

**Other DB work.**
- Write the PGlite test `supabase/tests/rls-readiness.test.ts`:
  - the player can read and write only their own checks
  - their captain can read but cannot write checks
  - another captain and another player see nothing
  - only the player's captain can write decisions; the player can read them
  - sync last-writer-wins
  - the CHECK ranges hold
- Also add both tables to whatever list `rls-suspension.test.ts` / the cross-tenant fixture expects.

## Offline (player writes)
- Add `daily_checks` to `src/core/offline`:
  - row type in `tables.ts`
  - `SyncRows` and `SYNC_ORDER` (after `supplement_logs`)
  - new Dexie `version(6)` store `daily_checks: 'id, log_date'`; never change older versions
  - the transport mapping to `sync_daily_checks`
- All player writes go through `saveAndQueue()`; the UI is optimistic.
- Water adds are increments on the local row: read it, add, then save with a new `client_updated_at`.
- Dates use `localDate()`.

## Pure logic: `src/features/readiness/` (new feature, standard layout)
- **Score:** `readinessScore({ sleepHours, waterMl, waterGoalMl, soreness })` returns `{ score 0..100, parts: { sleep, water, soreness } (each 0..1), flags }`.
  - `sleep = max(0, 1 - |8 - min(S,9)| / 4)`
  - `water = min(W / goal, 1)`
  - `soreness = (5 - R) / 4`
  - `score = round(100 * (0.4·sleep + 0.25·water + 0.35·soreness))`
  - Missing answers: score only the answered parts, re-normalizing the weights. If nothing is answered, return `null`.
- **Flags:** `lowSleep` (S < 5) and `highSoreness` (R ≥ 4).
- **Suggestion:** `suggestDecision(score)`
  - ≥ 80 → `keep`
  - 50..79 → `reduce`
  - < 50 → `rest`
  - `null` → `keep`
- **Reduced sets:** `reducedSets(sets) = max(1, round(sets * 0.8))` per exercise.
- **Water goal:** `waterGoalMl(weightKg?) = clamp(round(weightKg * 35 / 250) * 250, 2000, 4000)`, or 3000 when the weight is unknown. Use the latest intake or check-in weight if the home already has it; otherwise 3000.
- **Rest day:** move the rest-day detection now inline in `player-home/components/home-screen.tsx` into a pure `isRestDay(snapshot, sessions, today)` in player-home. Weekly programs: the picked day is a rest day. Fixed-weekday programs: today is not a training weekday and has no session today. Reuse it in `home-screen.tsx`.
  - Rest mood is on when `isRestDay` is true **or** today's coach decision is `rest`.

## Rest mood theme
- In `globals.css`, add a `[data-mood="rest"]` block that redefines the colour tokens for its subtree:
  - `--color-bg`, `--color-surface`, `--color-line`, `--color-ink`, `--color-muted`, plus whatever `glass` / `glass-strong` / `sheet` / bottom-nav use
  - a deep night-blue palette like the mockup (bg ≈ `#0a1224`, surface ≈ blue-tinted, line ≈ `#1e2a47`, ink ≈ `#e6ecff`, muted ≈ `#8c9bc4`), plus a new `--color-calm` (≈ `#c9d5ff`) for selected chips
  - hex values are allowed only in `globals.css`, as tokens
  - add a soft `transition` on background colour, disabled under `prefers-reduced-motion`
- In rest mood there is **no lime primary** on home. Chips use `calm`; water uses a `water` token (≈ `#60a5fa`); sleep and soreness icons use `sleep` (≈ violet) and `sore` (≈ orange) tokens. Add these to `@theme`.
- `player-shell.tsx` puts `data-mood="rest"` and `bg-bg min-h-dvh` on its root wrapper when rest mood is on, using a small hook exported from `@/features/player-home` (index only, no deep import). Make sure this creates no import cycle.
  - The workout focus route never gets the mood.
  - Also set `<meta name="theme-color">` to the rest bg while rest mood is on, and restore it on cleanup.
- The breathing circle is an inline SVG pulse, ≤ 1 per screen, `motion-reduce:animate-none`.

## Coach decision applied to the player's workout
- The player reads today's `readiness_decisions` row when online (lazy Supabase browser client). Cache the last value in memory or Dexie only if it is cheap; offline with no cache means no decision.
- `reduce`: the workout focus screen shows target sets as `reducedSets(sets)` for every exercise, plus a glass banner «الكابتن خفف تمرين النهارده ٢٠٪» ("your coach cut today's workout by 20%"). Stored set logs stay normal.
- `rest`: home switches to rest mood with the line «الكابتن قال النهارده راحة نشطة» ("your coach says today is active rest"). The workout card stays reachable as «اتمرن برضه» ("train anyway"), reusing the existing `trainAnyway` string.
- The coach's apply button writes the decision with `uuidv7()`, upsert on `(player_id, decision_date)`, and uses the `ActionResult` from `@/lib/action-result` for errors.

## Code layout
```
src/features/readiness/
  index.ts
  score.ts                      pure logic above
  water.ts                      pure logic above
  messages.ts                   all strings, Egyptian Arabic + English
  data/daily-checks.ts          local read/save via saveAndQueue
  data/decisions.ts             coach upsert action + reads
  hooks/use-daily-check.ts
  hooks/use-today-decision.ts
  components/morning-questions.tsx
  components/water-glass.tsx
  components/water-strip.tsx
  components/readiness-row.tsx
  components/rest-hero.tsx
  components/readiness-tab.tsx  (coach)
  components/score-rings.tsx
  components/decision-card.tsx
  components/week-rings.tsx
  readiness.test.ts
```
- The coach tab loads lazily (`next/dynamic`), like the analytics tab.
- Add `'readiness'` to `profileTabs` in `player-profile/model.ts`.

## States and UX
- Loading skeleton, error with retry, and empty states:
  - coach, no checks this week: «اللاعب لسه ماجاوبش على أسئلة الصبح» ("the player hasn't answered the morning questions yet")
- Touch targets ≥ 48 px. Chips are radio groups with `aria-pressed` or role radio, plus translated labels.
- Answering shows «اتبعت للكابتن» ("sent to the coach").
- Water ring and glass both have a text value, so nothing is colour-only.
- Logical properties only; `lucide-react` icons (`Moon`, `Activity`, `Droplet`, `HeartPulse`, `Dumbbell`); no emoji.

## Out of scope
- Push reminders to drink water.
- Dashboard-wide red-flag list (noted for later).
- Editing past days.

## Tests
- `readinessScore`:
  - every formula edge (S=4, 8, 9; R=1, 5; W=0, ≥ goal)
  - partial answers re-normalize
  - null when nothing is answered
- `suggestDecision` thresholds 49/50/79/80; `reducedSets` (1→1, 3→2, 5→4); `waterGoalMl` clamps and default.
- `isRestDay` for weekly and fixed-weekday programs, including a session logged today.
- Water increments keep a single stable row per day (same id twice), and `client_updated_at` advances.
- testing-library:
  - the rest home renders `data-mood="rest"`, the questions and the glass
  - the training home renders the water strip under the workout card
  - the focus screen shows reduced sets under `reduce`
- PGlite `rls-readiness.test.ts` as described above.

## Requirements
- No new dependencies.
- Files ≤ 250 lines.
- Tokens only in components.
- Every string in `messages.ts`.
- Perf budget must pass after the build without changing budgets. Player routes are close to their budget, so lazy-load the sheet, rest hero and coach tab where needed.

## Acceptance
- [ ] On a rest day, the player app turns calm blue, with sleep and soreness questions and the water glass working offline, synced later.
- [ ] On a training day, the home stays lime with a slim water strip under the workout and a readiness row.
- [ ] The coach sees the readiness tab with rings, flags, a decision card that applies to today's player workout, and a 7-day strip.
- [ ] `npx tsc --noEmit -p .`, `npx eslint .`, `npx vitest run --maxWorkers=2`, `npm run build` and the perf budget pass.
