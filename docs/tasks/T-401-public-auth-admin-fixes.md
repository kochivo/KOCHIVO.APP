# T-401: Landing, coach page, demo, auth, invite, suspended, and admin fixes

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
- `docs/design-audit/04-public-auth-admin.md`: the full scores and reasons for these screens.

## Fix list
### `/` — Explain KOCHIVO and lead visitors to signup or the demo
- The section nav disappears without a compact replacement → visitors must scroll through the landing page to reach pricing or FAQ → add a compact section menu with the same destinations. `src/features/marketing/components/landing.module.css:196`
- The compact workout card displays “New record” before a set is logged → visitors see success before acting → show feedback only after the sample action and announce it. `src/features/marketing/components/set-preview.tsx:14`

### `/c/[slug]` — Evaluate a coach and request training or join the waitlist
- A full coach can show “Join waitlist” alongside package request buttons → visitors get conflicting instructions → apply the coach’s acceptance state to package actions. `src/features/coach-page/components/public-coach-layout.tsx:32`, `src/features/coach-page/components/public-tier-cards.tsx:37`
- Hero, footer, and dock mount independent waitlist controls → another copy can still invite submission after success → share pending and result state across placements. `src/features/coach-page/components/public-coach-layout.tsx:44`, `src/features/coach-page/components/public-waitlist.tsx:11`

### `/demo` — Try a guided coach and player simulation, with an optional sample account
- The fixed guide overlays the fixed captain nav on phones → guide users can lose access to destinations while following instructions → give the guide and nav separate vertical space, or put the guide in flow. `src/features/demo/guided/guided.css:91`, `src/features/demo/guided/guided.css:96`
- Compact CSS hides the language switch and header restart → phone users lose language switching and mid-tour restart → put both in a compact menu. `src/features/demo/guided/demo-header.tsx:22`, `src/features/demo/guided/guided.css:85`

### `/login` — Sign in or create a coach or player account
- The method selector ignores activation while pending but still accepts keyboard focus → focus can move to an option that cannot be selected → expose and enforce the disabled state. `src/features/auth/components/login-methods.tsx:40`, `src/ui/segmented.tsx:27`
- OTP entry removes the email field without moving focus to the new step → keyboard users must find the code input again → focus the first code field and announce the destination email. `src/features/auth/components/login-methods.tsx:49`, `src/features/auth/components/login-methods.tsx:54`

### `/forgot-password` — Request a reset code and choose a new password
- Sending a code removes the email field and only offers resend to that address → a typo forces the user to leave the flow and start again → add a Change email action that preserves the address for editing. `src/features/auth/components/forgot-password-flow.tsx:53`, `src/features/auth/components/forgot-password-flow.tsx:65`
- Code entry strips Arabic-Indic and Eastern Arabic-Indic digits → Arabic users can enter a visually valid code and see nothing accepted → normalize both digit sets in the shared OTP input. `src/features/auth/components/otp-input.tsx:11`

### `/reset-password` — Set a new password from a recovery link
- The form validates passwords before detecting an invalid recovery link → users can create and confirm a password before learning they need a new link → surface unusable recovery state before password entry, while preserving valid recovery sessions. `src/features/auth/data/update-password.ts:13`, `src/features/auth/data/update-password.ts:21`
- Successful save goes straight to login → users receive no confirmation that the password changed → carry a translated success status into login. `src/features/auth/components/reset-password-form.tsx:36`

### `/welcome` — Start onboarding, choose a role, or enter a player invite
- The role cards distinguish selection only through lime border, tint, and icon color → users who miss those cues cannot see which route Continue will take → add a selected marker or visible radio indicator. `src/features/welcome/components/welcome.module.css:69`, `src/features/welcome/components/welcome.module.css:83`

### `/i/[code]` — Preview an invitation and connect a player account
- Expired invites and coach-account mismatches both offer Try again → users repeat the same failed request → distinguish permanent outcomes from transient failures and offer a new-invite or account-switch path. `src/features/auth/data/invite-preview.ts:16`, `src/features/auth/components/player-invite-flow.tsx:38`
- Switching to code entry removes the email field without moving focus → keyboard users must locate the replacement fields → focus the code group and include the address in its instructions. `src/features/auth/components/player-invite-flow.tsx:51`

### `/suspended` — Explain the account pause and offer support or sign-out
- The recovery instruction always points to WhatsApp, while the link is conditional → users can be told to contact support with no way to do so on the page → provide a fallback and make support the primary action when available. `src/features/auth/components/suspended-screen.tsx:13`, `src/features/auth/components/suspended-screen.tsx:17`

### `/admin` — Review operational metrics, manage captains, and audit changes
- Dashboard filters operate on at most 100 fetched captains → a real match on another page can appear as an empty result → filter server-side and reset pagination when a filter changes. `src/app/[locale]/admin/page.tsx:19`, `src/features/admin/components/admin-screen.tsx:63`
- Export CSV uses the current unfiltered page → admins can mistake a partial export for the whole matching dataset → export the declared query scope and state that scope in the action label. `src/features/admin/components/admin-screen.tsx:73`
- The route discards captain activity read errors → activity-dependent filters can quietly omit captains → show an unavailable state and offer retry. `src/app/[locale]/admin/page.tsx:21`, `src/features/admin/dashboard-ui.ts:14`

Behavior sketches (wording and behavior only, not looks): see the mockup PNGs named in `docs/mockups/design-audit/`.

Admin server-side filtering must use the existing admin queries and RLS or admin RPCs. Don't add a migration. If server-side filtering truly needs one, stop and say so under Notes.

The OTP input must accept Arabic-Indic (٠-٩) and Eastern Arabic-Indic (۰-۹) digits.

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
landing, coach public page, demo, auth screens, shared OTP input, welcome, invite, suspended, admin. Do not touch `/oauth/consent` (T-395) or `/offline` (T-396).

If a fix needs a file owned by another card, skip it and list it under Notes for reviewer.

## Out of scope
- "Nice to have" items.
- Visual restyles.
- Screens not listed here.

## Checks
`npm run check` and `npm run build` must pass. That includes `src/lib/perf-budget.test.ts`, so don't import client barrels into server code.
