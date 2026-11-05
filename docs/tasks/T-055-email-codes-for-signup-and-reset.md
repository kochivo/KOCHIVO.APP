# T-055 — Six-digit email codes for captain signup and password reset

**Phase:** 3 · **Depends on:** T-054 merged · **Status:** ready (owner decision, 2026-11-04)

## Decision
The owner wants every auth email to carry a **typed numeric code** (`{{ .Token }}`), not a link. The player invite flow already works this way (`OtpInput`, `send-email-code.ts`, `verify-email-code.ts`). The branded templates are in `docs/email-templates/`, and each one shows only `{{ .Token }}`.

## Changes
1. **Captain signup** (`sign-up-captain.ts` and the captain auth card):
   - After `signUp`, if no session comes back (confirmation is required), show a code step using `OtpInput`. Copy: «بعتنالك كود من 6 أرقام على <email>».
   - Verify with `verifyOtp({ email, token, type: 'signup' })`.
   - Include «ابعت الكود تاني» (`auth.resend({ type: 'signup', email })`) with a 60 s cooldown.
   - On success, continue to the existing post-signup path (role confirmation and onboarding). Keep the role intent that the callback uses today.
2. **Forgot password** (`forgot-password-flow.tsx`, `request-reset.ts`, `update-password.ts`):
   - Step 1: the user enters their email, and `resetPasswordForEmail` sends the code.
   - Step 2: on the same screen, the user enters the 6-digit code with a new password and its confirmation. The code is verified with `verifyOtp({ email, token, type: 'recovery' })` on the server, then `updateUser({ password })`, then sign out and go to `/login` with a success toast.
   - It works on any device because no link or verifier is involved.
   - Include «ابعت الكود تاني» with a 60 s cooldown.
   - Errors: a wrong code («الكود غلط»), an expired code («الكود خلص، اطلب كود جديد»), and the same password rules as now.
3. Keep the T-054 link paths (`token_hash`, `code`) working for emails already sent, but nothing new links to them.
4. `docs/SETUP.md`:
   - Replace the link templates with the code templates from `docs/email-templates/`.
   - Tell the owner to set **Email OTP length = 6** in Supabase Auth settings, because `OtpInput` expects 6 digits. If it is 8, make `OtpInput` take a `length` prop instead.
   - Say that the expiry shown in the email («لمدة ساعة») matches the **Email OTP expiration** setting, 3600 s.
5. Tests:
   - A signup code step that succeeds and one that fails.
   - A reset code that succeeds, one that is wrong and one that has expired.
   - The resend cooldown, with `now` injected.

## Requirements
- No new dependencies. Egyptian Arabic and English messages. Tokens only. Files under 250 lines. Touch targets at least 48 px.

## Acceptance
- [ ] A captain signs up, types the code from the email and lands in onboarding.
- [ ] A user resets a password from any device by typing the code.
- [ ] `npm run check`, `npm run build` and the perf budget pass.
