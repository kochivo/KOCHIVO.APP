# T-063 — Program builder: clear, calm, obvious

**Phase:** 3 · **Depends on:** T-057, T-059 (merged) · **Status:** ready (owner feedback with screenshots, 2026-11-04)

## Problem (owner, as a captain)
> "أنا ككابتن مش فاهم أنا بعمل إيه هنا، والشكل مش ألطف حاجة"
> ("As a captain I don't understand what I'm doing here, and it doesn't look nice")

Screens: `/captain/programs/[id]`, components in `src/features/programs/components`.
- **The exercise card is confusing.**
  - «المجموعات» sits alone in one column.
  - «العدّات» holds two stacked steppers («أقل عدّات» and «أكثر عدّات») plus an «عدّات مفتوحة» checkbox.
  - «الراحة» is a native `<select>` with 61 options that opens **white** on a dark page.
  - The superset checkbox «اختار للمجموعة المركّبة» and the separate «جمّع / فك المجموعة المركّبة» button make no sense to a coach.
- **The days column is noisy.** Every day has ↑ ↓ 🗑 under it, so the list looks like a form, not a week.
- **Legacy programs** show a lone «حوّله لأسبوع» ("convert to a week") button with no explanation.
- **The save buttons are unclear.** «حفظ كمسودة» ("save as draft") sits next to «حفظ الخطة» ("save the plan"); a coach can't tell which one sends the plan to the player.
- **Plurals are wrong:** «1 تمارين» should be «تمرين واحد».

## Changes
1. **Native controls follow the theme (global fix):** in `src/app/globals.css`, set `color-scheme: dark` when the site is dark (`html:not([data-theme='light'])`) and `color-scheme: light` for `html[data-theme='light']`, replacing `light dark`. Native selects, date pickers and scrollbars then match the theme. Add a test that asserts it.
2. **Exercise card** (`exercise-row.tsx`, split into small files as needed):
   - **Header:** the exercise thumbnail (`ExerciseImage`, 48 px) if there is media, the order number and the name. A single overflow menu button (`MoreVertical`, translated `aria-label`) holds: move up, move down, «اربطه بالتمرين اللي بعده» or «فك الربط» (superset), and delete (with a confirm). Replace the three always-visible icon buttons.
   - **Summary line** in plain words under the name, always visible: «3 مجموعات × 8–12 عدّة · راحة 90 ث». Open reps reads «للفشل».
   - **One clean row of three equal recessed fields** (`grid-cols-3` from `sm`, stacked on very small screens), each with a label on top and a big number:
     - **المجموعات:** stepper.
     - **العدّات:** one field that shows the range «8–12».
       - Tapping it opens a small sheet or popover (reuse `ResponsiveDialog` from `@/ui`) with two steppers «من» («from») and «لحد» («up to»).
       - It also has a segmented choice «رقم ثابت» / «مدى» / «للفشل» ("fixed number" / "range" / "to failure"). A fixed number means `reps_max = reps_min`; to failure means `reps_max = null`.
       - Clamp so max ≥ min; never let a typo give 42/43 silently. Add an upper bound of 100 in the stepper.
     - **الراحة:** a field showing «90 ث». Tapping it opens the same sheet pattern with preset chips 30, 45, 60, 90, 120, 180, 240 seconds plus a stepper (±15) for custom values. **No native select.**
   - Superset rows show a visible lime bracket or connector on the start edge and a small «سوبر سِت» chip, instead of the current text. Remove the selection checkboxes and the separate group/ungroup button from `day-editor.tsx`.
3. **Days navigation** (`program-builder.tsx`, split it: it is at 140 lines and will grow):
   - **Weekly programs:** 7 weekday tabs. On mobile, a horizontal scroll row of `Chip`s; on `lg`, a vertical list in the aside. Each tab shows the weekday and a small status: «راحة» or «4 تمارين». The selected tab uses the active chip state.
   - **Legacy rotation programs:**
     - Show a calm `glass` notice at the top: «البرنامج ده بنظام الأيام المتتالية. حوّله لأسبوع ثابت (سبت → جمعة) عشان اللاعب يشوف تمرين كل يوم باسمه.» ("This program uses consecutive days. Convert it to a fixed week (Saturday → Friday) so the player sees each day's workout by its name.")
     - Add a «حوّله لأسبوع» ("convert to a week") button inside the notice.
     - Move the day reorder and delete actions into the day editor header overflow menu, not under every day in the list.
   - On the day editor header, show the weekday or day name as the title. The day-name field stays, labelled «اسم اليوم (اختياري)» ("day name (optional)") with a placeholder like «صدر وتراي».
4. **Header and actions** (`builder-header.tsx`):
   - Show the program name field plus a status chip («نشط» / «مسودة» — "active" / "draft") and «في تغييرات مش متحفظة» ("there are unsaved changes") when dirty.
   - Rename the actions:
     - primary: «احفظ وابعت للاعب» ("save and send to the player"; this is the existing activate flow)
     - secondary: «احفظ من غير ما تبعت» ("save without sending")
   - On mobile, the primary action sits in a sticky bottom bar above the safe area, so it is always reachable while editing a long day.
5. **First-time guidance:** when a program has no exercises at all, show a 3-step inline hint above the day editor: «١ اختار اليوم ← ٢ ضيف التمارين ← ٣ احفظ وابعت للاعب» ("1 choose the day → 2 add the exercises → 3 save and send to the player"), using Latin digits if the rest of the UI uses them (match `formatNumber`). It hides once any exercise exists. No modal.
6. **Plurals:** fix the `exerciseCount` / `setCount` / `minuteCount` messages so Arabic uses proper forms for 1, 2, 3–10 and 11+ (e.g. «تمرين واحد», «تمرينين», «3 تمارين», «11 تمرين»). Use the existing plural mechanism in `@/core/i18n` (read how `n` is handled first). Do the same for the new summary line.

## Design rules
- Use the T-060 tokens only (`glass`, `glass-strong`, `glass-featured`, the `recessed` inputs, `Chip`, `Button` variants).
- Lime is only for the single primary action, active tabs and the superset bracket.
- Numbers use tabular figures.
- Touch targets are ≥ 48 px; steppers in the sheets are the large gym size.
- Use logical RTL properties.
- Check it at 375 px and at 1280 px: no horizontal overflow, and nothing cramped like the current three-column row.

## Files
- Everything under `src/features/programs/components/`, plus `src/features/programs/messages.ts`, `summary.ts` and their tests.
- `src/app/globals.css` (color-scheme only).
- `src/ui` only if a primitive truly needs a small prop (say so in Notes).
- Do not change the data layer, `draft.ts` semantics, `weekly-draft.ts` or any migration. Superset linking must map onto the existing `toggleSuperset` and `superset_group` behaviour.

## Tests
- Reps-mode derivation and clamping (fixed, range, to failure; max ≥ min; ≤ 100).
- The rest presets and formatting.
- The summary line in both locales.
- Arabic plural forms for 1, 2, 3, 11.
- Weekday tab status (rest, n exercises).
- Superset link and unlink with the next exercise.
- The color-scheme test.

## Acceptance
- [ ] A new captain can build one day (add 3 exercises, set 4×10, rest 90) without reading any help.
- [ ] No white native popups in dark mode.
- [ ] The days list is clean; reorder and delete live in a menu.
- [ ] The primary button clearly says it sends to the player.
- [ ] `npx tsc --noEmit -p .`, `npx eslint .`, `npx vitest run --maxWorkers=2`, `npm run build` and the perf budget pass.

## Out of scope
- Drag-and-drop reordering
- Templates screen redesign
- The player workout screen
