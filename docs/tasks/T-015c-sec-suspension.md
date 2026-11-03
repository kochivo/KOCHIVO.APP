# T-015c — Security fix SEC-01: a suspended account loses access everywhere

**Phase:** 5 · **Depends on:** T-015 report, migrations 0001–0024 (merged) · **Status:** ready
**Delegate to:** Codex

Read `docs/SECURITY-REVIEW.md` section SEC-01 first. Its SQL is a proposal; you own correctness.

## Product decision (fixed)
A suspended user can only:
- read their **own** `profiles` row (so the app can show why they are blocked)
- sign out
Everything else, reads and writes on every table, storage reads and uploads, and every RPC, is denied. Players of a suspended captain are **not** affected by this card (their access window is a separate rule).

## Files
- `supabase/migrations/0026_sec_suspension.sql` (new). Use exactly 0026.
  - A restrictive policy `active_caller` for `authenticated` on every public table that exists at this point, using `not public.is_suspended()`. On `profiles`, the restrictive policy must still let a suspended user SELECT their own row (for example `using (id = (select auth.uid()) or not public.is_suspended())` for SELECT, and the plain check for other commands). Write the table list explicitly, not with a catalog loop, so the migration is reviewable.
  - The same restrictive policy on `storage.objects` for the private buckets.
  - `is_admin()` returns false for a suspended admin.
  - Every **security definer** function a client can execute that writes or returns user data must reject a suspended caller with `42501` (definers bypass table RLS). Go through them one by one from the final state of 0001–0024 and list in Notes which you changed and which you left (and why). `is_suspended()` itself must not recurse through RLS.
  - Other cards are replacing these functions in parallel, so **do not recreate** them here: `plan_of_meal`, `plan_of_item`, `current_tier`, `enforce_player_limit`, `can_read_program`, `can_read_plan`, `player_can_read`. Mention in Notes if one of them needs a suspension check, and it will be added after merge.
  - Confirm `public.is_suspended()` is safe to call inside a `profiles` policy (definer, empty search path). If it is not, add a definer helper that is.
- `supabase/tests/rls-suspension.test.ts` (new), using the harness:
  - suspend a linked captain who keeps the same session; assert: direct `coach_clients.access_until` update fails, archive fails, program and plan CRUD fails, template RPCs fail, inbox review fails, intake/sessions/meal logs return no rows, storage SELECT on a player's object returns nothing
  - the suspended captain can still read their own profile row
  - another active captain is unaffected; the suspended captain's players can still read their own data
  - a suspended admin gets `42501` from `admin_captains` and the other admin functions
  - unsuspending restores access
  - a test that lists every table in `public` and asserts each has the `active_caller` policy, so a future table without it fails CI
- `src/core/supabase/session.ts` and `src/features/auth/routing.ts`: load `suspended_at` with the role lookup you already do; a suspended user is routed to `/suspended` (except for `/suspended`, sign-out and auth callback paths).
- `src/app/suspended/page.tsx` (thin) and `src/features/auth/components/suspended-screen.tsx`: «حسابك متوقف مؤقتاً», one line «كلّم الدعم على واتساب علشان نرجّعه», a WhatsApp link using `NEXT_PUBLIC_OWNER_WHATSAPP` (hide the link when it is empty), and a sign-out button. Glass panel, tokens only, RTL.
- Update the auth routing unit tests for the suspended case.
- `docs/ARCHITECTURE.md`: one note: every new table must add the `active_caller` restrictive policy; the catalog test enforces it.

## Requirements
1. Do not edit 0001–0024. Keep each file under 250 lines.
2. Every existing test keeps passing; if an old test relied on suspended users acting, explain in Notes.

## Acceptance
- [ ] New and old tests pass.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Revoking already-issued signed URLs
- SEC-02, SEC-03, SEC-04, SEC-05
