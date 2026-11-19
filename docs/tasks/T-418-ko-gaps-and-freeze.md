# T-418: KO respects the start form, mentions cardio, and freezes end at local midnight

**Depends on:** T-413 landed (it touches `ai-tools/data/player-workout.ts`) · **Status:** ready · **Source:** full audit 2026-11-19

## Problems
1. **KO shows the workout before a required start assessment is answered.**
   - The start gate replaces home content (`player-shell/components/player-shell.tsx:93`), but the KO launcher sits outside it (`app/[locale]/(player)/player/layout.tsx:11`).
   - KO's workout read (`ai-tools/data/player-workout.ts:24`) and facts do not check outstanding required forms.
2. **KO leaves cardio out.** A cardio-only day «Conditioning» with a 30-minute bike block replies only «تمرين النهارده: Conditioning» (`player-workout.ts:26`, `ko-account/data/execute.ts:54`). Player home shows the cardio (`player-home/components/day-preview-card.tsx:41`).
3. **A freeze ends about two hours late.**
   - Access checks use `frozen_at` until the daily release job runs at 06:10 UTC, which is 08:10 in Cairo (`supabase/migrations/0150_freeze_requests.sql:102`, `0139_waiting_access.sql:4`).
   - The player sees a return date (`billing/freeze/player-freeze.tsx:41`) but stays locked on its morning.

## Requirements
1. While the player has an outstanding required start form, KO plan reads and writes (`my_workout`, `read_exercise`, `read_nutrition`, `log_meal`, `swap`, facts) reply with a short message pointing to the form. Reuse the same check the start gate uses; do not duplicate the rule.
   - Messages go in `ko-account/messages.ts` and the standard file, with `ar`, `arStd` and `en`.
2. KO's workout answer and facts include cardio blocks with type and minutes, as player home shows them.
3. **Freeze:** access returns at 00:00 on the shown return date in the captain's timezone.
   - New migration `supabase/migrations/0161_freeze_local_release.sql`: the access checks treat a freeze as ended when `frozen_until` ≤ the local date (using the existing timezone helpers from `0097_timezone_aware_functions.sql`). The release job still finalizes it.
   - `create or replace` only, additive, same grants.
   - Add a PGlite test at 07:00 Cairo on the return date: access is allowed.

## Notes
- Do not apply the migration. The reviewer applies it after the owner approves.

## Out of scope
- Start-gate UI.
- Freeze request UI.

## Tests
- KO with an outstanding form gets the form message and no exercises.
- A cardio-only day is answered with the bike block and its minutes.
- PGlite freeze boundary.

## Checks
- `npx tsc --noEmit -p .`
- `npx eslint src/features/ko-account src/features/ai-tools src/features/billing`
- `npx vitest run src/features/ko-account src/features/ai-tools src/features/billing src/features/player-shell supabase/tests src/core/i18n/coverage.test.ts`
