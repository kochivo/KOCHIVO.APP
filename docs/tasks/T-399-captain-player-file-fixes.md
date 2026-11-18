# T-399: Captain players list, new player, and player file screen fixes

Owner decision 2026-11-18: fix every "Must fix" item from the Material 3 review of all screens, and keep the KOCHIVO look.

The look stays as it is: dark, lime as the only action color, glass. Change behavior, semantics, states, and accessibility only.

## Read first
- `AGENTS.md` and `DESIGN.md`.
- `docs/design-audit/02-captain-core.md`: the full scores and reasons for these screens.
- `docs/mockups/design-audit/`:
  - `screens-worst.html` has mockups a1–a4;
  - `screens-all.html` has p1–p4, c1–c3, t1–t2 and u1–u3;
  - `ai-connect.html` has s1–s4;
  - the matching PNGs are in the same folder.

  Match the behavior and copy shown there. Visual details follow the existing components and tokens.

## Fix list
### `/captain/players` — Find players and scan their status
- Phone search filters `phoneRows`, while desktop renders `visible` → results change when the window crosses the breakpoint → apply the same query to both collections and retain an in-roster search control on desktop. `src/features/roster/v6/roster.tsx:35`, `src/features/roster/v6/roster.tsx:50`, `src/features/roster/v6/roster.tsx:74`
- `order-last` moves phone filters visually → focus can jump across the strip out of visual order → render the filters in their intended reading order. `src/features/roster/v6/roster.tsx:58`

### `/captain/players/new` — Create an invite with payment terms and optional assessments
- Payment Edit returns to step 1 → changing payment requires going through player details again → return to step 2, use one Next control per step, and move focus to the new step heading. `src/features/roster/components/invite-form.tsx:60`, `src/features/roster/components/invite-form.tsx:66`, `src/features/roster/components/invite-form.tsx:91`
- Schema validity disables Next and Create without explaining payment failures → users can get stuck on an amount or date → show translated, field-linked validation and focus the first invalid field on attempted progression. `src/features/roster/components/invite-form.tsx:31`, `src/features/roster/components/invite-form.tsx:70`, `src/features/roster/components/invite-form.tsx:79`

### `/captain/players/[playerId]` — Review the player’s file and open coaching tools
- Preview is hidden below 760px and the phone header supplies no equivalent → captains cannot reach it from the phone file header → expose it as a labeled secondary action. `src/features/captain-workspace/player-file/file-header.tsx:44`, `src/features/captain-workspace/player-file/phone-file-header.tsx:34`
- Trained days use background and weight changes while their status text is screen-reader-only → sighted users must infer the state → add a visible check or another non-color marker. `src/features/captain-workspace/player-file/phone-overview.tsx:37`

### `/captain/players/[playerId]/assessments` — Send assessments and review responses
- Pending requests sit behind History → captains can overlook assessments that still need a response → surface a pending section or count and give the disclosure a label that covers both pending and past requests. `src/features/captain-workspace/player-file/assessment-review-entry.tsx:17`, `src/features/forms/components/request-manager.tsx:54`
- Reminder failure shows Retry, but the handler only reloads the list → the reminder stays unsent after tapping Retry → retain the failed request ID and retry its mutation. `src/features/forms/components/request-manager.tsx:30`, `src/features/forms/components/request-manager.tsx:52`

### `/captain/players/[playerId]/chat` — Exchange text and voice messages
- The tail effect always calls `scrollIntoView` → a new message can pull the captain away from earlier context → auto-scroll when already near the end or after sending, and show a new-message control otherwise. `src/features/chat/components/chat-thread-view.tsx:27`

### `/captain/players/[playerId]/checkins` — Inspect weekly measurements, photos, and replies
- Review opens the generic inbox → captains must find the same submission a second time → deep-link to that check-in’s review or open it in context. `src/features/captain-workspace/player-file/checkin-list.tsx:40`
- Fixed `object-cover` photos have no full-image action, and load errors have no retry → coaches can miss cropped detail or be unable to inspect a failed photo → offer a named full-image control and local recovery. `src/features/captain-workspace/player-file/checkin-list.tsx:35`

### `/captain/players/[playerId]/nutrition` — Build and send a player’s meal plan
- Selecting Rest can modify a draft that autosaves → inspecting the rest-day view can persist edits → keep selection view-only and use an explicit action to create or split rest-day meals. `src/features/meal-plans/components/editor/player-editor.tsx:62`, `src/features/meal-plans/components/editor/player-editor.tsx:98`

### `/captain/players/[playerId]/preview` — Inspect a read-only player view
- Section buttons announce a current page while swapping content in place → assistive technology gets the wrong navigation model → use a pressed-button group or a complete tab pattern with associated panels. `src/features/player-preview/components/preview-screen.tsx:52`
- Back goes to the roster in workspace mode and home in legacy mode → returning from preview loses the player file → link back to the same player’s file. `src/features/player-preview/components/preview-screen.tsx:44`, `src/features/player-preview/components/preview-screen.tsx:48`

### `/captain/players/[playerId]/programs` — Inspect, assign, or change a training program
- Day tabs lack the keyboard behavior their role implies → keyboard users must tab through every day and cannot use arrow keys to switch → implement RTL-aware tab navigation and roving focus, or use a pressed-button group. `src/features/captain-workspace/training/player-program-summary.tsx:36`

Mockups to follow:
- `c2` (player file and new player payment step);
- `c3` (chat, check-ins, rest day).

The rest-day fix must not change saved data just by viewing.

## Rules
- **Strings:** every new string goes in the feature's `messages.ts` in `ar`, `arStd`, and `en`. Egyptian Arabic is plain and short, like the mockups.
- **Targets and layout:** touch targets are at least 48px. Use logical properties only.
- **Errors:** every error state gets a scoped retry or a way out.
- **Accessibility:**
  - Icon-only buttons get translated labels.
  - Status is never shown by color alone.
  - On a step change, focus moves to the new step's heading or field.
- **Tests:** add or update tests for each logic change: validation, eligibility rules, digit normalization, retry targets, focus targets where testable. Keep them deterministic.
- **Forbidden:**
  - no new dependency;
  - no migration;
  - no change to `.env*`;
  - nothing outside the files below.

## Files
screens under `/captain/players/**`. Do not touch the captain shell, tasks, or notifications (T-398).

If a fix needs a file owned by another card, skip it and list it under Notes for reviewer.

## Out of scope
- "Nice to have" items.
- Visual restyles.
- Screens not listed here.

## Checks
`npm run check` and `npm run build` must pass. That includes `src/lib/perf-budget.test.ts`, so don't import client barrels into server code.
