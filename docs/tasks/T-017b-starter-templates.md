# T-017b — 10 ready-made templates, copied into every captain's account

**Phase:** 3 · **Depends on:** T-017a templates, T-014 names, the seed scripts (merged) · **Status:** ready
**Delegate to:** Codex

## Owner decision (2026-11-03)

Every captain gets **their own editable copy** of the ready-made templates in their account. There is no shared, read-only library for captains. An edit by one captain never affects anyone else. Changes to the library later only reach captains who are created after the change.

## Goal

When a captain account is confirmed (`profiles.role = 'captain'` and `role_confirmed` becomes true), the database copies 10 starter templates into that captain's account:
- **6 workout programs:** `programs` with `is_template = true`, together with their days and exercises
- **4 nutrition plans:** `nutrition_plans` with `is_template = true`, together with their meals, items and alternatives

The captain then sees them in their templates screen. They can assign them as they are, edit them, or delete them, like any template they made themselves.

## Content

Write it in `supabase/seed/source/starter-templates.json`, in Egyptian Arabic, short, with no emoji.

**Workout (6):**
1. full body for beginners, 3 days
2. upper/lower, 4 days
3. push/pull/legs, 6 days
4. fat-loss circuits, 3 days
5. home with dumbbells only, 3 days
6. **Ramadan**: after iftar, 4 days, shorter sessions with longer rest

**Nutrition (4):**
1. cutting
2. maintenance
3. bulking
4. **Ramadan**: iftar, a light snack, and suhoor

**Rules:**
- Reference exercises by `dataset_id`, from `exercises-gif.json`. Pick exercises that exist and are common gym movements, and prefer ones whose Arabic name is in `exercise-names-ar.proposed.json` with `high` confidence.
- Reference foods by `seed_key`, which is the `photo_file` name in `foods-starter.json` without its extension.
- Use realistic sets, reps, rest and grams. Each nutrition template gets macro targets that match its items within ±10%. A test checks this.

## Database

Write one new migration, `0030_starter_templates.sql`:
- It holds the library data, for example a `security_private.starter_templates` table with `jsonb` payloads. The data is inserted from the same content as the JSON file. Keep the two identical; a test compares them.
- `security_private.copy_starter_templates(p_captain uuid)`, a definer function with `search_path = ''`. It inserts the copies.
  - It resolves exercises by `exercises.dataset_id` and foods by `foods.seed_key`. It **skips** any row whose exercise or food is not seeded yet, and never fails because of one.
  - It is idempotent per captain: running it twice creates no duplicates. Use `source_template_id`, or a marker column if you need one, and explain the choice.
- A trigger on `profiles` calls the function when a captain is confirmed. Also backfill existing confirmed captains (the live database has 0 users, but write it correctly anyway).
- The library table and the function are never reachable by `anon` or `authenticated`. The copies are normal rows owned by the captain, so the existing RLS and `active_caller` policies apply. If you add a new public table, follow the catalog rules: RLS, plus a restrictive `active_caller` policy.
- Do not edit migrations 0001–0029.

## Files

- `supabase/migrations/0030_starter_templates.sql`
- `supabase/seed/source/starter-templates.json`
- `supabase/tests/starter-templates.test.ts` (PGlite). It must cover:
  - confirming a captain copies all 10 templates
  - a player gets none
  - running the copy twice does nothing new
  - missing exercises or foods are skipped
  - another captain cannot read the copies
  - a suspended captain gets no copies
- `scripts/seed/starter-templates.test.ts`. It must check that:
  - every `dataset_id` and `seed_key` in the JSON exists in the source files
  - the macros are consistent
  - the JSON and the migration data match

## Requirements

1. No app UI change is needed; the templates screen already lists templates. If something needs a change there, keep it minimal and mention it.
2. Tests are deterministic and use the fixed test clock.
3. Do not touch `exercises-gif.json`, `assets-source/`, `.env*`, or migrations 0001–0029.

## Acceptance

- [ ] A newly confirmed captain has 6 workout and 4 nutrition templates.
- [ ] All the tests above pass.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope

- A shared or read-only library for captains
- Pushing library updates to existing captains
- Translating exercise instructions
