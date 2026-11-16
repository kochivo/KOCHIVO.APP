# T-327 — Assessment screens: standard Arabic, shared buttons, faster library; profile retry

**Source:** `docs/AUDIT-2026-11-16-full.md`, findings 15 (UI-01), 21 (UI-03), 13 (PERF-02, forms library) and 20 (UI-02). There is no migration.

## 1. Standard Arabic on assessment screens (UI-01)
These screens read `messages[locale]` directly, so a user who picked standard Arabic sees Egyptian copy:
- `src/features/forms/components/answer-flow.tsx:28`;
- `player-form-page.tsx:14`;
- `request-manager.tsx:14`;
- `request-picker.tsx:15`;
- `request-review.tsx:13`.

**Fix:**
- Client components use `useT(messages)` from `src/core/i18n/client.tsx`, as other features do.
- The server component `player-form-page.tsx` uses the style-aware server translator that other server pages use. Find it with grep (`arStd`, `getT` or similar in `src/core/i18n`).
- `answer-flow.tsx` already reads the Arabic style for part of its copy. Make all of it consistent.
- Add a render test with arStd selected that shows a standard-Arabic string.

## 2. Shared buttons (UI-03)
In these places, replace the hand-styled native `<button>` with `<Button>` from `src/ui/button.tsx`:
- `request-manager.tsx:44`;
- `request-picker.tsx:37`;
- `request-review.tsx:50`.

Keep `type="submit"`, the pending states and the existing double-submit locks.

## 3. Forms library query count (PERF-02, still present)
- **Where:** `src/features/forms/data/library.ts:16-33` and `metrics.ts:27-38`.
- **Bug:** 20 forms make 84 requests. Questions are read form by form, metrics are read form by form, and the monthly requests are read globally and then again per form.
- **Fix:**
  - Read the questions of all forms in one `.in('form_id', ids)` query.
  - Read the requests once and compute the global and per-form metrics from that one result in a pure function.
  - The page result must stay identical. Test the pure function with fixtures.
  - Target: a constant number of requests, no matter how many forms there are (about 3 to 4).

## 4. Player profile retry (UI-02)
- **Where:** `src/features/player-profile/components/profile-screen.tsx:37`.
- **Bug:** the error state has no retry.
- **Fix:** add a translated retry action (shared `Button`, secondary style) that reloads the profile, using `router.refresh()` or the existing reload pattern in that feature. Keep the back link.

## Out of scope
- `src/features/forms/data/submit-answers.ts` and `save-form.ts`. T-326 changes them at the same time.
- Migrations.

## Rules
AGENTS.md applies in full: tokens only, logical properties, targets of at least 48px, and strings in ar, arStd and en.

## Gates
`npm run typecheck`, `npm run lint`, and `npx vitest run src/features/forms src/features/player-profile`.
