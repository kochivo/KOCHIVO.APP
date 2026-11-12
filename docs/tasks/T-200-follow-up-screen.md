# T-200: «المتابعة» replaces «المهام» (mockup v6-followup)

**Phase:** v6 owner review round 2. The owner approved the mockups on 2026-11-12 and wants them **100% like the mockup**. · **Status:** ready · **Depends on:** none
**Flag:** behind `captainWorkspaceEnabled()`. With the flag off, output stays byte-identical. **Messages:** `ar` (Egyptian), `arStd` (see docs/I18N-STYLE.md) and `en`. Copy every Arabic string from the mockup exactly.
**Rules:** AGENTS.md in full. Tokens only, logical properties, touch targets at least 48px, 250 lines max per file, no new deps, no Get-Content/Set-Content on text files, no commits. **Migration:** none expected. If one is needed, stop and explain why.

Read first, in full: `docs/mockups/captain-workspace/v6-followup.html` (all three screens).

## Files
- `src/features/inbox/`: workspace screen, rows, detail, reply, messages and tests (`workspace-*.ts(x)`, `components/workspace-*.tsx`).
- The tasks route page under `src/app/[locale]/(captain)/captain/`, only if the title or metadata lives there.
- NOT `src/features/roster/nav.ts`. The sidebar rename belongs to T-205.

## Requirements
1. **Header**
   - Title «المتابعة».
   - One summary line: «{n} مستنيين ردك · أقدمهم من {age} · بترد في المتوسط خلال {h} ساعات».
   - Omit the average part when there is no data. Never show «لا توجد بيانات بعد».
   - Remove the four stat cards.
2. **Filters**
   - One search box.
   - One status segment with counts: مستنيين ردك / متأخرين / خلصوا.
   - One type chip row: الكل، متابعات، فيديوهات أداء، تقييمات، طلبات انضمام.
   - Remove the duplicated second search and filter rows.
3. **List**
   - Split into «محتاج انتباهك» and «عادي». «محتاج انتباهك» holds the items the existing triage flags (pain, low sleep, absence, soreness…).
   - Each row shows: avatar, name, flag pill, kind · one-line summary, and age. The age turns amber when overdue.
4. **Detail.** Shown beside the list on desktop and full screen on mobile. From top to bottom:
   - Header with «افتح ملفه».
   - Flag pills.
   - Three KPI tiles, each with its change vs the previous week.
   - Answers, with flagged answers in amber.
   - Photos.
   - Reply area: quick replies, text box, voice, «اتراجعت من غير رد», and the primary «ابعت وافتح اللي بعده».
5. **Empty state:** «خلصت كل المتابعات» + «رديت على {n} الأسبوع ده · المتوسط {h} ساعات».
6. **History:** «سجل المراجعات», collapsed, at the bottom.

## Feature inventory (nothing lost)
- Item kinds: check-ins, assessments, join requests, form videos.
- Triage flags.
- Reply: quick replies, voice reply with the unsent guard, send-and-next, review without reply, drafts.
- Open player, history, search.
- Optimistic send with rollback.
- Loading, error and retry states.

## Acceptance
- [ ] Matches the mockup at 1440×900 and 390×844; differences listed.
- [ ] Tests:
  - filters and counts come from one source;
  - attention grouping;
  - send-and-next;
  - empty state;
  - no duplicated controls.
- [ ] `npm run check` and `npm run build` pass; summary lines pasted.
