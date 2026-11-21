# T-266 — Monthly income goal

**Phase:** data gaps · **Depends on:** none · **Status:** ready
Shared rules: `docs/tasks/DATA-GAPS.md`. Board panel 14.

## Goal
The captain sets a monthly income goal in EGP. The home income card then shows:
- this month's collected amount against the goal;
- a progress bar;
- «فاضل X جنيه · N يوم».

## Files
- `supabase/migrations/<next>_income_goal.sql`:
  - `profiles.monthly_income_goal_egp int` (1..10,000,000, nullable).
  - Captain-only update, through the existing profile update path or a narrow RPC.
- `supabase/tests/income-goal.test.ts`
- `src/features/settings/`: a goal field in captain settings.
- `src/features/captain-workspace/` (home): the income card with the goal. With no goal set, it shows the amount and a «حط هدف» link.

## Requirements
1. "Collected this month" uses the same sum as the existing billing summary, so the two numbers match.
2. Days left are counted in the captain's timezone.

## Acceptance
- [ ] Set the goal and see the bar.
- [ ] Without a goal, the card shows the amount only.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Yearly goals and forecasts.
