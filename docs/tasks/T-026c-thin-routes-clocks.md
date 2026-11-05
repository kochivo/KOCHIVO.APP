# T-026c — Thin routes, injected server clocks, explained assertions (CH-05, CH-06, CH-10)

**Phase:** 5 · **Depends on:** T-025 report (merged) · **Status:** ready
**Delegate to:** Codex

Read `docs/CODE-HEALTH.md` CH-05, CH-06 and CH-10 first.

## Fixes
1. **CH-06:**
   - `src/app/(player)/player/page.tsx`: move the profile query and first-name mapping into a feature data function exported from that feature's `index.ts`; the route only calls it and renders. Keep today's fallback behaviour.
   - `src/app/(player)/player/workout/[dayId]/page.tsx`: same for the session/identity lookup and its offline fallback (put it in the `workout` feature's `data/`, export via `index.ts`). **Do not touch** `src/features/workout/hooks/*` or `components/focus-screen.tsx` (another card is fixing them).
   - `src/app/(player)/player/onboarding/page.tsx`: move the status/error mapping behind the onboarding feature; the route keeps the framework redirect.
   - `src/features/marketing/marketing.test.ts`: stop importing `../../app/page`; test the feature component directly.
2. **CH-05:** for `fetchBilling`, `saveIntake`, `createInvite`, `archivePlayer`, `reviewItem`: split each into an internal function that takes `now: Date`, and the exported server action that reads the server clock once and calls it. Never accept a timestamp from the client. Update their tests to inject `now` directly instead of mocking the global clock where that is simpler.
3. **CH-10:** for each non-null `!` listed, either narrow with a descriptive thrown error, or add a one-line comment on why it is safe.

## Files
Only the files named above, the new feature data files, the features' `index.ts`, and their tests.

## Requirements
1. Behaviour stays identical. Import direction `app → features → (ui, core, lib)`. Files under 250 lines.

## Acceptance
- [ ] Tests pass.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- CH-01..CH-04, CH-07..CH-09, CH-11
