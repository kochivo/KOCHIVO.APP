# T-023 — Close small risks found in review

**Phase:** 5 · **Depends on:** T-003d, T-008b, T-017a (merged) · **Status:** ready
**Delegate to:** Codex

Three small, independent fixes. Do all three.

## 1. Intake draft holds health data in localStorage
`src/features/onboarding/hooks/use-intake-draft.ts` keeps the half-filled intake (injuries, conditions) in `localStorage`, so it survives on a shared phone forever.
- Move the draft to `sessionStorage` (same key), inside `try/catch`.
- Clear the draft after a successful submit (check whether it already does) and on sign-out if there is a single sign-out helper; if there is not, skip sign-out and say so in Notes.
- On first load, delete any old `localStorage` copy under the same key once, so existing users are cleaned up.
- Update `onboarding.test.ts`.

## 2. iPadOS shows as desktop in the install sheet
`src/features/install/platform.ts`: iPadOS 13+ reports a Mac user agent. Treat `Macintosh` with `maxTouchPoints > 1` as iOS. Inject `maxTouchPoints` like the other inputs so it stays testable. Add tests to `install.test.ts`.

## 3. Assigning an empty template creates an empty active plan
Find the template-assign functions (`assign_nutrition_template` in 0022 and `assign_program_template` in its final migration). Assigning a template with no days (program) or no meals (plan) must raise `22023` with no rows written.
- `supabase/migrations/0028_template_not_empty.sql` (new, exactly 0028): copy each function's **final** body and add only the check at the top, after the existing ownership checks (so a stranger still gets their old error code first). Keep the grants.
- Map `22023` to «القالب فاضي. زوّد أيام أو وجبات الأول» in the template server action(s) that call these RPCs.
- `supabase/tests/rls-templates.test.ts`: an empty template raises `22023` and creates nothing; a non-empty one still assigns.

## Requirements
1. Do not edit 0001–0027. Keep files under 250 lines. Arabic strings.

## Acceptance
- [ ] Tests for all three pass.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Any other onboarding, install or template change
