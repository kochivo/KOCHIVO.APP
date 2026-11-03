# T-036 — Smart empty states everywhere

**Phase:** 3 · **Depends on:** T-030, T-031, T-033 and T-034 merged (they touch the same screens) · **Status:** queued

## Goal
Every list or screen that can be empty tells the user why it is empty, and gives one clear button for the next step.

## Already done (commit 89e0926), keep as is
- The inbox (none pending, none reviewed, none of this type), the roster (no players, with steps; no filter results, with a clear-filters action) and the dashboard (no players).
- Do not rewrite them; only fix one if the audit finds it has no CTA.

## Files
- An audit first: list every list or async view in `src/features/**` and what it shows when empty. Put the audit table in the final report.
- For each one, use the shared `EmptyState` from `src/ui`:
  - icon, title and body
  - optional `steps`
  - one `action` (the next step), plus an optional `secondary`
- Make sure every action leads somewhere that works. Known screens:
  - Captain:
    - Players: no players → invite
    - Inbox: nothing pending → a link to the players
    - Templates: none of your own → copy a starter
    - Billing: no packages → create a package
    - Programs or nutrition for a player: none → start from a template, or create one
    - Profile tabs: no intake, weights, check-ins or voice notes, each with the right next step
    - Dashboard: no alerts
  - Player:
    - Home: no program yet → message the coach
    - Nutrition: no plan
    - Progress: no check-ins → send the first one
    - Coach page: no voice notes
    - Workout history: none
- `EmptyState` gets an `href` option for `action`, for link actions, without breaking the current `onClick` callers.
- `messages.ts` in each touched feature.
- Tests: a render test for each touched screen's empty branch, checking that the CTA exists and has the right target.

## Requirements
- One primary action per empty state.
- Copy: an invitation, not an apology. Egyptian Arabic, and plain English.
- Do not change data or business logic.

## Acceptance
- [ ] The audit table shows no empty view without a CTA.
- [ ] `npm run check`, `npm run build` and the perf budget pass.
