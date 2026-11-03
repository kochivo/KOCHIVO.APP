# T-025 — Code health review before the real trial (report only)

**Phase:** 5 · **Depends on:** everything merged so far · **Status:** ready
**Delegate to:** Codex

## Goal
Many cards landed in parallel. Before the owner runs the real gym trial (T-016), find what drifted from AGENTS.md and docs/ARCHITECTURE.md, and what will be hard to change later. This is a **report task**: change no code.

## What to check
1. AGENTS.md §2 structure:
   - files near or over 250 lines
   - more than one exported component in a file
   - deep imports across features (anything not through a feature's `index.ts`)
   - `core/`, `ui/`, `lib/` importing `features/`
   - routes in `src/app/` holding logic
2. Duplication: helpers written twice in different features (date formatting, Arabic number or date formatting, WhatsApp links, error mapping, Supabase client wrappers, the `ReadTable` type trick). Name each copy and propose one home.
3. AGENTS.md §3 data rules: any player write for sessions, sets, or meal logs that bypasses `saveAndQueue()`; any `Math.random`; any `toISOString().slice(0,10)`; any `new Date()` in logic that tests cannot inject.
4. AGENTS.md §4 UI rules: hex colours in components, physical direction classes (`ml-`, `pl-`, `left-`, `text-left` …), icon-only buttons without an Arabic `aria-label`, lists without an empty state, async views without loading or error states, English user-facing strings, the GIF attribution «© Gym visual» wherever the exercise library is browsable.
5. AGENTS.md §5: `any`, `@ts-ignore`, unexplained `!`, `console.log`.
6. Tests: features with no test file, and tests that use real timers, real dates, or network.
7. Dead code: exports nobody imports, unused components, and leftover TODOs.

Use `grep`/`rg` and read files; no new tools.

## Deliverable
`docs/CODE-HEALTH.md` (new), in English:
- a summary table: id, severity (high = breaks a rule that matters for users or security, medium = will slow changes, low = cosmetic), area, file, one-line title
- for each finding: the exact file and line, what rule it breaks, and the smallest fix
- a "clean" list of the checks that found nothing, so the reviewer knows what was covered

Group small findings of the same kind into one row (for example "7 files use `pl-`" with the list).

## Rules
- Write only `docs/CODE-HEALTH.md`.
- Rank by real impact. Don't pad.

## Acceptance
- [ ] `docs/CODE-HEALTH.md` exists and follows the structure above.
- [ ] `npm run check` passes (the tree is unchanged apart from the doc).

## Out of scope
- Fixing anything (fix cards follow from the report)
