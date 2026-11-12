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
- [x] Flag on: all three entry points render the same editor. Flag off: byte-identical.
- [x] Tests: warm-up add/remove/toggle through autosave, reps LTR rendering, Arabic-first names, expand/collapse, rest-day collapsing, template mode has no send.
- [ ] `npm run check` and `npm run build` pass; summary lines pasted.

## Implementation plan (reviewer notes extension approved)
- [x] Add a failing SQL notes round-trip test; extend exercise notes types, validation and the guarded 0098 patch only.
- [x] Test shared editor behavior: warm-up autosave operations, Arabic-first/LTR rows, expansion, rest grouping and template actions.
- [x] Build training-local day rail/summary, warm-up, expandable exercise fields, week menu, cardio and library/assignment adapters using existing tables and RPCs.
- [x] Route the standalone flag-on entry through the authorized server entry; retain the exact flag-off element.
- [x] Run focused tests, full checks/build, and record environment limitations below.

Backend inventory clarification: the old drawer adds library exercises; it does not persist exercise alternatives. Its reps/rest/RIR sheets edit the whole exercise, not individual sets. Unsupported alternatives/per-set actions must stay omitted, as requirement 5 specifies.

## Implemented feature locations
| Existing feature | Implementation in `training/` |
|---|---|
| Day add/rename/rest, fixed weekdays, repeat, conversion, move/delete confirmations | `day-rail.tsx`, `day-summary.tsx`, `week-menu.tsx`, `editor-draft.ts` |
| Search, suggestions, custom exercise create/edit/delete/archive, owned/muscle filters, drag/arrow order, removal | `inline-search.tsx`, `custom-exercise.tsx`, `data/editor-actions.ts`, `day-exercises.tsx`, `exercise-row.tsx` |
| Sets/reps/rest/RIR, failure, player notes | `exercise-fields.tsx`, `exercise-row.tsx`; approved notes type/schema/RPC extension |
| Supersets, media; unsupported alternatives/per-set settings | `editor-draft.ts`, `exercise-row.tsx`; unsupported buttons omitted |
| Cardio blocks, intensity/notes and order | `cardio-block.tsx`, `cardio-row.tsx` |
| Autosave/retry, validation/send/activation, history/new program, save as template | `training-editor.tsx`, `editor-header.tsx`, `week-menu.tsx`; existing programs public autosave API |
| Template autosave/manual save without activation; assignment | `template-entry.tsx`, `editor-header.tsx`, `assignment-sheet.tsx` (existing assignment RPC) |

## Verification and mockup differences
- Header, one live save status, day rail/summary, warm-up presets/free text/ramp, Arabic-first expandable rows/LTR reps, search/suggestions, supersets and optional cardio implemented with tokens and logical properties.
- Retained facts, library management, failure/range controls, week settings and history add controls beyond the static example. Rotation days omit weekdays until converted, because no weekday is stored for them.
- All touch controls remain at least 48px, including controls drawn smaller in the mockup.
- Alternatives and per-set buttons omitted: no existing persistence capability. Warm-up duration follows the existing T-197 timed-item helper, not a guessed duration for rep-based items.
- Live comparison at 1440×900 / 390×844 unavailable: `next dev` fails with `spawn EPERM`. Visual acceptance remains unchecked.
- Notes SQL round-trip passed after first failing on a null persisted note. Focused editor/notes/route/dictionary suite: 14 files, 58 tests passed. Standalone demo suite: 13 tests passed.
- Full fallback suite: 629 files / 4012 tests passed; three initial failures. Dictionary gating was corrected and passes focused verification; demo timeout passes alone. Performance-budget test references a missing generated `.next` chunk after the interrupted build, so the bundle budget remains unverified.
- `npm run check`: typecheck/lint passed, release audit blocked by `spawnSync git EPERM`. `npm run build`: compiled successfully, TypeScript worker blocked by `spawn EPERM`. Direct fallback typecheck and lint passed.
- Running the unchanged release-audit rules with the file list supplied by the shell also passed: `Release audit (shell file list): 2503 files, 0 findings`.
