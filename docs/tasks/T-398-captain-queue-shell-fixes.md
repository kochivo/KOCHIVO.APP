# T-398: Captain home, tasks, inbox, notifications, join, leaderboard, pending, and shell fixes

Owner decision 2026-11-18: fix every "Must fix" item from the Material 3 review of all screens. **Do not change the look.**

## The look must not change (hard rule)
The owner checks every screen afterwards. Anything that looks different gets reverted.

- Keep every existing color, surface, glass effect, font, size, spacing, radius, icon, animation, and layout order exactly as it is.
- Don't restyle, re-layout, or swap a component for a different-looking one.
- When a fix needs something new on screen, build it from components already on that screen or in `src/ui`, with their existing variants. Examples: an error line under a field, a Retry button, an Undo button, a "New" label, a sheet.
  - It should look as if it was always there.
  - Use the same button style the screen already uses for secondary actions.
- Invisible fixes are preferred wherever they solve the problem: accessible names, focus, aria, logic, validation, retry targets.
- Size fixes are invisible padding and hit-area changes. Examples: the 48px chip hit area, the weekday strip minimum width. Don't change the visible size of a control unless the item says so.
- The mockups in `docs/mockups/design-audit/` are rough sketches of **behavior and wording only**. Never copy their colors, shapes, or layout.

## Read first
- `AGENTS.md` and `DESIGN.md`.
- `docs/design-audit/02-captain-core.md`: the full scores and reasons for these screens.

## Fix list
### `/captain` — See what needs attention and start the day’s work
- Invite gets primary emphasis even with work waiting → the strongest CTA points away from daily triage → make Start tasks primary when the queue has work and Invite primary for onboarding. `src/features/dashboard/components/workspace-home.tsx:49`, `src/features/dashboard/home/home-hero-view.tsx:29`
- Follow-up failure replaces the whole dashboard → captains lose otherwise available task and roster context → show a local retry in the affected panel. `src/features/dashboard/components/workspace-home.tsx:52`

### `/captain/tasks` — Work through the Captain action queue
- Phone video action calls `open(task)`, while the detail pane exists only in the desktop branch → tapping it leaves the same card on screen → open a phone review panel or wire the action to the existing review dialog. `src/features/captain-workspace/queue/tasks-screen.tsx:81`, `src/features/captain-workspace/queue/tasks-screen.tsx:104`, `src/features/captain-workspace/queue/tasks-screen.tsx:131`
- Opening a program removes its task via an empty commit → unfinished work can disappear from the current queue → keep it open until the program is assigned, or expose a separate, persistent dismissal action. `src/features/captain-workspace/queue/tasks-screen.tsx:64`, `src/features/captain-workspace/queue/tasks-screen.tsx:83`

### `/captain/inbox` — Triage requests and reply to submissions
- Filtered zero results render a plain paragraph → screen-reader users can miss the result of a search or filter change → announce the empty result as a status and offer a translated reset action. `src/features/inbox/components/workspace-list.tsx:14`, `src/features/inbox/components/workspace-screen.tsx:103`

### `/captain/pending` — Submit onboarding information or check approval
- Approval polling collapses RPC errors into a false result and suppresses thrown errors → a captain cannot distinguish a failed check from a pending review → expose a localized check-failed state and a manual retry. `src/features/captain-approval/components/approval-watcher.tsx:9`, `src/features/captain-approval/components/approval-watcher.tsx:23`
- The route renders nothing when approval status is falsy → a direct visit can leave an empty screen → redirect approved captains to `/captain` or render an explicit continuation. `src/app/[locale]/(captain)/captain/pending/page.tsx:5`

### `/captain/notifications` — Read alerts and open their destinations
- An unread link waits for mark-as-read success before navigating → a failed write blocks access to the underlying alert → preserve native link navigation and treat marking read as a separate side effect. `src/features/notifications/components/captain-notifications-entry.tsx:38`
- Unread status is color-only and hidden from screen readers → users can miss which items are new → add a localized Unread label exposed to sighted and screen-reader users. `src/features/notifications/components/captain-notifications-entry.tsx:39`, `src/features/notifications/components/captain-notifications-entry.tsx:58`

### `/captain/leaderboard` — Compare player rankings and manage prizes
- The compact table retains five headers but renders three accessible cells per row → phone screen readers can get incorrect column associations → use a three-column compact table or a labeled list, with the additional metrics available through a disclosure. `src/features/rank-review/components/workspace-board-list.tsx:26`, `src/features/rank-review/components/workspace-board-list.tsx:53`

### `/captain/join` — Resolve join requests and share the invite link
- Desktop omits requested package days and sessions → captains make decisions with less context at larger widths → show the same package facts in desktop rows. `src/features/coach-page/components/workspace-join-card.tsx:24`, `src/features/coach-page/components/phone-join-card.tsx:25`
- Rows disappear before resolution completes → focus is lost and the list can look empty while a request is pending → keep the row visible and busy, then move focus after confirmed removal. `src/features/coach-page/components/join-requests-list.tsx:25`
- Request and invite-link load failures render alerts alone → recovery requires a page reload → add scoped retry controls beside each error. `src/features/coach-page/components/workspace-join-page.tsx:32`, `src/features/coach-page/components/workspace-join-page.tsx:37`

### `/captain/*` — Phone shell for navigation, search, and quick add
- More receives `aria-current="page"` and unmapped routes default to Home → users can hear or see the wrong current destination → reserve current-page state for destination links, and map notifications explicitly or leave the bar unselected. `src/features/roster/components/captain-phone-nav.tsx:41`, `src/features/roster/components/captain-frame-model.ts:43`
- Quick Add waits for an enabled button and silently expires → a tap can land on another page without completing the intended action → show a pending state and provide an explicit fallback when the action is unavailable. `src/features/roster/components/captain-frame-nav.tsx:57`, `src/features/roster/components/captain-frame-nav.tsx:75`

### `/captain/*` — Desktop shell for navigation, page actions, and account access
- The workspace bell is a button that routes and hides its unread indicator from assistive technology → users lose native link affordances and cannot hear the unread state → use a named link to Notifications with localized unread status. `src/features/notifications/components/notification-bell.tsx:36`
- Failed sidebar counts disappear visually → a blank badge can be read as no work waiting → distinguish unavailable counts from zero for all users. `src/features/roster/components/captain-frame-nav.tsx:34`, `src/features/roster/components/captain-nav-groups.tsx:49`

Behavior sketches (wording and behavior only, not looks): see the mockup PNGs named in `docs/mockups/design-audit/`.

For the phone video review, reuse the existing desktop review component inside a bottom sheet or dialog. Don't build a second review flow.

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
captain home, tasks/queue, inbox, notifications, join, leaderboard, pending, and captain shell components. Do not touch player-file screens under `/captain/players/**` (T-399) or captain library/billing/settings (T-400).

If a fix needs a file owned by another card, skip it and list it under Notes for reviewer.

## Out of scope
- "Nice to have" items.
- Visual restyles.
- Screens not listed here.

## Checks
`npm run check` and `npm run build` must pass. That includes `src/lib/perf-budget.test.ts`, so don't import client barrels into server code.
