# T-317 — Pain report: stop only the exercises that load the painful area

Owner report (2026-11-16): when a player marks a pain area, the current exercise always stops and KO moves them to the next exercise. This happens even when the exercise does not load that area. Example: knee pain during a bench press.

## Cause
After sending, `src/features/workout/components/pain-flow.tsx` always shows `PainAfterSend`. That screen always says «وقفنا {exercise} النهارده» and offers only "use the swap" or "skip this exercise". Nothing checks whether the current exercise touches the reported area.

## Do
1. **Pure helper in `src/features/workout/pain-safe-swap.ts`:**
   - Add `painAffects(area, exercise: { body_part?: string | null; stress?: string[] })`, which returns a boolean.
   - It returns true when the exercise's body part (lower-cased) is in `painBlockedParts[area]`.
   - It also returns true when the exercise's `stress` includes the mapped injury (knee_* → knee, shoulder_* → shoulder, lower_back → lower_back).
   - It returns true for `other`, and when the body part is unknown or missing. Unknown means safe-side: we stop.
   - Reuse the existing tables; do not duplicate the area lists.
2. **Flow when the current exercise is NOT affected:**
   - The report is still saved and sent to the captain exactly as today.
   - The after-send screen shows a calm card, not the danger "stopped" card, with the text: «التمرين ده مش بيضغط على {area}. كمّل عادي، والكابتن عرف.»
   - The doctor note stays, shown as it is today: on top in danger color when severity is 5 or the kind is sharp.
   - Primary button: «كمّل التمرين». It closes the sheet and keeps the current set.
   - Secondary button: «وقّف التمرين ده برضه». It skips the current exercise, as the skip button does today.
   - Do not call `skipExercise` or `switchExercise` unless the player taps a button.
3. **Flow when the current exercise IS affected:** unchanged (stopped card, safe swap or skip).
4. **Exception for severe pain:** when severity is 5 or the kind is sharp, always use the "affected" flow, whatever the area.
5. **Rest of the session:**
   - Look at how `state.painReports` and `use-pain-skips.ts` are used.
   - Any later exercise in the same session that the reported area affects must keep today's behavior.
   - A later exercise that the area does NOT affect must not be skipped automatically.
   - If the current code auto-skips later exercises by area without the body-part check, fix it with `painAffects`.
6. **Messages:** add the new strings in ar, arStd and en in `src/features/workout/pain/messages.ts`. Use gender-neutral Arabic and no emoji. English:
   - "This exercise doesn't load your {area}. Keep going, your coach knows."
   - "Continue the workout"
   - "Stop this exercise anyway"

## Tests
- In `pain-safe-swap.test.ts`, unit tests for `painAffects`:
  - knee pain with a chest exercise → false;
  - knee pain with a squat (upper legs) → true;
  - shoulder pain with a bench press (chest) → true;
  - `other` → true;
  - missing body_part → true.
- In `pain-ui.test.ts` (render with `createElement`):
  - the not-affected screen shows the continue button and not the "stopped" title;
  - the severe or sharp case shows the stopped flow;
  - if a skip test exists, a later unaffected exercise is not auto-skipped.

## Out of scope
The captain side, `answer_pain`, migrations, and the body map UI.

## Gates
npm run typecheck, npm run lint, and the workout pain test files. The orchestrator runs build and check.
