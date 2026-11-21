# T-269 — Form scale question: 1–5 or 1–10

**Phase:** data gaps · **Depends on:** none · **Status:** ready
Shared rules: `docs/tasks/DATA-GAPS.md`. Board panel 17.

## Goal
In the form editor, a `scale` question can be 1 to 5 or 1 to 10, and the captain chooses which. The player sees 5 or 10 buttons. Answers, charts and alerts read the max from the question.

## Files
- `supabase/migrations/<next>_form_scale_max.sql`:
  - `form_questions.scale_max smallint not null default 10`, with check `in (5,10)`.
  - Update the answer validation (wherever a scale answer is checked against 1..10) to use `scale_max`.
- `supabase/tests/form-scale-max.test.ts`: an answer of 6 on a 1-5 question is rejected, and old questions accept 1..10.
- `src/features/forms/`: the editor choice (`seg2` as on the board), the player answer buttons, and the chart axis.

## Requirements
1. Existing questions stay 1-10 and render exactly as today.
2. `alert_on` thresholds are checked against the chosen max.

## Acceptance
- [ ] The captain makes a 1-5 question and the player answers it.
- [ ] Old forms are unchanged.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Other question types.
