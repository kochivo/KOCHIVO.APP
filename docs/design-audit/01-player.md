# Player app

Source review of all 14 locale-prefixed routes. “Workspace” refers to the variant behind `NEXT_PUBLIC_CAPTAIN_WORKSPACE`. Scores reflect the code. Rendered contrast, keyboard behavior, text scaling, and breakpoint behavior were not measured. No files were changed and no builds or tests were run.

## `/player` — See today’s plan and start the next task

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 2 | Today’s workout and rest paths have distinct content. |
| Information hierarchy | 2 | The workout hero leads, with readiness and nutrition supporting it. |
| Component semantics | 1 | Assessment actions lead to the assessment index. |
| Token discipline | 2 | Reviewed controls use shared buttons and semantic surfaces. |
| Adaptive behavior | 1 | Both variants cap the layout at `max-w-lg`. |
| States & feedback | 1 | Cached program failures show a stale notice without retry. |
| Accessibility | 1 | Day buttons have descriptive names and pressed state, but seven columns can yield targets under 48px. |
| Expressive restraint | 2 | The workout hero carries the main emphasis. |

**Must fix**

- Each assessment row offers “Answer” but opens the same index → players must find the assignment again → link each row to its request or offer one accurately named index link. `src/features/player-shell/components/player-assessments.tsx:83`
- Cached program errors show a stale-data notice without an action → players cannot refresh from that state → put the existing program retry beside the notice. `src/features/player-home/components/home-screen.tsx:135`
- Seven equal-width weekday buttons shrink with the page → narrow phones lose the 48px target width → enforce minimum widths and allow the strip to scroll. `src/features/player-home/components/week-strip.tsx:26`

**Nice to have**

- On wide screens, place the week and readiness alongside today’s plan.

## `/player/workout/[dayId]` — Run a workout and log sets

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 2 | The active exercise, set number, and completion action are explicit. |
| Information hierarchy | 1 | A media placeholder can precede the exercise title and logging controls. |
| Component semantics | 1 | Completed set rows use a checkmark for an edit action. |
| Token discipline | 1 | Focus surfaces use glass tokens alongside a literal `22px` radius. |
| Adaptive behavior | 1 | The gym flow has a compact layout and no wider supporting pane. |
| States & feedback | 1 | Loading and retry exist, but invalid typed numbers can silently revert. |
| Accessibility | 1 | Large steppers and rest announcements help. Silent number rejection leaves a gap. |
| Expressive restraint | 1 | A play glyph appears even when there is no playable media. |

**Must fix**

- The no-media fallback renders a play glyph in a static container → players can mistake it for a video control → omit it or show a clearly noninteractive media-unavailable state. `src/features/workout/components/workout-set.tsx:76`
- Invalid typed numbers revert on blur without feedback → a player can complete a set with the previous value → keep the invalid entry visible, explain how to correct it, and block completion until corrected or explicitly reverted. `src/features/workout/components/workout-value.tsx:34`
- Completed rows show the same checkmark used to complete a set, but activate editing → the available action is unclear → give completed rows a distinct edit affordance and keep completion status separate. `src/features/workout/components/set-rows-view.tsx:56`

**Nice to have**

- Keep the exercise name and target above optional media in focus mode.

## `/player/nutrition` — Review today’s plan and log meals

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 2 | The daily target, meals, and logging action are visible. |
| Information hierarchy | 1 | The next meal has a prominent CTA and a second control that does the same thing. |
| Component semantics | 1 | Workspace meal completion looks reversible as a checkbox, then becomes a static check. |
| Token discipline | 2 | Cards and controls use shared semantic colors and surfaces. |
| Adaptive behavior | 1 | Meals, hydration, and utilities stay in one compact column. |
| States & feedback | 1 | Save failures and stale plans have feedback, but undo is tucked inside details. |
| Accessibility | 1 | Several disclosures share the same accessible name. |
| Expressive restraint | 1 | The duplicate completion affordance competes with the primary CTA. |

**Must fix**

- Each Workspace meal disclosure overrides its visible meal name with the same “Details” name → screen-reader users cannot tell which meal they will open → include the meal name in the accessible label. `src/features/nutrition/components/meal-card.tsx:93`
- The row check control disappears after logging, while undo lives inside details → accidental logs are hard to correct → retain a named reversible control in the row and use a single completion control for the featured meal. `src/features/nutrition/components/meal-card.tsx:88`

**Nice to have**

- Bring the training/rest selector closer to the meals it changes. `src/features/nutrition/components/nutrition-screen.tsx:80`

## `/player/nutrition/shopping` — Shop from the weekly meal plan

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 2 | The Workspace variant identifies a weekly list grouped by aisle. |
| Information hierarchy | 2 | Quantities sit with items and the estimate is separate. |
| Component semantics | 2 | Native checkboxes, pressed filters, and a share link match their behavior. |
| Token discipline | 2 | The list uses shared glass, control, and state tokens. |
| Adaptive behavior | 1 | Aisle filters scroll, but the page stays single-column at wide sizes. |
| States & feedback | 1 | Retry and empty states exist, but checklist progress is lost on remount. |
| Accessibility | 2 | Checkbox rows have large targets, visible focus, and checked cues beyond color. |
| Expressive restraint | 2 | Aisle sections organize the list without carding each item. |

**Must fix**

- Workspace checkmarks live only in component state → shoppers lose their place after leaving and reopening the list → persist checked items for the active list and provide an explicit reset. `src/features/nutrition/components/shopping-week-list.tsx:14`

**Nice to have**

- Add a link back to Nutrition in the empty state. `src/features/nutrition/components/shopping-screen.tsx:37`

## `/player/progress` — Review trends and send a weekly check-in

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 2 | Trends, workout history, and check-in entry are identifiable. |
| Information hierarchy | 1 | Workspace repeats check-in entry and presents overlapping weight summaries. |
| Component semantics | 1 | Two check-in entry points enforce different eligibility rules. |
| Token discipline | 2 | Reviewed charts and stats use named tokens and shared controls. |
| Adaptive behavior | 1 | Panels stay in a narrow column, with measurement cards two-up even at compact widths. |
| States & feedback | 1 | Remote strength failures only reach the console. |
| Accessibility | 1 | Filters expose pressed state, but the two check-in controls communicate availability differently. |
| Expressive restraint | 1 | Repeated weight and check-in sections dilute the main hierarchy. |

**Must fix**

- The Workspace header log button ignores `sent`, while the footer blocks repeat check-ins → returning players get contradictory guidance → use one eligibility rule and one primary check-in entry. `src/features/progress/components/progress-screen.tsx:130`, `src/features/progress/components/progress-screen.tsx:171`
- Remote strength failures are only logged → a new-device user can mistake incomplete data for an empty history → preserve local data and show an inline partial-data notice with retry. `src/features/progress/components/progress-screen.tsx:74`

**Nice to have**

- Use a wider layout to place related trend and measurement summaries alongside each other.

## `/player/rank` — Inspect rank, points, and team standing

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 2 | Current rank and the next milestone lead the page. |
| Information hierarchy | 2 | The hero, team race, and point explanations have distinct roles. |
| Component semantics | 2 | Native disclosures contain secondary rank details. |
| Token discipline | 1 | The hero builds its engraved stripe pattern inline. |
| Adaptive behavior | 1 | Both variants use a narrow stack. |
| States & feedback | 1 | A subsidiary retry resets the whole page, and an empty points history gets a fixed pace estimate. |
| Accessibility | 2 | The leaderboard identifies the player in text in Workspace, and rank progress has a label. |
| Expressive restraint | 2 | The medal hero carries the strongest treatment. |

**Must fix**

- An empty points history supplies 24 points per week to the estimate → a new player sees a timeline unsupported by their activity → show that more history is needed before estimating. `src/features/ranks/data/load-weekly-points.ts:12`, `src/features/ranks/components/rank-hero.tsx:33`
- Hall of Fame retry resets all rank data to loading → players lose the rest of the page while one section retries → retry that section independently or keep loaded data visible during refresh. `src/features/ranks/components/rank-v6.tsx:46`, `src/features/ranks/hooks/use-rank-data.ts:28`

**Nice to have**

- Pair the rank hero and team race at wider widths.

## `/player/history` — Browse past workouts and exercise performance

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 1 | Workspace puts the Workouts/Exercises selector below the results it changes. |
| Information hierarchy | 1 | Calendar and session history lead, with the view selector at the end. |
| Component semantics | 2 | View selectors expose pressed state and exercise selection uses a native select. |
| Token discipline | 1 | Calendar variants mix semantic surfaces with literal radii. |
| Adaptive behavior | 1 | Calendar and sessions share one narrow column. |
| States & feedback | 1 | A failed read can show both retry and a no-history prompt. |
| Accessibility | 1 | Calendar controls are named, but day states depend on fill, border, and ring treatments. |
| Expressive restraint | 2 | Calendar and session list serve distinct purposes. |

**Must fix**

- Workspace renders view controls after the session list → players must scroll through results before discovering exercise history → put the selector above the controlled content. `src/features/workout/components/history-screen.tsx:74`
- A load error and empty-history prompt can render together → players may interpret a failed fetch as having no workouts → show the empty state only after a successful empty read. `src/features/workout/components/history-screen.tsx:52`

**Nice to have**

- Use distinct day markers and match the Today legend to the Workspace ring. `src/features/workout/components/history-calendar.tsx:64`

## `/player/assessments` — Find due assessments and prior responses

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 2 | Due work and past responses have separate sections. |
| Information hierarchy | 1 | Workspace gives the first request two adjacent entry points. |
| Component semantics | 1 | The featured card and Record link open the same form. |
| Token discipline | 1 | Legacy cards use literal radii; Workspace uses shared surfaces. |
| Adaptive behavior | 1 | The page remains a narrow list at wide sizes. |
| States & feedback | 2 | Loading, retry, due-empty, and history-empty states are present. |
| Accessibility | 1 | Workspace due items use `h3` without a preceding section heading, and duplicate links add a tab stop. |
| Expressive restraint | 1 | The highlighted card and filled action repeat the same emphasis. |

**Must fix**

- The first Workspace request is both a linked card and a Record link → keyboard users encounter two stops for one destination → keep one named action and provide a visible Due heading above the list. `src/features/player-shell/components/player-assessments-workspace.tsx:36`

**Nice to have**

- Surface the next due date as the main value and the number of requests due that day as supporting text. `src/features/player-shell/components/player-assessments-workspace.tsx:33`

## `/player/forms/[requestId]` — Complete and submit a requested assessment

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 1 | A required multi-select can behave as though the first option is mandatory. |
| Information hierarchy | 2 | The form title, progress, question, and navigation are distinct. |
| Component semantics | 0 | Native validation on the first checkbox can misrepresent the selection requirement. |
| Token discipline | 2 | The reviewed player form uses named colors and shared buttons. |
| Adaptive behavior | 1 | The flow has a readable width cap and a single layout. |
| States & feedback | 1 | Draft, upload, offline, and success states exist, but a validation error relabels Next as Retry. |
| Accessibility | 1 | Fields are named, but step changes have no explicit focus handoff. |
| Expressive restraint | 2 | The interface concentrates on one question at a time. |

**Must fix**

- A required multi-select initially places HTML `required` on its first checkbox → submitting with no selection can tell players to check that specific answer → validate the group and associate a localized “Select at least one” message with it. `src/features/forms/components/question-field.tsx:38`
- Changing steps replaces the question without moving focus or announcing the new prompt → keyboard and screen-reader users can lose their place → focus the new question heading or legend on advance and back. `src/features/forms/components/answer-flow.tsx:63`, `src/features/forms/components/answer-flow.tsx:119`

**Nice to have**

- Keep Next or Finish after validation errors and reserve Retry for a failed request. `src/features/forms/components/answer-flow.tsx:122`

## `/player/captain` — Contact the coach and read replies

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 2 | Workspace gives the conversation and composer a clear home. |
| Information hierarchy | 2 | Coach identity, thread, and composer are distinct. |
| Component semantics | 1 | Quick replies send immediately without distinct send wording or a pending guard. |
| Token discipline | 2 | Reviewed actions use shared buttons and semantic colors. |
| Adaptive behavior | 1 | The thread scrolls independently, but remains capped at phone width. |
| States & feedback | 1 | Individual messages track sending and failure, but quick replies stay active during sends. |
| Accessibility | 1 | Header actions are named, but quick-reply labels omit the immediate send action. |
| Expressive restraint | 2 | The thread and composer dominate. |

**Must fix**

- Workspace quick replies send on tap and allow repeated activation → a player can send before reviewing or send duplicates → place the reply in the composer for review, or label it as a send action and disable repeat activation while pending. `src/features/player-shell/components/captain-quick-replies.tsx:8`, `src/features/chat/hooks/use-chat-thread.ts:152`

**Nice to have**

- Match the profile shortcut icon to the destination’s broader profile content. `src/features/player-shell/components/captain-heading.tsx:35`

## `/player/captain/profile` — View coach details and subscription access

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 2 | Identity, access dates, contact, and renewal are identifiable. |
| Information hierarchy | 2 | Identity and subscription have separate sections. |
| Component semantics | 1 | Missing WhatsApp is presented as a disabled action with no route to in-app contact. |
| Token discipline | 1 | Workspace uses `glass-strong` for subscription figures; legacy cards use a literal radius. |
| Adaptive behavior | 1 | Social links wrap, but both variants retain one narrow column. |
| States & feedback | 1 | Coach data has loading, empty, and retry states. The Workspace plan lookup has no local recovery. |
| Accessibility | 2 | Back is named, social links have text, and days remaining has a spoken equivalent. |
| Expressive restraint | 2 | The subscription figure is the main expressive element. |

**Must fix**

- Missing WhatsApp yields a disabled button even when the Workspace conversation is available → players hit a dead end in the contact area → show the availability as text and link to the in-app conversation when available. `src/features/player-shell/components/captain-profile-card.tsx:90`

**Nice to have**

- On wide screens, place coach identity and subscription details side by side.

## `/player/settings` — Manage account details, preferences, and privacy

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 1 | Workspace surfaces common preferences, but appearance also lives under More. |
| Information hierarchy | 1 | More combines installation, appearance, stats, budget, cycle settings, and KO. |
| Component semantics | 1 | Appearance has two entry points for theme controls. |
| Token discipline | 2 | Reviewed controls use semantic colors and shared surfaces. |
| Adaptive behavior | 1 | The legacy container grows wider, while Workspace retains the narrow stack. |
| States & feedback | 2 | Profile loading has retry, and preference writes handle pending and failure. |
| Accessibility | 1 | Selection is exposed, but language and unit groups sit in rows with no wrapping rule. |
| Expressive restraint | 1 | The KO placeholder and stats compete with account controls inside More. |

**Must fix**

- Workspace renders `PlayerTheme` in Preferences and `ThemeSwitch` under More → players have two places to change appearance → expose one theme control in the preference group. `src/features/settings/components/player-preferences.tsx:54`, `src/features/settings/components/settings-screen.tsx:93`
- Language and units share unwrapped rows with their option groups → scaled labels have no structural way to reflow → stack labels and controls at narrow widths and let options wrap. `src/features/settings/components/player-preferences.tsx:48`, `src/features/settings/components/player-preferences.tsx:56`

**Nice to have**

- Give installation and display options a named group so they can be found without opening a catch-all section.

## `/player/onboarding` — Send the coach an intake profile

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 1 | Next can be disabled before the wizard explains what is missing. |
| Information hierarchy | 2 | Step title, progress, fields, and footer have clear roles. |
| Component semantics | 1 | Exclusive choices use independent pressed chips. |
| Token discipline | 2 | The wizard uses shared inputs, controls, and glass surfaces. |
| Adaptive behavior | 1 | The footer accounts for the bottom inset; the wizard stays single-column. |
| States & feedback | 1 | Offline and save errors are shown, but storage failure is silent and defaults can be submitted untouched. |
| Accessibility | 1 | Heading focus is managed; untouched invalid fields have no equivalent discovery path. |
| Expressive restraint | 2 | Motion is limited within the steps and respects reduced motion there. |

**Must fix**

- The draft starts with a birth year, height, and weight and submits those fields → players can send sample measurements as their own → require explicit entry or confirmation before saving them. `src/features/onboarding/hooks/use-intake-draft.ts:9`, `src/features/onboarding/wizard.ts:56`
- Next is disabled while errors are displayed only for touched fields → players can reach a dead end without learning what is missing → provide persistent requirements or let Next reveal errors and focus the first incomplete field. `src/features/onboarding/components/intake-wizard.tsx:51`, `src/features/onboarding/components/intake-wizard.tsx:133`

**Nice to have**

- Use radio semantics for sex, workout length, and experience while keeping the current visual treatment.

## `/ko` — Ask KO questions using text, voice, or a meal photo

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 2 | Greeting, suggested prompts, and composer explain how to start. |
| Information hierarchy | 1 | The transcript is capped below a composer and suggestions that remain outside it. |
| Component semantics | 1 | Text can be entered after recording a clip, but submit omits it. |
| Token discipline | 1 | Semantic colors are present, with bespoke pill sizing and hero typography. |
| Adaptive behavior | 1 | The transcript uses the same `max-h-60` cap across window sizes. |
| States & feedback | 2 | Pending, error, attachment-ready, and retry-by-resubmit paths are present. |
| Accessibility | 1 | The transcript is a named log and icon actions are labeled, but the composer puts several controls in one unwrapped row. |
| Expressive restraint | 2 | Animation is limited to working feedback and respects reduced motion. |

**Must fix**

- After a clip is recorded, the composer replaces the text field, and submission prioritizes audio over text → a clip and prompt cannot reliably be sent together → make voice-only mode explicit and prevent mixed drafts, or support and preview both inputs. `src/features/ko-preview/components/ko-chat.tsx:91`, `src/features/ko-preview/components/ko-chat.tsx:166`

**Nice to have**

- Let the transcript grow with available viewport height and let attachment actions reflow independently of the text field. `src/features/ko-preview/components/ko-chat.tsx:132`, `src/features/ko-preview/components/ko-chat.tsx:166`

## Top 5 across this group

1. **`/player/onboarding`** — Require explicit confirmation of body measurements and birth year before the coach receives them. `src/features/onboarding/hooks/use-intake-draft.ts:9`
2. **`/player/workout/[dayId]`** — Prevent silent numeric reversion from producing incorrect set logs. `src/features/workout/components/workout-value.tsx:34`
3. **`/player/forms/[requestId]`** — Validate required multi-selects as a group so players are never directed toward an arbitrary answer. `src/features/forms/components/question-field.tsx:38`
4. **`/player/captain`** — Make quick-reply sending explicit and prevent accidental duplicates. `src/features/player-shell/components/captain-quick-replies.tsx:8`
5. **`/player/nutrition`** — Give each meal disclosure a unique accessible name and expose undo where players log the meal. `src/features/nutrition/components/meal-card.tsx:88`