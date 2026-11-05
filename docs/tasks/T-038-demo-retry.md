# T-038 — Demo button works on every attempt

**Phase:** 3 · **Depends on:** none · **Status:** ready

## Problem
The owner reports that «ادخل الديمو» on `/demo` stops working after the first attempt, and no error shows.
Likely cause (confirm it first): `startDemo` in `src/features/demo/data/start-demo.ts` reuses any existing anonymous session. If that session's demo workspace has expired or was purged, or the session is half-broken, `create_demo_workspace` fails on every later click, and the visitor can never get a fresh account. A Turnstile token is also single-use, so a retry must always use a new token.

## Already exists, keep it
- Each visitor already gets their own isolated account through Supabase anonymous sign-in, and `create_demo_workspace()` (migrations 0031–0035) seeds sample players and plans for that account only.
- **Do not** create e-mail accounts like `demo_<uuid>@…` and do not write a second seeding RPC. Anonymous accounts are already isolated, are cleaned after 24 h, and do not need Auth admin keys.
- **No Sonner.** The owner chose our own toast: use `useToast()` from `@/ui/toast`.

## Files
- `src/features/demo/data/start-demo.ts`:
  - Reproduce the failure in a unit test first: an existing anonymous session whose workspace call fails, then a second click.
  - If the existing session is not a usable demo (not anonymous, demo expired, or `create_demo_workspace` fails with an expired or missing workspace error), call `await client.auth.signOut()` and sign in anonymously again with the new Turnstile token, then create the workspace once more.
  - Keep the comment's intent: a plain network retry must not mint a second account when the first one is still usable.
  - Wrap every step in try/catch; return the translated error, never throw silently.
- `src/features/demo/components/demo-screen.tsx`: show action-level failures with `toast.error(...)` as well as the inline alert; make sure the button is never left disabled (token reset, widget remount, pending cleared) after any failure path.
- `src/features/demo/messages.ts`: any new string, Egyptian Arabic and English.
- Tests in `src/features/demo/demo.test.ts`: first click works, second click after an expired session works, a failure always re-enables the button, no duplicate account on a plain retry.

## Requirements
- No new dependencies. No migration unless the investigation proves the database is the cause; if so, add `0041_*.sql` with a PGlite test.
- Do not touch `.env*`.

## Acceptance
- [ ] Clicking «ادخل الديمو», leaving, and clicking again (also after 24 h) always reaches `/captain`.
- [ ] Any failure shows an error and leaves the button usable.
- [ ] `npm run check`, `npm run build` and the perf budget pass.
