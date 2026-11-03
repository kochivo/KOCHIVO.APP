# T-026g — Use the generated database types everywhere (CH-03)

**Phase:** 5 · **Depends on:** T-026f (merged) · **Status:** ready
**Delegate to:** Codex

Start by reading CH-03 in `docs/CODE-HEALTH.md`.

## Current state

`src/types/database.ts` is already in your working tree. It was generated from the live Supabase project, and the live schema matches migrations 0001 to 0029. **Do not edit that file by hand.** It is generated output; the next schema change regenerates it.

Right now it breaks one thing. `npx tsc --noEmit` fails once, in `src/core/offline/transport.ts`, because the generated sync RPCs declare `p_rows: Json`.

## Fixes

1. **Lint.** Generated code is not hand-written code, so it is exempt from the line limit. In `eslint.config.*`, turn `max-lines` off for `src/types/database.ts` only.
2. **transport.ts.** Make it compile against `p_rows: Json`. Pass the rows typed with a narrow, documented conversion, not with `any`. The sync rows are plain JSON-safe objects; say so in one comment.
3. **Typed clients.** `src/core/supabase/browser.ts` and `server.ts` must return `SupabaseClient<Database>`, using the generated `Database`.
4. **Remove the copies.** Delete every hand-written schema and every `as unknown as SupabaseClient<...>` cast that CH-03 lists:
   - the `ReadTable` and `Table` copies
   - the `*Database` interfaces, including the ones in `core/offline/media-queue.ts`, `nutrition-snapshot.ts`, `program-snapshot.ts`, `preview.ts` and `progress/data/checkins.ts`
   - the client wrappers

   Use `Tables<'x'>`, `Database['public']['Functions']['y']` and the typed clients instead.
5. **Domain types stay.** Feature domain types (view models, form inputs) stay in the features. Derive them from the generated rows wherever they are straight copies.
6. **Types that don't match.** If a generated type is wider than what a feature uses, narrow it at the data boundary with an existing zod schema or a small mapper. Never cast. For example: a function returns `string` where the feature expects a union, or a column is nullable in a view.

## Files

- `eslint.config.*`, the `max-lines` override only
- `src/core/supabase/*`, `src/core/offline/transport.ts`, `src/core/offline/media-queue.ts`
- the feature data, type and client files that CH-03 names, plus any other file with a `SupabaseClient<...>` cast (`grep -rn "as unknown as SupabaseClient" src` lists 22)
- the tests that need updating

## Requirements

1. No behaviour change. Runtime queries and results stay identical; this is a types-only refactor, plus any runtime narrowing you need.
2. No `any`, no `@ts-ignore`, no `as unknown as`. Any `!` gets a comment saying why it is safe.
3. **Do not touch:** `src/types/database.ts`, `supabase/`, `src/lib/*`.
4. Hand-written files stay under 250 lines.

## Acceptance

- [ ] `grep -rn "as unknown as SupabaseClient" src` prints nothing.
- [ ] No hand-written table or schema copies are left in features.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope

- Schema changes
- Regenerating the types
- White-label tables (not in the schema yet)
