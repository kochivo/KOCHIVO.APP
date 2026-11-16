# T-331 — Service worker cache, branded 404, sitemap and robots

**Source:** `docs/AUDIT-2026-11-16-full.md`, findings 12 (PERF-04), 19 (404) and 23 (SEO files). There is no migration.

## 1. The service worker caches failed responses (PERF-04)
- **Where:** `public/sw.js:87-95`.
- **Bug:** a 503 or 404 for a JS chunk gets cached, so the screen stays broken on that phone.
- **Fix:**
  - Cache a response only when `res.ok` is true and `res.type` is not `opaqueredirect`.
  - Bump the cache version constant so old caches are deleted on activate. Check that the activate handler already deletes old versions; if it doesn't, add that.
  - Update or add the sw test if one exists (grep `sw.js` in tests).

## 2. Branded 404 page
- Next 16 is in use, so read `node_modules/next/dist/docs/` for `not-found` before writing code.
- Add `src/app/[locale]/not-found.tsx` (and a root `src/app/not-found.tsx` if one is needed for paths without a locale). Follow how the app's layouts are set up.
- **Content:**
  - the KOCHIVO logo or wordmark, as the public pages use it;
  - one short line, for example "This page doesn't exist";
  - one primary lime action to the home page.
- Strings go in messages in ar, arStd and en. Use tokens only, a dark/light-safe design, and logical properties.

## 3. sitemap and robots
- Add `src/app/sitemap.ts` and `src/app/robots.ts`, using the Next metadata route APIs; read the docs in node_modules first.
- **Sitemap:** only the public pages that exist, in both locales: home, pricing, login, signup, demo. Base URL `https://kochivo.site`.
- **Robots:** allow `/`, and disallow `/captain`, `/player`, `/admin`, `/api` and `/dev`. Link the sitemap.
- Make sure the middleware or proxy does not redirect `/sitemap.xml` or `/robots.txt` to a locale; check the matcher.

## Tests
- A unit test for the sitemap and robots output.
- A test for the sw cache rule, if testable as a pure function. Extract a small helper if needed.

## Out of scope
- The footer privacy and terms links. They wait for the owner's legal text.

## Gates
`npm run typecheck`, `npm run lint`, the related vitest files, and `npm run build` (it needs network for fonts).
