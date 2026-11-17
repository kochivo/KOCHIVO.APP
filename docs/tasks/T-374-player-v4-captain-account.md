# T-374: Player v4 chat, coach profile, assessments tab, check-in form, account and onboarding

**Migration:** none. **Owner decision 2026-11-18:** build the player v4 mockups 100%. Assessments become their own main tab.
**Depends on:** T-370, which adds the التقييمات tab to the bar.

## Read first
- `AGENTS.md`, `DESIGN.md`, `docs/tasks/REFINED-LOOK.md`.
- `docs/mockups/player-v4/14-chat`, `15-coach`, `16-assessments`, `17-checkin`, `18-account` and `19-onboarding`. Match them 1:1.

## Files
Edit only these:
- `src/features/player-shell/components/captain-*`, `assessments-screen*`, `player-assessments*`, `captain-question.tsx` and `no-captain-screen.tsx`
- a new `src/features/player-shell/captain-messages.ts`, with its `standard/` twin, for this card's strings so you do not collide with T-370's `messages.ts`
- `src/features/forms/**`, player-side components only
- `src/features/settings/**`, player-side only
- `src/features/onboarding/**`
- tests

## What to build
1. **Chat (14).**
   - A back button, the captain's avatar and name, and an icon button that opens the captain profile.
   - No tabs.
   - Quick replies above the input. They are fixed translated phrases; tapping one sends it through the existing send path.
   - Keep voice notes and polling.
2. **Coach profile (15).** It shows the captain card, the plan name and days left, contact, and «الكابتن واشتراكك» details. There is a back button and no tabs.
3. **Assessments tab (16).**
   - A strip with three counts: waiting, done this month, and next due.
   - The waiting list comes first, then the history.
   - Tapping an item opens `/player/forms/<requestId>`.
   - Needs loading, empty and error states.
4. **Check-in form (17).** One question per step with a progress bar and one lime next button. Keep validation and offline-safe submit.
5. **Account (18).** Profile, language (the two-choice switch), units, notifications, export, delete and sign out, restyled to the mockup.
6. **Onboarding (19).** The steps restyled to the mockup. Keep the existing steps and data.

## Do not change
- chat polling
- form answer storage
- deletion and export logic
- auth
- the flag-off markup

## Done when
- Tests cover:
  - quick replies sending through the existing send function;
  - the assessments count strip and the waiting-first order;
  - the empty states.
- It fits at 360px and 390px. `npm run check` passes.
