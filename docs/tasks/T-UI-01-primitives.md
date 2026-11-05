# T-UI-01 — UI primitives every screen will reuse

**Phase:** 1 · **Depends on:** none · **Status:** ready
**Delegate to:** Codex

## Goal
Every screen in the mockup is built from the same small set of pieces: fields, segmented tabs, chips, progress bars, the sync pill, the bottom nav, and the empty, error, and loading states. Build them once in `src/ui/`, so feature work later only composes them and never restyles them. This is what keeps the codebase easy to change: one place per visual decision.

## Files
Create or modify only these:
- `src/ui/text-field.tsx`: label, input, optional hint and error. Error sets `aria-invalid` and links the message with `aria-describedby`. Accepts `dir` (phone and email fields are `ltr` with `text-start`).
- `src/ui/segmented.tsx`: 2–4 options, controlled (`value`, `onChange`). Uses `role="radiogroup"` with `role="radio"` and `aria-checked`. The active option is `bg-ink text-on-lime`.
- `src/ui/chip.tsx`: a toggle chip (`aria-pressed`), minimum height 40px, used inside a wrapping row.
- `src/ui/icon-button.tsx`: square 48px button. `aria-label` is a **required** prop in its type. It takes the icon as `children`.
- `src/ui/progress-bar.tsx`: `value` and `max`, clamped to 0–100%. Uses `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, and `aria-valuemax`. Lime fill on a `bg-line` track. Used for macro bars and upload progress.
- `src/ui/sync-pill.tsx`: presentational only. Props: `{ state: 'synced' | 'pending' | 'offline'; pending?: number }`. Texts: `متزامن` (lime, check icon), `محفوظ · N` (warn, refresh icon), and `من غير نت` (muted, wifi-off icon). It uses `role="status"`. It does **not** read the outbox; that wiring is T-006b.
- `src/ui/bottom-nav.tsx`: floating glass bar. Props: `items: { href; label; icon; active? }[]`. Uses `next/link`. The active item is lime with `aria-current="page"`. Each item is at least 48px tall.
- `src/ui/empty-state.tsx`, `src/ui/error-state.tsx`, `src/ui/loading-state.tsx`. Empty: icon, title, body, optional single action. Error: Arabic message plus a retry button (`onRetry`). Loading: skeleton blocks with `aria-busy` and a visually hidden `جاري التحميل`, and no spinner-only screens.
- `src/ui/index.ts`: re-export every primitive, including the existing `Button`, `GlassCard`, and `Stepper`.
- `src/ui/ui.test.ts`: tests (see Acceptance).
- `src/app/dev/ui/page.tsx`: a showcase page that renders every primitive in each state. Set `robots: { index: false }` in its metadata, and add a top line saying it is a dev page. It contains no logic beyond local `useState` for the controlled demos. If it needs client state, put the demo pieces in `src/app/dev/ui/demo.tsx` (`'use client'`).

## Requirements
1. Follow `AGENTS.md` strictly. In particular:
   - Use tokens only, with no hex.
   - Use logical properties only (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`).
   - Use `import type` for types.
   - Keep each file to 250 lines or fewer, with one exported component per file.
2. Read the existing `src/ui/button.tsx`, `glass-card.tsx`, and `stepper.tsx` first, and copy their style: `cn()` from `@/lib/cn`, variant maps as `Record<…, string>`, and props extending the native element props.
3. Visual reference: the shared mockup boards PlayerHome, Main, PlayerLogin, and CaptainMobile. Concretely:
   - Glass levels: `glass` for cards, `glass-strong` for big numbers.
   - Radii: `rounded-card` and `rounded-control`.
   - Fonts: `font-display` comes from base styles on buttons and headings.
4. Icons come from `lucide-react` only, and every icon is `aria-hidden`.
5. Arabic strings are short Egyptian Arabic with no emoji. Pass strings in as props when they belong to a feature. Built-in strings are only the ones named above.
6. Do not add dependencies. Tests render with `renderToStaticMarkup` from `react-dom/server` and `React.createElement` (the test file is `.ts`, so no JSX).

## Acceptance
- [ ] `ui.test.ts` checks:
  - `ProgressBar` clamps -5 → 0 and 150 → 100 in `aria-valuenow`.
  - `SyncPill` renders the three texts, including `محفوظ · 3`.
  - `TextField` with `error` sets `aria-invalid="true"` and an `aria-describedby` that matches the error's id.
  - `Segmented` marks exactly one option `aria-checked="true"`.
  - `BottomNav` sets `aria-current="page"` only on the active item.
- [ ] `IconButton` without `aria-label` is a TypeScript error. Prove it with a `// @ts-expect-error` line in the test.
- [ ] No `ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, or `text-left` classes, and no hex colors anywhere under `src/ui/` or `src/app/dev/`.
- [ ] `npm run check` and `npm run build` pass

## Out of scope
- Anything under `src/features/`, `src/core/`, `src/lib/`, and `globals.css` tokens (if a token is missing, use the closest one and say so under Notes).
- The OTP input, the camera button, and the rest timer. Those belong to their feature cards.
- Changing the existing `Button`, `GlassCard`, or `Stepper` beyond re-exporting them.

## References
- `AGENTS.md` §4 UI
- `src/app/globals.css`: the `@theme` tokens and glass utilities
- Mockup: https://claude.ai/artifact/BwxEBiAhHD38abNtBmLGhV
