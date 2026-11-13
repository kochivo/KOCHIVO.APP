# T-212: Assessment editor fixes (owner review of staging, 2026-11-12)

**Phase:** v6 fixes · **Status:** ready · **Depends on:** T-201 (landed) · **Migration:** none. If one is truly needed, stop and ask.
**Flag:** captain-workspace screens only (`captainWorkspaceEnabled()`). Flag-off output stays byte-identical. **Messages:** `ar` (Egyptian), `arStd`, `en`.
**Rules:** follow AGENTS.md in full.
- No new deps. Keep files under 250 lines.
- Tokens only and logical properties only. Touch targets ≥48px.
- No Get-Content/Set-Content. Do not commit.

## Why

The owner opened an assessment («صور تطور») at `/captain/library/forms?edit=…` on staging. Mockup: `docs/mockups/captain-workspace/v6-assessments.html` (editor section «المتابعة الأسبوعية»).

## Files

- `src/features/forms/components/`:
  - `schedule-editor.tsx`, `library-schedules-entry.tsx`, `form-builder.tsx`, `form-preview.tsx`;
  - `question-field.tsx` (photos and textarea, preview use only);
  - the themed select used by the schedule sentence (find `ThemedSelect`; if it lives in `src/ui`, fix it there for every user).
- `src/features/forms/redesign/messages.ts` (+ standard), and tests.
- T-210 owns the sidebar label and badge, and T-211 owns the quick-add chips styling. Do not touch those.

## Requirements

### 1. Dropdowns open above everything
- The schedule sentence's dropdowns («من غير ميعاد», «كل اللاعبين (N)», «من غير تذكير») open their option list on top of the question cards.
- Today the list renders behind the next card and is cut off, so options cannot be read or chosen.
- Fix the root cause: stacking context from `glass` or backdrop-filter, `overflow`, or z-index. Do not hack a large z-index per screen.
- The list must also stay inside the viewport on 390px width and support the keyboard, as the select does today.

### 2. The preview shows what the player really sees
- In the «اللاعب بيشوفه كده» preview, a photos question uses the same camera and gallery buttons as the player answer flow (`answer-flow.tsx`): Arabic labels, styled, no native "No file chosen / Choose Files".
- Text answers show no resize grip.
- Reuse the player's component or its markup; do not fork a second design.

### 3. One place for schedule and players
- The bottom collapsible «المواعيد واللاعبين» repeats the top sentence. The mockup has only the sentence.
- Before removing it, list every capability it has: per-player schedules, choosing specific players, reminder settings, pause, and anything else.
- Make sure each one is reachable from the top sentence. For example, choosing «لاعبين معيّنين» in the «لـ» dropdown opens the existing player picker, and a schedule per player stays editable.
- Then remove the duplicate box.
- If any capability cannot fit the sentence cleanly, stop and ask instead of dropping it.

## Acceptance
- [ ] Unit or render tests cover:
  - the option list rendering outside the clipped container (or the class or portal that guarantees it);
  - the preview photos control (Arabic labels, no native file text);
  - every schedule capability still reachable after the box is removed.
- [ ] A feature inventory in your report: old location and new location for each schedule capability.
- [ ] Flag-off output is unchanged.
- [ ] `npm run check` and `npm run build` pass; summary lines pasted.

## Out of scope
- Assessment library list, question types, data model.
