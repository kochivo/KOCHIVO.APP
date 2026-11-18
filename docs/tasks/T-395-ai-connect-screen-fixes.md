# T-395: AI connect screens: clear first step, connect steps, safe disconnect, honest consent

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
### `/oauth/consent` — Inspect a tool’s requested access and allow or deny it
- “Back” submits an OAuth denial → an ineligible user cannot tell that leaving changes the request → label the submission “Deny and return,” or make Back ordinary navigation. `src/features/ai-connect/components/consent-actions.tsx:19`
- A missing or duplicate authorization ID produces an alert with no exit → users cannot recover from an incomplete link → give that state a heading and direct users to restart from the requesting tool. `src/features/ai-connect/components/consent-page.tsx:29`

Also apply the four AI-connect mockups in `docs/mockups/design-audit/ai-connect.html` (s1–s4):
- **s1, first time:** when nothing is connected, show Claude and ChatGPT rows, each with status "Not connected" and a tonal **Connect** button. Below them, show a "What it can do" list and a "What it cannot do" list. Don't show any tool rows yet.
- **s2, Connect:** opens a bottom sheet with the steps. Show the KOCHIVO connector URL in a copy field (with a Copy button), then the steps for that app.
- **s3, Disconnect:** asks for confirmation in a dialog first. The dialog says the app loses access right away.
- **s4, consent page:** shows the app tile and the KOCHIVO tile, what it can read, a "cannot" list, and for players, that it can mark meals as eaten.

On the consent page:
- The secondary button reads **Deny and return** (the label says what it does).
- A missing or duplicate authorization id gets a heading, plus text telling the user to start again from Claude or ChatGPT.

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
`src/features/ai-connect/**`, `src/app/[locale]/oauth/consent/**`

If a fix needs a file owned by another card, skip it and list it under Notes for reviewer.

## Out of scope
- "Nice to have" items.
- Visual restyles.
- Screens not listed here.

## Checks
`npm run check` and `npm run build` must pass. That includes `src/lib/perf-budget.test.ts`, so don't import client barrels into server code.
