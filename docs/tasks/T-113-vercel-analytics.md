# T-113 — Vercel Web Analytics

Owner supplied the Next.js Analytics import. The package is already installed in the owner's working tree (`@vercel/analytics` 2.0.1 in package/lock); preserve that installation and include it in this integration release. Mount Analytics once in the shared locale root, and exclude the reserved Vercel insights route from auth/locale proxy handling. CSP same-origin script/connect rules already cover default analytics endpoints; no wider policy is needed. No custom events, database changes or additional dependencies. Publication follows standing owner instruction.

## Files

- `package.json`, `package-lock.json` — pre-existing owner installation.
- `src/app/[locale]/layout.tsx`, `src/app/locale-layout.test.ts`
- `src/ui/site-analytics.tsx` — lazy client boundary to keep the existing first-load budget.
- `src/proxy.ts`, `src/proxy.test.ts`
- This task card and `docs/superpowers/plans/2026-11-07-vercel-analytics.md`.

## Verification

Test exactly one Analytics component for both locales; reserved insights URLs skip proxy, app routes remain protected. Run full check/build/perf, independent review and live script/endpoint verification. Analytics collection depends on Web Analytics being enabled in Vercel; verify the live endpoint before claiming collection. Sentry is unavailable here, as previously confirmed.
