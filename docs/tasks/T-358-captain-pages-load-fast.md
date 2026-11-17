# T-358 — Captain pages show their data fast

**Migration:** none.

**Source:** the owner's logged-in screen review on 2026-11-17 (`docs/tasks/SCREEN-REVIEW-2026-11-17.md`, item S-1). On 2026-11-17 the owner asked for every item to be fixed.

## Problem (what the reviewer measured on kochivo.site)
- Every captain page with data stays on a skeleton for **10–20 s**: players, programs, meal plans, forms, settings, the player file, and the leaderboard. The shell paints in under 1 s.
- On the programs page, the browser only **started** the data requests at about 11.7 s, and each request took 0.3–1 s.
- Vercel logs show the server render of these routes takes about 1–2.5 s. For example, `/captain/settings` started at …714108 and logged at …716486. So most of the wait happens **before** the request leaves the browser.
- The captain sidebar prefetches every captain route again and again: 24 page prefetches in one visit, and hundreds of requests over the session. The links in `src/features/roster/components/captain-nav-groups.tsx` and `captain-frame-nav-view.tsx` use `prefetch={onSelect ? false : undefined}`, so on the real app they use the default prefetch.
- Main suspect: the prefetch flood fills the router's request queue and the serverless concurrency, so the real navigation waits behind it. This is not proven yet.

## Work
1. **Find the cause first, then fix it.**
   - Read the Next 16 docs in `node_modules/next/dist/docs/` on `Link` prefetch and the client router cache.
   - Find what delays the first data request. Candidates:
     - the sidebar prefetch flood;
     - something client-side that blocks hydration (offline db init, service worker, timezone boundary, product tour, demo mode);
     - `captainApproval()` or `fetchPlanSummary()` in `src/app/[locale]/(captain)/captain/layout.tsx` running before the page.
   - Write what you found in the notes, with evidence (code paths and timings from a local `next build` + `next start` if you can).
2. **Sidebar prefetch.**
   - Captain navigation links must not keep prefetching full dynamic pages.
   - Use `prefetch={false}`, or whatever the Next 16 docs recommend for dynamic, auth-gated pages. Hover or intent prefetch is fine if the docs offer it.
   - Keep the demo behavior (`onSelect`) as it is.
3. **Any other cause you prove in step 1:** fix it at the source. Example: if a client provider blocks rendering until IndexedDB opens, make it non-blocking.
4. **Tests:**
   - Add a guard test so that captain nav links keep `prefetch={false}`, or the chosen setting. The existing tests already check prefetch in places; follow their pattern.
   - Add tests for any other change.

## Out of scope
- Roster, leaderboard, billing, home, inbox, settings, and forms content. Other cards (T-359 to T-362) change those files in parallel.
- Only touch the nav, shell, or layout files that the cause needs.
- Do not upgrade Next.js or change dependencies.

## Done when
- Captain nav no longer prefetches every route repeatedly.
- The cause of the delay is named in the notes with evidence, and fixed where it lives in this repo.
- `npm run check` and `npm run build` pass.
- `npx vitest run src/lib/perf-budget.test.ts` passes after the build.
