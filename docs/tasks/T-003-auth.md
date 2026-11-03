# T-003 — Sign in: captain (email/password or Google) and player (invite, then Google or email code)

**Phase:** 1 · **Depends on:** T-UI-01 (merged) · **Status:** ready (built without a live Supabase project; T-001 connects it later)
**Delegate to:** Codex

## Goal
- **Captain:** creates an account or signs in with email and password, or with Google, and can reset a forgotten password.
- **Player:** opens the invite link from WhatsApp and signs in with Google, or with a 6-digit code sent to their email (no password). The invite is then redeemed, which links them to the captain.

After sign-in, each role lands in its own area and can never open the other role's pages.

## Files
- `supabase/migrations/0013_auth_roles.sql` (new). See requirement 1.
- `supabase/tests/rls-auth-roles.test.ts` (new)
- `src/features/auth/` (new):
  - `index.ts`
  - `routing.ts`: pure route decision (requirement 4)
  - `invite-code.ts`: pure parse and normalise of invite codes
  - `schemas.ts`: zod schemas for every form
  - `errors.ts`: maps Supabase auth error codes to short Egyptian Arabic messages
  - `auth.test.ts`
  - `data/*.ts`: one file per action: `sign-in-password.ts`, `sign-up-captain.ts`, `sign-in-google.ts`, `send-email-code.ts`, `verify-email-code.ts`, `request-reset.ts`, `update-password.ts`, `redeem-invite.ts`, `invite-preview.ts`
  - `components/*.tsx`: `captain-auth-card.tsx`, `forgot-password-flow.tsx`, `reset-password-form.tsx`, `player-invite-flow.tsx`, `otp-input.tsx`, `google-button.tsx`
- Routes, kept thin: `src/app/(auth)/login/page.tsx`, `src/app/(auth)/forgot-password/page.tsx`, `src/app/(auth)/reset-password/page.tsx`, `src/app/(auth)/i/[code]/page.tsx`, `src/app/auth/callback/route.ts`
- Placeholder landing pages so redirects have a target: `src/app/(captain)/captain/page.tsx` and `src/app/(player)/player/page.tsx`. Each is one line of Arabic text plus a sign-out button. Real screens come later.
- `src/core/supabase/session.ts` and `src/proxy.ts`: add the role guard (requirement 4)

## Requirements
1. **Migration `0013_auth_roles.sql`.**
   - **Role confirmation.** A Google sign-up carries no role metadata, so `handle_new_user` defaults it to `player`. Add `profiles.role_confirmed boolean not null default false`. Set it to `true` for rows whose role came from metadata. Do this in a new trigger function that replaces `handle_new_user` with `create or replace`, keeping its behaviour and adding the flag.
   - **`confirm_role(p_role user_role)`.** A security definer function. It succeeds only when the caller's `role_confirmed` is false and the profile was created less than 1 hour ago. It then sets the role and `role_confirmed = true`. In every other case it raises `42501`.
   - Also allow `confirm_role('player')`, which just sets the flag.
   - **`invite_preview(p_code text)`.** A security definer function granted to `anon` and `authenticated`. It returns only `captain_name text` (the first word of `full_name`) and `valid boolean`. It returns nothing else, and it never reveals whether an expired code existed. Treat it as an enumeration risk: same output shape and no early exit difference.
2. **Captain flows**, matching the mockup boards CaptainLogin and ForgotPassword (see `docs/mockups/`):
   - Login and sign-up tabs.
   - Sign-up sends `{ role: 'captain', full_name }` metadata.
   - Google sets an `intent=captain` cookie (httpOnly, 10 minutes) before the redirect. `/auth/callback` exchanges the code, calls `confirm_role` with the intent if the role is not confirmed, then redirects.
   - Forgot password: send the reset email with `redirectTo` set to `/reset-password`. Show the "check your email" step with a 60-second resend countdown. The new password needs at least 8 characters, with at least one letter and one digit.
3. **Player flow** (`/i/[code]`, mockup board PlayerLogin):
   - Show "كابتن X عايزك تبدأ معاه" from `invite_preview`. An invalid code shows an error state with no sign-in.
   - Then Google (intent=player), or email followed by a 6-digit code. Use `signInWithOtp` with `shouldCreateUser: true` and `data: { role: 'player' }`, then `verifyOtp`.
   - After the session exists, call `redeem_invite(code)` and go to `/player`.
   - A captain who opens an invite link sees "الحساب ده حساب كابتن" and nothing is redeemed.
   - Keep the code across the Google redirect in the same httpOnly cookie as the intent.
4. **Routing.** `routing.ts` exports a pure function:

   ```ts
   decideRoute({ path, user: null | { role, roleConfirmed } }): { redirect?: string }
   ```

   It is used by `session.ts` after `getClaims()`, reading the role from `profiles` once per request.

   | Path | Rule |
   |---|---|
   | `/captain/**` | Requires a confirmed captain. A player goes to `/player`, and no session goes to `/login`. |
   | `/player/**` | Requires a player. A captain goes to `/captain`, and no session goes to `/login`. |
   | `/login`, `/forgot-password` | With a session, go to the role's home. |
   | `/`, `/i/**`, `/reset-password`, `/auth/**`, `/dev/**`, `/offline` | Always public. |

5. **Errors.** Every Supabase error goes through `errors.ts`, so no raw English message reaches the user. Wrong credentials and an unknown email show the **same** message: «الإيميل أو كلمة السر مش مظبوطين».
6. **UI.** Build only from `@/ui` primitives (`TextField`, `Segmented`, `Button`, `GlassCard`, the states).
   - `otp-input.tsx`: 6 boxes, numeric `inputMode`, paste support, auto-advance, and `autocomplete="one-time-code"`.
   - Keep everything under 250 lines per file, with no hex colors and logical properties only.
7. Never log tokens, codes, or emails.

## Acceptance
- [ ] `auth.test.ts` covers:
  - every row of the routing table
  - invite-code normalisation (spaces, lowercase, dashes)
  - each zod schema's accept and reject cases
  - the error map, including that the two credential errors give the same text
- [ ] `rls-auth-roles.test.ts` covers:
  - `confirm_role` works once
  - it fails on the second call
  - it fails after 1 hour (inject the time through `created_at`)
  - `invite_preview` returns the same shape for valid, expired, and unknown codes, and never exposes the captain id
- [ ] `npm run check` and `npm run build` pass, with no `.env.local` present: pages must not read env at build time
- [ ] No change to migrations 0001–0012

## Out of scope
- The onboarding questionnaire (T-003d)
- The real captain and player screens
- Phone OTP
- Rate limiting and Turnstile (T-015)
- `src/types/database.ts` (regenerated in T-001). Use local narrow types for RPC results.

## References
- `supabase/migrations/0002_profiles.sql` and `0003_coach_clients.sql`
- `docs/ARCHITECTURE.md`
- `docs/mockups/` boards CaptainLogin, ForgotPassword, PlayerLogin
