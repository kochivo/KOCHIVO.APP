# T-080 — Cinematic onboarding for the player

**Phase:** V1 · **Status:** ready (owner request 2026-11-05: replace the plain intake form with a premium step-by-step experience)

## Today
- `src/features/onboarding/components/intake-wizard.tsx` runs 4 steps (`basics`, `schedule`, `health`, `food`; `wizard.ts`).
- Each step is a form of `TextField`s and chips.
- The draft lives in `use-intake-draft`, validation in `intake-schema.ts`, and the save goes through `saveIntake`.
- The data and validation stay **exactly** as they are. This card changes the experience only.

## Changes
1. **Welcome screen** before step 1 (not a schema step):
   - the coach's name, if known (`useMyCaptain` / existing data)
   - a large greeting: «الكابتن مستنيك» ("your coach is waiting for you")
   - one lime primary button: «يلا نبدأ» ("let's start")
   - no emoji
2. **Goal as big glass cards:** if the intake has a goal field, show it as 3 large selectable glass cards with lucide icons:
   - fat loss
   - muscle gain
   - general fitness
   Selected = lime border/glow, `aria-pressed`.
3. **Metrics without ugly inputs:**
   - Height and weight: custom sliders, `input type="range"` styled with tokens, with a big live number in `glass-strong` and +/- steppers for fine control (keyboard accessible).
   - Age stays the existing stepper.
   - Training days: a row of large day toggles (reuse/restyle `day-picker.tsx`).
4. **Transitions:** a fade/slide between steps (CSS only, `motion-reduce:` disables it), a lime progress bar, and back/next with ≥ 48 px targets. Focus moves to each step heading, as today.
5. **Completion:** after `saveIntake` succeeds, a short «بنجهّز خطتك…» ("preparing your plan…") state (≥ 1.2 s, honest: it waits for the save, then shows success «تمام، الكابتن هيبعتلك خطتك» — "done, your coach will send you your plan"), then the existing redirect.
6. Keep offline handling, error states, the draft restore and every existing validation message.

## Out of scope
- The InBody baseline step (it comes after T-079 lands; leave a clean place in `stepOrder` for an optional step).
- Schema or field changes.
- The captain side.

## Tests
- Update `onboarding.test.ts` / `locale.test.ts` for the welcome screen and the completion state.
- The slider and stepper keep the value within schema bounds (pure helper, unit-tested).
- `canAdvance` behaviour unchanged.

## Requirements
- No new dependencies (no animation libraries). Files ≤ 250 lines. Tokens only (`bg-bg`, `bg-lime`, `glass`, `glass-strong`, `text-muted`), no hex, logical RTL, strings in `messages.ts` (Egyptian Arabic + English), lucide icons.
- The onboarding route stays within the player budget (300 KB).

## Acceptance
- [ ] A new player goes welcome → steps → «بنجهّز خطتك» → success. Same data is saved as before.
- [ ] Works at 360 px wide, in RTL and LTR, keyboard only, and with reduced motion.
- [ ] All gates pass: `npx tsc --noEmit -p .`, `npx eslint .`, `npx vitest run --maxWorkers=2`, `npm run build`, perf budget.
