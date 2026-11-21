# T-261 — Weekly adherence and sleep in check-ins

**Phase:** data gaps · **Depends on:** none · **Status:** ready
Shared rules: `docs/tasks/DATA-GAPS.md`. Board panel 9.

## Goal
Each weekly check-in shows three things:
- **Training adherence:** completed workouts ÷ planned training days that week.
- **Food adherence:** days with meal checks ÷ 7.
- **Average sleep hours:** from a sleep question in the check-in form.

The captain sees them in the player file check-in tab and on the «متابعة جديدة» task.

## Files
- `supabase/migrations/<next>_checkin_sleep.sql`:
  - `check_ins.sleep_hours numeric(3,1)` (0..16, nullable);
  - add `sleep` to the `form_questions.maps_to` allowed list, so form answers can fill it.
  - Adherence is computed, not stored.
- `supabase/tests/checkin-sleep.test.ts`
- `src/features/check-in/` (or the forms answer mapping): write `sleep_hours` from the mapped answer.
- `src/lib/weekly-adherence.ts`: a pure function from sessions, planned days and meal checks to `{ training, food }` percentages, with unit tests.
- `src/features/captain-workspace/player-file/` and `queue/`: three rings as on the board.

## Requirements
1. Week boundaries match the crown and perfect-week rule: a Saturday-start week in the player's timezone.
2. No planned days: show «—» for training, not 0%.
3. Sleep is shown only when it was answered.

## Acceptance
- [ ] The rings show the right numbers for a seeded week.
- [ ] The sleep answer from the form lands in the check-in.
- [ ] Unit tests cover the edge weeks.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Sleep tracking from wearables.
