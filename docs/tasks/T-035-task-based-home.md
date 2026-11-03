# T-035 — Task-based home for captain and player

**Phase:** 3 · **Depends on:** T-034 merged (it touches the roster, inbox and billing rows) · **Status:** queued

## Goal
The captain's home and the player's home should open on **the one next thing to do**, picked automatically from the user's state, shown as a hero card with a single lime action.
Everything else (stats, alerts, search) moves below it.

## Already exists, build on it
- The captain dashboard (commit 72564e7) already has stat cards, smart alerts (`buildAlerts` in `src/features/dashboard/alerts.ts`), the dropout radar, and the player finder.
- The captain's next task is the top-ranked alert, plus the no-players and no-program cases. Reuse `buildAlerts` and its ranking; do not write a second, parallel ranking.

## Next-task rules (pure, ordered, first match wins)
**Captain** (`src/features/dashboard/next-task.ts`):
1. No players yet → "Invite your first player" → opens the invite sheet.
2. A player has no program → "Write a program for {name}" → `/captain/players/{id}/programs`.
3. There are open inbox items → "Review {n} check-ins / videos" → `/captain/inbox`.
4. A subscription has expired or is in the grace period → "Renew {name}" → `/captain/billing`.
5. A player owes money → "Record {name}'s payment" → `/captain/billing`.
6. A player is late (no training for 7 days or more) → "Message {name}" → their profile.
7. Otherwise → "Everything is on track" with a secondary link to the players list.

**Player** (`src/features/player-home/next-task.ts`):
1. The intake is not done → "Finish your starter questions".
2. Today is a training day and the workout is not finished → "Start today's workout: {day}" (or "Continue", if it has started).
3. There are meals left today → "Log your next meal: {meal}".
4. The weekly check-in is due and not sent → "Send this week's check-in".
5. An unheard voice note from the captain → "Listen to your coach's note".
6. Otherwise → "Rest day / all done today" with tomorrow's workout as a preview.

## Files
- `src/features/dashboard/next-task.ts` and its test: the pure rules above, built from data the dashboard already loads (roster, dues, open tasks). Inject `today`.
- `src/features/dashboard/components/next-task-card.tsx`: the hero card:
  - `glass-strong`, a big title, one line of context
  - one primary lime button, plus an optional small "then: …" preview of the second task
- `src/features/dashboard/components/dashboard-screen.tsx`: put the hero first, then the stats, alerts and finder. Keep the file under 250 lines.
- `src/features/player-home/next-task.ts` and its test.
- `src/features/player-home/components/next-task-card.tsx`, and the player home screen file, to render it first.
  - It uses data the home already has: the program snapshot, today's sessions, meal logs, check-in status, and the intake.
  - If check-in status or voice notes are not loaded on the home today, add a minimal read through the existing data helpers; do not add new tables.
- `messages.ts` in both features: every new string, in Egyptian Arabic and plain English.

## Requirements
1. One primary action on the screen: the hero's button. Existing primary buttons on these screens become secondary.
2. The rules are pure functions with exhaustive tests, including the priority order and ties (the oldest or most urgent player first).
3. Every state (loading, error, empty) is handled. The hero has a skeleton while loading, using T-033's skeleton if it has merged; otherwise the existing `LoadingState`.
4. No new dependencies. RTL logical properties. Tokens only.

## Acceptance
- [ ] The captain home shows the right next task for each rule, which can be checked with the demo data.
- [ ] The player home shows the right next task for each rule.
- [ ] Tests cover every rule and its priority.
- [ ] `npm run check`, `npm run build` and the perf budget pass.
