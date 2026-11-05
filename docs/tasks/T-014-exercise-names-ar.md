# T-014 — Arabic exercise names: a reviewed proposal for every exercise missing one

**Phase:** 4 · **Depends on:** the seed scripts (merged) · **Status:** ready
**Delegate to:** Codex

## Goal
`supabase/seed/source/exercises-gif.json` has 1,324 exercises, and only 167 have `name_ar`. Captains and players search and read in Arabic, so every exercise needs a short Arabic name that people actually use in Egyptian gyms. You **propose** names; the owner reviews them before anything reaches the database. Do **not** edit `exercises-gif.json`.

## Naming rules
- Use the term people say in Egyptian gyms, written in Arabic letters. Common English gym loanwords are fine and often better: «بنش برس», «سكوات», «ديدليفت», «لات بول داون», «كابل», «دمبل», «بار», «سميث».
- Build the name as **movement + equipment + variation**, short (ideally ≤ 5 words): «بنش برس بالدمبل مائل», «سكوات بالبار من قدام».
- Keep the meaning faithful to `name_en`, `equipment`, and `target`. Never invent a variation.
- Match the style of the 167 existing `name_ar` values. Read them all first and reuse their vocabulary.
- No emoji, no English letters, no parentheses unless the English name has a qualifier you cannot express otherwise.

## Files
- `supabase/seed/source/exercise-names-ar.proposed.json` (new): an array sorted by `dataset_id`, one object per exercise **missing** `name_ar`:
  ```json
  { "dataset_id": "0002", "name_en": "…", "name_ar": "…", "confidence": "high" | "medium" | "low", "note": "optional short reason when not high" }
  ```
  Use `low` when the English name is ambiguous or you are unsure of the gym term. The owner reviews `low` and `medium` first.
- `scripts/seed/merge-names.ts` (new): a pure function `mergeArabicNames(exercises, proposals, { minConfidence })` that returns a new array where `name_ar` is filled only when it is missing and the proposal meets `minConfidence`. It never overwrites an existing `name_ar`. Export it; there is no CLI and it never writes files.
- `scripts/seed/seed.test.ts`: add tests for `mergeArabicNames`:
  - does not overwrite an existing name
  - respects `minConfidence`
  - ignores unknown ids
  - output order equals input order
- `scripts/seed/names-ar.test.ts` (new): a validation test over the proposal file:
  - every `dataset_id` is unique, exists in `exercises-gif.json`, and is missing `name_ar` there
  - it covers **all** missing ids
  - `name_ar` is non-empty, has ≤ 60 characters, contains Arabic letters, and has no Latin letters
  - `confidence` is valid

## Requirements
1. Do not touch `exercises-gif.json`, `assets-source/`, migrations, or the database.
2. Work in batches if needed, but the final file must be complete and valid JSON (UTF-8, no BOM). Write it with your file tools, never through PowerShell `Set-Content` (it corrupts Arabic).
3. Report the counts per confidence level in your final message.

## Acceptance
- [ ] The proposal file covers every missing id, and `names-ar.test.ts` passes.
- [ ] The `mergeArabicNames` tests pass.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Translating instructions
- Changing the seed upload
- Body-part or equipment labels
