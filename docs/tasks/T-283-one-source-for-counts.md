# T-283 — The same number everywhere: counts and "ending soon"

**Phase:** captain v11 fixes · **Depends on:** none · **Status:** ready
Read `AGENTS.md`, `DESIGN.md` and `docs/tasks/V11-FIDELITY.md` first.

## Goal
On 2026-11-14 the owner saw different numbers for the same thing on different screens. For example, the home screen said one number of tasks, and the tasks screen showed another. A captain who sees two numbers trusts neither. After this card, each fact is computed in one place and every screen reads it from there.

## Known mismatches
1. **"Ending soon" uses 4 different windows today:**
   - `src/features/billing/components/workspace-billing-summary.ts` `expiringSoon()` lists players ending within **30** days, but the tile in the same file counts **7**.
   - `src/features/captain-workspace/queue/tasks-model.ts` creates renew tasks for **0–7** days.
   - `src/features/ko-account/data/read-progress.ts` uses **0–7** days.
   - The KO feed SQL function (last replaced in `supabase/migrations/0089_swap_reasons.sql`) uses **0–3** days (`l.today+3`).

   The owner's rule: **"بيخلص قريب" means the access ends within 7 days, today included**, on every screen.
   - Add one shared constant and helper in `src/lib/` (for example `ENDING_SOON_DAYS = 7` and `endingSoon(today, accessUntil)`), with unit tests, and use it in every client place above.
   - The billing list may still show everything ending within 30 days, but its title and count must say what they mean, for example «بيخلصوا الشهر ده». "Ending soon" stays 7 everywhere.
   - For the KO feed, add migration `0109_ending_soon_window.sql`. It is a `create or replace` of the same feed function with `today+7`, copied from the latest version, with nothing else changed. Add a PGlite test in `supabase/tests/`. Do not edit old migrations. The owner applies migrations to production separately.
2. **Home versus tasks counts.**
   - List every place that shows a count to the captain: the home "needs you today" list and its counter, the home summary tiles, the tasks screen tabs and total, the sidebar and bottom-nav badges, the inbox badge, the billing tiles, and the KO digest.
   - For each one, write down the source function and the filter it uses.
   - Make the same fact come from the same function. For example, the home task counter must equal the tasks screen total for the same day and filters.
   - When two screens intentionally count different things, give them labels that say so.
3. Fix any other mismatch you find in that list, the same way.

## Files
- `src/lib/` (the new helper and its test).
- The billing summary, tasks model, ko-account progress and the home and badge components that compute counts.
- `supabase/migrations/0109_ending_soon_window.sql` and its test.
- The messages for any label that changes (`ar`, `arStd`, `en`).

## Requirements
- **Tests:** add a test that feeds one fixture roster to every count function and asserts that they agree. Inject `today` into it.
- **Final message:** a table with the columns place, fact, source before, source after, and window or filter.
- **Scope:** no layout changes and no new features.

## Acceptance
- [ ] "Ending soon" is 0–7 days everywhere, including the KO feed after 0109.
- [ ] The home and tasks screens show the same task count for the same data.
- [ ] `npm run check` and `npm run build` pass.
