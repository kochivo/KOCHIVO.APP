# T-015g — Error tracking with Sentry, with no personal data

**Phase:** 5 · **Depends on:** T-026f (merged) · **Status:** ready
**Delegate to:** Codex

The owner approved Sentry on 2026-11-03. `@sentry/nextjs@11.8.0` is **already installed** in your working tree (`package.json` and the lockfile). Do not install, upgrade, or add any other package.

## Goal

Real crashes reach Sentry: browser, server, and edge. Nothing personal leaves the device. When no DSN is set (local development, tests, a preview without a key), Sentry does nothing at all.

## Fixes

1. **Config.** Wire it up the way the SDK's documentation for Next.js describes. Use `instrumentation.ts` (with `register` and `onRequestError`), `instrumentation-client.ts`, and the server and edge init, plus `withSentryConfig` in `next.config.*`.
   - Source-map upload is **off**: it needs an auth token, which we don't have. There are no tunnel routes or extra features.
   - Session replay is off. Tracing is off, or `tracesSampleRate: 0`.
2. **DSN from env only.**
   - The DSN comes from `NEXT_PUBLIC_SENTRY_DSN`. If it is empty or missing, do not call `init`, or init with `enabled: false`.
   - Add `NEXT_PUBLIC_SENTRY_DSN=` to `.env.example` with a one-line comment. That is the only env file you may touch.
3. **Privacy scrubber.** Put it in `src/lib/sentry-scrub.ts`, as a pure, tested `beforeSend` and `beforeBreadcrumb`. Every runtime uses it.
   - Never send the user: no email, no id, no IP. Set `sendDefaultPii: false`.
   - Strip request bodies, cookies, headers, and query strings.
   - Redact values whose keys look like any of these: email, phone, password, token, weight, kg, waist, photo, video, path, note, reply, full_name, name, intake, injuries, medical, allergies.
   - Redact email-shaped and phone-shaped strings in messages, exception values, and breadcrumb messages.
   - Drop breadcrumbs for `fetch`/`xhr` URLs that contain `/storage/` or a query string.
4. **Error boundary.** Report crashes from `src/app/global-error.tsx`. Create it if it doesn't exist, as a small Arabic error screen with a retry button. It must follow the UI rules: tokens only, RTL logical properties, and `min-h-12`.
5. **No console.** Leave the existing `console.error` calls as they are, and add no new logging.

## Files

- `instrumentation.ts`, `instrumentation-client.ts`, and the Sentry server and edge config files, at the root or in `src/` (whichever Next 16 and the SDK expect)
- `next.config.*`
- `.env.example`
- `src/lib/sentry-scrub.ts` and its test
- `src/app/global-error.tsx`

## Requirements

1. **Do not touch:** `supabase/`, `.env*` other than `.env.example`, `package.json`, the lockfile.
2. The build passes with **no** DSN set. The tests never init Sentry.
3. `lib/` does not import from `features/`. Files stay under 250 lines.

## Acceptance

- [ ] Scrubber tests cover each rule above: user removed, request stripped, keys redacted, email and phone patterns redacted, storage breadcrumbs dropped.
- [ ] A test proves that init is skipped when there is no DSN.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope

- Source maps
- Performance tracing
- Session replay
- Alerts
- Creating the Sentry project (the owner does this)
