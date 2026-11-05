# T-004 — Seed exercises and foods with their media

**Phase:** 1 · **Depends on:** T-001 (for the real run; the pure parts can be built and tested before) · **Status:** ready (pure parts)
**Delegate to:** Codex

## Goal
One command loads the 1324 GIF exercises and the 60 starter foods into the database, with their files in Storage. Running it twice changes nothing.

## Files
- `scripts/seed/map-exercise.ts`: pure function from a source JSON entry to an `exercises` insert row
- `scripts/seed/map-food.ts`: the same for `foods`
- `scripts/seed/upload.ts`: uploads one file to a bucket and skips it if the object already exists
- `scripts/seed/run.ts`: entry point. Reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from the environment and supports `--dry-run`.
- `scripts/seed/seed.test.ts`: tests for the mappers
- `package.json`: add the script `"seed": "node --experimental-strip-types scripts/seed/run.ts"`. No new dependencies.
- `vitest.config.ts`: add `scripts/**/*.test.ts` to `include`

## Requirements
1. Inputs:
   - `supabase/seed/source/exercises-gif.json` and `foods-starter.json`
   - Media from `assets-source/exercise-motion/<gif_file>` and `assets-source/food-photos/<photo_file>`
2. Exercises:
   - Upsert on `dataset_id` with `owner_id` null.
   - `media_path` = `exercise-media/<gif_file>`.
   - `name_ar` stays null when the source has none. Never invent a translation here (that is T-014).
3. Foods: upsert on a stable key. Read `0007_nutrition.sql`; if there is no unique column fit for upserting, stop and report it. Do not add a migration.
4. Upload in batches with a concurrency of 6 at most. Print progress every 100 files. On failure, list the failed files and exit with code 1.
5. `--dry-run` validates every source entry and checks that every media file exists, and writes nothing.
6. The service role key is read from the environment only. It is never logged, and never placed anywhere under `src/`.

## Acceptance
- [ ] The mapper tests cover a full entry, an entry with null Arabic name and instructions, and an entry whose media file is missing (it fails validation)
- [ ] `npm run seed -- --dry-run` reports 1324 exercises and 60 foods valid (run it locally; `assets-source/` exists)
- [ ] `npm run check` and `npm run build` pass

## Out of scope
- Arabic translation, image conversion and resizing, and anything in `src/`
