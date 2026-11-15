# T-313: Women's mode

The owner approved the mockup on 2026-11-15: `docs/mockups/edge/edge-features-v1.html`, section `#women` (screenshot `edge-women.jpg`). Match it, with the changes below.

## Owner decisions
- **Only female players see it.** It shows only when `player_intake.sex = 'female'`. Male players, and players with no intake, never see any cycle UI, setting or text.
- **The player opts in herself.** She is asked once, «تحبي تشغّلي متابعة الدورة؟». If she says no, it stays off until she turns it on in settings.
- **The captain sees only «يوم خفيف».** No dates, no cycle data, no reason.
- **The «كابتنة» filter** shows only to female players.

## What exists today
- **Intake `sex`:** defined in 0012. It is read in:
  - `src/features/onboarding/components/step-basics.tsx`;
  - `src/features/player-profile`;
  - `src/features/captain-workspace/player-file/overview-facts.tsx`;
  - the meal-plan calculator.
- **Progress photos:** `check_ins.photo_paths` / `photo_poses` (0048), private bucket `checkin-photos` (0009). RLS `private_media_read` allows the owner or `is_captain_of(owner)`. UI: `src/features/progress/components/progress-gallery.tsx`, `player-gallery.tsx`, `checkin-sheet.tsx`.
- **Coach page:** `src/app/[locale]/c/[slug]/page.tsx`, feature `src/features/coach-page`. There is **no coach directory** and no captain gender field.
- **Templates:** `src/features/templates`. Starter templates are in 0030 and `supabase/seed/source/starter-templates.json`.

## Do

### 1. Migration `supabase/migrations/0125_women_mode.sql` (additive only)
- **Table `cycle_settings`:**
  - `player_id primary key`;
  - `enabled boolean`, `asked_at`;
  - `avg_cycle_days smallint default 28` (21–40), `avg_period_days smallint default 5` (2–10);
  - `light_days smallint default 2` (0–5);
  - `photos_captain boolean default true`, `photos_share boolean default false`.
- **Table `cycle_logs`:** `(player_id, start_date date, primary key both)`.
- **RLS on both:** the player reads and writes only her own rows. **The captain cannot read either table.** Test that explicitly.
- **Insert guard:** inserts are allowed only when the player's intake `sex = 'female'`. Enforce it in a check function used by the policy.
- **RPC `public.player_light_day(p_player uuid, p_date date)`** returns a boolean.
  - `security definer`, callable by the captain of that player or the player.
  - It returns true when cycle tracking is enabled, `p_date` is within `light_days` of the latest period start, and the player has not set «اتمرني عادي» for that date.
  - It returns nothing else.
- **Table `cycle_overrides(player_id, day date)`:** the player's «اتمرني عادي» for one day. Same RLS as `cycle_logs`.
- **Photo privacy:** change `private_media_read` for the `checkin-photos` bucket with a new policy (drop/recreate is allowed in the new migration). The captain can read a female player's check-in photos only when `cycle_settings.photos_captain` is not false. With no row, keep today's behavior.
- **Captain field:** `profiles.coach_gender text null` with check `in ('male','female')`, set by the captain in settings, optional.
- Test: `supabase/tests/women-mode.test.ts`.

### 2. Player
- **One-time prompt:** after intake, or on next home open for an existing female player, show a card with «تحبي تشغّلي متابعة الدورة؟» and buttons «آه» / «لا شكرًا». Record `asked_at` either way.
- **Cycle strip (mockup phone 1):**
  - 7 days, period days in rose, today outlined in lime;
  - a «سجلي أول يوم» button that adds a `cycle_logs` row with today;
  - the chip «محدش يشوفها غيرك».
- **On a light day:**
  - the soft card «يومك الأول · تمرين أخف النهارده»;
  - the workout screen shows target loads ×0.85 and hides exercises tagged as heavy core, if such a tag exists (otherwise only the load hint);
  - a «اتمرني عادي» switch that writes `cycle_overrides`;
  - the line «الكابتن بيشوف إيه؟ «يوم خفيف» بس.».
  - Display only; never change the program.
- **Settings:** a «متابعة الدورة» section (female players only) with:
  - on/off;
  - average cycle and period days;
  - light days;
  - photo privacy toggles: «الكابتنة بتاعتي» → `photos_captain`, «في كارت التحول» → `photos_share`.
  - Mockup phone 2: the gallery shows locked, blurred thumbnails until tapped.
- **Colour:** rose is a new token; add `--color-rose` to `globals.css` `@theme`. No hex in components.

### 3. Captain
- The player file and the today list show a neutral chip «يوم خفيف» when `player_light_day` is true. Nothing else is shown.
- **Captain settings:** an optional «أنا» select (كابتن / كابتنة) for `coach_gender`.
- **Public coach page `/c/[slug]`:** when `coach_gender='female'`, show a «كابتنة» chip.

### 4. Female coach filter
There is no coach directory yet.
- Add only the data, `coach_gender`, and the chip on the coach page.
- Write in the result notes that the directory filter waits for a directory. Do not build a directory.

### 5. Templates
- Add three starter program templates to `supabase/seed/source/starter-templates.json` (seed only, following the existing format):
  - «بعد الولادة» (gentle, 3 days);
  - «تمرين في البيت للبنات» (bodyweight, 3 days);
  - «قوة للبنات» (4 days).
- Prefix every exercise note for the post-natal one with «بإذن الدكتور».

## Rules
- Follow AGENTS.md. Use tokens only, logical properties and targets of at least 48px.
- Messages go in ar, arStd and en. Use feminine Arabic for female-player text.
- English: "Cycle tracking", "Only you can see this", "Light day", "Train as usual", "Log day one".
- No emoji. Keep any new file under 250 lines.
- **Privacy:** never send cycle data to KO, analytics, Sentry breadcrumbs or notifications.

## Tests
- `supabase/tests/women-mode.test.ts`:
  - the captain cannot select either cycle table;
  - male players cannot insert;
  - `player_light_day` true and false cases, and the override;
  - the photo policy with `photos_captain` false or true, and with no row.
- A pure `light-day.ts` unit test, shared by the UI.
- Render tests:
  - the male player sees nothing (home, settings, workout);
  - the female prompt;
  - the strip;
  - the captain chip shows only «يوم خفيف».

## Out of scope
- A coach directory.
- Pregnancy tracking.
- Ramadan (T-310), pain (T-311), budget food (T-312).

## Gates
1. `npx vitest run src/features/player-home src/features/settings src/features/progress src/features/workout src/features/captain-workspace src/features/coach-page supabase/tests/women-mode.test.ts`
2. `npm run typecheck`
3. `npm run lint`
