# T-310: Ramadan mode

The owner approved the mockup on 2026-11-15: `docs/mockups/edge/edge-features-v1.html`, section `#ramadan` (screenshot `edge-ramadan.jpg`). Open it and match its three screens.

This must ship before Ramadan 2027 (about mid-February 2027).

## What exists today
- **Timezone:** `profiles.timezone` (0002), `public.safe_timezone(uuid)`, `public.user_today(uuid)` (0097), and app code in `src/core/timezone/`. There is no city, latitude or longitude for players.
- **Water:** `daily_checks.water_ml` (0056, `src/features/readiness`) and `nutrition_plans.water_target_ml` (0118).
- **Meals:** `meals` (0007) has `position` and `name` only, with no time column. Captain side is `src/features/meal-plans`; player side is `src/features/nutrition`.
- **Reminders:** `public.queue_workout_reminders()` plus the pg_cron job `workout-reminders` at a fixed 06:00 UTC (0052). Push is delivered by `supabase/functions/send-push`.
- **Captain settings:** columns on `profiles`, written in `src/features/settings/data/settings.ts` and `preferences.ts`. UI is in `src/features/settings/components/`.
- **Player home:** `src/features/player-home/components/home-screen.tsx` / `v3-home.tsx`.
- **Existing "ramadan" strings:** only billing offer presets. Do not touch them.

## Do

### 1. Migration `supabase/migrations/0122_ramadan_mode.sql` (additive only)
- **`profiles` columns:**
  - `ramadan_mode boolean not null default false` (captain);
  - `ramadan_training text not null default 'after_iftar_2h'` with check `in ('before_iftar_1h','after_iftar_2h','after_taraweeh','before_suhoor')`;
  - `ramadan_intensity text not null default 'lighter_20'` with check `in ('same','lighter_20','maintenance')`;
  - `ramadan_water_ml int not null default 3000` with check 1000–6000;
  - `prayer_city text` (player; null means "derive from timezone").
- **Not fasting:** table `ramadan_exempt(captain_id uuid, player_id uuid, primary key both, created_at)`.
  - RLS: the captain manages it for their own players (`is_captain_of`); the player can read their own row.
  - Add a PGlite test in `supabase/tests/ramadan-mode.test.ts`.
- **Meal slot:** `meals.ramadan_slot text null` with check `in ('iftar','post_workout','suhoor')`. Null means automatic: the first meal is iftar, the last is suhoor, and the rest go after the workout.
- **Player RPC:** `public.my_ramadan()` returns:
  - `active` (the captain's mode is on and the player is not exempt);
  - `training`, `intensity`, `water_ml`.
  - Use `security definer`, `set search_path = ''`, and `require_active_caller()` like recent functions.
- **Reminder job:** an hourly pg_cron job `ramadan-reminders` that queues one `workout_reminder` notification per active player per day, 30 minutes before their training time.
  - Compute that time in SQL from a `security_private.sunset_utc(date, lat, lng)` function that ports the same NOAA formula as the TS module.
  - Pass the city coordinates as values from a small `security_private.prayer_cities` table seeded with the same list.
  - Dedupe by `(player, date)`. Do not change the existing 06:00 job; skip it for active Ramadan players.

### 2. Pure module `src/lib/prayer-times.ts`
- `sunsetAndFajr(date: string, city: PrayerCity): { maghrib: Date; fajr: Date }`.
  - Use the NOAA solar formula. Fajr uses the Egyptian General Authority angle of 19.5°. Maghrib is sunset plus 1 minute.
  - No dependency. No network.
- `PRAYER_CITIES` gives code, lat, lng and timezone for about 25 cities:
  - all Egyptian governorate capitals;
  - Riyadh, Jeddah, Dubai, Kuwait, Doha, Amman, and London.
- `defaultCityForTimezone(tz)` maps `Africa/Cairo` to Cairo, `Asia/Riyadh` to Riyadh, and so on, with Cairo as the fallback.
- Tests: Cairo maghrib on known dates within ±3 minutes of the published Egyptian times. Put the expected values as constants in the test and note their source in a comment.

### 3. Captain screen (mockup phone 1)
- Add a «وضع رمضان» section in captain settings (`workspace-preferences.tsx` or a new `ramadan-settings.tsx`) with:
  - the toggle;
  - training-time chips;
  - intensity chips;
  - the water target;
  - the line «من أول رمضان لآخره، ويرجع لوحده بعد العيد.»;
  - the primary button «طبّق على N لاعب»;
  - a "not fasting" list where the captain picks players to exempt.
- Optimistic, with a success popup. Loading, empty and error states.
- **Auto-off:** compute Ramadan 1448 dates in `src/lib/ramadan-calendar.ts` with a hard-coded table for 2027–2030, and show the start and end dates.
  - When today is outside that range, `my_ramadan()` returns `active=false` even if the toggle is on.

### 4. Player home (mockup phone 2), only when `my_ramadan().active`
- **Iftar card:** a `glass-strong` countdown to maghrib in the player's city, with «رمضان · اليوم N» and the maghrib time.
- **«يومك» timeline:** suhoor, iftar, workout (from the training choice and the day's planned workout duration), post-workout snack, and next suhoor. The current item is lime.
- **Water cups:**
  - 8 cups (water_ml ÷ 8), counting only between maghrib and fajr;
  - a secondary button «شربت كوباية» that adds to `daily_checks.water_ml` through the existing readiness write path;
  - the line «فاضل N ساعات على السحور».
- **Workout intensity:** apply it at display time on the workout screen as a target-weight hint.
  - `lighter_20` shows the target load ×0.8 with a small «رمضان: أخف 20%» chip.
  - `maintenance` shows sets −1, with a minimum of 1.
  - Never write it into the program.

### 5. Player meals (mockup phone 3)
- When active, group the day's meals under «فطار · time», «بعد التمرين · time» and «سحور · time», using `ramadan_slot` or the automatic rule.
- Add a «رمضان» chip in the header.
- One static KO tip line from messages: «قلّل الملح في السحور عشان العطش.» (no LLM call).
- **Captain meal editor:** an optional «وقت رمضان» select per meal (automatic / فطار / بعد التمرين / سحور), shown only when the captain's Ramadan mode is on.

### 6. Player city
- In player settings near the timezone fields, add a «مدينتك (لمواعيد الصلاة)» select from `PRAYER_CITIES`.
- The default comes from the timezone.

## Rules
- Follow AGENTS.md. Use tokens only and logical properties, targets of at least 48px, the T-278 spacing and T-275 click cues, and the liquid buttons.
- Messages go in ar, arStd (standard files, `as const`) and en. English: "Ramadan mode", "Time to iftar", "Your day", "Water since iftar", "I drank a cup".
- No emoji. Numbers are LTR-isolated. Use `localDate()` for dates.
- Keep any new file under 250 lines.

## Tests
- `src/lib/prayer-times.test.ts` and `src/lib/ramadan-calendar.test.ts`.
- A slot-grouping unit test.
- Intensity display tests.
- `supabase/tests/ramadan-mode.test.ts` covers:
  - RLS on `ramadan_exempt`;
  - `my_ramadan()` active, inactive and exempt cases;
  - outside the date range;
  - the reminder dedupe.
- Render tests: the captain section, and player home with and without Ramadan.

## Out of scope
- Prayer-time notifications other than the workout reminder.
- Taraweeh times. Use isha + 1 hour as "after taraweeh", with isha = maghrib + 90 minutes in Ramadan per the Egyptian convention.
- Any change to billing offers.

## Gates
1. `npx vitest run src/lib src/features/player-home src/features/nutrition src/features/meal-plans src/features/settings src/features/workout supabase/tests/ramadan-mode.test.ts`
2. `npm run typecheck`
3. `npm run lint`

## Owner change (2026-11-16)

The owner chose this on 2026-11-16. It is sent as a follow-up after the first run.

1. **Captain settings.** The «وضع رمضان» section shows only from 14 days before the first day of Ramadan until the last day, using `src/lib/ramadan-calendar.ts`. Outside that window it is hidden completely. A toggle that was left on stays stored but does nothing (already true through `my_ramadan()`).
2. **Reminder.** Add a daily pg_cron job, in the same migration 0122, that fires on the day 14 days before Ramadan starts. It sends each active captain one notification of the new type `ramadan_soon`:
   - **Arabic:** «رمضان قرّب. تحب تشغّل وضع رمضان لفريقك؟»
   - **English:** "Ramadan is close. Turn on Ramadan mode for your team?"
   - **Tapping it** opens captain settings at the Ramadan section.
   - **Dedupe:** one per captain per year.
   - **Type list:** rebuild `notifications_type_check` the 0121 way, and add the type to `src/types/enums.ts`, `format.ts`, messages and push text.
3. **Tests.** The section is hidden outside the window and shown inside it. The reminder dedupe is covered in `supabase/tests/ramadan-mode.test.ts`.
