# Captain tools

Code-only review of 14 screens, including workspace and legacy branches where the route switches between them. Scores reflect what the source establishes. Rendered contrast, text scaling, and keyboard behavior remain unverified.

## `/captain/library/exercises` — Find exercises and add them to programs

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 2 | Search, filters, and New Exercise are easy to identify in the screen structure. |
| Information hierarchy | 2 | Filters precede results. Cards show the exercise name and key attributes. |
| Component semantics | 1 | Filters expose pressed state, but the no-media placeholder uses a play icon on phones. |
| Token discipline | 2 | Surfaces, text roles, and controls use KOCHIVO tokens. |
| Adaptive behavior | 2 | Compact rows become a multi-column gallery. |
| States & feedback | 2 | Results have loading, empty, and retry states. Pagination is gated. |
| Accessibility | 1 | Search and icon actions are named. Equipment filters fall below the target size. |
| Expressive restraint | 2 | Media and compact ownership labels support scanning. |

**Must fix**

- Equipment and ownership chips use a 2.375rem height → dense filters are harder to tap → give each chip a 48px minimum hit area. `exercise-library.tsx:87`, `chip.tsx:14`, `globals.css:150`
- Missing media shows a play icon on phones → users can expect playback where none exists → use a neutral placeholder. `exercise-card.tsx:47`

**Nice to have**

- Add Clear filters beside the filtered empty message. `exercise-library.tsx:101`

## `/captain/library/exercises/new` — Create a custom exercise

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 2 | New Exercise, privacy information, and Save establish the task. |
| Information hierarchy | 2 | Identity and prescription fields lead. Preview is secondary. |
| Component semantics | 1 | The duplicate check opens a dialog through a self-link. |
| Token discipline | 2 | Form surfaces and input colors use brand roles. |
| Adaptive behavior | 2 | The preview stacks on phones and sits beside the form on wider screens. |
| States & feedback | 1 | Load retry, validation, and save feedback exist. Duplicate lookup and base form loading share a dependency. |
| Accessibility | 1 | Inputs have labels and associated errors. Dense choice chips are undersized. |
| Expressive restraint | 2 | Preview supports the task, with one emphasized Save action. |

**Must fix**

- Similar Exercise is a hash link that opens a dialog → link actions such as opening in a new tab cannot inspect the match → use a button with dialog semantics. `exercise-form.tsx:118`
- A failed name-catalog scan blocks the entire form → a duplicate-check failure prevents creation → load the form independently and give the lookup its own retry. `editor-actions.ts:64`, `exercise-form.tsx:54`
- Muscle and equipment choices inherit the 38px chip height at the default root size → touch users can miss adjacent options → enlarge the hit areas to 48px. `exercise-form.tsx:124`, `exercise-form.tsx:140`, `chip.tsx:14`

**Nice to have**

- Mark the required name visibly alongside the optional English name. `exercise-form.tsx:114`

## `/captain/library/exercises/[exerciseId]/edit` — Update an owned exercise

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 2 | Edit heading, prefilled fields, and Save identify the task. |
| Information hierarchy | 2 | Exercise details lead, with preview alongside on wide screens. |
| Component semantics | 1 | Similar Exercise uses link markup for a dialog action. |
| Token discipline | 2 | Inputs, sections, and feedback use brand roles. |
| Adaptive behavior | 2 | The secondary preview becomes a sticky pane at wider widths. |
| States & feedback | 1 | Save feedback is present. Missing and archived rows lead to retry-only recovery. |
| Accessibility | 1 | Field-level errors are associated. Choice chips fall below 48px. |
| Expressive restraint | 2 | Status and preview support editing without competing with Save. |

**Must fix**

- An unavailable exercise only offers Retry → captains on stale links have no direct way back from the error panel → distinguish unavailable rows from transient failures and link to the library. `editor-actions.ts:60`, `exercise-form.tsx:54`
- Shared form controls retain undersized choices and a dialog-opening self-link → touch selection and link behavior remain inconsistent → use 48px choices and a button for the duplicate detail. `exercise-form.tsx:118`, `exercise-form.tsx:124`, `chip.tsx:14`

**Nice to have**

- Give the error panel the destination-aware cancel path already used by the loaded form. `exercise-form.tsx:54`, `exercise-form.tsx:69`

## `/captain/library/foods` — Browse foods, favorites, and recipe tools

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 2 | Search, food filters, and New Food are identifiable. |
| Information hierarchy | 2 | Search and filters precede comparable nutrition results. |
| Component semantics | 1 | Favoriting exposes pressed state, but repeated row actions have generic names. |
| Token discipline | 2 | Table, cards, and filter selections use brand roles. |
| Adaptive behavior | 2 | Compact rows and desktop tables preserve labeled nutrition values. |
| States & feedback | 1 | Load retry and empty copy exist. Favorite requests have no visible pending state. |
| Accessibility | 1 | Row actions have names, but names lack food context and filter chips are undersized. |
| Expressive restraint | 2 | Most row actions sit behind a disclosure. |

**Must fix**

- Repeated Actions, Add, Details, and Favorite controls omit the food name → users navigating by controls can lose row context → include the localized food name in each accessible label. `food-results.tsx:52`, `food-results.tsx:54`, `food-results.tsx:59`
- Filter chips use the shared 38px height at the default root size → crowded filters are harder to tap → apply a 48px minimum hit area. `library-workspace.tsx:102`, `chip.tsx:14`

**Nice to have**

- Expose the per-food pending state while a favorite change is saving. `library-workspace.tsx:61`

## `/captain/library/foods/new` — Create a food or start from a catalog copy

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 1 | Blank creation is clear. The copy path is titled Edit Food. |
| Information hierarchy | 2 | Identity, per-100g nutrition, and units are grouped. |
| Component semantics | 1 | Copy creation uses edit language even though it inserts a new row. |
| Token discipline | 2 | Fields, surfaces, and nutrition feedback use existing roles. |
| Adaptive behavior | 2 | The form stacks on phones and gets a supporting preview on wider screens. |
| States & feedback | 1 | Busy, success, and errors exist. Schema failures lose field detail. |
| Accessibility | 1 | Inputs are labeled, but schema errors are only announced at form level. |
| Expressive restraint | 2 | Nutrition feedback and preview are tied to the current input. |

**Must fix**

- The copy path says Edit Food but creates a custom copy → captains can misunderstand what Save will change → use explicit copy wording in the heading and save action. `food-form.tsx:57`, `food-form.tsx:71`, `food-form.tsx:86`
- Schema failure collapses into one generic alert → captains have to hunt for the invalid value or unit → preserve field issues, associate each error with its input, and focus the first invalid field. `food-form.tsx:64`, `food-form.tsx:90`

**Nice to have**

- Offer Start blank when a catalog item cannot seed the copy. `food-form-entry.tsx:22`

## `/captain/library/foods/[foodId]/edit` — Update an owned food

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 2 | Edit Food and prefilled values establish what will change. |
| Information hierarchy | 2 | Identity, nutrition, and servings have distinct sections. |
| Component semantics | 2 | Labeled fields, photo picker, and Save fit the edit task. |
| Token discipline | 2 | The form uses the shared surface and action roles. |
| Adaptive behavior | 2 | The preview becomes a separate pane on wider windows. |
| States & feedback | 1 | Load errors offer Retry and Cancel. Schema errors omit actionable field detail. |
| Accessibility | 1 | Inputs are named. Schema errors are unassociated and repeated Remove Unit labels lack context. |
| Expressive restraint | 2 | Save carries primary emphasis. |

**Must fix**

- Schema failures appear in a generic alert above the form → users can miss which edited value needs correction → associate errors with the affected fields and focus the first invalid field. `food-form.tsx:64`, `food-form.tsx:90`

**Nice to have**

- Include the serving name in each Remove Unit label. `food-units-editor.tsx:33`

## `/captain/library/forms` — Create forms and review their activity

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 2 | New Form and existing form cards separate creation from editing. |
| Information hierarchy | 2 | Title and status precede schedule, recipients, and response counts. |
| Component semantics | 1 | Template links need a second step when opened through standard alternate link actions. |
| Token discipline | 2 | Form cards, status treatments, and controls use existing roles. |
| Adaptive behavior | 2 | Form cards and the chooser reflow into wider grids. |
| States & feedback | 1 | Library loading and empty states exist. Retry drops the requested form or draft context. |
| Accessibility | 1 | The chooser has named controls. Response counts lack explicit answered and sent labels. |
| Expressive restraint | 2 | Status labels and counts serve scanning. |

**Must fix**

- Library Retry links to the base URL and drops `edit`, `template`, and `draft` → a transient failure can take captains away from the task they were opening → retry the same URL and offer Return to library separately. `forms-library-page.tsx:34`
- Template links append a draft ID only on unmodified activation → opening a template in a new tab lands on an intermediate page → make the link destination resolve the intended draft flow consistently. `template-link-entry.tsx:10`, `forms-library-page.tsx:57`

**Nice to have**

- Give the response ratio an accessible label that names both counts. `v11-library-list.tsx:31`

## `/captain/library/meal-plans` — Browse, create, and assign meal templates

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 2 | Search, filters, creation, and assignment have defined entry points. |
| Information hierarchy | 2 | Plan title leads, followed by calories, macros, and usage. |
| Component semantics | 2 | Cards link to editors. Assignment and creation use buttons. |
| Token discipline | 1 | Card nutrition figures omit the stronger surface specified for big numbers. |
| Adaptive behavior | 2 | Cards reflow, and the phone menu preserves the desktop assignment action. |
| States & feedback | 2 | Library errors have retry. Filtered emptiness is distinguished from an empty library. |
| Accessibility | 1 | Nutrition is available as text. The phone card removes plan-type text entirely. |
| Expressive restraint | 2 | Macro graphics support the numerical breakdown. |

**Must fix**

- Plan type is hidden on phones → captains lose the card’s plan-type cue when choosing among templates → retain the type as compact text on phones. `refined-meal-card.tsx:30`
- Desktop calorie figures sit on the base glass card → the nutrition figure lacks the stronger surface prescribed for big numbers → apply `glass-strong` to the calorie block. `refined-meal-card.tsx:24`, `refined-meal-card.tsx:33`

**Nice to have**

- Remove the grid’s second creation control if the persistent header action covers the same task. `meal-library-grid.tsx:20`, `v11-new-plan.tsx:63`

## `/captain/templates` — Browse, copy, and assign reusable programs

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 1 | Main library tasks are clear. Opening a starter program has an implicit copy effect. |
| Information hierarchy | 2 | Workspace search and creation lead. Generator tools are disclosed separately. |
| Component semantics | 1 | The workspace starter Open action creates a copy. |
| Token discipline | 2 | Buttons, cards, and feedback use shared roles. |
| Adaptive behavior | 2 | Search and layout respond to available width. |
| States & feedback | 2 | Loading, retry, pending, rollback, and copy success are implemented. |
| Accessibility | 1 | Search is named but removes its outline without a wrapper focus treatment. |
| Expressive restraint | 2 | Secondary tools stay collapsed. |

**Must fix**

- Opening a starter program immediately duplicates it → browsing can create an unwanted template → label the action Copy and edit, and keep preview read-only. `templates-screen.tsx:113`, `templates-screen.tsx:156`
- Workspace search suppresses its outline and the wrapper has no `focus-within` style → keyboard users can lose their place → preserve the input ring or show it on the wrapper. `library-view.tsx:41`

**Nice to have**

- Replace the browser prompt with a labeled name form that retains input on failure. `templates-screen.tsx:54`

## `/captain/programs/[programId]` — Build and send a training program

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 2 | Day selection, exercises, and sending are identifiable. |
| Information hierarchy | 2 | Day navigation supports the editor, with history disclosed below. |
| Component semantics | 1 | Workspace save retry can replace the program the captain was trying to open. |
| Token discipline | 2 | Focus panels, status, and actions use existing roles. |
| Adaptive behavior | 2 | Day controls and editing content get dedicated regions on wider screens. |
| States & feedback | 1 | Autosave and send have feedback. One program-load retry changes the destination. |
| Accessibility | 1 | Save status is announced, but ordinary save state is visually hidden on phones. |
| Expressive restraint | 2 | Emphasis follows the day being edited and the send action. |

**Must fix**

- When workspace player-program data fails, Retry links to the player’s general Programs route → recovery can open a different program from the one requested → preserve the current program ID and retry its route. `training-content.tsx:26`
- The phone day header visually hides both saving and saved states → sighted captains lose confirmation while editing → retain a compact visible save status alongside the live announcement. `editor-header.tsx:43`

**Nice to have**

- After send validation fails, link each actionable error to the affected day or exercise. `training-editor.tsx:106`

## `/captain/nutrition/[planId]` — Edit meals, nutrition targets, and activation

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 2 | Save and Activate are distinct, with a first-meal action when empty. |
| Information hierarchy | 2 | Meals lead, with targets and totals in a supporting panel. |
| Component semantics | 1 | The template back link always targets the general Templates route. |
| Token discipline | 2 | Inputs, warning text, and totals use semantic roles and surfaces. |
| Adaptive behavior | 2 | Targets stack on compact screens and sit alongside meals on wide screens. |
| States & feedback | 1 | Explicit saves report progress and failure. Unmount persistence has no visible recovery path. |
| Accessibility | 1 | Controls have names and totals are live. Unsaved changes have no live announcement. |
| Expressive restraint | 2 | Activation is clearly emphasized and the totals panel has a distinct role. |

**Must fix**

- A dirty draft can be saved during unmount, after the visible error UI is gone → failed persistence during in-app navigation can lose edits without feedback → guard navigation or finish saving before leaving, with a recoverable failure state. `use-plan-draft.ts:45`, `use-plan-draft.ts:83`, `use-plan-draft.ts:92`
- The editor opened from Meal Plans Library sends template users back to Templates → captains lose their browsing context → route back to the meal library or preserve the originating destination. `refined-meal-card.tsx:28`, `plan-builder.tsx:25`

**Nice to have**

- Announce the transition to unsaved changes once with a polite status. `plan-builder.tsx:37`

## `/captain/billing` — Review dues, payments, receipts, and renewals

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 1 | The workspace phone layout hides the Record payment action under Details. |
| Information hierarchy | 1 | On phones, the attention queue is visually moved below the payment list. |
| Component semantics | 2 | Disclosures, filters, and payment dialogs match their operations. |
| Token discipline | 2 | Billing surfaces and payment statuses use existing roles. |
| Adaptive behavior | 1 | Phone rows replace the desktop table, but core actions become harder to find. |
| States & feedback | 2 | Load retry, empty states, renewal failure, and success feedback are implemented. |
| Accessibility | 1 | Controls are named. Phone visual order differs from keyboard and reading order. |
| Expressive restraint | 2 | Alerts and counts reflect work the captain can act on. |

**Must fix**

- Record payment and player search sit inside a collapsed Details block below phone results → the main payment task can be missed → place Record payment in the phone header and search above the list. `workspace-billing-phone-payments.tsx:27`, `workspace-billing-phone-payments.tsx:32`
- The attention queue precedes payments in markup but uses `max-md:order-last` → phone keyboard focus can visit controls out of visual order → make reading and visual order agree. `workspace-billing.tsx:76`, `workspace-billing.tsx:102`

**Nice to have**

- Differentiate the empty-player state from filtered no matches in the phone list. `workspace-billing-phone-payments.tsx:27`, `workspace-billing.tsx:110`

## `/captain/billing/packages` — Manage package tiers, durations, and offers

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 1 | New Package opens tier creation, while adding a package duration sits in tier options. |
| Information hierarchy | 2 | Tiers lead, with offers and archived items grouped below. |
| Component semantics | 1 | The primary button’s label describes a different entity from the form it opens. |
| Token discipline | 1 | Large package prices use the base tier-card surface. |
| Adaptive behavior | 2 | Tier cards shift from a stack to a responsive grid. |
| States & feedback | 2 | Loading, retry, empty, busy, and archive confirmation are represented. |
| Accessibility | 1 | Main actions are named, but the primary action’s accessible name repeats the misleading label. |
| Expressive restraint | 2 | The featured tier receives distinct emphasis. |

**Must fix**

- New Package opens a tier sheet → captains looking to add a priced duration enter the wrong form → rename the action New Tier or route it into a package-duration flow with tier selection. `workspace-catalog.tsx:68`, `workspace-catalog.tsx:93`
- Large price text sits on the regular tier surface → price emphasis lacks the specified stronger surface → apply `glass-strong` to the price region. `workspace-tier-card.tsx:18`, `workspace-tier-card.tsx:30`

**Nice to have**

- Put Add duration directly in the empty duration state for a newly created tier. `workspace-tier-card.tsx:27`, `workspace-tier-card.tsx:35`

## `/captain/settings` — Manage profile, preferences, subscription, and security

| Category | Score 0-2 | Why |
|---|---:|---|
| Task clarity | 2 | Named sections separate preferences, account, and security tasks. |
| Information hierarchy | 2 | Phone overview and desktop section headings establish context. |
| Component semantics | 2 | Section navigation uses links and identifies the current destination. |
| Token discipline | 2 | Navigation, panels, and controls use shared roles. |
| Adaptive behavior | 2 | Phones use overview-to-detail navigation. Desktop keeps a section rail. |
| States & feedback | 1 | Initial load and retry exist. A resource error is hidden when cached profile data exists. |
| Accessibility | 1 | Links expose current state. Phone drill-in removes the prior menu without explicit heading focus. |
| Expressive restraint | 2 | Settings use section grouping and modest selection emphasis. |

**Must fix**

- Phone drill-in unmounts the menu and renders a focusable heading without moving focus to it → keyboard and screen-reader users can lose their place → focus the section heading on entry and restore the activating row on Back. `captain-settings.tsx:59`, `captain-settings.tsx:65`, `section-heading.tsx:23`
- A profile error is only shown when no profile data exists → captains can keep seeing stale settings with no retry cue → preserve the displayed data and show a scoped refresh error with Retry. `captain-settings.tsx:50`, `captain-settings.tsx:56`

**Nice to have**

- Give the legacy captain view section navigation so payment and security tasks are easier to locate in the long page. `settings-screen.tsx:96`, `settings-screen.tsx:113`

## Top 5 across this group

1. **`/captain/nutrition/[planId]`** — Protect dirty drafts during in-app navigation and keep save failures recoverable. `use-plan-draft.ts:83`, `use-plan-draft.ts:92`
2. **`/captain/billing`** — Expose Record payment and player search above phone results. `workspace-billing-phone-payments.tsx:27`, `workspace-billing-phone-payments.tsx:32`
3. **`/captain/billing/packages`** — Align New Package with the entity the form actually creates. `workspace-catalog.tsx:68`, `workspace-catalog.tsx:93`
4. **`/captain/templates`** — Make copying a starter explicit before creating a template. `templates-screen.tsx:113`, `templates-screen.tsx:156`
5. **`/captain/library/exercises`, `/captain/library/exercises/new`, `/captain/library/exercises/[exerciseId]/edit`, `/captain/library/foods`** — Fix the shared chip hit area so filters and form choices meet the 48px target. `chip.tsx:14`, `globals.css:150`