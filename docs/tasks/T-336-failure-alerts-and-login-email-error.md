# T-336 — Alerts when login email or push breaks, plus a clear login email error

**Source:** on 2026-11-16, login-code emails failed for about 16 hours (the SMTP provider expired). Nobody knew until the owner tried to sign in. The login page only said "Something went wrong. Try again". The owner approved both fixes.

**Migration:** ONE new file, `supabase/migrations/0136_push_config_sentry.sql`. It only re-creates `security_private.push_config()` so the vault name list also includes `'sentry_dsn'`. Copy the live body exactly:

```
select jsonb_object_agg(name, decrypted_secret) from vault.decrypted_secrets
  where name in ('push_function_url','push_hook_secret','vapid_public_key','vapid_private_key','vapid_subject')
```

Keep its grants, and make no other change. Do not apply it.

## A. Login page: say what happened (owner item 3)
- The email-sending auth actions live in `src/features/auth/data/`: `send-email-code.ts`, plus sign-up, password reset and resend-code actions if they exist (find them).
- Errors go through `runAction` → `authError(error, t)` in `auth-client.ts`. Extend `authError` so that:
  - **The email provider failed.** This is a Supabase `AuthError` with `status >= 500`, or `code` `unexpected_failure`, or a message mentioning SMTP or sending email. Show:
    - ar: «مقدرناش نبعت الإيميل دلوقتي. ادخل بجوجل أو بالباسورد، أو جرّب كمان شوية.»
    - arStd: «تعذّر إرسال البريد الآن. سجّل الدخول بجوجل أو بكلمة المرور، أو حاول لاحقًا.»
    - en: "We couldn't send the email right now. Sign in with Google or your password, or try again later."
  - **The email rate limit was hit** (`over_email_send_rate_limit`), if `authError` doesn't already handle it. Show:
    - ar: «طلبت أكواد كتير. استنى دقيقة وجرّب تاني.»
    - arStd: «طلبت رموزًا كثيرة. انتظر دقيقة ثم حاول مرة أخرى.»
    - en: "Too many codes requested. Wait a minute and try again."
  - Everything else keeps today's behaviour.
- Messages go in the auth `messages.ts` (ar, en) and its standard file (arStd).

## B. Report login email failures to Sentry
- In the same place, report to Sentry only in the provider-failure case, not the rate-limit case:
  - Use `captureException` from `@sentry/nextjs` on the server, as other server code does.
  - Tags: `area: 'auth-email'`, plus the Supabase `code` and `status`.
  - **Never** include the email address, user id, or the provider's raw message if it could contain an address. Use a fixed message: `new Error('Auth email send failed')`.
- Respect `publicConfig.sentryDsn` the same way `global-error.tsx` does.

## C. Report send-push failures to Sentry, without a new dependency
- In `supabase/functions/send-push/index.ts`, read an optional `config.sentry_dsn` from the existing `push_config` RPC result. Also add `sentry_dsn?: string` to `PushConfig`.
- Add a small helper, for example `supabase/functions/send-push/report.ts`. It POSTs a minimal Sentry envelope with `fetch` to the DSN's envelope endpoint (`https://<host>/api/<project_id>/envelope/`, auth through the `sentry_key` query parameter or header, as the Sentry envelope docs specify).
  - It contains one `event` item: `level: 'error'`, a fixed `message`, and `tags: { area: 'push', reason }`.
  - It must never throw, and must use a short timeout (`AbortSignal.timeout(3000)`).
  - No endpoint, no user id, no notification payload.
- Call it:
  - in the top-level catch (`reason: 'request_failed'`);
  - once per request when one or more deliveries fail with a status other than 404 or 410 (`reason: 'delivery_failed'`, with the count as an extra).
- If `sentry_dsn` is missing, do nothing. Keep responses and status codes exactly as today.

## Tests
- `authError`: the provider-failure case gives the new message and calls the reporter, and passes no email. The rate-limit case gives the rate-limit message and does not report. Other errors are unchanged.
- `report.ts`: correct URL and envelope shape from a sample DSN (`https://abc@o1.ingest.sentry.io/2`); returns quietly on fetch rejection; sends nothing without a DSN. Use the existing send-push test harness style and inject `fetch`.
- `index.ts`: the existing tests still pass.

## Gates
`npm run check`, `npm run build`, and the send-push and auth tests.

## Out of scope
- Creating Sentry alert rules or uptime monitors, putting the DSN in the vault, and deploying. The reviewer does these.
- Any other auth or push behaviour.
