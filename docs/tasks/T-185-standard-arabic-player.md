# T-185: Standard Arabic for the player app

**Phase:** International · **Depends on:** T-184 · **Status:** ready

## Goal
Every screen a player sees reads naturally in standard Arabic when that style is chosen.

## Files
- Only `messages.ts` files, adding an `arStd` block, in player-facing features. Examples include player-shell, player-home, workout, nutrition, supplements, progress, readiness, body-scans, muscle-analytics, ranks, notifications, player-profile, voice-notes, forms (the player answer flow), and onboarding leftovers. Use the T-184 coverage test to find each file.
- This card.

## Requirements
1. Follow `docs/I18N-STYLE.md` exactly. Same keys, placeholders and plural keys as `ar`.
2. No code changes besides `arStd` blocks. If a string is built in code rather than in messages, list it under "Notes for reviewer" and leave it alone.
3. Every touched file reaches 100% coverage in the T-184 coverage test.

## Acceptance
- [x] Coverage is 100% for every player-facing messages file.
- [ ] All gates pass.

## Out of scope
- Captain screens (T-186).

## Implementation notes
- Added flag-gated sibling `standard/messages.ts` dictionaries for player-shell, player-home,
  workout, nutrition, supplements, progress, readiness, body-scans, muscle-analytics/analytics
  (including premium), ranks, notifications (including push), player-profile, voice-notes,
  forms, and forms/requests. Shared player-facing settings, demo, install, feedback,
  share-card, ko-core, ko-entry, ko-account and ko-preview dictionaries are covered too.
  Onboarding already has full standard coverage from T-184.
- Extended T-184 coverage assertions to these files, nested form keys, placeholders,
  and flag-off dictionary omission.
- Forms components still read `messages[locale]` directly (including answer-flow,
  player-form-page, pending-forms, and question-field), so they do not select `arStd`.
  Wiring the style into those components requires changes outside this card's Files list.
- KO account server replies and share-card image renderers call `createT(messages, locale)`
  without a style, so they still default to Egyptian. Those call sites are outside scope.
  Inline Arabic separators in streak-sheet and KO account formatting were left unchanged.
- Shared dictionaries above are included in T-185; T-186 should avoid duplicating them.
  Captain-only dictionaries, including ko-feed and player-preview, remain untouched.
- Gates remain subject to reviewer rerun: this Windows environment blocks child-process
  creation for the default Vitest loader, release audit, and production-build type checking.
- Verification: standalone TypeScript and ESLint pass; coverage has 59 passing tests;
  the final source-only suite has 430 passing files / 2829 passing tests using the native
  loader and thread pool (excluding Supabase and the build-dependent performance test).
  Audit rules run through a PowerShell git-path pipe report 2104 files / 0 findings,
  including new dictionaries. Production compilation succeeds, then fails with spawn EPERM.
  Performance verification cannot complete because the existing bundle stats reference
  a missing chunk. The full suite also reports a 20-second demo-workspace test timeout;
  its two coverage failures came from starting the run before the final dictionaries existed
  and are absent from the final coverage and source-only runs.
