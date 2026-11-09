# T-129 — KO popup in production (account mode)

**Phase:** KO core · **Depends on:** T-116, T-123, T-124, T-128 · **Status:** draft

## Goal
Signed-in pilot captains and players get the real KO popup, the same one as in local development,
with the feed, page context, suggestion chips and account chat. It replaces the
`KoAccountLink` link that navigates to `/ko`. The `/ko` page stays as the full-screen fallback.
The popup is the same component in every environment, with no second design.

## Files
Create or modify only these:
- `src/features/ko-entry/ko-account-link.tsx`: still a server gate (`koPilotAvailable`, hidden on player workout and onboarding); renders the client widget in account mode instead of a `Link`
- `src/features/ko-entry/ko-account-widget.tsx`: new `'use client'` wrapper that lazy-loads the KO widget in account mode
- `src/features/ko-entry/messages.ts`: only if a new string is needed
- `src/features/ko-entry/index.ts`
- `src/features/ko-preview/components/ko-widget.tsx`: `account` prop (forces the interactive chat and hides the "under development" hammer badge)
- `src/features/ko-preview/components/ko-panel.tsx`: pass `account` through to `KoChat`
- `src/features/ko-preview/index.ts`: export what `ko-entry` needs (public API only)
- `src/features/ko-entry/ko-entry.test.ts` (new) plus existing tests that assert the old link
- This task card.

## Requirements
1. **Gate unchanged:** the widget renders only when `koPilotAvailable()` is true on the server.
   - Non-pilots see nothing, with no client fetch and no flash.
   - Player workout and onboarding routes stay hidden.
2. **Account mode:**
   - The panel renders `KoChat` with `account`, so it uses `/api/ko`, signed approvals, the photo and voice limits, and context from T-124.
   - The KO feed (T-123) shows above the chat.
   - No "local", "dev" or "under development" text appears in account mode.
3. **The dev preview** (`KoPreview`, development only) keeps working as before.
4. **Performance:**
   - The launcher is light: the panel, chat and feed code load only on first open (dynamic import), and the KO images use `next/image`.
   - `src/lib/perf-budget.test.ts` budgets must still pass. Do not raise any budget.
5. **Position:**
   - Same corner as today, above the bottom nav on mobile.
   - It must not cover the bottom nav, the feedback button or the install sheet on captain and player shells.
6. **Fallback:** if the panel chunk fails to load, show a translated error with a retry button and a link to `/ko`.
7. **Release note (card only):** production needs migration 0077 (`ko_feed`) applied before this ships. Write that under "Notes for reviewer"; do not apply anything.

## Acceptance
- [x] Tests:
  - the gate renders nothing for a non-pilot;
  - workout and onboarding routes are hidden;
  - account mode passes `account` to the chat and shows no dev strings;
  - the dev preview is unchanged;
  - the panel is lazy (no import of the panel module from the launcher's module graph);
  - ar/en and RTL.
- [ ] `npm run check` and `npm run build` pass (a sandbox Google Fonts failure is a known limit).

## Out of scope
- Opening KO to non-pilot users or plans (owner decision after the feasibility study)
- New KO tools, confirm buttons (T-130), and player exercise swaps (T-131)

## Notes for reviewer
- Production needs migration **0077 (`ko_feed`)** applied before this ships. No migration was created or applied by this card.
- `KoAccountLink` retains the server pilot and route gates. The client wrapper stays private to `ko-entry`, outside its public API.
- The existing widget opens the existing panel through a dynamic import. Account mode forces chat, keeps the feed above it, and lets `KoChat` own the removable account context so it appears once.
- To keep feed code out of the launcher, the urgent badge starts updating on first open and retains the last count when closed. No background feed polling happens before opening.
- Chunk loading and failure use the existing dialog primitive with Egyptian Arabic/English copy, retry, and the `/ko` fallback.
- The sandbox build cannot fetch Alexandria, Changa, or Manrope from Google Fonts. Fresh performance measurements require a successful build; the failed build left a stale manifest referring to missing chunks, which was set aside in `.next/diagnostics/route-bundle-stats.pre-t129.json`. No budget was changed.
- The exact reviewer Vitest command finished with `26 passed | 1 skipped` files and `249 passed | 1 skipped` tests (perf skipped). The full suite reported 2,781 passing tests and one sheet-surface failure; that failure was fixed in the widget and its test rerun passed.
- `npm run check` passed TypeScript and ESLint, then stopped at the release audit because the sandbox rejected Node spawning Git (`spawnSync git EPERM`). Running the same audit rules with Git invoked by the shell reported `Release audit: 1617 tracked files, 0 findings`.

## Review (2026-11-09)
- Restored the urgent badge on the launcher before first open (T-123 requirement): `useKoFeedCount` lives in `ko-widget.tsx` again, and the panel's `onBadge` callback was removed. The launcher is already lazy-loaded, so first-load budgets are unaffected; the lazy-import test now guards only the panel and chat.
- Before shipping: apply migrations 0075, 0077 (and 0080 with T-131) to production.
