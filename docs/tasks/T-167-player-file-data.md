# T-167: Player file: the latest answer for every fact, with its source

**Phase:** Captain workspace · **Depends on:** T-165 · **Status:** implemented; acceptance verification blocked (Windows EPERM)

## Goal
The captain needs the player's current facts while building a plan. That means the newest value, not
only the onboarding answer. Today the facts live in several forms:
- `player_intake`, the onboarding, which a player can update (`updated_at`);
- weekly `check_ins` (body weight, waist, notes);
- more form types later.

Build a pure, extensible data layer. It merges every source into one **player file**: per fact, the latest
value, its source and date, and the previous value when it changed. It also builds a per-form history that
says what each form changed.

The design is in `docs/mockups/captain-workspace/v5-mobile.html` (screens 2 and 3) and `v4.html` (start
column). This card is data and logic only, no UI.

## Files
- New feature `src/features/player-file/` (`index.ts`, `model.ts`, `merge.ts`, `data/load-player-file.ts`,
  `player-file.test.ts`)
- `docs/ARCHITECTURE.md` (one line), this card

## Requirements
1. **Types:**
   - `FactKey`: `weight`, `targetWeight`, `height`, `age`, `sex`, `experience`, `trainingDays`,
     `sessionMinutes`, `injuries`, `medical`, `allergies`, `waist`, `note`.
   - `FormSource = { kind: 'intake' | 'checkin'; id: string; at: string }`. Keep the union open for future
     kinds: adding one must only mean writing one adapter.
   - `PlayerFact<K> = { key: K; value: …; source: FormSource; previous?: { value: …; source: FormSource } }`.
2. **Adapters:**
   - Each source turns its rows into `{ source, facts: Partial<Record<FactKey, value>> }`.
   - The intake adapter maps every intake column. Its `at` is `updated_at`, falling back to `completed_at`
     and then `created_at`.
   - The check-in adapter maps `body_weight_kg`, `waist_cm` and `notes`. Its `at` is `created_at`.
3. **`mergePlayerFile(snapshots, now)`** (pure):
   - For each key, the newest snapshot that has the key wins.
   - `previous` is the newest older snapshot with a different value. Arrays compare as sets.
   - A fact is `isNew` when its source is the newest form, and that form is newer than the captain's last
     view. `lastViewedAt` is an optional input; persisting it is out of scope.
4. **`formHistory(snapshots)`** (pure): newest first. Each form lists the keys it changed compared with the
   state before it. The first form lists "first data" (an empty changed list plus `first: true`).
5. **Loader** `loadPlayerFile(client, playerId, { checkinLimit = 12 })`:
   - Reads intake plus the latest N check-ins for that player, with RLS as the boundary (captain reads only
     own players).
   - Returns `{ facts, history }`.
   - Runs two parallel queries, bounded, and selects only the columns the adapters need.
6. **Derived helpers** for later cards: `age(birthYear, today)` (reuse `ageIn` from player-profile only
   through its public entry, or move it to `src/lib` if both need it). Export the facts the fit checks will
   read: training weekdays as the 0..6 Sat-based index used by `programs/weekly-draft.ts`, session minutes,
   and injury keys.
7. **Tests, deterministic, no network:**
   - intake only;
   - intake then a check-in that changes the weight (previous kept);
   - a check-in with the same weight (no previous);
   - an updated intake that adds an injury (injuries changed, set comparison);
   - history change lists;
   - `isNew` with and without `lastViewedAt`;
   - the loader's fake client records bounded selects with `player_id` filters.

## Acceptance
Implementation plan: define typed snapshots and adapters in `model.ts`; test and implement the pure merge/history in `merge.ts`; test the bounded parallel loader in `data/load-player-file.ts`; publish through `index.ts`, document the feature, and run every acceptance gate.
- [x] The tests above pass (14 deterministic feature tests, native config loader and thread pool).
- [ ] `npx tsc --noEmit -p .`, `npx eslint .`, `npm run audit:release`, `npx vitest run`, `npm run build`,
  then `npx vitest run src/lib/perf-budget.test.ts` all pass.

## Out of scope
- UI (T-168), the flag and workspace (T-166), migrations, new form types, persisting `lastViewedAt`.
- `src/features/programs`, `src/app/globals.css`, `src/features/luxury-preview`.

## Implementation notes
- Public API: typed facts/snapshots, intake/check-in adapters, merge/history, `age`, `fitFacts`, and `loadPlayerFile`.
- Intake nullable answers clear earlier values; null check-in fields are unanswered. Equal timestamps use kind/id ordering; `previous` requires a strictly older timestamp.
- `isNew` defaults to unseen when no last view is supplied, applies only to the newest form, and excludes future-dated forms. Loader options accept injected `now` and `lastViewedAt`.
- `ageIn` is not exported by the player-profile public entry. To keep the strict file scope, `age` uses the same one-line birth-year calculation locally; exporting/moving the shared helper requires expanding the allowed file scope.
- `npx tsc --noEmit -p .` and `npx eslint .` passed. `npm run check` stopped at `audit:release`: `spawnSync git EPERM`.
- Audit fallback: PowerShell `git ls-files` piped into Node running the unchanged `scanFile`/`scanRoutes` rules: `Release audit fallback: 1825 tracked files, 0 findings`.
- Default Vitest commands hit config-loader `spawn EPERM`; used `--maxWorkers=2 --configLoader native --pool=threads`.
- Full fallback summary: `Test Files 1 failed | 456 passed (457)`; `Tests 1 failed | 3300 passed (3301)`. The only failing test was the performance artifact read described below.
- `npm run build`: `Compiled successfully in 19.9s`, then `spawn EPERM` at Next's TypeScript worker. Standalone TypeScript passed.
- Post-build performance test with the Vitest fallback failed with `ENOENT` for `.next/static/chunks/3n07mo54s1gbz.js`; no budgets changed. Reviewer must rerun the complete build and all gates.
