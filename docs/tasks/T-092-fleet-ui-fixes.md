# T-092 — UI fixes from fleet QA (T-089 bugs C-1 … C-4)

**Phase:** V1 beta · **Status:** ready (owner: "fix everything", 2026-11-05)

Each bug has a failing render or logic test marked `it.fails` with `// BUG T-089-C-…` in `src/features/**/fleet-ui-*.test.ts`. Make each pass, then change `it.fails` to `it` and delete the comment.

## Bugs → required behaviour
1. **C-4 (major): no sign-out on the intake gate.**
   - `src/features/captain-approval/components/pending-intake.tsx:14` shows the intake form with no way out.
   - → Show the same `SignOutButton` (variant `danger`, below the form, secondary weight) so a captain who signed up with the wrong account can leave.
   - Keep one lime primary («إرسال الطلب», "send request").
2. **C-1: the plan badge disappears on a failed read.**
   - `src/features/billing/components/plan-badge.tsx:10`.
   - → Show a short inline error state with a retry, following how other async views in billing show errors. Strings go in `messages.ts`.
3. **C-2: a rest day says the coach is still preparing it.**
   - `src/features/player-home/components/today-card.tsx:30`.
   - → An intentional rest day (check how the program marks a rest day) shows rest guidance. Only a day that is really unconfigured shows "still preparing".
4. **C-3: English plural.**
   - `src/features/billing/packages/messages.ts:25` says "1 sessions left".
   - → "1 session left" for 1 and "{n} sessions left" otherwise. Use the plural pattern the project already uses elsewhere (grep messages for `one`/`other` or similar).
   - Arabic stays correct for 1, 2 and 3–10.

## Out of scope
- Database changes (T-090, T-091).
- Desktop layout width (needs the owner's screenshot first).

## Requirements
- AGENTS.md:
  - tokens only
  - logical RTL
  - strings in `messages.ts`
  - files ≤ 250 lines
  - no dependencies
- **Perf budgets unchanged.** The captain player route is at about 309.3/310 KB, so keep billing changes tiny. If the plan badge sits on that route and the budget test fails, move the error UI behind the existing lazy boundary, or report it instead of raising the budget.

## Acceptance
- [ ] The four markers pass.
- [ ] Gates: `npx tsc --noEmit -p .`, `npx eslint .`, `npx vitest run --maxWorkers=2`, `npm run build`, then `npx vitest run src/lib/perf-budget.test.ts`.
