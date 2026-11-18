# Captain core — phone v4 and desktop

Source review of the workspace layouts and the legacy branches exposed by the same routes. Routes are shown without the locale prefix. Scores reflect verified code behavior. Rendered contrast, text scaling, and keyboard behavior were outside this source review. No files changed, and no builds or tests ran.

## `/captain` — See what needs attention and start the day’s work

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 1 | The invite gets the top-bar primary slot while starting tasks is secondary. |
| Information hierarchy | 1 | The task hero leads, but first-player onboarding sits below several operational panels. |
| Component semantics | 2 | Task, roster, and invite links use navigation semantics. |
| Token discipline | 2 | The reviewed hero and task list use shared surfaces and controls. |
| Adaptive behavior | 2 | Phone task cards and a wide supporting column serve different reading needs. |
| States & feedback | 1 | Loading and retry exist, but several secondary reads can replace the dashboard with one error. |
| Accessibility | 1 | The task list truncates player names and task details without a reveal affordance. |
| Expressive restraint | 2 | The hero has a clear focal point and supporting rows are quieter. |

**Must fix**

- Invite gets primary emphasis even with work waiting → the strongest CTA points away from daily triage → make Start tasks primary when the queue has work and Invite primary for onboarding. `src/features/dashboard/components/workspace-home.tsx:49`, `src/features/dashboard/home/home-hero-view.tsx:29`
- Follow-up failure replaces the whole dashboard → captains lose otherwise available task and roster context → show a local retry in the affected panel. `src/features/dashboard/components/workspace-home.tsx:52`

**Nice to have**

- Let desktop task names and subtitles wrap when space is tight. `src/features/dashboard/home/home-task-list-view.tsx:27`

## `/captain/tasks` — Work through the Captain action queue

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 1 | The phone card surfaces the next task, but one review action has no visible result. |
| Information hierarchy | 1 | Desktop renders two controls for the same type filter. |
| Component semantics | 0 | The phone video action updates desktop detail state that the phone view never renders. |
| Token discipline | 2 | Uses shared buttons, filters, and glass roles. |
| Adaptive behavior | 1 | Phone cards and desktop list-detail are distinct, but the video review path is incomplete on phone. |
| States & feedback | 1 | Initial failures offer retry. A failure with retained data renders a text alert alone. |
| Accessibility | 1 | Phone arrows are named and sized. The inaccessible video flow also blocks keyboard users. |
| Expressive restraint | 1 | The duplicated desktop filter adds avoidable visual weight. |

**Must fix**

- Phone video action calls `open(task)`, while the detail pane exists only in the desktop branch → tapping it leaves the same card on screen → open a phone review panel or wire the action to the existing review dialog. `src/features/captain-workspace/queue/tasks-screen.tsx:81`, `src/features/captain-workspace/queue/tasks-screen.tsx:104`, `src/features/captain-workspace/queue/tasks-screen.tsx:131`
- Opening a program removes its task via an empty commit → unfinished work can disappear from the current queue → keep it open until the program is assigned, or expose a separate, persistent dismissal action. `src/features/captain-workspace/queue/tasks-screen.tsx:64`, `src/features/captain-workspace/queue/tasks-screen.tsx:83`

**Nice to have**

- Use one desktop type filter and give the retained-data error a retry action. `src/features/captain-workspace/queue/tasks-screen.tsx:103`, `src/features/captain-workspace/queue/tasks-screen.tsx:117`

## `/captain/inbox` — Triage requests and reply to submissions

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 2 | Status, type, search, and review actions are explicit. |
| Information hierarchy | 2 | Attention and routine items are grouped, with history disclosed separately. |
| Component semantics | 2 | Filters expose their pressed state, and detail adapts to a modal or pane. |
| Token discipline | 1 | Uses shared surface colors with several literal control radii. |
| Adaptive behavior | 2 | Wide list-detail and compact dialog preserve the same review workflow. |
| States & feedback | 1 | Load and history errors have recovery. A filtered empty list gives no reset action. |
| Accessibility | 1 | Filter controls are named and sized, but filtered results have no status announcement. |
| Expressive restraint | 2 | The composer gives Send and next the strongest emphasis. |

**Must fix**

- Filtered zero results render a plain paragraph → screen-reader users can miss the result of a search or filter change → announce the empty result as a status and offer a translated reset action. `src/features/inbox/components/workspace-list.tsx:14`, `src/features/inbox/components/workspace-screen.tsx:103`

**Nice to have**

- Replace the literal segmented-control radius with the shared control token. `src/features/inbox/components/workspace-controls.tsx:26`

## `/captain/players` — Find players and scan their status

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 2 | Player rows, status filters, and Add player are easy to identify in the markup. |
| Information hierarchy | 2 | Phone rows prioritize status. The desktop table adds coaching metrics. |
| Component semantics | 2 | Player destinations are links and filters expose their pressed state. |
| Token discipline | 1 | Shared colors are used, with a literal table radius. |
| Adaptive behavior | 1 | Resizing to desktop discards the visible effect of the roster search. |
| States & feedback | 1 | Retry and empty copy exist, but no-results offers no reset. |
| Accessibility | 1 | CSS reorders phone filters independently of their DOM and keyboard order. |
| Expressive restraint | 2 | Player status carries the visual emphasis in each row. |

**Must fix**

- Phone search filters `phoneRows`, while desktop renders `visible` → results change when the window crosses the breakpoint → apply the same query to both collections and retain an in-roster search control on desktop. `src/features/roster/v6/roster.tsx:35`, `src/features/roster/v6/roster.tsx:50`, `src/features/roster/v6/roster.tsx:74`
- `order-last` moves phone filters visually → focus can jump across the strip out of visual order → render the filters in their intended reading order. `src/features/roster/v6/roster.tsx:58`

**Nice to have**

- Add a clear-search or show-all action to the applicable empty state. `src/features/roster/v6/roster.tsx:67`

## `/captain/players/new` — Create an invite with payment terms and optional assessments

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 1 | Phone exposes duplicate Next controls and routes payment editing through player details. |
| Information hierarchy | 2 | Details, payment, assessments, and the desktop summary have distinct roles. |
| Component semantics | 1 | The phone payment Edit action opens the details step. |
| Token discipline | 1 | Shared controls coexist with repeated literal card radii. |
| Adaptive behavior | 2 | Phone stages the form and desktop shows form plus summary. |
| States & feedback | 1 | Load retry and invite success exist, but invalid payment can silently disable progression. |
| Accessibility | 1 | Fields are labeled, but changing steps does not move focus to the newly visible content. |
| Expressive restraint | 1 | Repeated Next actions compete within the same step. |

**Must fix**

- Payment Edit returns to step 1 → changing payment requires going through player details again → return to step 2, use one Next control per step, and move focus to the new step heading. `src/features/roster/components/invite-form.tsx:60`, `src/features/roster/components/invite-form.tsx:66`, `src/features/roster/components/invite-form.tsx:91`
- Schema validity disables Next and Create without explaining payment failures → users can get stuck on an amount or date → show translated, field-linked validation and focus the first invalid field on attempted progression. `src/features/roster/components/invite-form.tsx:31`, `src/features/roster/components/invite-form.tsx:70`, `src/features/roster/components/invite-form.tsx:79`

**Nice to have**

- Place server submission errors beside the phone footer action or move focus to the error. `src/features/roster/components/invite-form.tsx:87`

## `/captain/players/[playerId]` — Review the player’s file and open coaching tools

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 1 | Preview is exposed wide and omitted from the phone header. |
| Information hierarchy | 1 | A phone summary is inserted before the shared overview, which also contains adherence. |
| Component semantics | 2 | File destinations use links and billing has a dedicated action. |
| Token discipline | 2 | Uses shared glass and text roles. |
| Adaptive behavior | 1 | Phone gets a tailored summary but loses preview access from the file header. |
| States & feedback | 2 | The file has loading, missing-profile handling, and a retryable load error. |
| Accessibility | 1 | The phone week gives day status to screen readers, but visible day markers rely on styling. |
| Expressive restraint | 1 | Two weekly adherence presentations add weight on phone. |

**Must fix**

- Preview is hidden below 760px and the phone header supplies no equivalent → captains cannot reach it from the phone file header → expose it as a labeled secondary action. `src/features/captain-workspace/player-file/file-header.tsx:44`, `src/features/captain-workspace/player-file/phone-file-header.tsx:34`
- Trained days use background and weight changes while their status text is screen-reader-only → sighted users must infer the state → add a visible check or another non-color marker. `src/features/captain-workspace/player-file/phone-overview.tsx:37`

**Nice to have**

- Show one weekly adherence summary on phone. `src/features/captain-workspace/player-file/file-content.tsx:63`, `src/features/captain-workspace/player-file/overview.tsx:40`

## `/captain/players/[playerId]/assessments` — Send assessments and review responses

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 1 | Sending is surfaced, while outstanding requests are inside a disclosure labeled History. |
| Information hierarchy | 1 | Answered cards lead, while pending work is concealed in the request manager. |
| Component semantics | 2 | Response cards link to a specific request and review section. |
| Token discipline | 2 | Cards, links, and buttons use shared roles. |
| Adaptive behavior | 2 | The grid expands on wider screens and the review section spans the row. |
| States & feedback | 1 | Loading, retry, and sent feedback exist. Reminder retry only reloads data. |
| Accessibility | 1 | Repeated Open links share the same accessible name across assessment cards. |
| Expressive restraint | 2 | Cards emphasize the assessment title, date, and numeric answers. |

**Must fix**

- Pending requests sit behind History → captains can overlook assessments that still need a response → surface a pending section or count and give the disclosure a label that covers both pending and past requests. `src/features/captain-workspace/player-file/assessment-review-entry.tsx:17`, `src/features/forms/components/request-manager.tsx:54`
- Reminder failure shows Retry, but the handler only reloads the list → the reminder stays unsent after tapping Retry → retain the failed request ID and retry its mutation. `src/features/forms/components/request-manager.tsx:30`, `src/features/forms/components/request-manager.tsx:52`

**Nice to have**

- Include the assessment title in each Open link’s accessible name. `src/features/captain-workspace/player-file/assessment-cards.tsx:22`

## `/captain/players/[playerId]/chat` — Exchange text and voice messages

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 2 | The player header and composer establish recipient and task. |
| Information hierarchy | 2 | History, composer, and message-level status are distinct. |
| Component semantics | 2 | Send, record, discard, and older-message retrieval are explicit controls. |
| Token discipline | 1 | Shared colors coexist with literal bubble and composer dimensions. |
| Adaptive behavior | 1 | The same thread stacks at all widths, with breakpoint-specific bottom clearance. |
| States & feedback | 2 | Empty, loading, older-message errors, send pending, and failed-send retry are represented. |
| Accessibility | 1 | Every new final message scrolls the viewport, even while the captain reads earlier messages. |
| Expressive restraint | 2 | Bubble alignment and status text convey useful distinctions. |

**Must fix**

- The tail effect always calls `scrollIntoView` → a new message can pull the captain away from earlier context → auto-scroll when already near the end or after sending, and show a new-message control otherwise. `src/features/chat/components/chat-thread-view.tsx:27`

**Nice to have**

- Add a concise live announcement for incoming messages while preserving the reading position. `src/features/chat/components/chat-thread-view.tsx:36`

## `/captain/players/[playerId]/checkins` — Inspect weekly measurements, photos, and replies

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 1 | A row’s review link opens the general inbox without targeting the check-in. |
| Information hierarchy | 2 | Weekly history leads, with analysis and readiness under disclosures. |
| Component semantics | 1 | Photos are static thumbnails with no full-image control. |
| Token discipline | 2 | Check-in surfaces, measurements, and badges use named roles. |
| Adaptive behavior | 1 | Photos remain two columns with a fixed height and crop at every width. |
| States & feedback | 1 | Empty history has a reminder action. Photo errors have no local recovery. |
| Accessibility | 1 | Review state is textual, but photos share generic alternative text. |
| Expressive restraint | 2 | Disclosures contain secondary details and keep the history scannable. |

**Must fix**

- Review opens the generic inbox → captains must find the same submission a second time → deep-link to that check-in’s review or open it in context. `src/features/captain-workspace/player-file/checkin-list.tsx:40`
- Fixed `object-cover` photos have no full-image action, and load errors have no retry → coaches can miss cropped detail or be unable to inspect a failed photo → offer a named full-image control and local recovery. `src/features/captain-workspace/player-file/checkin-list.tsx:35`

**Nice to have**

- Use a specific photo label when pose metadata is available. `src/features/captain-workspace/player-file/checkin-list.tsx:36`

## `/captain/players/[playerId]/nutrition` — Build and send a player’s meal plan

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 1 | Send is prominent, but changing day views can alter the draft. |
| Information hierarchy | 2 | Targets and meals lead, with food and player facts alongside on wide screens. |
| Component semantics | 0 | The Rest selector also updates the draft through `openRestDay`. |
| Token discipline | 2 | Uses shared surfaces, controls, and status colors. |
| Adaptive behavior | 2 | The food picker moves from below the editor to a supporting column. |
| States & feedback | 1 | Loading and save retry exist, but the selector gives no confirmation for its edit. |
| Accessibility | 1 | Selection exposes pressed state. That state gives no indication of the draft side effect. |
| Expressive restraint | 1 | A permanently disabled notes field takes up task space. |

**Must fix**

- Selecting Rest can modify a draft that autosaves → inspecting the rest-day view can persist edits → keep selection view-only and use an explicit action to create or split rest-day meals. `src/features/meal-plans/components/editor/player-editor.tsx:62`, `src/features/meal-plans/components/editor/player-editor.tsx:98`

**Nice to have**

- Replace the disabled notes textarea with concise informational text until notes can be edited. `src/features/meal-plans/components/editor/player-editor.tsx:122`

## `/captain/players/[playerId]/preview` — Inspect a read-only player view

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 2 | The preview identifies the player and states that it is read-only. |
| Information hierarchy | 2 | Four sections organize the simulation. |
| Component semantics | 1 | In-place section buttons use `aria-current="page"`. |
| Token discipline | 1 | The simulated frame uses a literal radius. |
| Adaptive behavior | 1 | The phone-width simulation is intentional, but compact screens still get nested scrolling. |
| States & feedback | 2 | Loading, retry, and unavailable states are implemented. |
| Accessibility | 1 | Buttons meet the vertical target, but the page-current semantics misdescribe the view change. |
| Expressive restraint | 2 | The device frame communicates the preview’s purpose. |

**Must fix**

- Section buttons announce a current page while swapping content in place → assistive technology gets the wrong navigation model → use a pressed-button group or a complete tab pattern with associated panels. `src/features/player-preview/components/preview-screen.tsx:52`
- Back goes to the roster in workspace mode and home in legacy mode → returning from preview loses the player file → link back to the same player’s file. `src/features/player-preview/components/preview-screen.tsx:44`, `src/features/player-preview/components/preview-screen.tsx:48`

**Nice to have**

- Keep the framed simulation on wide screens and let the outer page scroll on compact screens. `src/features/player-preview/components/phone-frame.tsx:8`

## `/captain/players/[playerId]/programs` — Inspect, assign, or change a training program

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 2 | The workspace summary offers edit/change actions and an assignment path for an empty program. |
| Information hierarchy | 2 | Program and week precede day selection and prescription. |
| Component semantics | 1 | The day picker declares tabs but supplies click selection alone. |
| Token discipline | 2 | Uses shared controls, surfaces, and type roles. |
| Adaptive behavior | 1 | The day strip scrolls, but the workspace summary stays single-column on wide screens. |
| States & feedback | 2 | Loading, load retry, assignment pending/error, and empty prescriptions are represented. |
| Accessibility | 1 | All day tabs are tab stops, with no arrow navigation or roving focus. |
| Expressive restraint | 2 | Prescription rows remain quieter than the program actions. |

**Must fix**

- Day tabs lack the keyboard behavior their role implies → keyboard users must tab through every day and cannot use arrow keys to switch → implement RTL-aware tab navigation and roving focus, or use a pressed-button group. `src/features/captain-workspace/training/player-program-summary.tsx:36`

**Nice to have**

- Retain the player’s unread badge in training by passing the count into the shared file header. `src/features/captain-workspace/training/player-program-content.tsx:17`

## `/captain/pending` — Submit onboarding information or check approval

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 2 | Intake, pending, and rejected states have distinct content. |
| Information hierarchy | 2 | The form or approval message leads, with sign-out separate. |
| Component semantics | 2 | Native radio inputs and form submission match the onboarding task. |
| Token discipline | 1 | The legacy waiting screen uses decorative lime in its pulsing hourglass. |
| Adaptive behavior | 2 | Form option groups become columns at wider widths. |
| States & feedback | 1 | Intake retries, but polling failures silently look like continued waiting. |
| Accessibility | 1 | Form inputs are labeled, but approval polling provides no status announcement. |
| Expressive restraint | 1 | The legacy repeating pulse adds motion to a passive waiting state. |

**Must fix**

- Approval polling collapses RPC errors into a false result and suppresses thrown errors → a captain cannot distinguish a failed check from a pending review → expose a localized check-failed state and a manual retry. `src/features/captain-approval/components/approval-watcher.tsx:9`, `src/features/captain-approval/components/approval-watcher.tsx:23`
- The route renders nothing when approval status is falsy → a direct visit can leave an empty screen → redirect approved captains to `/captain` or render an explicit continuation. `src/app/[locale]/(captain)/captain/pending/page.tsx:5`

**Nice to have**

- Make the legacy hourglass static and use a neutral token. `src/features/captain-approval/components/captain-pending-screen.tsx:31`

## `/captain/notifications` — Read alerts and open their destinations

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 2 | Each row provides notification content, time, and a destination. |
| Information hierarchy | 2 | Urgency is textual and rows are grouped in one list. |
| Component semantics | 0 | An unread link opens its destination only after its read mutation succeeds. |
| Token discipline | 1 | Token colors are used with literal surface radii. |
| Adaptive behavior | 1 | Mark all as read disappears on phone. |
| States & feedback | 1 | Load errors have retry. Read failure blocks navigation and reports only a save error. |
| Accessibility | 0 | Unread is conveyed through background and an assistive-technology-hidden dot. |
| Expressive restraint | 2 | The urgent badge is reserved for the relevant notification type. |

**Must fix**

- An unread link waits for mark-as-read success before navigating → a failed write blocks access to the underlying alert → preserve native link navigation and treat marking read as a separate side effect. `src/features/notifications/components/captain-notifications-entry.tsx:38`
- Unread status is color-only and hidden from screen readers → users can miss which items are new → add a localized Unread label exposed to sighted and screen-reader users. `src/features/notifications/components/captain-notifications-entry.tsx:39`, `src/features/notifications/components/captain-notifications-entry.tsx:58`

**Nice to have**

- Offer Mark all as read in the phone action area. `src/features/notifications/components/captain-notifications-entry.tsx:24`

## `/captain/leaderboard` — Compare player rankings and manage prizes

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 2 | Period selection, rankings, prizes, and points rules have distinct roles. |
| Information hierarchy | 2 | The leader card provides a focal point and the list supports comparison. |
| Component semantics | 2 | Period selection uses a shared segmented control. |
| Token discipline | 2 | The reviewed ranking list uses named roles and type sizes. |
| Adaptive behavior | 1 | Phone removes medal and workout cells for ordinary rows with no row-level reveal. |
| States & feedback | 2 | Board and prize load failures have explicit retry, with loading and empty states. |
| Accessibility | 1 | Compact rows hide cells while retaining a five-column header for assistive technology. |
| Expressive restraint | 2 | The crown treatment focuses emphasis on the leader. |

**Must fix**

- The compact table retains five headers but renders three accessible cells per row → phone screen readers can get incorrect column associations → use a three-column compact table or a labeled list, with the additional metrics available through a disclosure. `src/features/rank-review/components/workspace-board-list.tsx:26`, `src/features/rank-review/components/workspace-board-list.tsx:53`

**Nice to have**

- Give the period selector a group name that describes the choice, such as Ranking period. `src/features/rank-review/components/workspace-leaderboard.tsx:53`

## `/captain/join` — Resolve join requests and share the invite link

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 1 | Desktop omits package facts shown on phone. |
| Information hierarchy | 2 | Requests lead and invite sharing sits in a separate supporting panel. |
| Component semantics | 1 | Accept also opens billing, while the phone label implies a start action. |
| Token discipline | 2 | Buttons, states, and surfaces use shared roles. |
| Adaptive behavior | 1 | The phone and desktop versions expose different decision context. |
| States & feedback | 1 | Mutation failure restores the row, but requests disappear during submission and load alerts lack local retry. |
| Accessibility | 1 | Targets are sized, but removing the submitting row also removes its focused control. |
| Expressive restraint | 1 | Every request repeats a filled primary button. |

**Must fix**

- Desktop omits requested package days and sessions → captains make decisions with less context at larger widths → show the same package facts in desktop rows. `src/features/coach-page/components/workspace-join-card.tsx:24`, `src/features/coach-page/components/phone-join-card.tsx:25`
- Rows disappear before resolution completes → focus is lost and the list can look empty while a request is pending → keep the row visible and busy, then move focus after confirmed removal. `src/features/coach-page/components/join-requests-list.tsx:25`
- Request and invite-link load failures render alerts alone → recovery requires a page reload → add scoped retry controls beside each error. `src/features/coach-page/components/workspace-join-page.tsx:32`, `src/features/coach-page/components/workspace-join-page.tsx:37`

**Nice to have**

- Align the phone and desktop action labels with the acceptance-to-billing flow. `src/features/coach-page/components/phone-join-card.tsx:30`, `src/features/coach-page/components/join-requests-list.tsx:32`

## `/captain/*` — Phone shell for navigation, search, and quick add

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 1 | Inbox is behind More, and unmapped routes fall back to Home selection. |
| Information hierarchy | 1 | The fixed lime Quick Add competes with page-level primary actions. |
| Component semantics | 1 | More is a dialog trigger but can announce itself as the current page. |
| Token discipline | 1 | Uses named color roles, but the rotated Quick Add surface departs from the shared button shape. |
| Adaptive behavior | 2 | Bottom navigation and sheets switch to the sidebar, and content reserves safe-area clearance. |
| States & feedback | 1 | Quick Add silently expires if its destination action stays unavailable. |
| Accessibility | 1 | Targets are named and sized, but More’s current-page state and title truncation weaken orientation. |
| Expressive restraint | 1 | The oversized rotated action draws attention on every screen. |

**Must fix**

- More receives `aria-current="page"` and unmapped routes default to Home → users can hear or see the wrong current destination → reserve current-page state for destination links, and map notifications explicitly or leave the bar unselected. `src/features/roster/components/captain-phone-nav.tsx:41`, `src/features/roster/components/captain-frame-model.ts:43`
- Quick Add waits for an enabled button and silently expires → a tap can land on another page without completing the intended action → show a pending state and provide an explicit fallback when the action is unavailable. `src/features/roster/components/captain-frame-nav.tsx:57`, `src/features/roster/components/captain-frame-nav.tsx:75`

**Nice to have**

- Let page titles wrap when space permits and soften Quick Add when a page already has a primary action. `src/features/roster/components/captain-top-bar.tsx:42`, `src/features/roster/components/captain-phone-nav.tsx:36`

## `/captain/*` — Desktop shell for navigation, page actions, and account access

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 2 | Grouped sidebar, search, and page action slot establish the main workflow. |
| Information hierarchy | 2 | Account controls sit beneath operational destinations. |
| Component semantics | 1 | The workspace bell uses a button for route navigation. |
| Token discipline | 2 | Sidebar and top bar use named surfaces, borders, and text roles. |
| Adaptive behavior | 2 | A persistent sidebar and wrapping top bar serve the wider layout. |
| States & feedback | 1 | Failed counts expose unavailable text only to screen readers in sidebar rows. |
| Accessibility | 1 | Sidebar links expose current page, but the bell’s unread state is hidden from assistive technology. |
| Expressive restraint | 2 | The sidebar uses low-emphasis labels and a compact active marker. |

**Must fix**

- The workspace bell is a button that routes and hides its unread indicator from assistive technology → users lose native link affordances and cannot hear the unread state → use a named link to Notifications with localized unread status. `src/features/notifications/components/notification-bell.tsx:36`
- Failed sidebar counts disappear visually → a blank badge can be read as no work waiting → distinguish unavailable counts from zero for all users. `src/features/roster/components/captain-frame-nav.tsx:34`, `src/features/roster/components/captain-nav-groups.tsx:49`

**Nice to have**

- Give the desktop navigation landmark a label specific to Captain navigation. `src/features/roster/components/captain-nav-groups.tsx:34`

## Top 5 across this group

1. **`/captain/tasks`** — Restore phone video review. The current action updates detail state that only the desktop branch renders. `src/features/captain-workspace/queue/tasks-screen.tsx:81`, `src/features/captain-workspace/queue/tasks-screen.tsx:131`
2. **`/captain/players/[playerId]/nutrition`** — Keep rest-day selection from changing the autosaved draft. `src/features/meal-plans/components/editor/player-editor.tsx:62`, `src/features/meal-plans/components/editor/player-editor.tsx:98`
3. **`/captain/notifications`** — Let alerts open when mark-as-read fails, and expose unread state in text. `src/features/notifications/components/captain-notifications-entry.tsx:38`, `src/features/notifications/components/captain-notifications-entry.tsx:58`
4. **`/captain/players/new`** — Explain invalid payment fields and return Payment Edit directly to payment. `src/features/roster/components/invite-form.tsx:66`, `src/features/roster/components/invite-form.tsx:79`
5. **`/captain/join`** — Show package details on desktop and retain focus with a visible pending row during resolution. `src/features/coach-page/components/workspace-join-card.tsx:24`, `src/features/coach-page/components/join-requests-list.tsx:25`