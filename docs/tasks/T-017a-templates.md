# T-017a — Templates: «احفظ كقالب», a templates library, assign to a player

**Phase:** 3 · **Depends on:** T-010, T-011 (merged) · **Status:** ready
**Delegate to:** Codex

## Goal
A captain who has built a good program or nutrition plan for one player can save it as a template. Later they can assign it to any other player in two taps. The assigned copy is independent: editing it never changes the template or other players, and the reverse holds too.

Ready-made system templates (the "10 جاهزين" from PLAN) and editing a template's contents are **T-017b**, not this card.

## Schema today
- `programs` and `nutrition_plans` both have `is_template`, `source_template_id`, and the check `is_template = (player_id is null)`.
- `assign_program_template(p_template, p_player)` (0005, replaced in 0017):
  - security invoker
  - archives the player's active program
  - copies days and exercises into a new **active** program
- There is no nutrition equivalent and no save-as-template function.

## Files
- `supabase/migrations/0022_templates.sql` (new). All functions are `security invoker set search_path = ''`, raise `42501` for non-owners and `P0002` for not found, and grant execute to `authenticated` only.
  - `public.program_to_template(p_program uuid, p_title text) returns uuid`: copies an owned, assigned program (any status) into a new template (`player_id null`, `is_template true`, `status 'draft'`, `source_template_id null`), with its days and exercises.
  - `public.nutrition_plan_to_template(p_plan uuid, p_title text) returns uuid`: the same for plans, copying meals, `meal_items`, and `meal_item_alternatives`, with targets kept.
  - `public.assign_nutrition_template(p_template uuid, p_player uuid) returns uuid`: mirrors `assign_program_template` from 0017. It checks `is_captain_of`, archives the player's active plan first (the `nutrition_plans_one_active` index from 0018), then inserts an active copy with `source_template_id`, then copies meals, items, and alternatives.
  - Title: trimmed, 1–80 characters, `22023` otherwise.
  - Number note: 0021 is taken by a parallel task; use exactly `0022`.
- `supabase/tests/rls-templates.test.ts` (new):
  - save as template for both kinds copies the full hierarchy and leaves the source untouched
  - assigning a nutrition template twice keeps exactly 1 active
  - editing the assigned copy does not change the template
  - another captain gets `42501` on all three functions
  - anon has no execute
- `src/features/templates/` (new):
  - `index.ts`
  - `types.ts`
  - `data/templates.ts`, `'use server'`, captain session:
    - `listTemplates()` returns both kinds with title, kind, created_at, and counts (days or meals)
    - `saveAsTemplate({ kind, id, title })`
    - `assignTemplate({ kind, templateId, playerId })` returns the new id
    - `renameTemplate({ kind, id, title })`
    - `deleteTemplate({ kind, id })` deletes only rows where `is_template` is true
    - Each action is zod-validated and returns `{ data }` or an Arabic `{ error }`.
  - `components/templates-screen.tsx`:
    - header «TEMPLATES · القوالب»
    - tabs «تمارين» and «أكل»
    - cards with title, counts, «ادّيه للاعب» (opens the player picker), rename, and delete (confirm)
    - empty state «لسه معندكش قوالب. افتح برنامج لاعب واضغط احفظ كقالب»
  - `components/assign-sheet.tsx`: lists the captain's active players (reuse `fetchRoster` through `@/features/roster`) and confirms. After success, go to `/captain/programs/{id}` or `/captain/nutrition/{id}`.
  - `components/save-template-button.tsx` (client): a ghost «احفظ كقالب» button with a title prompt, prefilled with the source title
  - `templates.test.ts`
- `src/app/(captain)/captain/templates/page.tsx` (new, thin)
- `src/features/programs/components/builder-header.tsx`: add `<SaveTemplateButton kind="program" id=… title=… />` imported from `@/features/templates`. It is shown only when the program is saved (not dirty). This is the only change there.
- `src/features/meal-plans/components/plan-builder.tsx`: the same with `kind="nutrition"`. This is the only change there.
- `src/features/roster/nav.ts`: add «القوالب» `/captain/templates` (lucide `Files`) after «المهام», and update the expected list in `roster.test.ts`.

## Requirements
1. RLS and invoker functions are the security. Never take `captain_id` from the client.
2. Features import each other only through `index.ts`. Check that `templates` → `roster` and `programs`/`meal-plans` → `templates` creates no import cycle. `templates` must not import `programs` or `meal-plans`.
3. States: loading, error with retry, and empty.
4. Files are under 250 lines, use tokens only, use RTL logical properties, have targets ≥ 48px, use Egyptian Arabic, and give icon buttons an Arabic `aria-label`.

## Acceptance
- [ ] The SQL tests and `templates.test.ts` (validation and error mapping with mocked clients) pass.
- [ ] `/captain/templates` builds, and `npm run check` and `npm run build` pass.

## Out of scope
- System or ready-made templates and Ramadan plans (T-017b)
- Editing template contents in the builders
- Sharing templates between captains
