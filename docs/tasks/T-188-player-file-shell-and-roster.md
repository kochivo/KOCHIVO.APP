# T-188: One player file and the new players list (mockup v6, screens ٧ and ٨)

**Phase:** Captain workspace v6 (owner approval 2026-11-12: "نفس الشكل 100%") · **Depends on:** T-187 · **Status:** ready
**Migration:** none. **Flag:** everything here is behind `captainWorkspaceEnabled()`. Flag off stays byte-identical (test).

## Goal
Today a player has two pages: the old profile page (البيانات، التطور، الخطة، المتابعات، التحليل، الجاهزية) and the new workspace that only opens from «البرامج» or «الأكل», which has its own tabs. The owner wants **one** player file that looks exactly like mockup screen ٨, and a players list that looks exactly like screen ٧. This card also creates the shared UI parts the next three cards reuse.

Read first: `docs/mockups/captain-workspace/v6-owner-review.html` (screens ٧ and ٨) and `docs/mockups/captain-workspace/v6-spec.md`.

## Files
- New shared UI in `src/ui/`: `underline-tabs.tsx`, `fact-row.tsx`, `save-status.tsx` (plus tests and their `messages.ts` strings), as described in `v6-spec.md`.
- `src/features/roster/` (players list screen, filters, row, row menu, join requests filter) and tests.
- `src/features/coach-page/` only where the join-requests list is rendered, so it can show inside the new filter.
- `src/features/captain-workspace/` (new `player-file/` folder for the shell: header, tabs, overview tab, check-ins tab) and its entry exports.
- `src/features/player-profile/` read-only reuse: data loaders and existing analysis/readiness/progress components may be imported through its public entry and restyled by wrapping. Do not change player-profile behaviour for flag off.
- Routes (thin): `src/app/[locale]/(captain)/captain/players/[playerId]/page.tsx`, `.../programs/page.tsx`, `.../nutrition/page.tsx`, and new `.../assessments/page.tsx` and `.../checkins/page.tsx` (each: flag off → current behaviour or `notFound()` for the new ones; flag on → the shell with the matching tab).
- This card.

## Requirements
1. **Players list = screen ٧.**
   - Header: «اللاعبين», subline «{active} لاعب نشط · {free} أماكن فاضية في باقتك» (from the existing plan limit data), primary «ضيف لاعب» (opens the existing invite flow).
   - Filter chips with counts: نشطين، محتاج برنامج، متأخرين، اشتراكه هيخلص، and «طلبات انضمام» in lime **only when there is at least one request**. Choosing it shows the existing join requests list in place of the table. No join-requests card under the table anymore.
   - Search field in the same row.
   - Table columns: اللاعب (avatar, name, small goal · level), آخر تمرين، الخطة (program title + small line that says what is missing, e.g. «مفيش نظام أكل لسه»), الاشتراك («باقي {n} يوم»), and a ⋯ menu (شوف كلاعب، أرشفة).
   - **The whole row opens the player file.** Remove the per-row «البرامج / الأكل / شوف كلاعب» links.
   - Empty, loading and error states per `v6-spec.md`.
2. **Player file shell = screen ٨ header and tabs**, used by every tab:
   - Header: avatar, breadcrumb «اللاعبين ‹», name, status chip, «باقي {n} يوم» + small «جدّد» (existing renew flow), «شوف كلاعب».
   - Underline tabs in this order: نظرة عامة · التمرين · الأكل · التقييمات · المتابعات. Each tab is its own route (above), so links and back button work.
   - Replace the workspace's current own header/tabs with this shell. The التمرين and الأكل tabs keep their current content for now (T-189 and T-190 redesign them); التقييمات shows the existing player forms tab content (T-191 redesigns it).
3. **نظرة عامة tab = screen ٨ body.**
   - Three status cards: التمرين / الأكل / التقييمات, each with title, one line, and one button. The card for whatever is missing gets the warn border and the **only** primary button on the screen (e.g. «اعمل نظام أكل»). If nothing is missing, no card is primary.
   - «بياناته» card with fact rows: الهدف، الوزن · الطول · السن، الخبرة، أيام التمرين، إصابات · حالات طبية · حساسية (and any other intake facts the old «البيانات» tab shows, as more fact rows).
   - «التطور» card with tiles (الوزن with bar to goal, الالتزام this week). Anything else the old «التطور» tab shows (charts, photos, history) goes below as more cards built per `v6-spec.md`.
   - The old big green renew card is gone (renew is in the header).
4. **المتابعات tab** (not in the mockup, same system): check-ins list, then «التحليل» and «الجاهزية» sections from the old page, each restyled as `v6-spec.md` cards. Keep all their data and behaviour.
5. Old «الخطة» tab content is covered by التمرين and الأكل; drop it under the flag.
6. Create `underline-tabs`, `fact-row` and `save-status` in `src/ui/` exactly as `v6-spec.md` says, and use them here.
7. Copy every Arabic string from the mockup exactly. `ar` + `en` only; do not touch `arStd`.

## Acceptance
- [ ] Flag on: screens match mockup ٧ and ٨ at 1440×900 and 390×844 (differences listed with reasons).
- [ ] Flag off: players list and player page byte-identical (tests).
- [ ] Row click opens the file; join requests filter appears only with requests.
- [ ] Every old tab's information is reachable in the new file (list where each went in Notes).
- [ ] Unit tests for filters/counts, "what is missing" logic and the primary-card choice.
- [ ] All gates pass; route budgets unchanged.

## Out of scope
- Content of the التمرين (T-189), الأكل (T-190) and التقييمات (T-191) tabs.
- Database changes.
