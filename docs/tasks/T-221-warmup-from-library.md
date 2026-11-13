# T-221: Warm-up items from the captain's exercise library

**Phase:** Captain workspace (captain complaint, owner request 2026-11-13) · **Depends on:** T-197 (day warm-up) · **Status:** ready

## Goal
A captain added his own warm-up exercises to «تماريني» (custom exercises), but the day's «التسخين» block cannot find them. Today it only offers five fixed chips (bike, joints, band, rope, squat) and a free-text name box. Let the captain add a warm-up item straight from the exercise library, with «تماريني» first.

## Files
- `src/features/captain-workspace/training/warmup-block.tsx` (keep it under 250 lines; it is 59 now).
- New `src/features/captain-workspace/training/warmup-library-picker.tsx` (one component).
- `src/features/captain-workspace/training/editor/messages.ts`, `editor/standard-messages.ts`.
- `src/features/programs/warmup.ts` (schema), plus its tests.
- Tests next to the files above (a new `warmup-library-picker.test.ts(x)` or the existing training tests).
- This card.

## Requirements
1. **Entry point.** In the warm-up block, next to the existing «add» form, add a secondary button «من تماريني» (en "From my exercises", arStd «من تماريني»). It opens an inline panel under the block. The chips, the free-text box and the ramp switch stay exactly as they are.
2. **The panel.** It reuses the existing search data loader `loadTrainingSearch(query, bodyPart, mine)` from `./data/library`. Do not add a new query or RPC.
   - It has a search field with the same 250 ms debounce as `inline-search.tsx`.
   - It has a «تماريني» toggle that is **on by default** in this panel, so the captain's own exercises show first. Turning it off searches the whole library.
   - With the toggle on and an empty query, it lists the captain's own exercises right away; no typing needed.
   - Results show the exercise name in the current locale (`name_ar` / `name_en`, the same rule the main search uses).
   - Every result row is a button with at least 48px height (`min-h-12`) and a translated `aria-label` such as «ضيف للتسخين · <name>».
   - States: loading, error (with retry), and an empty state. When the toggle is on and the captain has no exercises, the empty state says «لسه ماضفتش تمارين خاصة بيك. ضيفها من «+ تمرين خاص بيك» في التمارين.» Write short en and arStd versions too.
3. **Adding.** Tapping a result adds one warm-up item: `{ id: uuidv7(), name: <locale name, trimmed to 60>, amount: 10, unit: 'reps', exerciseId: <exercise id> }`. Then:
   - the panel stays open, so the captain can add several;
   - an exercise already in this day's warm-up is shown as added and disabled;
   - the 12-item limit is respected exactly like the chips (disabled at 12).
4. **Schema.** Add `exerciseId: z.uuid().optional()` to `warmupItemSchema` in `src/features/programs/warmup.ts`.
   - Old items without it must still parse and round-trip unchanged.
   - Check `save_weekly_program` and the `program_days_warmup_shape` check from migration 0098. The jsonb is stored as sent and only its shape is checked, so no migration should be needed. If you find that a migration **is** needed, stop and say so in Notes; do not write one.
5. **Player side.** No change. The player warm-up card keeps showing the item name, amount and unit. (Showing the exercise GIF there is a later card.)
6. **Rules.**
   - Tokens only and logical properties.
   - Lime stays the only action color. This button is secondary (border style like the chips), not lime.
   - Every string goes in messages: ar, arStd, en. No emoji.
   - Import from features only through public entries. No new dependency.

## Acceptance
- [x] Tests:
  - the schema accepts an item with `exerciseId`, accepts old items without it, and rejects a non-uuid;
  - adding from the picker produces the item shape above;
  - an exercise already in the warm-up is disabled;
  - the 12-item limit is enforced;
  - the «تماريني» toggle defaults to on;
  - the empty state shows when the captain has no own exercises.
- [x] `npm run check` and `npm run build` pass (reviewer rerun; demo.test flake passes alone 13/13).

## Out of scope
- Player warm-up card media (GIF or video).
- A "warm-up" category or tag on exercises.
- Any change to the main exercise search, the custom-exercise sheet, or the program generator.
