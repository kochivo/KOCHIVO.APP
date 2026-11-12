# T-186: Standard Arabic for the captain app

**Phase:** International · **Depends on:** T-184 · **Status:** ready

## Goal
Every screen a captain sees reads naturally in standard Arabic when that style is chosen.

## Files
- Only `messages.ts` files, adding an `arStd` block, in captain-facing features. Examples include roster, captain-workspace (including queue/ and forms/), programs, templates, program-generator, meal-plans (including calculator and library), forms, inbox, billing, dashboard, settings, coach-page, ko-account, rank-review and captain-approval. Use the T-184 coverage test to find each file.
- This card.

## Requirements
1. Follow `docs/I18N-STYLE.md` exactly. Same keys, placeholders and plural keys as `ar`.
2. No code changes besides `arStd` blocks. List any string built in code under "Notes for reviewer".
3. Every touched file reaches 100% coverage.

## Acceptance
- [x] Coverage is 100% for every captain-facing messages file.
- [ ] All gates pass.

## Out of scope
- Player screens (T-185).

## Implementation notes

- Added 23 flag-gated sibling standard dictionaries for roster (including invites),
  captain-workspace (including forms and queue), programs, templates,
  program-generator, meal-plans (including calculator, editor and library), forms
  (including requests), inbox, billing (including packages), dashboard, settings,
  coach-page, ko-account, rank-review and captain-approval.
- Captain-approval intake already has complete standard coverage from T-184.
- Extended coverage to nested form labels and weekdays, and extended flag gating tests.
- Forms consumers still select `messages[locale]` directly; selecting the standard
  dictionary there requires consumer changes outside this messages-only card.
- Existing composed strings remain unchanged: template assignment title fragments
  (`give` / `toAPlayer`), settings account-deletion date fragments, and KO account
  food/exercise/team lists assembled in data/execute.ts, data/swap.ts and
  data/read-progress.ts.
- Shared player dictionaries outside this card remain with T-185.

## Validation

- TypeScript and ESLint passed; coverage and dictionary-gating tests: 2 files,
  60 tests passed. All 23 added dictionaries have complete leaf-key coverage.
- Default Vitest commands hit Windows spawn EPERM; reran with
  `--maxWorkers=2 --configLoader native --pool=threads`.
- `npm run check` passed typecheck and lint, then stopped at release audit:
  `spawnSync git EPERM`. No audit substitute was used.
- `npm run build` compiled successfully, then stopped at its TypeScript worker:
  `spawn EPERM`. No build substitute was used.
- The standalone performance test fallback fails with ENOENT for a referenced
  chunk in the incomplete .next output; budgets remain unchanged.
- Full fallback suite: 527 passed / 2 failed files; 3664 passed / 2 failed tests.
  Failures were the missing performance chunk and the demo workspace test's
  20-second timeout. The isolated demo suite rerun passed all 13 tests.
