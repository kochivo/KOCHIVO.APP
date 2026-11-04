# T-065 — Player signup from a coach page: code step and a working confirm link

**Phase:** 3 · **Depends on:** T-055 (merged) · **Status:** ready (live bug reported by the owner on iPhone, 2026-11-04)

## Problem (live)
1. On `/c/<slug>/join` (`coach-signup.tsx`), a new player submits name, email and password.
2. `signUpPlayer` returns `{ message: confirmCoachRequest }` («افتح رسالة التأكيد في إيميلك عشان نبعت طلبك للكابتن» — "open the confirmation email so we can send your request to the captain").
3. **There is no field to type the 6-digit code** from the email. T-055 added a code step for captains only (`signup-code-step.tsx`, `sign-up-captain.ts` `verifyOtp` / `resendCaptainCode`).
4. The confirm-signup email in Supabase also has a «تأكيد الحساب» ("confirm account") button that opens **404**. It most likely links to `{{ .SiteURL }}/auth/confirm?token_hash=…&type=…`, and `/auth/confirm` does not exist; only `/auth/callback` does.

## Changes
1. **Code step for players** (`coach-signup.tsx` plus `sign-up-player.ts`):
   - When `signUp` returns no session, return `{ codeEmail }` (keep the message), and render the existing `SignupCodeStep` (or a generalized version of it) for that email: «بعتنالك كود من 6 أرقام على <email>» ("we sent you a 6-digit code at <email>").
   - Add a server action `verifyPlayerCode(input, coach)` in `sign-up-player.ts`:
     - call `verifyOtp({ email, token, type: 'signup' })`
     - then run `confirm_role('player')` if the role is not confirmed (same as `handleAuthCallback`)
     - then return `{ redirect: await completeCoachRequest(client, coach) }`
   - Resend reuses `auth.resend({ type: 'signup', email })` with the existing 60 s cooldown (`resend-code-button.tsx`).
   - Map errors: wrong code «الكود غلط» ("wrong code"), expired code «الكود خلص، اطلب كود جديد» ("the code expired, request a new one"). Reuse the existing messages.
   - Keep `existing` sign-in and Google paths unchanged.
   - Generalize `SignupCodeStep` only as far as needed: a `verify` action and an `onDone` prop. The captain flow must behave exactly as before.
2. **`/auth/confirm` route:** add `src/app/[locale]/auth/confirm/route.ts`. It reuses the same handler as `/auth/callback`, so any template linking there works.
   - In `handleAuthCallback`, accept `type` `signup` **and** `email` for `token_hash` (`verifyOtp({ token_hash, type })`), and treat everything else as before.
   - Read `coach` from the query as today.
3. **Docs:** in `docs/SETUP.md`, under Confirm signup, add one line: the template must contain only the code, and any old button link to `/auth/confirm` now works too.

## Tests
- Coach signup: no session gives the code step; verify success redirects through `completeCoachRequest`; a wrong code gives the error; resend respects the cooldown (inject `now`).
- Callback: `token_hash` with `type=email` works; `/auth/confirm` exports the same `GET`.
- The captain code step tests stay green.

## Requirements
- No new dependencies.
- Messages in `messages.ts` (Egyptian Arabic and English).
- Tokens only.
- 48 px targets.
- Files ≤ 250 lines.

## Acceptance
- [ ] A new player on a coach page types the 6-digit code and lands where `completeCoachRequest` sends them (request pending or player home).
- [ ] An email button link to `/auth/confirm?token_hash=…&type=signup` no longer 404s.
- [ ] `npx tsc --noEmit -p .`, `npx eslint .`, `npx vitest run --maxWorkers=2`, `npm run build` and the perf budget pass.
