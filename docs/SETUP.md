# Auth email templates

The owner must update these templates in Supabase Authentication → Email
Templates. Deploy T-055 first, then change the templates. Set Site URL to
`https://kochivo.site` in production. No database migration is needed.

Branded, ready-to-paste templates (logo, Arabic first with an English line)
live in `docs/email-templates/`. Paste each file's full HTML into the matching
Supabase template:

| Supabase template | File | Subject |
| --- | --- | --- |
| Reset password | `reset-password.html` | غيّر كلمة السر · KOCHIVO |
| Confirm signup | `confirm-signup.html` | أكّد إيميلك · KOCHIVO |
| Magic link | `magic-link-code.html` | كود الدخول · KOCHIVO |
| Change email address | `change-email.html` | تأكيد الإيميل الجديد · KOCHIVO |

`_layout.txt` is the shared frame; edit it and regenerate rather than editing
the four files by hand. The logo loads from `https://kochivo.site/brand/logo-primary-light.png`.

## Email OTP settings

In Supabase Authentication settings, set **Email OTP length = 6**. The shared
`OtpInput` expects exactly six numeric digits. Do not leave this at 8; supporting
eight digits would require a length prop and matching validation changes first.
Set **Email OTP expiration = 3600 seconds** so the email's «لمدة ساعة» matches
the actual one-hour expiration. Resend is available after 60 seconds.

## Code templates and flows

Paste the full branded HTML files listed above from [email-templates](email-templates/).
They display only `{{ .Token }}`. Do not add `{{ .ConfirmationURL }}` or
`{{ .TokenHash }}` links to new emails.

- **Confirm signup:** use [confirm-signup.html](email-templates/confirm-signup.html).
  The template must contain only the code; old button links to `/auth/confirm` now work too.
  Captains enter the code on the signup screen, which verifies `type: 'signup'`,
  confirms the captain role, and continues through the existing onboarding path.
  New players also receive this template when signing in with email OTP.
- **Reset password:** use [reset-password.html](email-templates/reset-password.html).
  Users enter the code and a new password on the forgot-password screen. The
  server verifies `type: 'recovery'`, updates the password, and signs out. This
  works on any device, with no link or PKCE verifier required.
- **Magic link:** use [magic-link-code.html](email-templates/magic-link-code.html).
  Players enter the code in the invite flow (`sendEmailCode` / `verifyEmailCode`).
- **Change email address:** use [change-email.html](email-templates/change-email.html).

Previously sent T-054 signup and recovery `token_hash` links remain supported,
as do existing `?code=` paths (which require the original browser's PKCE verifier).
Invalid recovery links offer the new code flow. The callback still uses the
original role-intent cookie when role confirmation is needed.

Google sign-in uses the OAuth callback and no email template. Invite links are
application links and do not use Supabase email templates.
