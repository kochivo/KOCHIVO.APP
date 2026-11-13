# T-210: The new template screen opens ready to work, with clear buttons (owner review of staging, 2026-11-12)

**Phase:** v6 fixes · **Status:** ready · **Depends on:** T-198, T-209 (landed) · **Migration:** none expected. If one is truly needed, stop and ask.
**Flag:** captain-workspace screens only (`captainWorkspaceEnabled()`). Flag-off output stays byte-identical. **Messages:** `ar` (Egyptian), `arStd`, `en`.
**Rules:** follow AGENTS.md in full.
- No new deps. Keep files under 250 lines.
- Tokens only and logical properties only. Touch targets ≥48px.
- No Get-Content/Set-Content. Do not commit.

## Why

The owner opened a brand-new template on staging (`/captain/templates?plan=…`). Problems:
- Every day was a rest day, so the screen opened on Saturday as a rest day: no warm-up, no exercise search, and no clear way to add an exercise.
- Several controls look like plain text, so a captain will not notice they are buttons.

Mockup reference: `docs/mockups/captain-workspace/v6-program-editor.html` (day rail, warm-up block 1, exercises block 2).

## Files

- `src/features/captain-workspace/training/`: `training-editor.tsx`, `day-rail.tsx`, `day-summary.tsx`, `editor-header.tsx`, `week-menu.tsx`, `editor-draft.ts`, the messages files, and tests.
- Template creation: find where a new template draft or row is created (`src/features/programs/` or the templates data) and change only that.
- `src/features/roster/messages.ts` (+ standard messages) and `src/features/roster/components/captain-nav.tsx` for item 8.

## Requirements

### 1. A new template starts ready
- A newly created template has its first day (Saturday, or day 1 in non-weekly mode) as a training day.
- The editor opens on that day, showing the warm-up block and the exercises block with the inline search, exactly like the mockup.
- An existing template whose days are all rest days opens with one clear start card: a short line, plus a primary button «ابدأ أول يوم تمرين» that turns the first day into a training day and selects it.

### 2. The selected day is always visible in the rail
- If the selected day is a rest day, it still appears in the rail, highlighted as selected, above «راحة باقي الأيام».

### 3. No meaningless numbers
- On a rest day, hide the warm-up, exercises, sets and duration stats.
- On a training day with no exercises, show «—» instead of «0 د» and «~0 د».

### 4. Rest-day card
- Make «خلّيه يوم تمرين» a real button, styled as secondary with a border and an icon. Do not use plain text.

### 5. Header
- Remove the «احفظ القالب» button. Autosave plus «اتحفظ» already cover it, and the retry button on error stays.
- For templates, replace the letter circle («ق») with a template icon. Players keep their avatar letter.

### 6. Week menu
- Move «...» into the header row, next to the save status.
- Make it a visible button: border, icon, and the label «خيارات» (icon-only on narrow screens, with an aria-label).

### 7. «استخدمه للاعب» on an empty template
- Keep the button enabled.
- If the template has no exercises in any day, clicking it shows an inline message «ضيف تمرين واحد على الأقل الأول» and does not open the sheet.

### 8. Sidebar
- The training nav group label becomes «التمارين» (ar) and its arStd equivalent.
- The follow-up badge is hidden when the count is 0. Keep the `sr-only` text for unavailable.

### 9. Button clarity on this screen
Every clickable control on the template and program editor screen follows one rule:
- **Primary** (lime, `Button` default): one per screen.
- **Secondary:** `Button variant="secondary"` or an equivalent bordered pill, with a visible border or background, a label, and preferably an icon.
- **Icon-only:** `IconButton` or a bordered circle, never a faint bare icon. It needs an aria-label.
- No clickable control that looks like plain text. Covers: «راحة باقي الأيام», «+ يوم» (becomes «ضيف يوم تمرين» with a plus icon), the rest-day button, and the week menu.

## Acceptance
- [ ] Unit tests cover:
  - the new-template default (first day training);
  - the all-rest start card;
  - a selected rest day shown in the rail;
  - no stats on a rest day and «—» on an empty day;
  - no «احفظ القالب» on templates;
  - the empty-template assign message;
  - the nav label and the hidden zero badge.
- [ ] Flag-off output is unchanged. Player-program editing keeps all current features (feature inventory in your report).
- [ ] `npm run check` and `npm run build` pass; summary lines pasted.

## Out of scope
- Other screens' buttons (T-211).
- Changing autosave or the data model.
