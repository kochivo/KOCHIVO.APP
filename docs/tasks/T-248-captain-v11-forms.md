# T-248 — Captain v11: forms list and form editor

**Phase:** captain v11 fidelity · **Depends on:** T-238 · **Status:** ready

Read `docs/tasks/V11-FIDELITY.md` first. It is part of this card.

## Goal
`/captain/library/forms` matches the mockup `forms` screen, and the form editor matches `formEdit`, exactly. The editor includes the phone preview.

## Files
- `src/features/forms/components/*` (workspace path). New files are allowed.
- `src/features/forms/messages.ts`
- the forms edit route, if one does not exist: `src/app/[locale]/(captain)/captain/library/forms/[formId]/page.tsx` (thin)
- tests in `src/features/forms/`

## Requirements
1. **Forms list.**
   - Header «الفورمات», with a lime «فورم جديد» button.
   - Cards (`g3`):
     - an icon avatar, the name, and a status pill (شغال، متوقف، يدوي);
     - «<type> · <schedule> · <n> أسئلة»;
     - «الردود», with the answered count out of the players it was sent to.
   - The last card is «فورم جديد», with «ابدأ من قالب أو من الصفر».
2. **Form editor.**
   - The bar: back, name, «<n> أسئلة · بيتبعت <schedule>», and a lime «احفظ».
   - The question list:
     - drag grip, type icon, «<n>. <label>», and «<type> · إجباري»;
     - a remove icon;
     - the selected question is highlighted.
   - «ضيف سؤال»: type buttons for رقم، كتابة، اختيار، تقييم 1-5، صور.
   - «الإعدادات»: النوع، بيتبعت (day and time)، تذكير لو مردش، لمين, using the existing schedules and requests.
   - On desktop, a mini phone preview «زي ما اللاعب هيشوفه»:
     - progress dots;
     - the selected question rendered the way the player sees it (number input, 1–5 scale, choices, photo slots, text);
     - an «التالي» button.
3. Reordering, adding and removing questions use the existing forms data. The reminder setting only shows if a reminder exists in the data. Otherwise report it.

## Acceptance
- [ ] Both screens match the mockup at desktop and at 390px.
- [ ] There are tests for the question type labels and the preview per type.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- The player's form-filling screen.
