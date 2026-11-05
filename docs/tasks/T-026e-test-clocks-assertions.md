# T-026e — Fixed clock for SQL tests and explained assertions (CH-07, CH-10)

**Phase:** 5 · **Depends on:** T-026a/b/c (merged) · **Status:** ready
**Delegate to:** Codex

Read `docs/CODE-HEALTH.md` CH-07 and CH-10 first.

## Fixes
1. **CH-07:** SQL tests must not depend on the real date.
   - In `supabase/tests/harness.ts`, give each test database a fixed clock. Look at how `rls-player-payments.test.ts` freezes SQL `today` and choose the cleanest general approach. A good option: create a `test_clock` schema with `now()` and `current_date` replacement functions returning a fixed instant, and put it **first** on the test role's `search_path`, so unqualified `now()` and `current_date` in migrations resolve to it. Confirm it works for functions that set `search_path = ''`; if those still call `pg_catalog.now()`, use another approach (for example, overriding at the function level in the harness only) and explain the choice.
   - Export a fixed instant (for example `TEST_NOW = '2026-11-03T10:00:00Z'`) and make `dayOffset` use it.
   - Update the listed tests to compute expected dates from `TEST_NOW` and not from JS `new Date()` or SQL live time.
   - Production migrations must not change.
2. **CH-10:** in `src/core/offline/sync.ts`, `supabase/tests/harness.ts`, `supabase/tests/rls.test.ts`: replace each `!` with a narrowing check that throws a descriptive error, or add a one-line comment on why it is safe.

## Files
`supabase/tests/*.ts`, `src/core/offline/sync.ts` and its test if needed.

## Requirements
1. **Do not touch** `src/lib/*`, `src/features/*` (another card). No migration changes.
2. Every test keeps passing; the full suite runs in the same time or faster.

## Acceptance
- [ ] Tests pass with the fixed clock.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- CH-03, CH-04
