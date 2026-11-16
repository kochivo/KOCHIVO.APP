# T-330 — Captain: waiting-subscription tasks, money-owed row on phones, inbox query count

**Source:** `docs/AUDIT-2026-11-16-full.md`, findings 8 (BL-04), 17 (money-owed row) and 13 (PERF-01, inbox).

**Migration:** ONE new file, `supabase/migrations/0133_inbox_previews.sql`, only if part 3 needs it. It is additive: one new function, no data writes.

## 1. Subscriptions waiting for plans (BL-04)
- **Where:** `src/features/captain-workspace/queue/tasks-model.ts:31-40` and `queue/data/page.ts:37`.
- **Bug:** a player whose subscription clock is paused while waiting for plans (`awaitingPlansAt` is set) still gets renewal and absence tasks. Once the nominal end date passes, the early `continue` also removes the "missing program" and "missing meal plan" tasks.
- **Fix:**
  - When `awaitingPlansAt` is set:
    - keep the missing-plan tasks;
    - drop the renewal, expiry and absence tasks;
    - leave the waiting links out of the renewal query.
  - Everything else is unchanged.
  - Add unit tests in the existing tasks-model test.

## 2. The money-owed row breaks on a 390px phone
- **Where:** `src/features/captain-workspace/money-owed/money-owed-view.tsx:39-48`. The same component is used in billing.
- **Bug:** with the record-payment action beside it, the player name and description shrink to one letter per line.
- **Fix:**
  - On narrow screens, stack the action under the text, or let the text take the free width with `min-w-0` and truncate.
  - The action keeps at least 48px.
  - Use logical properties and tokens only.
  - Check it in the demo at `/ar/demo`: pick 6–20 and go to tour step 10.

## 3. Inbox query count (PERF-01, still present)
- **Where:**
  - `src/features/inbox/data/conversation-previews.ts:8-11`;
  - `components/conversation-screen.tsx:30`;
  - `src/features/chat/data/chat.ts:26`;
  - `src/features/chat/data/unread-counts.ts:5`.
- **Bug:** 100 players make 101 requests every 60 seconds, plus signed URLs for audio previews.
- **Fix:**
  - Add a caller-scoped RPC `inbox_previews()` that returns one row per player of the calling captain: the latest message (kind, text preview, created_at, sender) and the unread count.
    - It is security invoker if RLS covers it; otherwise definer with `search_path = ''` and an `auth.uid()` scope.
    - Grant it to `authenticated`.
  - Use it in `conversation-previews.ts`.
  - Do not sign audio for previews; show the audio label only. Signing happens when a chat is opened, as today.
  - Keep the result shape the components use. Add a PGlite test: the captain sees only their own players, the counts are correct, and another captain sees nothing.
  - Update `src/types/app-database.ts`.

## Rules
AGENTS.md applies in full.

## Gates
`npm run typecheck`, `npm run lint`, `npx vitest run src/features/captain-workspace src/features/inbox src/features/chat`, and the new test in `supabase/tests/`.
