# T-311: «عندي وجع» pain report

The owner approved the mockup on 2026-11-15: `docs/mockups/edge/edge-features-v1.html`, section `#pain` (screenshot `edge-pain.jpg`). Match its three screens.

**Owner decision:** KO suggests a safe swap at once, before the captain answers, and always shows the "see a doctor if sharp or swollen" note.

## What exists today (reuse it)
- **Set screen:** `src/features/workout/components/workout-set.tsx`, plus `set-controls.tsx` and `focus-screen.tsx`. T-309 just added `ExerciseVideo` there, so keep it.
- **Alternatives:**
  - DB: `program_exercises.alternatives uuid[]` (0100).
  - Snapshot: `alternative_exercises` in `src/core/offline/db.ts`.
  - UI: `exercise-alternatives.tsx`.
  - Swap logic: `src/features/workout/data/exercise-choices.ts`.
- **Swap requests:**
  - Table `exercise_swap_requests` (0080) with `injury in ('knee','shoulder','lower_back')`, plus `reason` (0089) and its request RPC.
  - Captain decision: `src/features/ko-feed/data/decide-swap.ts`.
  - Generator swap options: `src/features/program-generator/swap-options.ts` and `src/features/ko-account/data/swap.ts`.
- **Notifications:**
  - Copy the type-check rebuild pattern in `0121_medal_ranks.sql`.
  - Add the type to the `NotificationType` union in `src/types/enums.ts`.
  - Update `src/features/notifications/format.ts` (text key, icon, href) and its messages plus `standard/`.
  - Push text goes in `supabase/functions/send-push/messages.ts`.
- **Program editing:** `src/features/programs/data/program-io.ts`.
- **Intake:** `player_intake.injuries text[]`.

## Do

### 1. Migration `supabase/migrations/0123_pain_reports.sql` (additive only)
- **Table `pain_reports`:**
  - `id uuid primary key` (stableId from session id + program exercise id + set index on the client);
  - `player_id`, `captain_id`;
  - `session_id` (nullable), `program_exercise_id` (nullable), `set_index` smallint (nullable);
  - `area text` with check in a fixed list: `neck, shoulder_l, shoulder_r, elbow_l, elbow_r, wrist_l, wrist_r, upper_back, lower_back, chest, hip_l, hip_r, knee_l, knee_r, ankle_l, ankle_r, other`;
  - `side_view text` with check `in ('front','back')`;
  - `severity smallint` 1–5;
  - `kind text` with check `in ('sharp','strain','tired')`;
  - `status text default 'open'` with check `in ('open','answered')`;
  - `reply text` (nullable) with check `in ('swap_2w','reduce_20','rest_week','talk')`;
  - `answered_at`, `created_at`.
- **RLS:**
  - The player inserts and reads their own rows.
  - The captain reads and updates (reply only) rows of their players, using `is_captain_of`.
  - Nobody deletes.
  - Test: `supabase/tests/pain-reports.test.ts`.
- **Notification:** a trigger on insert queues a notification of new type `player_pain` to the captain. Rebuild `notifications_type_check` the 0121 way.
- **RPC `public.answer_pain(p_report uuid, p_reply text)`** (captain only) sets reply and status, then notifies the player with new type `pain_answered`. It applies the reply:
  - `swap_2w`: approve the KO-suggested swap through the same path `decide-swap.ts` uses, by creating or approving an `exercise_swap_requests` row with `reason='injury'`. Map the area to `injury` where possible (knee, shoulder, lower_back); otherwise use `discomfort`.
  - `reduce_20`: store a per-player load hint (`program_exercises` is shared by template, so add `pain_load_hints(player_id, program_exercise_id, factor numeric, until date)` with RLS). The workout screen shows the target ×0.8 for 14 days.
  - `rest_week`: insert `pain_load_hints` with factor 0 for every exercise in that player's active program that hits the same body region, for 7 days. The workout screen shows «الكابتن قال ريّح ده الأسبوع ده» and lets the player skip it.
  - `talk`: only opens the chat. Nothing else changes.
- **Repeat count:** a helper `pain_repeat_count(player, area)` counts reports for the same area in the last 30 days. Include it in what the captain alert reads.

### 2. Player flow (mockup phones 1 and 2)
- **Button:** a secondary icon button «عندي وجع» on the set screen with a translated aria-label. Lucide `HeartPulse` or `Bandage`.
- **Sheet with three steps on one screen:**
  - a body map SVG (front/back toggle) whose areas are buttons of at least 48px;
  - severity 1–5;
  - kind chips;
  - the primary button «ابعت للكابتن».
- **Saving:** write locally first (Dexie) and send through `saveAndQueue()` so it works offline. Register the table in the offline sync, following how meal logs or sets are registered.
- **After sending:**
  - The alert card «وقفنا <exercise> النهارده».
  - The KO safe swap: pick from the exercise's `alternative_exercises` the first one whose movement pattern does not load the area. Add a pure rule map `src/features/workout/pain-safe-swap.ts` from area to blocked patterns or muscle groups, using the exercise fields that exist; inspect the exercise catalog columns. If nothing is safe, show «كمّل باقي التمرين من غير تمارين <المنطقة>».
  - The doctor note, always shown.
  - The buttons «استخدم البديل» (primary, uses the existing swap path in `exercise-choices.ts` for this session only) and «كمّل من غير ...» (secondary, skips this exercise's remaining sets).
- Severity 5 or kind `sharp` shows the doctor note at the top in danger color.

### 3. Captain alert (mockup phone 3)
- The `player_pain` notification opens a sheet or page in the captain workspace (a `pain-alert` component in captain-workspace) showing:
  - player, area, severity, kind, exercise and set;
  - «من N دقايق»;
  - «تاني مرة الشهر ده في نفس المكان» when repeat ≥ 2;
  - four quick-reply buttons that call `answer_pain`;
  - the line «أي اختيار بيتعدّل في برنامجها على طول، ويوصلها إشعار.».
- Mark it urgent in the notification dropdown (danger chip «عاجل»).
- Show open pain reports at the top of the captain player file.

### 4. Copy
- Messages in ar, arStd and en. English: "I'm in pain", "Where does it hurt?", "How bad?", "Send to coach", "Use the swap", "If it's sharp or swollen, stop and see a doctor."
- Gender-neutral Arabic for the player-facing text. The captain text uses the player's name.

## Rules
- Follow AGENTS.md. Use tokens only, logical properties and targets of at least 48px.
- No hex colours in components. The body-map SVG uses `currentColor` and token classes.
- Keep any new file under 250 lines.

## Tests
- `pain-safe-swap.test.ts`.
- `supabase/tests/pain-reports.test.ts`:
  - RLS;
  - the notification trigger;
  - `answer_pain` for each reply;
  - repeat count;
  - a player cannot answer.
- Render tests:
  - the sheet;
  - the after-send card with and without a safe swap;
  - the captain alert;
  - the offline save goes to the queue.
- Load-hint display tests on the workout screen.

## Out of scope
- An LLM call. The "KO" suggestion here is rule-based.
- Medical advice beyond the fixed doctor note.
- Ramadan (T-310), budget food (T-312), women's mode (T-313).

## Gates
1. `npx vitest run src/features/workout src/features/notifications src/features/captain-workspace src/core/offline supabase/tests/pain-reports.test.ts`
2. `npm run typecheck`
3. `npm run lint`
