# T-191: Assessments library and per-player scheduling (mockup v6, screens ٥ and ٦)

**Phase:** Captain workspace v6 (owner approval 2026-11-12: "نفس الشكل 100%"; name «التقييمات» / "Assessments") · **Depends on:** T-188 · **Status:** ready
**Migration:** `0096_assessment_schedules.sql`, **additive only**, not applied. Applying it to production needs the owner's approval.
**Flag:** behind `captainWorkspaceEnabled()`; flag off byte-identical.

## Goal
"Forms" become **Assessments** (التقييمات): question sets the captain asks players to answer once, weekly, monthly, every N days, or when a player joins. Today a schedule belongs to the whole form and goes to every player. The owner wants to schedule an assessment **per player** at a time the captain chooses. Build screens ٥ and ٦ exactly.

Read first: `docs/mockups/captain-workspace/v6-owner-review.html` (screens ٥ and ٦), `docs/mockups/captain-workspace/v6-spec.md`, migrations `0091_custom_forms.sql` and `0093_form_schedules.sql`, and `src/features/forms/`.

## Files
- `supabase/migrations/0096_assessment_schedules.sql` + PGlite tests in `supabase/tests/`.
- `src/types/` database overlay for the new table.
- `src/features/forms/` (library page, builder, schedule editor, request picker, data) and `src/features/captain-workspace/forms/` (player tab), tests, messages (`ar`/`en` only).
- The التقييمات tab slot in the T-188 shell and `/captain/players/[playerId]/assessments` content.
- This card.

## Requirements
1. **Database (additive):**
   - New table `public.assessment_schedules`: `id uuid pk`, `form_id` → forms, `captain_id`, `player_id` (nullable = all active players of the captain), `kind text check in ('once','week','month','days','on_join')`, `every_days int null` (2–60 for `days`), `weekday int null`, `day int null`, `hour int`, `minute int default 0`, `starts_on date`, `ends_on date null`, `max_times int null`, `remind_after_hours int null`, `paused_at timestamptz null`, `created_at`, `updated_at`. Checks for each kind's required fields.
   - RLS: captain can CRUD own rows only; player can read rows that target them; nobody else. PGlite RLS tests.
   - New owner-only worker function `queue_assessment_schedules(p_now)` that creates `form_requests` for due schedules using the **player's timezone** (`profiles.timezone`, default Cairo), idempotent per period (same pattern as `queue_form_schedules`). Register its cron job gated by the same `app.captain_workspace_enabled` setting. Do **not** change or drop `queue_form_schedules` or `forms.schedule`; existing whole-form schedules keep working and show in the UI as "all players".
2. **Library = screen ٥:** header «التقييمات» + subline + primary «تقييم جديد»; four tiles (مستني رد، اتردّ عليه الأسبوع ده، نسبة الرد، متوسط وقت الرد) from the existing metrics; rows: name + «{n} أسئلة · …», who receives it («{n} لاعيبة» / player name / «كل لاعب جديد»), schedule summary with icon, response rate, chevron; «ابدأ من قالب جاهز» chips: متابعة أسبوعية، قياسات شهرية، تقييم بداية، صور تطور (use the existing templates; add «صور تطور» as a template).
3. **Schedule for a player = screen ٦** (from the player file التقييمات tab and from an assessment's page):
   - Side panel «تقييمات {name}» with each assessment and its next date or last answer, and «ابعت تقييم دلوقتي» (existing manual send).
   - Step ١ «أنهي تقييم؟» chips + «جديد». Step ٢ «امتى؟»: مرة واحدة / كل أسبوع / كل شهر / كل كام يوم, with the matching fields (كل {n} أيام، الساعة، يبدأ من) and end: لحد ما أوقفه / لحد {date} / عدد مرات. Step ٣ «لو ماردّش»: من غير تذكير / فكّره بعد 12 ساعة / فكّره بعد يوم.
   - The lime summary sentence that states exactly what will happen, in the player's timezone, including the count of sends when it ends.
   - «جدولة» (primary) and «إلغاء». Edit, pause and delete an existing schedule.
4. **Rename:** every captain and player string says «تقييم / التقييمات» ("Assessment(s)"). Routes and code names stay `forms`.
5. Copy every Arabic string from the mockup exactly. `ar` + `en` only.

## Acceptance
- [ ] Matches mockups ٥ and ٦ at 1440×900 and 390×844 (differences listed).
- [ ] PGlite: table checks, RLS (captain/player/other captain/anon), worker idempotency, player-timezone due times (Cairo, Riyadh, London DST), on_join.
- [ ] Unit tests: summary sentence, next-date maths for every kind, end conditions.
- [ ] Existing form schedules and requests unchanged (test).
- [ ] Flag off byte-identical; all gates pass; budgets unchanged.

## Out of scope
- T-183 (moving the old Cairo-only database functions to per-user timezones).
- Applying the migration to production.
