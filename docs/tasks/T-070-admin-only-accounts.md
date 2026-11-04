# T-070 — Admin accounts are admin-only (no captain area)

**Phase:** 3 · **Status:** ready (owner request, 2026-11-04)

## Context
- `profiles.role` is a `user_role` enum (`captain | player`, not null).
- Admin rights come from `public.admins` + `public.is_admin()` (migration 0015).
- The owner's account (`kkochivo@gmail.com`, role `captain`, in `admins`) must be **admin only**:
  - it must never land in or use the captain area
  - it must not count or appear as a captain in the admin dashboard
- Its captain data was already deleted by hand on 2026-11-04. Its read-only starter templates (`is_starter`) remain and must stay hidden.
- Rule: **any user in `public.admins` is admin-only.**

## Changes
1. **Routing** (`src/features/auth/routing.ts` + wherever `AuthUser` is built, in the proxy and session loading):
   - Add `admin: boolean` to `AuthUser`. Load it with the existing request's Supabase client (`rpc('is_admin')`, or join it into the existing profile read so it adds no extra round trip if possible).
   - When `admin`:
     - home is `/admin`
     - `/captain/*` and `/player/*` redirect to `/admin`
     - `/login` with a session redirects to `/admin`
   - `/admin` itself stays guarded by `requireAdmin` as today.
2. **Post-login redirects** go to `/admin` for admins:
   - `callback.ts`
   - `sign-in-password.ts`
   - `sign-up-captain.ts`, only if reachable
   - Google sign-in
   Use one helper (for example `homeFor(user)` in `routing.ts`) instead of repeating the ternary.
3. **Hide admins from captain lists:** new migration `0054_admin_only.sql`. T-069 takes 0053; do not use it.
   - `admin_captains(...)` and any admin dashboard counts or metrics that count captains exclude `user_id in (select user_id from public.admins)`. Re-create the functions with `create or replace`, same signatures, and keep their grants.
   - Public coach page lookup by slug and any coach search exclude admins.
   - PGlite test in `supabase/tests/`: an admin captain is excluded from `admin_captains` and from the counts.
4. **Admin header:** the admin screen gets a sign-out button if it doesn't have one, since the admin can no longer reach captain settings to sign out. It needs a translated label and must be at least 48 px.

## Out of scope
- Removing the `captain` role value from the owner's profile (the enum has no admin value; the routing rule covers it).
- Deleting starter templates.

## Tests
- `routing.test.ts`: admin → `/captain` redirects to `/admin`; admin → `/player` redirects to `/admin`; admin on `/login` redirects to `/admin`; non-admin behavior is unchanged.
- Redirect helper unit tests.
- The PGlite test above.

## Requirements
- No new dependencies.
- RLS untouched except the functions above.
- Strings in `messages.ts`.
- Files ≤ 250 lines.

## Acceptance
- [ ] Signing in as an admin always lands on `/admin`; opening `/captain` redirects to `/admin`.
- [ ] The admin dashboard captain list and counts do not include admins.
- [ ] `npx tsc --noEmit -p .`, `npx eslint .`, `npx vitest run --maxWorkers=2`, `npm run build` and the perf budget pass.
