# T-034 — Optimistic captain actions

**Phase:** 3 · **Depends on:** none · **Status:** ready

## Goal
Every captain action should feel instant: the UI changes the moment the captain taps, then the server confirms. If the server rejects the change, the UI rolls back and shows the error.
Several actions still wait for a Supabase round-trip, or for `router.refresh()`, before anything changes on screen.
The workout logging and meal logs already go through the offline queue and are instant; do not touch them.

## Files
Create or modify only these:
- `src/lib/optimistic.ts` (new): a small pure helper, `applyOptimistic(state, change, commit)`, or a React hook in the feature folders if a hook fits better. It applies a change, runs the server call, and rolls back on failure. Unit-test it.
- `src/features/roster/components/roster-row.tsx`, `roster-screen.tsx`: archiving a player removes the row at once, with no wait for `router.refresh()`. On failure the row comes back and the error shows on the row.
- `src/features/inbox/components/inbox-screen.tsx`: sending a review or reply moves the item to "reviewed" at once and closes the dialog. On failure the item goes back to open and the error shows.
- `src/features/billing/components/player-billing-row.tsx`: renewing and recording a payment update the access date and the dues badge at once. Background `router.refresh()` is fine after that, but the UI must not wait for it. On failure, roll back.
- `src/features/templates/components/templates-screen.tsx`: rename, delete and duplicate update the list at once (a duplicate shows a placeholder row until the server returns the real id). On failure, roll back.
- `src/features/settings/components/settings-screen.tsx` (or its toggle rows): toggles flip at once and roll back on failure, if they don't already.
- The tests next to each feature (`*.test.ts`):
  - the rollback-on-failure path for each action above
  - the pure helper tests
  - deterministic: no real timers and no network

## Requirements
1. The server stays the source of truth. After a success, reconcile with what the server returned (a real id, or a new date).
2. Rollback restores the exact previous state, and shows the existing translated error text near the control. Do not add toasts; a toast component is coming in another card.
3. Prevent double submits while a change is in flight; disable only the affected control, not the whole screen.
4. Keep files under 250 lines, and keep all strings in `messages.ts` (add keys only if an error message is missing).
5. No new dependencies. Do not touch `src/ui/**` (another card is changing it), `src/features/meal-plans/**`, `src/features/programs/**`, or `src/features/workout/**`.

## Acceptance
- [ ] Each of the actions above changes the UI immediately; with the network throttled, the change still appears at once.
- [ ] Forcing a server error rolls the UI back and shows the error.
- [ ] The new tests pass; `npm run check` and `npm run build` pass; the perf budget test passes after the build.

## Out of scope
- Skeletons and toasts (T-033).
- The program and nutrition builders: they edit a local draft already, and their save is explicit.
