# T-318 — Captain pain reply: clear message when no safe swap exists

Owner report (2026-11-16, live): on the captain's pain alert, «بدّل التمرين أسبوعين» shows «مقدرناش نحفظ الرد. جرّب تاني» every time.

## Cause
The live Postgres logs show `answer_pain` raising `No safe alternative` (errcode 22023). The exercise in the report (a one-arm dumbbell triceps extension, neck pain) has no alternative in `program_exercises.alternatives` that passes the safe-swap rules. The alert in `src/features/captain-workspace/components/pain-alert.tsx` turns every error into the generic "could not save" text. Retrying cannot help.

## Do
1. **Map the error.** In the captain answer path (the data function that calls `answer_pain`, and `pain-alert.tsx`), map the known RPC errors to their own messages:
   - `No safe alternative`: «مفيش بديل آمن للتمرين ده في البرنامج. اختار «قلّل الوزن 20%» أو «ريّح المنطقة الأسبوع ده»، أو ضيف بدايل للتمرين من البرنامج.»
   - `Active exercise required`: «التمرين ده مش في برنامج اللاعب الحالي.»
   - Anything else keeps today's generic text.
2. **Hide the swap when it can't work.** When the alert can tell beforehand that the swap will fail, disable the swap button and show the reason under it. Use the existing client-side `safePainSwap` from `src/features/workout/pain-safe-swap.ts` through the workout feature's public entry; export it if it isn't exported. Base it on the report's program exercise and its alternatives, if the alert already loads them or can load them cheaply. If it needs a new query, skip this step and rely on step 1.
3. **Keep the report open.** After a failed swap the report stays open and the other three buttons still work. Check this.
4. **Messages:** ar, arStd (gated), and en (English: "No safe swap for this exercise in the program. Pick reduce 20% or rest this area this week, or add alternatives to the exercise in the program."). No emoji.

## Tests
Unit test the error mapping (each known message plus a fallback). Add a render test that the alert shows the specific text for `No safe alternative`.

## Out of scope
SQL and migrations. `answer_pain` stays as it is. Also out of scope: the player pain flow (T-317 is changing it in parallel, so do not touch `src/features/workout/components/pain-*` or `pain-safe-swap.ts` except to export the helper).

## Gates
npm run typecheck, npm run lint, and the captain-workspace pain tests. The orchestrator runs build and check.
