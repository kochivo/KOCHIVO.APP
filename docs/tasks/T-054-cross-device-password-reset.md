# T-054 — Password reset works when the email is opened on another device

**Phase:** 3 · **Depends on:** none · **Status:** ready (owner hit it live, 2026-11-04)

## Problem
Live logs from 2026-11-03 22:35Z:
- The owner requested a reset from Windows Edge. `request-reset.ts` calls `resetPasswordForEmail`, which uses PKCE and stores the code verifier as a cookie in *that* browser.
- They opened the email on iPhone Chrome. `verify` returned 303 to `/reset-password?code=…`.
- `updatePassword` then calls `exchangeCodeForSession(code)`. That browser has no verifier, so it throws before any request reaches Supabase, and the user sees the generic «حصلت مشكلة».

Most players open email on their phone, so this breaks for nearly everyone.

## Fix
- Support the token-hash recovery link, which works on any device:
  - `/reset-password?token_hash=…&type=recovery` → `verifyOtp({ token_hash, type: 'recovery' })` on the server, then `updateUser`.
  - Keep the `code` path for links already sent.
- `src/features/auth/data/update-password.ts` and the reset page component: read `token_hash`/`type` or `code`, verify once, and keep the "single use" retry behaviour (`recoveryReady`).
- A missing verifier, or an expired or used link, shows a specific message with a «اطلب لينك جديد» action instead of the generic error.
  - Arabic: «اللينك ده مينفعش. اطلب لينك جديد وافتحه من نفس الموبايل أو الكمبيوتر»
  - English to match.
- `docs/SETUP.md` (or the existing auth setup doc): the owner must set the Supabase **Reset password** email template link to

  `{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery`

  Do the same for **Magic link** and **Confirm signup** if they use the `code` flow. Find out which email flows the app uses and list the exact template for each.
- Tests:
  - token_hash success
  - code success
  - expired link → specific message
  - missing verifier → specific message
  - the same password rules as now

## Requirements
- No new dependencies. Egyptian Arabic and English messages. Files under 250 lines.

## Acceptance
- [ ] A reset requested on a laptop and opened on a phone sets the new password.
- [ ] `npm run check`, `npm run build` and the perf budget pass.
