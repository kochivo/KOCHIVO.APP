# T-397: Player nutrition, progress, rank, history, forms, settings, onboarding, KO fixes

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
- `docs/design-audit/01-player.md`: the full scores and reasons for these screens.

## Fix list
### `/player/nutrition` — Review today’s plan and log meals
- Each Workspace meal disclosure overrides its visible meal name with the same “Details” name → screen-reader users cannot tell which meal they will open → include the meal name in the accessible label. `src/features/nutrition/components/meal-card.tsx:93`
- The row check control disappears after logging, while undo lives inside details → accidental logs are hard to correct → retain a named reversible control in the row and use a single completion control for the featured meal. `src/features/nutrition/components/meal-card.tsx:88`

### `/player/nutrition/shopping` — Shop from the weekly meal plan
- Workspace checkmarks live only in component state → shoppers lose their place after leaving and reopening the list → persist checked items for the active list and provide an explicit reset. `src/features/nutrition/components/shopping-week-list.tsx:14`

### `/player/progress` — Review trends and send a weekly check-in
- The Workspace header log button ignores `sent`, while the footer blocks repeat check-ins → returning players get contradictory guidance → use one eligibility rule and one primary check-in entry. `src/features/progress/components/progress-screen.tsx:130`, `src/features/progress/components/progress-screen.tsx:171`
- Remote strength failures are only logged → a new-device user can mistake incomplete data for an empty history → preserve local data and show an inline partial-data notice with retry. `src/features/progress/components/progress-screen.tsx:74`

### `/player/rank` — Inspect rank, points, and team standing
- An empty points history supplies 24 points per week to the estimate → a new player sees a timeline unsupported by their activity → show that more history is needed before estimating. `src/features/ranks/data/load-weekly-points.ts:12`, `src/features/ranks/components/rank-hero.tsx:33`
- Hall of Fame retry resets all rank data to loading → players lose the rest of the page while one section retries → retry that section independently or keep loaded data visible during refresh. `src/features/ranks/components/rank-v6.tsx:46`, `src/features/ranks/hooks/use-rank-data.ts:28`

### `/player/history` — Browse past workouts and exercise performance
- Workspace renders view controls after the session list → players must scroll through results before discovering exercise history → put the selector above the controlled content. `src/features/workout/components/history-screen.tsx:74`
- A load error and empty-history prompt can render together → players may interpret a failed fetch as having no workouts → show the empty state only after a successful empty read. `src/features/workout/components/history-screen.tsx:52`

### `/player/assessments` — Find due assessments and prior responses
- The first Workspace request is both a linked card and a Record link → keyboard users encounter two stops for one destination → keep one named action and provide a visible Due heading above the list. `src/features/player-shell/components/player-assessments-workspace.tsx:36`

### `/player/forms/[requestId]` — Complete and submit a requested assessment
- A required multi-select initially places HTML `required` on its first checkbox → submitting with no selection can tell players to check that specific answer → validate the group and associate a localized “Select at least one” message with it. `src/features/forms/components/question-field.tsx:38`
- Changing steps replaces the question without moving focus or announcing the new prompt → keyboard and screen-reader users can lose their place → focus the new question heading or legend on advance and back. `src/features/forms/components/answer-flow.tsx:63`, `src/features/forms/components/answer-flow.tsx:119`

### `/player/captain` — Contact the coach and read replies
- Workspace quick replies send on tap and allow repeated activation → a player can send before reviewing or send duplicates → place the reply in the composer for review, or label it as a send action and disable repeat activation while pending. `src/features/player-shell/components/captain-quick-replies.tsx:8`, `src/features/chat/hooks/use-chat-thread.ts:152`

### `/player/captain/profile` — View coach details and subscription access
- Missing WhatsApp yields a disabled button even when the Workspace conversation is available → players hit a dead end in the contact area → show the availability as text and link to the in-app conversation when available. `src/features/player-shell/components/captain-profile-card.tsx:90`

### `/player/settings` — Manage account details, preferences, and privacy
- Workspace renders `PlayerTheme` in Preferences and `ThemeSwitch` under More → players have two places to change appearance → expose one theme control in the preference group. `src/features/settings/components/player-preferences.tsx:54`, `src/features/settings/components/settings-screen.tsx:93`
- Language and units share unwrapped rows with their option groups → scaled labels have no structural way to reflow → stack labels and controls at narrow widths and let options wrap. `src/features/settings/components/player-preferences.tsx:48`, `src/features/settings/components/player-preferences.tsx:56`

### `/player/onboarding` — Send the coach an intake profile
- The draft starts with a birth year, height, and weight and submits those fields → players can send sample measurements as their own → require explicit entry or confirmation before saving them. `src/features/onboarding/hooks/use-intake-draft.ts:9`, `src/features/onboarding/wizard.ts:56`
- Next is disabled while errors are displayed only for touched fields → players can reach a dead end without learning what is missing → provide persistent requirements or let Next reveal errors and focus the first incomplete field. `src/features/onboarding/components/intake-wizard.tsx:51`, `src/features/onboarding/components/intake-wizard.tsx:133`

### `/ko` — Ask KO questions using text, voice, or a meal photo
- After a clip is recorded, the composer replaces the text field, and submission prioritizes audio over text → a clip and prompt cannot reliably be sent together → make voice-only mode explicit and prevent mixed drafts, or support and preview both inputs. `src/features/ko-preview/components/ko-chat.tsx:91`, `src/features/ko-preview/components/ko-chat.tsx:166`

Behavior sketches (wording and behavior only, not looks): see the mockup PNGs named in `docs/mockups/design-audit/`.

Persisting shopping checkmarks must be local only, using IndexedDB or localStorage through the existing local-db helpers if there are any. Don't add new tables.

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
player feature folders for these screens (nutrition, progress, rank, history, assessments, forms, player chat, captain profile, settings, onboarding, ko). Do not touch `src/features/workout/**` or `src/features/player-home/**` (T-396).

If a fix needs a file owned by another card, skip it and list it under Notes for reviewer.

## Out of scope
- "Nice to have" items.
- Visual restyles.
- Screens not listed here.

## Checks
`npm run check` and `npm run build` must pass. That includes `src/lib/perf-budget.test.ts`, so don't import client barrels into server code.
