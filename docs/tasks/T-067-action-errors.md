# T-067 — Server actions return errors instead of throwing (fix "Minified React error #441")

**Phase:** 3 · **Status:** ready (live bug reported by the owner, 2026-11-04; Sentry KOCHIVO-2)

## Problem (live)
1. The coach taps «فعّل للاعب» ("activate for player") on a meal plan that has an empty meal.
2. `meal-plans/data/activate.ts` throws `new Error(t('addAMealAndFoodFirst'))` inside a server action. Sentry received «ضيف وجبة وأكلة الأول» ("add a meal and a food first").
3. In production, Next.js masks thrown server-action errors, so `hooks/use-plan-draft.ts:51` (`setError(failure.message)`) shows the raw English text «Minified React error #441; visit https://react.dev/…» to the coach.
4. Any server action that throws a user-facing message has the same bug. Today 83 `throw new Error(t(...))` exist in `src/features/*/data/`.

## Changes
1. **Shared result type** in `src/lib/action-result.ts`:
   - `type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string }`
   - helpers `ok(data)` and `fail(message)`
2. **Expected failures return `fail(t(...))`.** Validation, "add a meal first", "sign in first" and similar are expected failures. Throwing stays only for programmer errors.
   Convert every `'use server'` action that throws a translated message:
   - meal-plans: activate, save, custom food, custom food photo, foods
   - programs builder save and activate
   - any other `'use server'` file whose throws reach the UI (grep `'use server'` and check each)
   - non-server helpers can stay as they are
3. **Callers check `result.ok`.**
   - They show `result.error`.
   - A real thrown error (network, masked) always shows the translated generic message (`couldntSaveTryAgain` or the matching message), never `error.message`.
   - Remove `failure.message` / `cause.message` displays in UI code. Grep `\.message` under `components/` and `hooks/`.
4. **Activate with an empty meal:**
   - Ideally, check on the client before calling, and show «ضيف وجبة وأكلة الأول» ("add a meal and a food first") next to the button.
   - Also keep the server check.

## Out of scope
- The layout bugs (T-066).
- Changing any business rule.

## Tests
- `activate.test.ts`: the 22023 error code gives `{ ok:false, error:'ضيف وجبة وأكلة الأول' }`, not a throw.
- `use-plan-draft`: a thrown masked error shows the generic message; an `ok:false` result shows its error.
- Update the existing tests that expected throws.

## Requirements
- No new dependencies.
- Strings in `messages.ts`.
- Files ≤ 250 lines.
- `import type` for the result type.

## Acceptance
- [ ] Activating a plan with an empty meal shows «ضيف وجبة وأكلة الأول» ("add a meal and a food first"); no English or minified text reaches the UI anywhere.
- [ ] `npx tsc --noEmit -p .`, `npx eslint .`, `npx vitest run --maxWorkers=2` and `npm run build` pass.
