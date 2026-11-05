# T-057 — Weekly program cycle, explicit rest days and cardio

**Phase:** 3 · **Depends on:** — · **Status:** ready (owner request, 2026-11-04)

## Goal
The captain builds a fixed **7-day week (Saturday → Friday)** instead of an open "add day" list.
- Each day is a training day or a rest day.
- Each day can hold cardio blocks.
- The player sees today's day by weekday.

## Current state (read first)
- `program_days` is created in `0005_programs.sql` with columns `program_id`, `position` and `title`, and the player follows a rotation: `pickTodayDay` in `src/features/player-home/next-day.ts` moves to the next day after the last completed one.
- Rest days today come from the player's intake `training_days`.
- The builder lives in `src/features/programs/components` (`program-builder.tsx`, `day-editor.tsx`, `exercise-row.tsx`) and `data/program-io.ts`.
- Programs are copied by activation, templates and demo SQL (0017, 0022, 0030, 0036, 0031/0032) and by the offline snapshot (`src/core/offline`, `player-home/data/program-snapshot.ts`).

## Changes
1. **Migration `0050_weekly_cycle.sql`** (do not edit 0001–0049):
   - `program_days`:
     - add `weekday smallint` (0 = Saturday … 6 = Friday, check 0–6), nullable; null means a legacy rotation day.
     - add `is_rest_day boolean not null default false`.
     - add a unique `(program_id, weekday)` where weekday is not null.
     - A rest day must have no exercises; enforce this in the save path, and with a trigger or check if practical.
   - New table `program_cardio`:
     - columns `id`, `day_id → program_days on delete cascade`, `position`, `kind text` (1–40 chars), `minutes smallint` (1–300), `intensity text check in ('low','moderate','high')`, `notes text` (≤ 300).
     - unique `(day_id, position)` deferrable.
   - Give `program_cardio` RLS identical in spirit to `program_exercises`: the captain owns it through the program, the assigned player reads it, and the restrictive active/suspension policies match.
   - Weekly auto-repeat is stored in the existing `programs.settings` jsonb as `"repeatWeekly": true` (default true for weekly programs). No column.
   - **Update every SQL function that copies days or exercises** (activation, template copy, starter templates, demo seed) so `weekday`, `is_rest_day` and cardio rows are copied too. Use `create or replace` in 0050 and keep the signatures.
   - Add a PGlite test in `supabase/tests/` covering RLS (captain, assigned player, other player, anon), copying via activation and template, and rejecting exercises on a rest day.
2. **Builder UI:**
   - New programs show 7 fixed day cards labelled with weekday names (Arabic and English, starting Saturday). Empty days show as rest automatically.
   - Each day gets a toggle «تعيين كيوم راحة».
     - When on, hide add-exercise and add-cardio, and show a calm dashed `glass` card with a moon or coffee lucide icon and the text «يوم راحة واستشفاء».
     - Turning it on for a day that has exercises asks for confirmation before clearing them.
   - Each day gets a «+ إضافة كارديو» button that adds a cardio glass card with:
     - type (a free text with suggestions: مشي، جري، عجلة، إليبتيكال، نط حبل)
     - minutes (stepper)
     - intensity (3-option segmented control: خفيف / متوسط / عالي)
     - notes
     - reorder and delete
   - A program-level toggle «تكرار أسبوعي تلقائي» (on by default).
   - Legacy rotation programs (days with null weekday) keep their current editor. Offer «حوّله لأسبوع» to map days in order onto Sat… and leave the rest as rest days.
3. **Player:**
   - For weekly programs, today's day is chosen by `localDate()` weekday (Africa/Cairo), not by rotation. Rotation stays for legacy programs.
   - A rest day, or a weekday with no day, shows «اليوم راحة.. استمتع بالاستشفاء» in a calm glass card, and the next training day's name and weekday.
   - Cardio blocks show under the day's exercises as read-only glass cards (type, minutes, intensity, notes). Logging cardio is out of scope.
   - If `repeatWeekly` is false, after the first full week the program shows as finished until the captain renews it.
   - The offline snapshot must include `weekday`, `is_rest_day`, cardio and `repeatWeekly`, so the player works offline.
4. Tests:
   - Unit tests for the weekday mapping (Saturday = 0, Cairo timezone, injected `now`).
   - Weekly vs rotation selection.
   - Rest-day selection and next training day.
   - Snapshot shape.
   - Builder rest toggle clearing.
   - The PGlite RLS and copy tests above.

## Out of scope
Cardio logging by the player, adherence scoring, supplements (separate card).

## Requirements
- No new dependencies.
- Messages in `messages.ts` (Egyptian Arabic and English).
- Tokens only (`glass`, `glass-strong`, `bg-lime` only for the primary action).
- Logical RTL properties.
- Touch targets ≥ 48 px.
- Files under 250 lines.
- `uuidv7()` for new ids.
- Regenerate `src/types/database.ts` for the new columns and table by hand-editing in the existing style.

## Acceptance
- [ ] A captain builds Sat–Fri with 3 training days, 4 rest days and cardio on one day, saves, and activates it for a player.
- [ ] The player sees the right day by weekday, the rest message on rest days, and cardio cards. It works offline.
- [ ] Existing rotation programs and templates still work unchanged.
- [ ] `npm run check`, `npm run build`, the perf budget and the PGlite tests pass.
