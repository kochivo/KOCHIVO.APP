# T-165 — The coach page never says "sent" when no request was saved

**Phase:** Bug fix · **Depends on:** T-164 · **Status:** ready (owner decision 2026-11-11)

## Bug
A prospect taps Join on a captain's public page (`/c/<slug>`), finishes sign-in or sign-up, and lands on
`/c/<slug>?requested=1` with "Your request was sent". The captain never sees a request.

**Root cause (confirmed from production logs, 2026-11-11):** inserting into `coach_join_requests` fires
the `join_request_attach` trigger (migration 0060), which inserts a pending `coach_clients` row. The unique
index `coach_clients_one_active_captain` (one non-archived link per player, migration 0003) rejects it when
the player already has a live link (pending or active, with this captain or another one). The whole insert
fails with SQLSTATE 23505. `completeCoachRequest` in `src/features/auth/data/coach-request.ts` treats every
23505 as "already requested" and returns `?requested=1`. Four production attempts on 2026-11-11 failed
this way: Postgres logged `duplicate key value violates unique constraint "coach_clients_one_active_captain"`
for each, and the page still said "sent".

## Owner decision (2026-11-11)
A player who is already linked to a captain **cannot** request another captain. The page tells them clearly
instead of pretending the request was sent. No database change.

## Files
- `src/features/auth/data/coach-request.ts`
- `src/app/[locale]/c/[slug]/page.tsx` (parse the param only)
- `src/features/coach-page/components/coach-page.tsx`, `src/features/coach-page/messages.ts`
- Tests: `src/features/auth/coach-request.test.ts`, `src/features/coach-page/coach-page.test.ts`, and a new
  PGlite test `supabase/tests/join-request-linked.test.ts`
- This task card

## Requirements
1. **Check the live link before inserting.** In `completeCoachRequest`, after resolving the captain, read the
   player's own non-archived `coach_clients` row (RLS `coach_clients_player_select` allows it):
   - a live link with **this** captain → return `/c/<slug>?requested=member`, no insert;
   - a live link with **another** captain → return `/c/<slug>?requested=linked`, no insert;
   - no live link → insert as today.
2. **23505 after the insert** means "sent" only when this player already has a **pending request for this
   captain** (check with a select on `coach_join_requests`, `status = 'pending'`). Otherwise (a race where a
   link appeared in between) return the `linked`/`member` result from a fresh link check. Any other error
   still throws as today.
3. **One status type.** Export a `CoachRequestStatus = 'sent' | 'member' | 'linked'` union and the URL
   values from one place (keep `requested=1` meaning `sent` so links already in emails keep working). The
   route maps the search param to that union with a pure parser; an unknown value means "no status"
   (the normal Join button shows).
4. **Coach page states** (glass `role="status"` box like today's "sent"):
   - `sent`: today's text, unchanged.
   - `member`: Arabic `انت مشترك مع الكابتن ده بالفعل.` / English `You already train with this coach.`, plus a
     48px link to the player home (`/player`) labelled `افتح التطبيق` / `Open the app`.
   - `linked`: Arabic `حسابك مربوط بكابتن تاني، أو طلبك عنده لسه مستني. الطلب ده ماتبعتش. لو عايز تنقل، اطلب من كابتنك الحالي يقفل اشتراكك الأول.`
     / English `Your account is linked to another coach, or a request there is still waiting. This request was not sent. To switch, ask your current coach to end your membership first.`
   - No Join button in any of the three states. Strings live in `messages.ts` only.
5. Admin, captain and other existing branches of `completeCoachRequest` stay as they are.
6. **Tests** (deterministic, fake client that records calls):
   - `coach-request.test.ts`: no link → insert and `sent`; live link with the same captain → `member`, no
     insert; live link with another captain → `linked`, no insert; insert 23505 with a pending request →
     `sent`; insert 23505 without a pending request and a link appearing → `linked`; other insert error
     throws.
   - `coach-page.test.ts`: each state renders its text and no Join link; the route parser maps `1`→`sent`,
     `member`, `linked`, and junk → none.
   - `supabase/tests/join-request-linked.test.ts` (PGlite, like the other tests there): a player with an
     active link to captain A inserting a request to captain B fails with `23505` on
     `coach_clients_one_active_captain`, and no request row remains. This documents the database rule the
     app relies on.

## Acceptance
- [ ] The tests above pass; existing auth and coach-page tests stay green.
- [ ] `npx tsc --noEmit -p .`, `npx eslint .`, `npm run audit:release`, `npx vitest run`, `npm run build`,
  then `npx vitest run src/lib/perf-budget.test.ts` all pass.

## Implementation plan
- Add recording-client regressions for live links, duplicate requests, races and read/write failures.
- Keep the status union, URL values and pure parser together on the existing public `CoachPage` export,
  so auth and the route share them without changing a barrel outside this card's Files list.
- Check non-archived links before insertion; verify a pending request after 23505, then recheck links.
- Render translated status panels and the member's player-home link; test both locales and unknown params.
- Document the existing unique-index rollback in PGlite, then run every acceptance gate.

## Implementation review notes (2026-11-11)
- The three scoped suites pass: 3 files, 31 tests. The PGlite test asserts both the 23505 constraint
  name and rollback of the request row, using the real migrations and player RLS context.
- `npx eslint .` passes. `npx tsc --noEmit -p .` and `npm run check` stop at the existing missing
  `koAccountConfig` export in `src/features/ko-account/route.ts:11`; that file is outside this card.
- Default Vitest commands hit Windows `spawn EPERM`; the native-loader/thread-pool fallback runs.
- `npm run audit:release` hits `spawnSync git EPERM`. Running the unchanged audit with a Git file list
  supplied by PowerShell reports: `Release audit: 1832 tracked files, 0 findings`.
- `npm run build` compiles successfully, then stops with `spawn EPERM` at its TypeScript stage.
  The subsequent budget fallback cannot find a chunk referenced by the existing bundle manifest;
  the reviewer must rebuild successfully before checking budgets. No budget was changed.
- The broader auth run reports 6 failures in `coach-signup.test.ts`: its fake query has only
  `.eq().single()`, so the new required `.eq().is().maybeSingle()` read needs a fixture update.
  That test is outside this card's Files list; a fixture-only scope extension was requested.
- Full fallback result: `Test Files 3 failed | 451 passed (454)` and
  `Tests 8 failed | 3261 passed (3269)`. Besides the 6 signup fixture cases, the failures are the
  bundle manifest's missing chunk and the existing KO UI-barrel import in
  `src/features/ko-account/account.ts`, reported by `ko-core/import-graph.test.ts`.
- Revisiting a `?requested=1` URL still displays sent, as explicitly left out of scope.

## Out of scope
- Any migration, trigger, RLS or RPC change; letting players switch captains.
- The fact that revisiting a `?requested=1` URL always shows "sent" (note only).
- `src/types/*` and `core/offline/tables.ts` (T-163 runs in parallel), `src/app/globals.css`,
  `src/features/luxury-preview`.
