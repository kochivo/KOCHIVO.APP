# T-256 — Program length in weeks

**Phase:** data gaps · **Depends on:** none · **Status:** ready
Shared rules: `docs/tasks/DATA-GAPS.md`. Board panel 4.

## Goal
The captain sets how many weeks a program runs. The app then shows «الأسبوع 6 من 12»:
- in the player file;
- in the programs library;
- on the player's program tab.

A week before a program ends, the captain gets a task «البرنامج بيخلص» so they can plan the next one.

## Files
- `supabase/migrations/<next>_program_weeks.sql`:
  - `programs.duration_weeks smallint` (1..52, nullable);
  - `programs.started_on date` (nullable), set by the existing assign path when a program is assigned to a player.
  - Templates keep `started_on` null.
- `supabase/tests/program-weeks.test.ts`
- `src/features/captain-workspace/training/`: a weeks stepper in the program editor header.
- `src/features/captain-workspace/` (library card tag, player file pill) and `src/features/player-home/`: the week pill and progress bar.
- `src/features/captain-workspace/queue/`: task kind `program_ending`.
- `src/lib/program-week.ts`: a pure `programWeek(startedOn, durationWeeks, today)` function, with unit tests.

## Requirements
1. The week number is `floor(days since started_on / 7) + 1`, capped at the duration. Use `localDate()`.
2. A null duration hides the pill. That covers old programs, so nothing else changes for them.
3. A program past its last week shows «خلص» and keeps working. Nothing is blocked.
4. Copying a template copies `duration_weeks`.

## Acceptance
- [ ] The editor saves the weeks.
- [ ] The pill shows the right week in the file, the library and the player app.
- [ ] The task appears 7 days before the end.
- [ ] Unit tests cover week 1, the middle, the last week, past the end and a null duration.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Automatic progression or deload weeks.
