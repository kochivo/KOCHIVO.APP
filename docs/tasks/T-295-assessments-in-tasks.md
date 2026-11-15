# T-295: answered custom assessments show in captain Home and Tasks (audit BL-04)

## Problem
- `src/features/captain-workspace/queue/data/tasks.ts:19,25` always passes `skipRequests: true` to `loadQueuePage`, so custom-form requests are never fetched for Tasks.
- `buildTasks()` (`queue/tasks-model.ts:19`) also drops every item whose kind is not `form` or `checkin`. Custom assessments have kind `request`.
- Home (`src/features/dashboard/components/workspace-home.tsx:46`) and the nav count use the same `loadTasks()`.

The result: a player answers an assessment, `reviewed_at` stays null, and the captain never sees it in Home, Tasks or the nav count.

## Files
- `src/features/captain-workspace/queue/data/tasks.ts`, `queue/tasks-model.ts`, and `queue/data/page.ts` if needed.
- The task row and its link: the item must open the existing assessment review screen. Find the route that review uses today; do not build a new screen.
- Messages (ar, arStd, en), only if a new label is needed.
- Tests: update or add the tasks-model and tasks tests to show:
  - an answered, unreviewed request appears once, with the right link;
  - a reviewed request does not appear;
  - an unanswered request follows the existing rule for sent-but-unanswered items (document it);
  - the counts in Home, Tasks and nav stay equal;
  - pagination through `requestCursor` still works.

## Rules
Keep one source of counts, as T-283 established. Keep the T-275 click cues and the T-278 spacing tokens.

## Out of scope
SQL, other findings.

## Gates
`npx vitest run src/features/captain-workspace src/features/dashboard`, `npm run typecheck`, `npm run lint`.
