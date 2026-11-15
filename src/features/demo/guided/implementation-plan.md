# T-288 implementation plan

Goal: replace demo drawings with production presentational views while preserving reducer events and tour targets.

1. Extract the home hero, tiles and task list into synchronous views; retain server translation wrappers. Test production markup parity and demo imports.
2. Extract captain navigation chrome from count hooks; feed demo counts and intercept navigation locally. Keep real mobile tabs and desktop groups.
3. Extract workout set rows from translation hooks; adapt reducer sets and callbacks without offline writes. Preserve logging pulse target and rest timer.
4. Reuse further safe presentation leaves screen by screen. Record any retained copies and coupling that prevents a safe split.
5. Run typecheck, lint, Vitest, check and build. Verify bundle budgets when build artifacts are available; report any environment blockers explicitly.

Constraints: only card files, no dependencies or database changes, no server barrels in client imports, no production behavior changes, tokens and logical properties only. Preserve all 13 tour steps. Check Arabic/English, empty tasks, reducer updates, mobile more navigation, rest blocking and tour targets.
