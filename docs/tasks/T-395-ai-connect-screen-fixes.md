# T-395: AI connect screens: clear first step, connect steps, safe disconnect, honest consent

Owner decision 2026-11-18: fix every "Must fix" item from the Material 3 review of all screens, and keep the KOCHIVO look.

The look stays as it is: dark, lime as the only action color, glass. Change behavior, semantics, states, and accessibility only.

## Read first
- `AGENTS.md` and `DESIGN.md`.
- `docs/design-audit/04-public-auth-admin.md`: the full scores and reasons for these screens.
- `docs/mockups/design-audit/`:
  - `screens-worst.html` has mockups a1–a4;
  - `screens-all.html` has p1–p4, c1–c3, t1–t2 and u1–u3;
  - `ai-connect.html` has s1–s4;
  - the matching PNGs are in the same folder.

  Match the behavior and copy shown there. Visual details follow the existing components and tokens.

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
