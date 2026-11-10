# T-146 — The captain sets a prize for the monthly crown

**Phase:** Gamification · **Depends on:** T-137, T-141 · **Status:** ready (owner request 2026-11-10)

## Goal
The crown is a symbol only. After this card the captain can write this month's prize (for example «حصة
مجانية» or «خصم 20٪ على الشهر الجاي»), and players see it in the crown race. The app records it; the captain
delivers it.

## Files
Create or modify only these:
- `supabase/migrations/0085_crown_prizes.sql` (new)
- `supabase/tests/crown-prizes.test.ts` (new)
- `src/types/database.ts`
- `src/features/ranks/data/load-crown-prize.ts` (new), `src/features/ranks/index.ts`, `src/features/ranks/messages.ts`,
  `src/features/ranks/components/crown-race.tsx`, `src/features/ranks/hooks/use-rank-data.ts` (load it with the rest)
- `src/features/rank-review/components/crown-prize-editor.tsx` (new), `src/features/rank-review/components/leaderboard-screen.tsx`,
  `src/features/rank-review/hooks/use-leaderboard.ts`, `src/features/rank-review/data/save-crown-prize.ts` (new),
  `src/features/rank-review/messages.ts`
- Render and unit tests in both features.
- This task card.

## Requirements
1. **Table** `public.crown_prizes(captain_id uuid references profiles on delete cascade, month date check
   (month = date_trunc('month', month)), prize text not null check (char_length(btrim(prize)) between 2 and 120),
   updated_at timestamptz not null default now(), primary key(captain_id, month))`. RLS on.
   - Captain: select, insert, update, delete own rows, only for the current or next month (Africa/Cairo).
   - Player: select the rows of their own active captain (`public.my_captain_id()`).
   - Suspended callers: nothing (same `active_caller` restrictive policy as `points_log`).
   - No anon access. Grants restated explicitly.
2. **Captain UI** on the leaderboard, under the crown card, only for the current or next month shown: the
   prize text with an edit button, or «حط جايزة للتاج الشهر ده» / "Set a prize for this month's crown".
   Editing is an inline text field (max 120, counter), save and cancel; empty save deletes the prize.
   Optimistic with rollback and an error line on failure.
3. **Player UI** in the crown race: when a prize exists, one line «جايزة التاج: {prize}» / "Crown prize: {prize}"
   with a gift icon from lucide (decorative, `aria-hidden`). Nothing when there is none.
4. User text is rendered as text, never as HTML.

## Acceptance
- [ ] PGlite tests: captain writes own current/next month; cannot write a past month or another captain's
  row; player reads own captain's prize only; another captain's player reads nothing; suspended reads
  nothing; anon nothing; the length check.
- [ ] Render tests: editor states (empty, with prize, editing, error), crown race with and without a prize, ar and en.
- [ ] `npm run check` and `npm run build` pass (known sandbox limits).

## Out of scope
- Notifying players when the prize changes, delivering or tracking the prize, money.

## Implementation notes
- Added migration 0085 with explicit authenticated grants, captain/current-or-next Cairo month policies,
  player captain-only reads, restrictive suspension policy, and the shared updated-at trigger.
- Prize loading joins the existing leaderboard/rank loading and error states. The player hook carries the
  prize on the points object so the existing rank screen needs no out-of-scope changes.
- The leaderboard offers a separate next-month control because the existing month switch stops at the
  current month. Past months hide the editor. Empty saves delete; failures restore the previous prize.
- Tests cover RLS, length/date constraints, Cairo/year boundaries, both locales, escaped text, editor
  states, optimistic persistence and rollback. No notifications, delivery tracking or dependencies added.
- Optimistic state is stored per month; a regression test resolves two month saves in reverse order
  and verifies a later failure restores that month's saved prize without losing its error.
- Reads started during a save cannot clear its final value or rollback. Verification in this sandbox:
  typecheck/lint pass; the standard release audit cannot spawn Git (EPERM), while the same rules fed
  tracked paths by the shell report zero findings. Build stops only on the three Google Fonts fetches;
  the full suite's only failure is the bundle-budget test referencing a missing pre-existing build chunk.
