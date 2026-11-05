# T-094 — Captain dashboard uses the desktop width

**Phase:** V1 polish · **Status:** ready (owner: the dashboard looks squeezed on desktop)

## Findings from the T-089 QA
At 1280px the content gets about 920px, because of:
- `src/ui/page-container.tsx`: `max-w-7xl` plus `md:px-6`
- `src/features/roster/components/captain-shell.tsx`: sidebar `w-60` (240px), the shell gap, and the glass padding
- dashboard panels: stats use 4 columns at `lg`, and panels split side by side only at `xl`

Read the captain layout (`src/app/[locale]/(captain)/captain/layout.tsx`), `CaptainShell`, `PageContainer`, and the captain dashboard feature before changing anything.

## Changes
- **Captain area on desktop (≥1024px):** content should use the available width.
  - Widen the container for the captain shell to something like `max-w-[1600px]`, or let the main column be `flex-1 min-w-0` without a second cap.
  - Make the sidebar slimmer (`w-56`).
  - Reduce the nested padding to one gutter level.
  - The player area (mobile-first) must not change. If `PageContainer` is shared, add a captain variant instead of changing the default.
- **Dashboard grid:**
  - at `lg`, put the main panels side by side (not only at `xl`)
  - the stat cards stay 4 across
  - no horizontal scroll at 1024, 1280, 1440 and 1920
  - the roster list uses the full width
- Keep RTL (logical properties), tokens only, and glass styles. Put `min-w-0` on flex and grid children so long Arabic names truncate instead of overflowing.
- Mobile (375px) and tablet (768px) must look exactly as today.

## Tests
- Render tests asserting the new container and grid classes on the captain shell and dashboard, and that the player shell is unchanged.
- Report the content width you compute for 1280 and 1440 in the final message.

## Out of scope
- Player screens.
- New dashboard widgets.

## Acceptance
- [ ] Gates: `npx tsc --noEmit -p .`, `npx eslint .`, `npm run build`, `npx vitest run --maxWorkers=2` (includes the perf budget). Captain budget 310 KB: CSS class changes only.
