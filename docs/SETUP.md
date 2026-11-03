# Auth email templates

The owner must update these templates in Supabase Authentication → Email
Templates. Deploy T-054 first, then change the templates. Set Site URL to
`https://kochivo.site` in production. No database migration is needed.

## Reset password

Use this exact link instead of `{{ .ConfirmationURL }}`:

```html
<a href="{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery">Reset password</a>
```

The server verifies the recovery hash on the device opening the email; no
verifier from the device requesting the email is needed. Existing `?code=`
links remain supported on the requesting browser. Expired, used, and missing
verifier links offer a new reset link.

## Magic link (player email sign-in)

Players enter a six-digit code in the invite flow (`sendEmailCode` and
`verifyEmailCode`), rather than following a magic link. Use this exact template
body; do not use a `ConfirmationURL` link:

```html
<p>Your sign-in code is: {{ .Token }}</p>
```

## Confirm signup

Captain email/password signup requests email confirmation. Use this exact link:

```html
<a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup">Confirm email</a>
```

The callback verifies the signup hash without PKCE. Existing OAuth and signup
`?code=` callbacks remain supported. If role confirmation still needs the
original browser's intent cookie, the callback returns to login, where the user
can finish signing in. New players created through email OTP also receive the
Confirm signup template, so include the code in that same template:

```html
<p>Your sign-in code is: {{ .Token }}</p>
<a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup">Confirm email</a>
```

Google sign-in uses the OAuth callback and no email template. Invite links are
application links and do not use Supabase email templates.
