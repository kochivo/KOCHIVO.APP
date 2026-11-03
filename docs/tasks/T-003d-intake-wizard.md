# T-003d — Player intake wizard (UI)

**Phase:** 1 · **Depends on:** T-003c (merged), T-003 (merged) · **Status:** ready
**Delegate to:** Codex

## Goal
Right after a player redeems an invite, they fill a 4-step questionnaire with big chips and steppers, using one hand: basics, schedule, health, and food. The captain then has a real player file before writing the program. A player who already submitted never sees it again unless they open it from settings later.

## Files
- `src/features/onboarding/components/`:
  - `intake-wizard.tsx`: the client component. Holds the step index and draft, renders one step, and owns Back/Next.
  - `step-basics.tsx`, `step-schedule.tsx`, `step-health.tsx`, `step-food.tsx`
  - `chip-group.tsx`: a multi-select chip list built on `Chip` from `@/ui`, using `toggleChip`
  - `day-picker.tsx`: 7 day chips, Saturday first (Egyptian week), values 0–6 as in 0012
- `src/features/onboarding/hooks/use-intake-draft.ts`: draft state, saved to `localStorage` under `kochivo:intake-draft` so a reload or lost connection keeps answers. Wrap every storage access in try/catch.
- `src/features/onboarding/data/save-intake.ts`: a `'use server'` action. It validates with `makeIntakeSchema(new Date()).intakeSchema`, then upserts `player_intake` for `auth.uid()` (never send `player_id` from the client; set it from `getClaims()`), and returns `{ error?: string }`.
- `src/features/onboarding/data/intake-status.ts`: server-only `hasIntake()`, which returns whether the caller already has a row.
- `src/features/onboarding/wizard.ts`: pure helpers: `stepOrder`, `canAdvance(step, draft, now)` (uses `stepSchemas`), `progress(step)`, and `toPayload(draft)`
- `src/features/onboarding/onboarding.test.ts`: extend it
- `src/features/onboarding/index.ts`: export the new public pieces
- `src/app/(player)/player/onboarding/page.tsx` (new, thin): if `hasIntake()` → redirect to `/player`. Otherwise render the wizard.
- `src/features/auth/data/redeem-invite.ts` and `src/features/auth/data/callback.ts`: after a successful redeem, redirect to `/player/onboarding` instead of `/player`. This is the only change allowed in `features/auth`.

## Requirements
1. **Match the mockup board PlayerOnboarding** (`docs/mockups/PlayerOnboarding.dc.html`): a top `ProgressBar` with "خطوة 2 من 4", one question group per screen, big chips, and a sticky bottom bar with "رجوع" (ghost) and "التالي" (the one lime action). The last step's action reads "ابعت للكابتن".
2. **Inputs.**
   - Birth year, height, and weight use `Stepper` from `@/ui`, with sane starts (1998, 170 cm, 75 kg) and steps (1, 1, 0.5).
   - Target weight is optional, with a chip "مش محدد" that sets it to `null`.
   - Sex, session length, and experience are single-select chips.
   - Injuries, medical, and allergies are multi-select through `toggleChip`, so "مفيش" stays exclusive.
   - Notes is a `TextField` (multiline if the primitive supports it; if not, note it and use a single line), capped at 500 characters with a live counter.
3. **Validation.** "التالي" is disabled until `canAdvance` is true. Show the first zod issue under the group, in Arabic, only after the user has touched that group.
4. **Health safety note.** On the health step, if `medical` contains anything except `none`, show a muted line: «الكابتن هيشوف ده قبل ما يكتب برنامجك. لو عندك حالة طبية استشير دكتور الأول.» Show no other medical advice.
5. **Submit.** Show a loading state on the button. On success, clear the draft and go to `/player`. On error, keep the draft and show the message from the action. Offline: show «مفيش نت. إجاباتك محفوظة، ابعتها لما النت يرجع», keeping the draft. Intake is **not** part of the offline outbox (it is not a session, set, or meal log), so a direct server action is correct here.
6. RTL, logical properties only, touch targets ≥ 48px (`min-h-12`), no hex, Egyptian Arabic copy, and `aria-label` on icon-only buttons. Every file stays under 250 lines.

## Acceptance
- [ ] `onboarding.test.ts` covers `canAdvance` for each step (valid and invalid), `toPayload` (target weight `null`, exclusive "none", trimmed empty notes become `null`), and `progress`.
- [ ] Redeem and callback now land on `/player/onboarding`, and `auth.test.ts` still passes (update the expectation if one asserts `/player` after redeem).
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Editing the intake from settings (T-019)
- The captain's view of the player file (T-009)
- Any migration change
