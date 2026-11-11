# T-163 — `database.ts` is generated; corrections live in the overlay

**Phase:** Refactor (blueprint R-07) · **Depends on:** T-162 · **Status:** implemented; verification blocked (2026-11-11)

## Goal
`src/types/database.ts` was generated once and then hand-edited: it imports local row types from
`@/core/offline/tables`, and some code casts around wrong column types. Replace it with a fresh, untouched
generation from the live project, move every hand correction into `src/types/app-database.ts`, and make
local sync row types derive from the generated tables. Zero runtime change.

## Files
- `src/types/database.ts`: replaced by the generated file the reviewer placed at
  `src/types/database.generated.ts` in this worktree (move it over `database.ts`, then delete the
  `.generated` copy). Only a header comment may be added.
- `src/types/app-database.ts`, a new `src/types/enums.ts`
- `src/core/offline/tables.ts` (types only)
- The casts in `src/features/notifications/data/notifications.ts`, `src/features/supplements/data/refresh.ts`
  and the settings data file that casts a `Database` type (`grep -rn " as " src/features/settings/data`)
- `eslint.config.mjs` (ignore `src/types/database.ts`)
- A new `supabase/tests/type-narrowing.test.ts` (PGlite, like the other tests in `supabase/tests/`)
- Any file that stops compiling because a hand edit is gone: fix it through the overlay, not by editing
  `database.ts`
- This task card

## Requirements
1. `database.ts` is 100% generated: no import line, no edits except a top comment
   `// Generated from the live Supabase project. Do not edit; corrections go in app-database.ts.`
   ESLint ignores it.
2. Corrections live in `app-database.ts` (blueprint §4.3; read it at
   `C:/Users/ALY/Desktop/KOCHIVO-REBRAND/docs/REFACTOR-BLUEPRINT.md`). Use a `Narrow<Row, Patch>` helper.
   Narrow `text` columns that have a `check (... in (...))` constraint to string unions declared in
   `src/types/enums.ts`. Find them in `supabase/migrations/*.sql`; narrow at least the ones the code relies on.
3. `core/offline/tables.ts` row types derive from `Tables<'...'>` (`Omit` of server-only columns such as
   `player_id`, `server_updated_at`), with explicit `Narrow<...>` plus a one-line why-comment where the
   local row is stricter than the server (for example `set_logs.program_exercise_id` is nullable on the
   server because the RPC nulls references to deleted plan rows).
4. Delete the three casts named in the card; `tsc` passes without them and without new casts.
5. `supabase/tests/type-narrowing.test.ts`: for every narrowed column, read its CHECK constraint from
   `pg_constraint` after applying the migrations in PGlite and assert the allowed values equal the union
   exported from `enums.ts` (export the unions as `readonly` arrays plus derived types so the test can
   compare at runtime).
6. No runtime change: no query, migration, string or behaviour changes. If the generated file reveals a real
   mismatch between the code and the live schema, do not "fix" the database; list it in the notes.

## Acceptance
- [x] `database.ts` is byte-identical to the generated file apart from the header comment.
- [x] The three casts are gone; the PGlite narrowing test passes.
- [ ] `npx tsc --noEmit -p .`, `npx eslint .`, `npm run audit:release`, `npx vitest run`, `npm run build`,
  then `npx vitest run src/lib/perf-budget.test.ts` all pass.

## Out of scope
- Migrations, Postgres enums, Zod wire schemas (blueprint §4.3 item 4), any runtime code change.
- `src/core/resource` and the analytics/readiness/captain supplements islands (T-161),
  `src/app/globals.css`, `src/features/luxury-preview`.

## References
- `docs/REFACTOR-BLUEPRINT.md` §4.3 and card R-07

## Implementation / reviewer notes (2026-11-11)

- Generated body SHA-256: `0d61ac643b90797447a57cdab9da15963679aa18649b0ca46abcf9d0333769af`.
  The `.generated` copy was moved, and only the required header was prepended.
- The overlay preserves trigger defaults, RPC JSON shapes, nullable RPC arguments/returns,
  validated social JSON, and CHECK-backed unions. Offline rows derive from generated tables.
- Compiler-required changes outside the named cast files are type-only imports: offline transport
  and its test, private media, auth-client, nutrition/program snapshots, generator candidates and
  its test, and the set-sync PGlite test now use `AppDatabase`.
- Narrowing test: **18 passed** (17 catalog comparisons and one compile-time contract test), including
  a verified failure when `crown_defend` was temporarily removed from the notification union and a green
  run after restoring it. The final focused run (narrowing, transport, generator, set-sync) reported
  **4 files passed, 41 tests passed**.
- `npx tsc --noEmit -p .` and `npm run check` stop on the existing unrelated import in
  `src/features/ko-account/route.ts:11`: `koAccountConfig` is not exported by `@/features/ko-entry`.
  This file was left untouched.
- `npx eslint .`: passed. `npm run audit:release`: blocked by `spawnSync git EPERM`;
  the same `scanFile` / `scanRoutes` checks with shell-supplied `git ls-files` paths reported
  **1828 tracked files, 0 findings**.
- Default Vitest commands hit `spawn EPERM`; reruns use
  `--maxWorkers=2 --configLoader native --pool=threads`.
  The full fallback run reported **449 files passed, 2 failed; 3248 tests passed, 2 failed**.
  Failures: the unchanged `src/features/ko-core/import-graph.test.ts` finds a KO UI barrel import in
  `src/features/ko-account/account.ts`, and `src/lib/perf-budget.test.ts` lacks a build chunk.
- `npm run build`: **Compiled successfully in 15.3s**, then `spawn EPERM` during TypeScript.
  No build settings were changed. The post-build performance-test fallback fails with a missing
  `.next/static/chunks/3n07mo54s1gbz.js` artifact; no budget was changed.
