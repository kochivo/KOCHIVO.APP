# T-026f — Shared error-code reading and snapshot refresh (CH-04 rows 5–6)

**Phase:** 5 · **Depends on:** T-026d (merged) · **Status:** ready
**Delegate to:** Codex

Start by reading the last two rows of the CH-04 table in `docs/CODE-HEALTH.md`. They are the error-code row and the snapshot-refresh row.

## Fixes

### 1. Error codes

Add `src/core/supabase/errors.ts`, with two kinds of pure helpers:
- **Reading the code:** take an unknown error and safely read its `code` and `message`. This works for an `Error`, a plain object, `null`, or anything else.
- **Shared classification:** one helper for permission denied (`42501`), and one for a missing row (`PGRST116`, or `P0002` where a caller already treats it as missing).

Use these helpers in each of these callers:
- `authError` (`auth/errors.ts`)
- `actionError` (`admin/format.ts`)
- `errorMessage` (`templates/data/templates.ts`)
- the renewal mapping (`billing/data/billing.ts`)
- the two activation mappings (`programs/data/activate.ts`, `meal-plans/data/activate.ts`)

Each caller keeps its own Arabic messages and its own domain codes. `22023` means different things in each domain, so leave it local.

### 2. Snapshot refresh

Add `src/core/offline/refresh-snapshot.ts`, a small typed helper. It holds the scaffolding that `refreshSnapshot` (`player-home/data/refresh-snapshot.ts`) and `refreshNutrition` (`nutrition/data/refresh-nutrition.ts`) both repeat:
- the online guard
- the injected fetch and the injected DB
- put when there is a snapshot, delete when there is none
- the result states

Fetching, mapping and table selection stay in each feature. Export the helper from `src/core/offline/index.ts`.

## Files

- `src/core/supabase/errors.ts` (new)
- `src/core/offline/refresh-snapshot.ts` (new), and `src/core/offline/index.ts`
- the callers named above
- tests: new unit tests for both helpers, plus updated caller tests if any need it

## Requirements

1. `core/` must not import from `features/`.
2. Every caller keeps exactly the same behaviour, and every message the user sees stays the same. The existing tests prove this; add tests wherever a caller had none.
3. **Do not touch:** `supabase/`, `src/lib/*`, `src/features/workout/*`.
4. Every file stays under 250 lines.

## Acceptance

- [ ] The tests cover both helpers, including unknown and null errors, offline, and an empty snapshot.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope

- CH-03 (generated database types)
- any new error messages
