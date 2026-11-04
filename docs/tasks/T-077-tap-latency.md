# T-077 — Tap latency: instant feedback and fewer server round-trips

**Phase:** V1 freeze · **Status:** ready (owner report 2026-11-05: "every tap takes a while before anything happens").

## Measured
- The app server (Hyperlift, 63.250.43.x) answers even the static `/offline` page with ~1.0 s TTFB from the test machine. Supabase is in eu-central-1 (Frankfurt).
- `src/proxy.ts` → `refreshSession()` (`src/core/supabase/session.ts`) runs on **every** navigation and awaits **two sequential** Supabase calls after `getClaims()`: `profiles` select, then `rpc('is_admin')`. That means two server→Frankfurt round trips before the page even starts rendering.
- Player routes have **no `loading.tsx`**. Only `/captain`, `/captain/players/[playerId]`, `/captain/programs/[programId]`, `/admin` and `/c/[slug]` have one. So a tap on a nav link shows nothing until the server responds, and the app feels frozen.

## Changes
1. **Instant feedback.** Add `loading.tsx` to every player route segment:
   - `player`, `player/nutrition`, `player/progress`, `player/history`, `player/captain`, `player/settings`, `player/onboarding`
   - Also every captain segment that lacks one: roster, programs list, nutrition, inbox, templates, settings, billing (check the tree).
   - Each uses the existing `LoadingState` / skeleton variants from `@/ui` that match the page shape (cards / list).
   - The bottom nav item must show its active state immediately on tap. Use `useLinkStatus` from `next/link` or the pathname-pending pattern, whichever this Next version supports, without layout shift.
   - Keep the workout focus route's own behaviour.
2. **Proxy: one round trip, not two.**
   - Run the profile select and `is_admin` in parallel (`Promise.all`), **or** add migration `0057_route_profile.sql` with a `security definer`, `stable`, `search_path=''` function `my_route_profile()`. It returns role, role_confirmed, suspended_at and is_admin for `auth.uid()` in one call; grant it to authenticated only; add a PGlite test. Prefer the single RPC.
   - Skip the DB lookup entirely for paths where `decideRoute` cannot use it: static assets already bypass, plus `/offline`, `/privacy`, `/terms`. Keep behaviour identical, and keep the existing auth tests green (add cases).
3. **Server pages: no waterfalls.**
   - Audit the server data functions used by player and captain pages (`fetchPlayerIdentity`, `fetchPlayerProfile`, dashboard, roster…).
   - Any independent sequential `await`s become `Promise.all`.
   - If a page re-reads the user with `auth.getUser()` (network) where `getClaims()` (local JWT) is enough for an id, switch it. Keep `getUser` where a fresh server check is required, with a comment.
   - List what you changed per file.
4. **Prefetch.** Make sure the bottom nav and the main home CTAs use `next/link` with default prefetch (they do; just verify). Do not add `prefetch={false}` anywhere new.

## Out of scope
- Moving hosting region (owner decision; see Notes).
- Caching user data across users.

## Tests
- `session` / proxy tests: one DB call per navigation (spy count), same redirect decisions as before for captain, player, admin, suspended, anonymous and logged-out.
- `my_route_profile` PGlite test if added: returns only the caller's row; anon gets nothing.
- A simple test asserting every player route directory has a `loading.tsx` (fs scan), so this does not regress.

## Requirements
- No new dependencies.
- Files ≤ 250 lines; tokens; strings in `messages.ts`.
- Perf budget passes without changing budgets.

## Acceptance
- [ ] Every player/captain nav tap shows a skeleton immediately.
- [ ] The proxy makes one Supabase query per navigation (none on static legal/offline pages).
- [ ] Server waterfalls are removed.
- [ ] All gates pass: `npx tsc --noEmit -p .`, `npx eslint .`, `npx vitest run --maxWorkers=2`, `npm run build`, perf budget.
