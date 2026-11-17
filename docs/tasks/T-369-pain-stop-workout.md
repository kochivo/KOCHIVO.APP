# T-369: Sharp pain stops the workout properly

**Migration:** none. **Owner decision 2026-11-18:** apply the whole proposed fix.

## Problem
A player reports pain during a workout. Today, `painBlocksExercise` (`src/features/workout/pain-block.ts`) blocks far too much:
- any exercise whose `body_part` is missing or unknown;
- every exercise when the area is `other`;
- whole groups, for example lower back blocks all legs and back.

Nothing tells the player what to do next. They press "skip" on every exercise, one by one, until the queue is empty. Then the session completes and they see the normal "you finished today's workout" screen, which is wrong: they did not train.

## Files
Edit only these:
- `src/features/workout/pain-block.ts`
- `src/features/workout/hooks/use-pain-skips.ts`
- `src/features/workout/hooks/use-focus-session.ts` (only to expose new values; keep it at 250 lines or fewer)
- `src/features/workout/components/pain-flow.tsx`
- `src/features/workout/components/pain-after-send.tsx`
- `src/features/workout/components/pain-carried.tsx`
- `src/features/workout/components/finish-hero.tsx`
- `src/features/workout/components/session-feedback.tsx`, only to pass a flag down
- `src/features/workout/pain/messages.ts`
- new small files under `src/features/workout/` if needed
- tests

Do not touch `pain-safe-swap.ts` behaviour: swap targets stay strict.

## Rules
1. **Sharp or severe pain** (`kind === 'sharp'` or `severity === 5`):
   - The after-send panel leads with one primary button, «وقّف تمرين النهارده» (stop today's workout). It skips every remaining exercise in the queue at once, so the session completes through the existing path.
   - A secondary button, «كمّل من غير {area}» (continue without {area}), runs rule 2 instead.
   - The doctor note stays.
2. **Continue without the area:** one tap skips every remaining exercise blocked by this report, not just the current one.
   - The player lands on the next safe exercise.
   - A short status line says how many were removed, for example «شلنا 3 تمارين عشان الركبة».
   - If no safe exercise is left, the result is the same as rule 1.
3. **Unknown body part:** an exercise with a missing or unknown `body_part` is blocked by a report on another exercise only when:
   - the report is sharp, or
   - its severity is 5, or
   - its area is `other`.

   For mild pain in a named area, unknown exercises stay open.

   The exercise the pain was reported on keeps today's rule.
4. **Finish screen:** when the session ended with at least one exercise skipped for pain, the finish hero says so instead of the normal "done" headline.
   - **No set logged:** «وقفنا تمرين النهارده عشان الوجع. الكابتن عرف.»
   - **Some sets logged:** «خلصت التمارين الآمنة. شلنا {n} عشان الوجع، والكابتن عرف.»

   Do not change points or session completion logic. Mention in Notes whether points are still given for a pain-stopped session.
5. **Pain carried to a later exercise:** the PainCarried panel (shown on a later exercise) also gets the "continue without {area}" bulk skip.
6. **Strings:** all new strings go in ar, arStd and en. English stays short and plain.

## Done when
- Unit tests cover:
  - the new `painBlocksExercise` rules (unknown part with mild versus sharp pain, `other`, the reported exercise itself);
  - the bulk skip, which skips only the blocked remaining ids;
  - the finish headline choice.
- `npm run check` and `npm run build` pass.
