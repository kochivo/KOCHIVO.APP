# AGENTS.md — rules for any coding agent working on KOCHIVO

Read this file, `docs/ARCHITECTURE.md`, and the task card you were given **before** writing code.
These rules are mandatory. A diff that breaks one is rejected in review, even if it works.

## 1. Scope

- Do exactly the task card. Nothing outside its "Files" list unless the card says so.
- Anything listed under "Out of scope" stays untouched, even if it looks broken. Write it under "Notes for reviewer" instead.
- Never add a dependency. If you believe one is needed, stop and explain why in your final message.
- Never edit `supabase/migrations/0001`–`0009`. Schema changes go in a new numbered migration.
- Never touch `.env*` (except `.env.example`), `assets-source/`, `brand/`, or anything outside this repository.
- Do not commit, push, or create branches. The reviewer lands the work.

## 2. Structure

- One responsibility per file. Hard limit: **250 lines** (ESLint enforces it in `src/`).
- One exported React component per file. File names are kebab-case: `set-row.tsx`, `use-rest-timer.ts`.
- Import direction: `app → features → (ui, core, lib)`.
  - `core/`, `ui/`, `lib/` never import from `features/`.
  - Features import other features only through their `index.ts`. No deep imports.
- Routes in `src/app/` are thin. They read params, call a feature, and render it. No business logic there.
- Feature layout:
  ```
  src/features/<name>/
    index.ts          public API only
    components/       UI for this feature
    hooks/            client state
    data/             queries, mutations, and local-db access
    <name>.test.ts    tests
  ```

## 3. Data and offline

- Supabase RLS is the real security. Never rely on hiding a button. Every new table gets RLS and a test in `supabase/tests/`.
- Player writes for sessions, sets, and meal logs go through `saveAndQueue()` from `@/core/offline`. Never call Supabase directly for these.
- Ids:
  - Use `stableId(...)` for rows that must be the same on every device (session, set, meal log).
  - Use `uuidv7()` for everything else.
  - Never use `Math.random`.
- Dates: training and log dates use `localDate()` from `@/lib/dates` (Africa/Cairo by default). Never use `new Date().toISOString().slice(0,10)`.
- UI is optimistic. Write locally, show it at once, and let sync send it.

## 4. UI

- Use tokens only. Colors come from `globals.css` `@theme`, as in `bg-lime`, `text-muted`, `glass`, and `glass-strong`. No hex values in components.
- Lime is the only action color. One primary action per screen.
- Big numbers and focus-mode panels use `glass-strong` for contrast.
- RTL:
  - Use logical properties only: `ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`.
  - Never use `ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, or `text-left`.
- Touch targets are at least 48px (`min-h-12`). Gym controls (steppers, done buttons) are bigger.
- Every user-facing string lives in `messages.ts`; Arabic is Egyptian, English is short and plain, with no emoji and no inline UI text.
- Icons come from `lucide-react`. Every icon-only button needs a translated `aria-label`.
- Every list has an empty state, and every async view has loading and error states.
- The exercise GIF attribution "© Gym visual" lives only in the public site footer (owner decision 2026-11-05; see `docs/LEGACY-AUDIT.md`). Do not add it to app screens, and never remove the footer credit.

## 5. Code style

- TypeScript strict. No `any`, no `@ts-ignore`, no non-null `!` without a comment explaining why it is safe.
- Use `import type` for types.
- Comments explain *why*, not *what*. Keep them rare.
- No `console.log`. `console.warn` and `console.error` are allowed for real failures only.

## 6. Tests

- Every task adds or updates tests. Pure logic gets unit tests; RLS or SQL changes get a PGlite test in `supabase/tests/`.
- Tests must be deterministic: inject `now`, with no real timers and no network.

## 7. Tooling (Windows)

- Edit files with your file-editing tools. **Never rewrite text files through PowerShell `Get-Content`/`Set-Content`**. It corrupts Arabic (this already happened once).
- Before you finish, run:
  ```
  npm run check
  npm run build
  ```
  Both must pass. Paste the summary lines in your final message.

## 8. Final message format

```
## Done
- what changed, file by file
## Checks
- npm run check: <result>
- npm run build: <result>
## Notes for reviewer
- anything skipped, any doubt, anything out of scope you noticed
```
