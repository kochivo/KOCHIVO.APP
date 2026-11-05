# T-003c — Player intake: table, RLS, and validation

**Phase:** 1 · **Depends on:** T-002 merged (same test folder) · **Status:** ready
**Delegate to:** Codex

## Goal
Right after a player accepts the invite, a step-by-step questionnaire collects:
- age, height, and current and target weight
- the training days available in their week
- injuries, food allergies, and medical contraindications

The answers become the "player file" the captain sees. This card builds the data side only: the table, its security, and the validation the wizard will use. The wizard UI is a later card (T-003d).

This is health data. Only the player and their own active captain may ever read it.

## Files
- `supabase/migrations/0012_player_intake.sql` (new)
- `supabase/tests/rls-intake.test.ts` (new)
- `src/features/onboarding/data/intake-schema.ts` (new): zod schema plus the option lists
- `src/features/onboarding/index.ts` (new): exports the public API only
- `src/features/onboarding/onboarding.test.ts` (new)

## Requirements

**Table `public.player_intake`.** One row per player, with `player_id uuid primary key references public.profiles(id) on delete cascade`.

| Column | Type and constraint |
|---|---|
| `birth_year` | `smallint`, check 1930–(current year − 10) |
| `sex` | `text`, check in (`male`, `female`) |
| `height_cm` | `numeric(5,1)`, check 100–250 |
| `weight_kg` | `numeric(5,1)`, check 25–300 |
| `target_weight_kg` | `numeric(5,1)`, check 25–300, nullable |
| `training_days` | `smallint[]` of weekday numbers 0–6 (0 = Saturday, the Egyptian week start). Check: array length 1–7, no duplicates, all values in range. |
| `session_minutes` | `smallint`, check in (30, 45, 60, 90) |
| `experience` | `text`, check in (`new`, `under_1y`, `1_3y`, `over_3y`) |
| `injuries` | `text[]`, default `'{}'` |
| `allergies` | `text[]`, default `'{}'` |
| `medical` | `text[]`, default `'{}'` |
| `notes` | `text`, check length ≤ 500, nullable |
| `completed_at` | `timestamptz`, nullable (null means the wizard is in progress) |
| `created_at`, `updated_at` | usual pattern, with the `public.touch_updated_at()` trigger |

The three `text[]` columns hold chip keys (see option lists below). `notes` is the only free-text field.

**RLS**
- Enable RLS.
- The player can select, insert, and update only their own row (`player_id = auth.uid()`).
- The player's active captain can only select, via `public.is_captain_of(player_id)`.
- No delete policy. Nothing is granted to `anon`.
- Follow the style of `0003`–`0008`: policy names, `search_path = ''`, fully qualified names.

**Option lists** (`intake-schema.ts`). Each list is `as const` arrays of `{ key, label }`, with Arabic labels in short Egyptian Arabic. Each list also includes a `none` key (`مفيش`).
- **Injuries:** knee, lower_back, shoulder, neck, wrist, ankle, hip, other.
- **Allergies:** lactose, gluten, nuts, eggs, seafood, other.
- **Medical:** heart, blood_pressure, diabetes, asthma, recent_surgery, pregnancy, other.
- **`none` rule:** selecting `none` must be exclusive. The zod schema rejects `none` combined with anything else. A pure helper `toggleChip(list, key)` implements it for the UI: picking `none` clears the others, and picking another key removes `none`.

**Zod schema**
- Mirrors the SQL constraints, so the client rejects what the database would reject.
- Exposes `intakeSchema` (full) and `stepSchemas` (one per wizard step).
- The steps are: `basics` (birth_year, sex, height, weight, target), `schedule` (training_days, session_minutes, experience), `health` (injuries, medical), `food` (allergies, notes).
- Takes the current year as a parameter: `makeIntakeSchema(now: Date)`. No hidden `new Date()`.

## Acceptance
- [ ] RLS tests in `rls-intake.test.ts`, using the `harness.ts` helpers:
  - player P inserts and updates their own row
  - P cannot read or write another player's row
  - P's captain can read it but cannot update it
  - captain B cannot read it
  - a captain whose link to P is not active cannot read it
  - `training_days` with a duplicate or a value of 7 is rejected by the database
- [ ] Unit tests:
  - `toggleChip` exclusivity, in both directions
  - each step schema accepts a valid sample and rejects one bad value per field
  - the `birth_year` bounds move with the injected `now`
- [ ] No change to migrations 0001–0009
- [ ] `npm run check` and `npm run build` pass

## Out of scope
- The wizard screens (T-003d)
- Routing after invite redemption (T-003)
- Showing the file in the captain dashboard (T-009)

## References
- `supabase/migrations/0003_coach_clients.sql`: `is_captain_of`
- `supabase/tests/rls.test.ts` and `harness.ts`
- `AGENTS.md` §3
