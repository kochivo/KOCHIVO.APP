# T-198: One program editor, with warm-up (mockup v6-program-editor)

**Phase:** Unified program editor (owner approved mockup 2026-11-12; wants it **100% like the mockup**) · **Depends on:** T-197 · **Status:** ready
**Migration:** none. **Flag:** behind `captainWorkspaceEnabled()`; flag off byte-identical (the old `ProgramBuilder` stays for flag off).

Read first, in full: `docs/mockups/captain-workspace/v6-program-editor.html` (screens «محرر الكابتن» and «إيه اللي اتغيّر»), `docs/mockups/captain-workspace/v6-spec.md`, `AGENTS.md`.

## Why
Today the captain has two different editors for the same program: the player-file training tab (`src/features/captain-workspace/training/training-editor.tsx`) and the standalone builder at `/captain/programs/[programId]` (`src/features/programs/components/program-builder.tsx`). They look and behave differently, and the owner found it confusing. With the flag on, there must be **one** editor, used in three places: player file → «التمرين», `/captain/programs/[programId]`, and template mode (`/captain/templates?plan=`).

## Files
- `src/features/captain-workspace/training/` (editor, rows, new warm-up block, day rail, day summary, messages `ar` + `arStd` + `en`) and its tests.
- `src/app/[locale]/(captain)/captain/programs/[programId]/page.tsx`: thin flag switch to the unified editor (server entry validates access like `template-entry.tsx`).
- `src/features/captain-workspace/server.ts` / `index.ts` exports if needed.
- This card.

## Requirements (match the mockup exactly; copy Arabic strings from it)
1. **Header:** breadcrumb «اللاعبين ‹ {name}», title «برنامج {first name}», status pill «نشط · باقي {n} يوم» when active, ONE save status «اتحفظ» (remove the duplicate «محفوظ»), «شوفه كلاعب», one primary «ابعت للاعب». Template mode: no send; primary becomes «استخدمه للاعب» (existing assign flow).
2. **Day rail (start side, sticky):** one card per training day: title (real name, never «اليوم ١ · يوم»), subline «{weekday} · {n} تمارين · {m} د». Rest days collapse into one dashed row «راحة باقي الأيام». «+ يوم» at the end. Selected day = lime border + lime-soft background. On ≤1000px it becomes a horizontal scroller.
3. **Day summary card (glass-strong):** «اسم اليوم» + editable day name, then four cells: تسخين (minutes via `warmupMinutes`), تمارين, مجموعات, المدة (~ minutes; reuse the existing estimate in `programs/summary.ts` if present, plus warm-up minutes).
4. **Block 1 «التسخين»** (amber number tag, collapsible): hint line, preset chips (+ عجلة / مشاية 5 د, + دوران مفاصل, + مطاطة, + نط حبل, + قرفصاء خفيف) that add an item and disappear, a free-text add, rows (drag handle, name + optional note, amount + unit, remove), and the toggle «مجموعات تسخين قبل أول تمرين تقيل» showing the 50% × 10 · 70% × 5 · 85% × 2 pills and «من الوزن اللي اللاعب هيشيله». Uses the T-197 helpers; saves through the same autosave queue.
5. **Block 2 «التمارين»** (lime number tag): compact rows: handle, thumbnail (existing media), **Arabic name first** (`name_ar`, fall back to `name_en`), subline «{muscle} · {equipment}», cells مجموعات / عدّات / راحة. Reps render `dir="ltr"` as «8–12» (never reversed). Clicking a row expands it in place: four big boxes (المجموعات, العدّات, الراحة with steppers; «الشدة (اختياري)» dashed, = existing RIR), «ملاحظة للاعب» (existing `notes`), and buttons «بدائل», «اربطه سوبرسِت», «مجموعات مختلفة», «شيل». Wire each to the existing capability in the old builder (drawer, superset group, per-set sheets). If one has no existing backend, keep the button out and list it in Verification; do not invent data.
6. Supersets: label «سوبرسِت · من غير راحة بينهم» and a lime start-border grouping the linked rows.
7. Search row «دوّر على تمرين بالعربي أو الإنجليزي…» and «مقترح لليوم ده:» chips (existing inline search + suggestions). Single «+» per add button (no icon plus text plus).
8. **Block 3 «كارديو بعد التمرين»** «اختياري» with «+ كارديو» (existing cardio editor).
9. Keep every existing feature (feature inventory below). Player facts panel stays beside the editor in player mode as today.
10. Messages: `ar` (Egyptian), `arStd`, `en`. No inline text.

## Feature inventory (nothing may be lost)
| Existing | Destination |
|---|---|
| Day add/rename/rest days, fixed week (weekday) rules, repeat weekly, rotation→week convert | Day rail + day summary name; week settings in the editor's ⋯ menu |
| Exercise add (search, suggestions, custom exercise sheet), drag/arrow reorder, remove | Block 2 |
| Sets/reps/rest/RIR, failure reps, notes | Row cells + expanded boxes |
| Supersets, alternatives, per-set settings, exercise media | Expanded row buttons / grouping |
| Cardio blocks | Block 3 |
| Autosave queue, retry, validation before send, activate, history, new program choice | Header + existing flows |
| Template mode save without activation | Header in template mode |

## Acceptance
- [ ] Matches the mockup at 1440×900 and 390×844; differences listed.
- [ ] Flag on: all three entry points render the same editor. Flag off: byte-identical.
- [ ] Tests: warm-up add/remove/toggle through autosave, reps LTR rendering, Arabic-first names, expand/collapse, rest-day collapsing, template mode has no send.
- [ ] `npm run check` and `npm run build` pass; summary lines pasted.
