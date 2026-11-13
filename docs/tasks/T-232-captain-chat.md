# T-232 — Captain: chat tab in the player file and unread badges

**Phase:** player v3 · **Depends on:** T-229, T-230 · **Status:** ready

## Goal
The captain reads and answers each player's messages inside the workspace, and sees at a glance who wrote.

## Files
Create or modify only these:
- `src/app/[locale]/(captain)/captain/players/[playerId]/chat/page.tsx` (new, thin route, same shape as `checkins/page.tsx`)
- `src/features/captain-workspace/player-file/types.ts`, `file-content.tsx`, `file-header.tsx` (or wherever the tab list lives), `routes.test.ts`: the new tab `chat`
- `src/features/captain-workspace/player-file/chat-entry.tsx` (new, dynamic, `ssr: false`, like `voice-entry.tsx`)
- `src/features/roster/components/roster-row.tsx` and the roster screen that loads rows: the unread badge
- messages files (`ar`, `arStd`, `en`) and tests

## Requirements
1. **New player-file tab «الشات»**, after «التقييمات». It shows the unread count when > 0, e.g. «الشات · 2». The route is `/captain/players/<id>/chat`.
2. The tab renders `ChatThread` (`viewer="captain"`) and `ChatComposer` from `@/features/chat`, with `useChatThread`. The composer placeholder is «اكتب ل<first name>». On mobile it is fixed at the bottom of the viewport. On desktop it sits under the thread in the content column.
3. **Roster:**
   - each row shows a lime count badge (`bg-lime text-on-lime`, Manrope) when that player has unread messages;
   - the subline shows «رسالة صوتية · time» or the first line of the text;
   - load the counts with one `unreadCounts` call per roster load, not one call per row.
4. The existing captain voice recorder and voice list (`FileVoiceEntry`, `CaptainVoiceNotes`) stay where they are. The thread already shows their notes.
5. The notification from T-229 links to this tab. Check that the link resolves.
6. Every state is covered: loading, error with retry, empty («لسه مفيش رسايل»).

## Acceptance
- [ ] Tests:
  - [ ] the tab route and label count;
  - [ ] the roster badge with 0 vs N;
  - [ ] a single counts query;
  - [ ] the composer placeholder;
  - [ ] the empty state.
- [ ] `npm run check` and `npm run build` pass. Run the perf budget (`/c/[slug]` must stay ≤ 200 KiB).

## Out of scope
- Player screens.
- DB changes.
- A global captain inbox page. The roster badge is enough for now.

## References
- Mockup: `docs/mockups/player-v3/12-chat-split.html`, screen 5.
