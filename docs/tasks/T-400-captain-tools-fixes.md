# T-400: Captain library, templates, program and nutrition editors, billing, packages, settings fixes

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
- `docs/design-audit/03-captain-tools.md`: the full scores and reasons for these screens.

## Fix list
### `/captain/library/exercises` — Find exercises and add them to programs
- Equipment and ownership chips use a 2.375rem height → dense filters are harder to tap → give each chip a 48px minimum hit area. `exercise-library.tsx:87`, `chip.tsx:14`, `globals.css:150`
- Missing media shows a play icon on phones → users can expect playback where none exists → use a neutral placeholder. `exercise-card.tsx:47`

### `/captain/library/exercises/new` — Create a custom exercise
- Similar Exercise is a hash link that opens a dialog → link actions such as opening in a new tab cannot inspect the match → use a button with dialog semantics. `exercise-form.tsx:118`
- A failed name-catalog scan blocks the entire form → a duplicate-check failure prevents creation → load the form independently and give the lookup its own retry. `editor-actions.ts:64`, `exercise-form.tsx:54`
- Muscle and equipment choices inherit the 38px chip height at the default root size → touch users can miss adjacent options → enlarge the hit areas to 48px. `exercise-form.tsx:124`, `exercise-form.tsx:140`, `chip.tsx:14`

### `/captain/library/exercises/[exerciseId]/edit` — Update an owned exercise
- An unavailable exercise only offers Retry → captains on stale links have no direct way back from the error panel → distinguish unavailable rows from transient failures and link to the library. `editor-actions.ts:60`, `exercise-form.tsx:54`
- Shared form controls retain undersized choices and a dialog-opening self-link → touch selection and link behavior remain inconsistent → use 48px choices and a button for the duplicate detail. `exercise-form.tsx:118`, `exercise-form.tsx:124`, `chip.tsx:14`

### `/captain/library/foods` — Browse foods, favorites, and recipe tools
- Repeated Actions, Add, Details, and Favorite controls omit the food name → users navigating by controls can lose row context → include the localized food name in each accessible label. `food-results.tsx:52`, `food-results.tsx:54`, `food-results.tsx:59`
- Filter chips use the shared 38px height at the default root size → crowded filters are harder to tap → apply a 48px minimum hit area. `library-workspace.tsx:102`, `chip.tsx:14`

### `/captain/library/foods/new` — Create a food or start from a catalog copy
- The copy path says Edit Food but creates a custom copy → captains can misunderstand what Save will change → use explicit copy wording in the heading and save action. `food-form.tsx:57`, `food-form.tsx:71`, `food-form.tsx:86`
- Schema failure collapses into one generic alert → captains have to hunt for the invalid value or unit → preserve field issues, associate each error with its input, and focus the first invalid field. `food-form.tsx:64`, `food-form.tsx:90`

### `/captain/library/foods/[foodId]/edit` — Update an owned food
- Schema failures appear in a generic alert above the form → users can miss which edited value needs correction → associate errors with the affected fields and focus the first invalid field. `food-form.tsx:64`, `food-form.tsx:90`

### `/captain/library/forms` — Create forms and review their activity
- Library Retry links to the base URL and drops `edit`, `template`, and `draft` → a transient failure can take captains away from the task they were opening → retry the same URL and offer Return to library separately. `forms-library-page.tsx:34`
- Template links append a draft ID only on unmodified activation → opening a template in a new tab lands on an intermediate page → make the link destination resolve the intended draft flow consistently. `template-link-entry.tsx:10`, `forms-library-page.tsx:57`

### `/captain/library/meal-plans` — Browse, create, and assign meal templates
- Plan type is hidden on phones → captains lose the card’s plan-type cue when choosing among templates → retain the type as compact text on phones. `refined-meal-card.tsx:30`
- Desktop calorie figures sit on the base glass card → the nutrition figure lacks the stronger surface prescribed for big numbers → apply `glass-strong` to the calorie block. `refined-meal-card.tsx:24`, `refined-meal-card.tsx:33`

### `/captain/templates` — Browse, copy, and assign reusable programs
- Opening a starter program immediately duplicates it → browsing can create an unwanted template → label the action Copy and edit, and keep preview read-only. `templates-screen.tsx:113`, `templates-screen.tsx:156`
- Workspace search suppresses its outline and the wrapper has no `focus-within` style → keyboard users can lose their place → preserve the input ring or show it on the wrapper. `library-view.tsx:41`

### `/captain/programs/[programId]` — Build and send a training program
- When workspace player-program data fails, Retry links to the player’s general Programs route → recovery can open a different program from the one requested → preserve the current program ID and retry its route. `training-content.tsx:26`
- The phone day header visually hides both saving and saved states → sighted captains lose confirmation while editing → retain a compact visible save status alongside the live announcement. `editor-header.tsx:43`

### `/captain/nutrition/[planId]` — Edit meals, nutrition targets, and activation
- A dirty draft can be saved during unmount, after the visible error UI is gone → failed persistence during in-app navigation can lose edits without feedback → guard navigation or finish saving before leaving, with a recoverable failure state. `use-plan-draft.ts:45`, `use-plan-draft.ts:83`, `use-plan-draft.ts:92`
- The editor opened from Meal Plans Library sends template users back to Templates → captains lose their browsing context → route back to the meal library or preserve the originating destination. `refined-meal-card.tsx:28`, `plan-builder.tsx:25`

### `/captain/billing` — Review dues, payments, receipts, and renewals
- Record payment and player search sit inside a collapsed Details block below phone results → the main payment task can be missed → place Record payment in the phone header and search above the list. `workspace-billing-phone-payments.tsx:27`, `workspace-billing-phone-payments.tsx:32`
- The attention queue precedes payments in markup but uses `max-md:order-last` → phone keyboard focus can visit controls out of visual order → make reading and visual order agree. `workspace-billing.tsx:76`, `workspace-billing.tsx:102`

### `/captain/billing/packages` — Manage package tiers, durations, and offers
- New Package opens a tier sheet → captains looking to add a priced duration enter the wrong form → rename the action New Tier or route it into a package-duration flow with tier selection. `workspace-catalog.tsx:68`, `workspace-catalog.tsx:93`
- Large price text sits on the regular tier surface → price emphasis lacks the specified stronger surface → apply `glass-strong` to the price region. `workspace-tier-card.tsx:18`, `workspace-tier-card.tsx:30`

### `/captain/settings` — Manage profile, preferences, subscription, and security
- Phone drill-in unmounts the menu and renders a focusable heading without moving focus to it → keyboard and screen-reader users can lose their place → focus the section heading on entry and restore the activating row on Back. `captain-settings.tsx:59`, `captain-settings.tsx:65`, `section-heading.tsx:23`
- A profile error is only shown when no profile data exists → captains can keep seeing stale settings with no retry cue → preserve the displayed data and show a scoped refresh error with Retry. `captain-settings.tsx:50`, `captain-settings.tsx:56`

Behavior sketches (wording and behavior only, not looks): see the mockup PNGs named in `docs/mockups/design-audit/`.

The shared chip fix (48px minimum hit area in `src/ui/chip.tsx` and `globals.css`) belongs to this card. Check that other screens using the chip still look right.

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
captain library, templates, programs editor, nutrition plan editor, billing, packages, captain settings, `src/ui/chip.tsx`, `src/app/globals.css` chip rules only.

If a fix needs a file owned by another card, skip it and list it under Notes for reviewer.

## Out of scope
- "Nice to have" items.
- Visual restyles.
- Screens not listed here.

## Checks
`npm run check` and `npm run build` must pass. That includes `src/lib/perf-budget.test.ts`, so don't import client barrels into server code.
