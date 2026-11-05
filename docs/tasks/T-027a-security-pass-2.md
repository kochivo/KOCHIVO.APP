# T-027a — Security pass 2: headers, new code since T-015, and fixes

**Phase:** 4 · **Depends on:** T-015 (done) · **Status:** ready

## Goal
The first review (`docs/SECURITY-REVIEW.md`) covered migrations 0001–0023. Since then we added
admin billing changes, templates, starter templates, the demo (anonymous sign-in is now ON in
production), Sentry and more. This pass reviews everything added after 0023, adds the missing
HTTP security headers, and fixes every finding of medium severity or higher in the same diff.

## Files
Create or modify only these:
- `next.config.ts`: security headers for every route (keep the existing `/sw.js` rule)
- `src/lib/security-headers.ts` (new): builds the header list and the CSP string, pure and tested
- `src/lib/security-headers.test.ts` (new)
- `supabase/migrations/0034_security_pass_2.sql` (new, only if a DB fix is needed)
- `supabase/tests/security-pass-2.test.ts` (new): one PGlite test per DB finding you fix
- `docs/SECURITY-REVIEW.md`: append a section `## Pass 2 (T-027a)` with the same table format
- Any `src/features/*/data/*.ts` or `src/core/**` file where you fix a finding (list each in your report)

## Requirements
1. **Headers** on all routes:
   - `Content-Security-Policy`:
     - `default-src 'self'`
     - `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com`. Next inlines its RSC payload and we have pre-paint boot scripts; nonces would force every page to render dynamically, so we accept `'unsafe-inline'` and say so in a comment.
     - `style-src 'self' 'unsafe-inline'`
     - `img-src 'self' data: blob:` plus the Supabase origin
     - `media-src 'self' blob:` plus the Supabase origin
     - `connect-src 'self'` plus the Supabase origin with `https:` and `wss:`, plus `https://*.ingest.de.sentry.io`
     - `frame-src https://challenges.cloudflare.com`
     - `font-src 'self'`
     - `worker-src 'self'`
     - `object-src 'none'`
     - `base-uri 'self'`
     - `form-action 'self'`
     - `frame-ancestors 'none'`
     - `upgrade-insecure-requests`, in production only
     
     Read the Supabase origin from `publicEnv()` at build time. Fall back to `https://*.supabase.co` if it is missing.
   - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (production only)
   - `X-Content-Type-Options: nosniff`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `X-Frame-Options: DENY`
   - `Permissions-Policy: camera=(self), microphone=(self), geolocation=(), payment=(), usb=()`
   - `Cross-Origin-Opener-Policy: same-origin`
2. **Review** everything added after migration 0023 and every source file changed since the first review. Cover at least:
   - migrations 0024–0033
   - all `'use server'` actions
   - `src/features/auth/data/callback.ts`: the redirect target must be same-origin and relative. `//evil.com` and `/\evil.com` must be rejected.
   - `src/proxy.ts`
   - admin pages and RPCs
   - the demo and anonymous flow, including the new `0033` guards
   - storage signed-URL helpers
   - the offline sync RPCs
   - Sentry scrubbing
   - invite codes: can they be brute-forced through `invite_preview` or `redeem_invite`? Report the code length and entropy, and add a DB-side attempt limit if it is weak.
3. For each finding, give: ID (`SEC2-NN`), severity, attack steps, why it is allowed, and the fix. Fix everything rated medium or higher here. Low findings may be report-only.
4. Every fix has a test that fails before the fix and passes after it.
5. Do not loosen any existing policy, and do not edit migrations 0001–0033.

## Acceptance
- [ ] `curl -I` against `npm run start` shows all headers. In your report, paste the header list from the test instead.
- [ ] The CSP test asserts each directive above.
- [ ] Tests for the callback redirect cover `//evil.com`, `/\evil.com`, `https://evil.com`, and `/captain` (allowed).
- [ ] The Pass 2 table is in `docs/SECURITY-REVIEW.md`.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Rewriting UI, theming, i18n, performance.
- Supabase dashboard settings (report them under Notes for reviewer, e.g. leaked-password protection).

## References
- `docs/SECURITY-REVIEW.md`, `AGENTS.md` §3, `supabase/tests/harness.ts`
