# V11 fidelity rules (shared by T-238 to T-251)

Owner decision 2026-11-14: the captain workspace must look and work **exactly** like
`docs/mockups/captain-workspace/v11-prototype.html`, with 100% fidelity. Every card from T-238 to T-251 follows these rules.

## How to read the mockup
- Each screen is a function in the `SCREENS` object (search `SCREENS={`). For example, `home:()=>` is the home screen.
- Shared parts:
  - `header()` builds the top bar.
  - `taskRow()` builds a task row.
  - `ring()` draws the progress rings.
  - `sideHTML()` builds the sidebar, using `NAV`.
  - `sheetHTML()` builds the mobile "more" sheet, using `MOB`.
- The CSS at the top of the file shows sizes, radii, spacing, and the classes `.glass`, `.card`, `.st`, `.hero2`, `.row`, `.pill`, `.tabs`, `.btn.go`, `.btn.gl`.
- The sample data (`P`, `TASKS`, `INTAKE`, `TPLS`, `FOODS`, `PLAN`, `FORMQ`) is **only an example**. In the app, every value comes from real data.
- To see a screen, open the file in a browser and click through it. Check both desktop and mobile widths (under 760px).

## What "100%" means
1. **Same structure.** Keep the same sections in the same order, the same grid (`g4`, `g21`, `g2`, `g3`, `builder`), and the same desktop and mobile behaviour (`desk-only`, `mob-only`, `hide-m`).
2. **Same Arabic copy.** Use the same labels, button text, tab names and empty-state text. Put them in the feature's messages file:
   - `ar`: exactly the mockup text;
   - `arStd`: the simple standard Arabic version, following `docs/I18N-STYLE.md`;
   - `en`: a short, plain English version.
3. **Same look.**
   - Glass cards: `glass` / `glass-strong` / `glass-featured`.
   - Rings, pills, tabs and button styles as in the mockup.
   - Lime is the only action colour, and the blue `--color-calm` is used as the mockup uses it.
   - Use the app's tokens and existing UI components. Never paste the mockup CSS, and no hex colours in components.
4. **Same interactions.** Tabs filter, rows open the right page, buttons do the action their label says, and mobile list/detail panes switch the way the mockup does.

## Real data only
- Every number, name and status comes from existing tables and loaders, the same ones listed in the mockup's `map` screen. Look in `src/features/*/data` before writing a new query.
- If a mockup element needs data we do not store:
  - Do **not** fake it, and do not hard-code sample values.
  - Leave that element out, and list it under "Notes for reviewer" with what data would be needed.
- No migrations in these cards. Existing RLS stays the only security.

## Must still hold
- Every rule in AGENTS.md applies:
  - 250 lines per file, one component per file, kebab-case names;
  - logical properties only;
  - `min-h-12` touch targets;
  - icon-only buttons have a translated `aria-label`.
- Icons:
  - `lucide-react` icons, except navigation and main action buttons, which use `src/ui/icons`.
  - Pick the icon closest to the mockup `ic()` name.
- Every list has an empty state, and every async view has loading and error states. Use the mockup's empty text where it has one.
- Keep the T-237 perf rules:
  - no live `backdrop-filter` on touch cards;
  - no `filter: blur` on large layers;
  - loops follow the motion rules below (owner decision 2026-11-15 supersedes the blanket ban).
- Route budgets in `src/lib/perf-budget.test.ts` must pass: captain 310 KiB.
  - Load heavy client parts with `dynamic()`.
  - Client components must not import values from barrels that pull editor UI.
- The old screens behind `captainWorkspaceEnabled()` stay as they are. Change only the workspace path.

## Final message must include
- Which mockup screen(s) you compared, at desktop and at mobile width.
- Every mockup element you left out, and why.

## Clickable things must look clickable (owner rule 2026-11-14)
The captain should never have to try something to find out whether it reacts.
- **A button looks like a button.** It has a glass fill with a border, or lime if it is the one main action. No button is styled as plain text.
- **A row that opens something** ends with a direction-aware chevron (`dir-icon`) and has hover and pressed states.
- **A value that can be edited in place** (meal name, question title) looks like a field: a subtle field surface, or a pencil icon next to it.
- **Anything that expands or collapses** has a clear chevron that rotates. Never use a small «◂» glyph.
- **Every clickable element** has `cursor-pointer`, a visible `focus-visible` ring and a pressed state (`press`).
- **Plain text that does nothing** is never coloured or styled like a link.

## Secondary screens and popups
The same look covers more than the main screens. It also applies to every captain sub-page, sheet and dialog under `[data-area='captain']`, even when the mockup has no picture of it:
- a glass-strong panel with a 24px radius;
- a header holding the title and a close icon button;
- a body that scrolls on its own with a thin scrollbar;
- a sticky footer with a single lime main action;
- v11 chips (`.chip` from the mockup).

## Motion and phone glass (T-282, owner decision 2026-11-15)
- Keep existing animations and their desktop timing. Animate only `transform` and
  `opacity` in keyframes, including TSX styles. Never animate width, height, top,
  left, box-shadow, filter or background-position. Growing meters use `scaleX`.
- Loops default to `animation-play-state: paused`. The shared `useInView` observer
  enables them only while intersecting the viewport and `document.hidden` is false.
  Missing IntersectionObserver support leaves loops paused. Disconnect on unmount.
  The root Orbs lifecycle also enrolls built-in Tailwind pulse/spin/bounce loops,
  including lazy loading fallbacks, observing only added nodes and class changes.
- UI feedback lasts at most 400ms. Existing decorative sequences keep their timing;
  entrances run once. Reduced motion removes non-essential motion, including loops
  and skeleton sweeps. Set `will-change` only while a loop actually runs.
- Touch glass uses the reference liquid gradient over a lifted solid token surface,
  with existing borders, inset highlights and shadows. Sticky headers/bars, bottom
  navigation and overlays may retain at most 12px blur. Desktop glass is unchanged.
  Solid glass and reduced transparency override both paths; light tokens keep contrast.
- Orbs use static radial gradients in a fixed, strictly contained layer. Long captain
  lists defer individual rows with `content-visibility: auto` and intrinsic row estimates.
- `src/lib/motion-rules.test.ts` scans CSS and TSX keyframes and checks the touch/loop
  rules; `src/lib/use-in-view.test.ts` injects an observer and visibility events.

## Shared spacing and type scale (T-278)

The application scale switches at **760px**, independently of Tailwind?s `md` breakpoint.

| Token | Mobile | ?760px |
|---|---|---|
| `page-x`, `page-y` | 16px | 24px |
| `section` | 24px | 32px |
| `card` | 16px | 20px |
| `card-gap` | 12px | 16px |
| `stack` | 8px | 12px |
| `inline` | 8px | 8px |
| `control` | 20px | 20px |
| `chip` | 38px | 38px |

Use `px-page-x` for page/header/footer gutters, `py-page-y` for page content,
`p-card` for panels, `gap-card-gap` for cards, `gap-stack` for rows and
`gap-inline` for icon/label groups. Zero resets and structural safe-area,
keyboard, navigation and fixed-control clearance remain explicit.
Buttons keep at least 48px targets; gym controls retain their larger targets.
Chips use the explicit 38px height specified by T-278.

Type utilities: `text-micro` 11.5px, `text-xs` 12px, `text-row` 13px,
`text-sm` 14px, `text-md` 15px, `text-title` 19px, `text-h` 24px.
The existing stat tokens remain 32/40/48/60px. The Arabic font stacks are unchanged.

### Approved reference exceptions

Landing and guided demo layouts retain their approved spacing whenever a responsive
token would alter it by more than 1px. Their CSS maps fixed 8px, 20px and 48px
spacing to `inline`, `control` and `touch`; other fixed values and fluid `clamp()`
expressions stay explicit. Their type values map only within 1px. The comparison
rows in Why KOCHIVO have no minimum height because they are non-interactive.
SVG chart coordinates/type, media dimensions, negative overlap margins, full-screen
workout panels, skeleton placeholders and safe-area/navigation clearance stay intentional.
Legacy shell, admin screens and development playgrounds are outside this sweep.

### Values intentionally retained

- Zero resets (`p-0`, `px-0`, `pb-0`, `gap-0`, etc.).
- `--safe-*`, `--nav-clearance`, `--page-bottom-clearance`, keyboard and builder action offsets, and their `max()`/`calc()` expressions.
- Bottom/overlay clearance: `pb-20`, `pb-24`, `pb-28`, `pb-32`, `pb-40`, `pb-52`, `pb-[104px]`, `pb-[120px]`; fixed inset/control clearance `pe-20`, `pt-[134px]`, `ms-touch`, `pe-touch`, `ps-touch`.
- Media/chart dimensions, overlapping decorative margins, full-screen gym layouts and loading placeholders. SVG chart axis text stays `text-[10px]`.
- Landing header signup padding stays `px-4` (16px); guided demo card/card-gap stay 20/16px, default/compact control padding stays 16/12px, input insets stay 16px, chips stay 48px high with 16px insets, and stepper icon padding stays 6px to preserve the approved reference.
- Arabic font family stacks, marketing slogan `clamp()` and responsive reference dimensions.
- `src/features/marketing/components/landing.module.css` fixed/fluid spacing retained: `0px`, `clamp(72px, 8.5vw, 120px)`, `16px`, `12px`, `clamp(56px, 8vw, 104px)`, `10px`, `26px`, `.14em`, `-.04em`, `22px`, `34px`, `clamp(48px, 6vw, 80px)`, `clamp(40px, 5vw, 72px)`, `3px`, `40px`, `clamp(24px, 4vw, 48px)`, `28px`, `24px`, `4px`, `48px`, `14px`, `6px`, `-6px`, `32px`, `18px`, `clamp(32px, 6vw, 96px)`, `56px`, `36px`, `8px`, `clamp(72px, 10vw, 128px)`, `-60px`, `-56px`, `38px`, `7px`.
- `src/features/marketing/components/preview.module.css` fixed/fluid spacing retained: `12px`, `14px`, `10px`, `2px`, `18px`, `16px`, `4px`, `7px`, `6px`, `3px`, `9px`, `44px`, `1px`, `11px`.
- `src/features/demo/guided/guided.css` fixed/fluid spacing retained: `6rem`, `50dvh`, `1rem`, `16px`, `12px`, `6px`.

### File-by-file sweep

Removed/added spacing and type utilities are shown; unchanged utilities are omitted.

| Area | File | Before | After |
|---|---|---|---|
| Routes/tokens | `src/app/[locale]/(captain)/captain/billing/loading.tsx` | `p-4` | `p-card` |
| Routes/tokens | `src/app/[locale]/(captain)/captain/inbox/loading.tsx` | `p-4` | `p-card` |
| Routes/tokens | `src/app/[locale]/(captain)/captain/join/error.tsx` | `space-y-4`, `p-5` | `space-y-card-gap`, `p-card` |
| Routes/tokens | `src/app/[locale]/(captain)/captain/leaderboard/loading.tsx` | `p-4` | `p-card` |
| Routes/tokens | `src/app/[locale]/(captain)/captain/library/exercises/loading.tsx` | `p-4` | `p-card` |
| Routes/tokens | `src/app/[locale]/(captain)/captain/nutrition/[planId]/loading.tsx` | `p-4` | `p-card` |
| Routes/tokens | `src/app/[locale]/(captain)/captain/nutrition/loading.tsx` | `p-4` | `p-card` |
| Routes/tokens | `src/app/[locale]/(captain)/captain/players/[playerId]/nutrition/loading.tsx` | `p-4` | `p-card` |
| Routes/tokens | `src/app/[locale]/(captain)/captain/players/[playerId]/preview/loading.tsx` | `p-4` | `p-card` |
| Routes/tokens | `src/app/[locale]/(captain)/captain/players/[playerId]/preview/page.tsx` | `p-4` | `p-card` |
| Routes/tokens | `src/app/[locale]/(captain)/captain/players/[playerId]/programs/loading.tsx` | `p-4` | `p-card` |
| Routes/tokens | `src/app/[locale]/(captain)/captain/players/[playerId]/programs/page.tsx` | `space-y-6` | `space-y-section` |
| Routes/tokens | `src/app/[locale]/(captain)/captain/players/loading.tsx` | `p-4` | `p-card` |
| Routes/tokens | `src/app/[locale]/(captain)/captain/programs/loading.tsx` | `p-4` | `p-card` |
| Routes/tokens | `src/app/[locale]/(captain)/captain/settings/loading.tsx` | `p-4` | `p-card` |
| Routes/tokens | `src/app/[locale]/(captain)/captain/templates/loading.tsx` | `p-4` | `p-card` |
| Routes/tokens | `src/app/[locale]/(player)/player/assessments/loading.tsx` | `p-5` | `p-card` |
| Routes/tokens | `src/app/[locale]/(player)/player/captain/loading.tsx` | `p-5` | `p-card` |
| Routes/tokens | `src/app/[locale]/(player)/player/captain/profile/loading.tsx` | `p-5` | `p-card` |
| Routes/tokens | `src/app/[locale]/(player)/player/history/loading.tsx` | `p-5` | `p-card` |
| Routes/tokens | `src/app/[locale]/(player)/player/loading.tsx` | `p-5` | `p-card` |
| Routes/tokens | `src/app/[locale]/(player)/player/nutrition/loading.tsx` | `p-5` | `p-card` |
| Routes/tokens | `src/app/[locale]/(player)/player/onboarding/loading.tsx` | `p-5` | `p-card` |
| Routes/tokens | `src/app/[locale]/(player)/player/progress/loading.tsx` | `p-5` | `p-card` |
| Routes/tokens | `src/app/[locale]/(player)/player/rank/loading.tsx` | `p-4` | `p-card` |
| Routes/tokens | `src/app/[locale]/(player)/player/settings/loading.tsx` | `p-5` | `p-card` |
| Routes/tokens | `src/app/[locale]/(player)/player/settings/page.tsx` | `px-5`, `pt-6` | `px-page-x`, `pt-section` |
| Routes/tokens | `src/app/[locale]/c/[slug]/error.tsx` | `p-6` | `p-section` |
| Routes/tokens | `src/app/[locale]/ko/page.tsx` | `px-4`, `pb-8`, `gap-3`, `p-4`, `px-3` | `px-page-x`, `pb-section`, `gap-stack`, `p-card`, `px-stack` |
| Routes/tokens | `src/app/[locale]/offline/page.tsx` | `gap-3`, `px-6` | `gap-stack`, `px-page-x` |
| Routes/tokens | `src/app/global-error.tsx` | `p-6`, `mt-3`, `mt-6`, `px-6` | `p-section`, `mt-stack`, `mt-section`, `px-page-x` |
| Routes/tokens | `src/app/globals.css` | Fixed CSS values | `text-micro`, `text-row`, `text-md`, `text-title`, `text-h` |
| auth | `src/features/auth/components/captain-auth-card.tsx` | `px-6`, `gap-6`, `gap-3`, `space-y-2`, `pt-6`, `space-y-1`, `p-6`, `space-y-6`, `p-8`, `space-y-4` | `px-page-x`, `gap-section`, `gap-stack`, `space-y-inline`, `pt-section`, `p-section`, `space-y-section`, `space-y-card-gap` |
| auth | `src/features/auth/components/coach-signup.tsx` | `p-6`, `space-y-6`, `p-8`, `space-y-4` | `p-section`, `space-y-section`, `space-y-card-gap` |
| auth | `src/features/auth/components/forgot-password-flow.tsx` | `p-6`, `space-y-6`, `p-8`, `space-y-4` | `p-section`, `space-y-section`, `space-y-card-gap` |
| auth | `src/features/auth/components/google-button.tsx` | `space-y-2` | `space-y-inline` |
| auth | `src/features/auth/components/login-methods.tsx` | `space-y-4` | `space-y-card-gap` |
| auth | `src/features/auth/components/otp-input.tsx` | `gap-2`, `px-2` | `gap-inline`, `px-inline` |
| auth | `src/features/auth/components/player-invite-flow.tsx` | `p-6`, `space-y-6`, `p-4`, `space-y-4` | `p-section`, `space-y-section`, `p-card`, `space-y-card-gap` |
| auth | `src/features/auth/components/reset-password-form.tsx` | `p-6`, `space-y-6`, `p-8`, `space-y-4` | `p-section`, `space-y-section`, `space-y-card-gap` |
| auth | `src/features/auth/components/signup-code-step.tsx` | `space-y-4` | `space-y-card-gap` |
| auth | `src/features/auth/components/suspended-screen.tsx` | `p-6`, `space-y-6`, `p-8`, `px-6` | `p-section`, `space-y-section`, `px-page-x` |
| billing | `src/features/billing/choice/pricing-cards.tsx` | `space-y-[18px]`, `gap-3`, `px-[18px]`, `py-3.5`, `text-[13px]`, `space-y-1.5`, `text-[30px]`, `gap-1`, `p-1`, `px-5`, `gap-3.5`, `gap-2.5`, `py-[22px]`, `px-2.5`, `py-1`, `text-[11px]`, `text-[19px]`, `gap-2`, `px-3`, `py-2`, `text-[32px]`, `text-[15px]`, `mt-1.5`, `p-5` | `space-y-card-gap`, `gap-stack`, `px-page-x`, `py-card`, `text-row`, `space-y-inline`, `text-stat`, `gap-inline`, `p-inline`, `gap-card-gap`, `py-page-y`, `px-stack`, `py-inline`, `text-micro`, `text-title`, `text-md`, `mt-inline`, `p-card` |
| billing | `src/features/billing/choice/renewal-choice.tsx` | `px-5`, `p-5`, `space-y-3` | `px-page-x`, `p-card`, `space-y-stack` |
| billing | `src/features/billing/choice/renewal-requests.tsx` | `space-y-3`, `p-5`, `text-[19px]`, `px-4`, `gap-3`, `py-3`, `gap-2` | `space-y-stack`, `p-card`, `text-title`, `px-page-x`, `gap-stack`, `py-stack`, `gap-inline` |
| billing | `src/features/billing/components/activate-sheet.tsx` | `p-6`, `gap-3`, `mt-5`, `space-y-4`, `space-y-2`, `p-3` | `p-section`, `gap-stack`, `mt-card-gap`, `space-y-card-gap`, `space-y-inline`, `p-stack` |
| billing | `src/features/billing/components/balance-badges.tsx` | `gap-2`, `px-3`, `py-1` | `gap-inline`, `px-stack`, `py-inline` |
| billing | `src/features/billing/components/billing-manager-card.tsx` | `space-y-3`, `p-5`, `px-3`, `py-1`, `gap-2` | `space-y-stack`, `p-card`, `px-stack`, `py-inline`, `gap-inline` |
| billing | `src/features/billing/components/billing-screen.tsx` | `space-y-6`, `mt-2`, `gap-6`, `space-y-4`, `space-y-3` | `space-y-section`, `mt-inline`, `gap-section`, `space-y-card-gap`, `space-y-stack` |
| billing | `src/features/billing/components/collect-sheet.tsx` | `p-6`, `mb-6`, `gap-4`, `space-y-5`, `p-4` | `p-section`, `mb-section`, `gap-card-gap`, `space-y-card-gap`, `p-card` |
| billing | `src/features/billing/components/finance-summary.tsx` | `space-y-3`, `gap-3`, `space-y-1`, `p-5` | `space-y-stack`, `gap-stack`, `space-y-inline`, `p-card` |
| billing | `src/features/billing/components/packages-card.tsx` | `space-y-4`, `p-5`, `space-y-1`, `space-y-2`, `gap-3`, `ps-4`, `pe-1`, `py-2`, `space-y-3`, `mt-2`, `px-3`, `gap-1`, `p-1`, `gap-2` | `space-y-card-gap`, `p-card`, `space-y-inline`, `gap-stack`, `ps-card`, `pe-inline`, `py-inline`, `space-y-stack`, `mt-inline`, `px-stack`, `gap-inline`, `p-inline` |
| billing | `src/features/billing/components/payment-history.tsx` | `p-5`, `mb-3`, `text-[19px]`, `space-y-2`, `py-3`, `gap-2`, `mt-3` | `p-card`, `mb-stack`, `text-title`, `space-y-inline`, `py-stack`, `gap-inline`, `mt-stack` |
| billing | `src/features/billing/components/payment-method-picker.tsx` | `space-y-2`, `mb-2`, `px-3`, `gap-3`, `p-3`, `px-4` | `space-y-inline`, `mb-inline`, `px-stack`, `gap-stack`, `p-stack`, `px-page-x` |
| billing | `src/features/billing/components/payment-player-picker.tsx` | `p-5`, `mb-3`, `gap-3`, `text-[19px]`, `px-4`, `px-3` | `p-card`, `mb-stack`, `gap-stack`, `text-title`, `px-page-x`, `px-stack` |
| billing | `src/features/billing/components/plan-badge-error.tsx` | `gap-2`, `px-4`, `px-2` | `gap-inline`, `px-page-x`, `px-inline` |
| billing | `src/features/billing/components/plan-badge.tsx` | `gap-2`, `px-4` | `gap-inline`, `px-page-x` |
| billing | `src/features/billing/components/plan-card.tsx` | `space-y-5`, `p-6`, `mt-3`, `space-y-3`, `px-4` | `space-y-card-gap`, `p-section`, `mt-stack`, `space-y-stack`, `px-page-x` |
| billing | `src/features/billing/components/plan-sidebar.tsx` | `px-4`, `py-3`, `space-y-2`, `px-3`, `py-2` | `px-page-x`, `py-stack`, `space-y-inline`, `px-stack`, `py-inline` |
| billing | `src/features/billing/components/player-billing-row.tsx` | `space-y-4`, `p-5`, `gap-3`, `gap-2`, `px-3`, `py-1`, `mt-1`, `px-4` | `space-y-card-gap`, `p-card`, `gap-stack`, `gap-inline`, `px-stack`, `py-inline`, `mt-inline`, `px-page-x` |
| billing | `src/features/billing/components/player-waiting-room.tsx` | `min-h-80`, `p-5`, `gap-5`, `p-8` | `p-card`, `gap-card-gap`, `p-section` |
| billing | `src/features/billing/components/renew-sheet.tsx` | `p-6`, `mb-6`, `gap-4`, `space-y-5`, `space-y-2`, `mb-2`, `gap-2`, `p-4` | `p-section`, `mb-section`, `gap-card-gap`, `space-y-card-gap`, `space-y-inline`, `mb-inline`, `gap-inline`, `p-card` |
| billing | `src/features/billing/components/workspace-billing-row.tsx` | `gap-3`, `px-[18px]`, `py-3`, `gap-2.5`, `text-[13px]`, `px-2.5`, `py-1`, `text-[11.5px]`, `gap-2`, `px-3`, `text-[12.5px]`, `px-4`, `pb-3` | `gap-stack`, `px-page-x`, `py-stack`, `text-row`, `px-stack`, `py-inline`, `text-micro`, `gap-inline`, `text-xs`, `pb-stack` |
| billing | `src/features/billing/components/workspace-billing-tiles.tsx` | `gap-4`, `gap-3`, `p-[18px]` | `gap-card-gap`, `gap-stack`, `p-card` |
| billing | `src/features/billing/components/workspace-billing.tsx` | `space-y-[18px]`, `px-4`, `text-[13px]`, `p-3`, `gap-3.5`, `p-[18px]`, `mb-2`, `gap-2`, `px-2.5`, `py-1`, `py-3`, `p-5` | `space-y-card-gap`, `px-page-x`, `text-row`, `p-stack`, `gap-card-gap`, `p-card`, `mb-inline`, `gap-inline`, `px-stack`, `py-inline`, `py-stack` |
| billing | `src/features/billing/components/workspace-catalog.tsx` | `space-y-4`, `gap-4`, `p-5` | `space-y-card-gap`, `gap-card-gap`, `p-card` |
| billing | `src/features/billing/components/workspace-offers-card.tsx` | `p-[18px]`, `gap-3`, `px-4`, `px-3`, `py-3`, `px-2.5`, `py-1`, `text-[11px]` | `p-card`, `gap-stack`, `px-page-x`, `px-stack`, `py-stack`, `py-inline`, `text-micro` |
| billing | `src/features/billing/components/workspace-packages.tsx` | `px-5`, `py-[18px]`, `mb-2`, `px-4`, `gap-2.5`, `py-3`, `text-[13px]`, `mt-2`, `p-5`, `mb-3`, `gap-3`, `text-[19px]` | `px-page-x`, `py-page-y`, `mb-inline`, `gap-stack`, `py-stack`, `text-row`, `mt-inline`, `p-card`, `mb-stack`, `text-title` |
| billing | `src/features/billing/components/workspace-payments-table.tsx` | `p-[18px]`, `mb-3`, `gap-3`, `px-4`, `text-[13px]`, `pb-3`, `py-3`, `py-1`, `pe-2`, `px-2.5` | `p-card`, `mb-stack`, `gap-stack`, `px-page-x`, `text-row`, `pb-stack`, `py-stack`, `py-inline`, `pe-inline`, `px-stack` |
| billing | `src/features/billing/components/workspace-plan.tsx` | `px-5`, `py-[18px]`, `my-1.5`, `text-[19px]`, `text-[22px]`, `mb-3.5`, `mt-2.5`, `mb-3`, `px-3`, `text-[12.5px]`, `mt-2` | `px-page-x`, `py-page-y`, `my-inline`, `text-title`, `text-h`, `mb-card-gap`, `mt-stack`, `mb-stack`, `px-stack`, `mt-inline` |
| billing | `src/features/billing/components/workspace-player-detail.tsx` | `p-5`, `mb-4`, `gap-3`, `text-[19px]`, `space-y-4` | `p-card`, `mb-card-gap`, `gap-stack`, `text-title`, `space-y-card-gap` |
| billing | `src/features/billing/components/workspace-tier-card.tsx` | `p-[18px]`, `px-2.5`, `py-1`, `text-[11px]`, `pe-14`, `mt-1`, `my-3`, `space-y-1.5`, `text-[12.5px]`, `gap-2`, `mb-1.5`, `px-3`, `text-[13px]`, `py-2`, `py-3`, `mt-2`, `mt-2.5` | `p-card`, `px-stack`, `py-inline`, `text-micro`, `pe-section`, `mt-inline`, `my-stack`, `space-y-inline`, `gap-inline`, `mb-inline`, `text-row`, `py-stack`, `mt-stack` |
| billing | `src/features/billing/offers/offer-fields.tsx` | `px-3.5`, `text-[12.5px]`, `mb-2`, `gap-2`, `p-3.5`, `mb-1`, `mt-2`, `px-3`, `gap-3`, `gap-2.5`, `py-2`, `text-[13px]` | `px-card`, `mb-inline`, `gap-inline`, `p-card`, `mt-inline`, `px-stack`, `gap-stack`, `py-inline`, `text-row` |
| billing | `src/features/billing/offers/offer-preview.tsx` | `mb-3`, `text-[11px]`, `space-y-3`, `px-5`, `py-[22px]`, `px-2.5`, `py-1`, `gap-2`, `text-[32px]`, `text-[15px]`, `mt-[26px]`, `px-[18px]`, `py-3.5`, `text-[12.5px]` | `mb-stack`, `text-micro`, `space-y-stack`, `px-page-x`, `py-page-y`, `px-stack`, `py-inline`, `gap-inline`, `text-stat`, `text-md`, `mt-section`, `py-card`, `text-xs` |
| billing | `src/features/billing/offers/offer-screen.tsx` | `mb-[18px]`, `gap-3.5`, `text-[30px]`, `mb-4`, `gap-[18px]`, `space-y-4`, `px-5`, `py-[18px]`, `mb-2`, `gap-2`, `px-3.5`, `text-[12.5px]` | `mb-card-gap`, `gap-card-gap`, `text-stat`, `space-y-card-gap`, `px-page-x`, `py-page-y`, `mb-inline`, `gap-inline`, `px-card` |
| billing | `src/features/billing/offers/offers-card.tsx` | `gap-3.5`, `px-[18px]`, `py-3.5`, `text-[13px]`, `gap-2`, `px-2.5`, `py-1`, `text-[11.5px]`, `mt-1`, `text-[12.5px]`, `py-3`, `py-2` | `gap-card-gap`, `px-page-x`, `py-card`, `text-row`, `gap-inline`, `px-stack`, `py-inline`, `text-micro`, `mt-inline`, `py-stack` |
| billing | `src/features/billing/receipts/captain-receipts.tsx` | `p-[18px]`, `mb-2`, `gap-3`, `px-3`, `py-1`, `px-4`, `py-4` | `p-card`, `mb-inline`, `gap-stack`, `px-stack`, `py-inline`, `px-page-x`, `py-page-y` |
| billing | `src/features/billing/receipts/player-receipt.tsx` | `space-y-2`, `px-4`, `space-y-3`, `pt-4`, `px-5` | `space-y-inline`, `px-page-x`, `space-y-stack`, `pt-card` |
| billing | `src/features/billing/receipts/review-row.tsx` | `space-y-3`, `py-4`, `gap-3`, `mt-1`, `px-4`, `space-y-1`, `ms-3`, `px-3`, `gap-2` | `space-y-stack`, `py-page-y`, `gap-stack`, `mt-inline`, `px-page-x`, `space-y-inline`, `ms-stack`, `px-stack`, `gap-inline` |
| billing | `src/features/billing/receipts/upload-sheet.tsx` | `p-6`, `mb-5`, `gap-3`, `px-4`, `space-y-4`, `gap-2`, `p-5`, `space-y-2`, `px-3` | `p-section`, `mb-card-gap`, `gap-stack`, `px-page-x`, `space-y-card-gap`, `gap-inline`, `p-card`, `space-y-inline`, `px-stack` |
| billing | `src/features/billing/tiers/catalog-screen.tsx` | `space-y-4`, `mb-[18px]`, `gap-3.5`, `text-[30px]`, `mt-1`, `text-[13px]`, `px-3.5`, `text-[12.5px]`, `gap-3`, `space-y-3`, `p-5`, `gap-2`, `mt-[26px]`, `px-[18px]`, `py-3.5` | `space-y-card-gap`, `mb-card-gap`, `gap-card-gap`, `text-stat`, `mt-inline`, `text-row`, `px-card`, `gap-stack`, `space-y-stack`, `p-card`, `gap-inline`, `mt-section`, `px-page-x`, `py-card` |
| billing | `src/features/billing/tiers/package-sheet.tsx` | `p-5`, `mb-4`, `text-[19px]`, `mt-3`, `mt-4`, `gap-2` | `p-card`, `mb-card-gap`, `text-title`, `mt-stack`, `mt-card-gap`, `gap-inline` |
| billing | `src/features/billing/tiers/tier-card.tsx` | `gap-2.5`, `px-[18px]`, `py-2`, `px-2`, `py-1`, `text-[11.5px]`, `space-y-1`, `p-2`, `pt-3`, `py-3`, `text-[12.5px]`, `gap-1.5`, `mt-1.5`, `text-[13px]`, `py-0.5`, `text-[11px]`, `text-[15px]`, `gap-2` | `gap-stack`, `px-page-x`, `py-inline`, `px-inline`, `text-micro`, `space-y-inline`, `p-inline`, `pt-stack`, `py-stack`, `gap-inline`, `mt-inline`, `text-row`, `text-md` |
| billing | `src/features/billing/tiers/tier-sheet.tsx` | `p-5`, `space-y-4`, `text-[19px]`, `mt-2`, `p-3`, `px-3`, `gap-2` | `p-card`, `space-y-card-gap`, `text-title`, `mt-inline`, `p-stack`, `px-stack`, `gap-inline` |
| billing | `src/features/billing/tiers/unassigned-packages.tsx` | `p-5`, `text-[19px]`, `gap-3`, `py-3` | `p-card`, `text-title`, `gap-stack`, `py-stack` |
| body-scans | `src/features/body-scans/components/scan-file.tsx` | `space-y-2` | `space-y-inline` |
| body-scans | `src/features/body-scans/components/scan-metrics.tsx` | `space-y-3`, `p-5`, `gap-2`, `space-y-1`, `space-y-2`, `p-2`, `p-3`, `text-[11px]`, `text-[11.5px]` | `space-y-stack`, `p-card`, `gap-inline`, `space-y-inline`, `p-inline`, `p-stack`, `text-micro` |
| body-scans | `src/features/body-scans/components/scan-section.tsx` | `space-y-4`, `p-5`, `gap-2`, `text-[19px]`, `space-y-2`, `p-4`, `gap-3`, `p-3`, `ps-4`, `space-y-3` | `space-y-card-gap`, `p-card`, `gap-inline`, `text-title`, `space-y-inline`, `gap-stack`, `p-stack`, `ps-card`, `space-y-stack` |
| body-scans | `src/features/body-scans/components/scan-sheet.tsx` | `p-5`, `mb-4`, `space-y-4`, `space-y-1`, `px-3`, `py-2` | `p-card`, `mb-card-gap`, `space-y-card-gap`, `space-y-inline`, `px-stack`, `py-inline` |
| captain-approval | `src/features/captain-approval/components/captain-pending-screen.tsx` | `gap-3`, `p-4`, `p-6`, `px-[18px]`, `py-3`, `text-[15px]`, `gap-4`, `p-[18px]`, `space-y-6`, `p-8`, `px-6` | `gap-stack`, `p-card`, `p-section`, `px-page-x`, `py-stack`, `text-md`, `gap-card-gap`, `space-y-section` |
| captain-approval | `src/features/captain-approval/components/intake-form.tsx` | `px-4`, `space-y-4`, `p-[18px]`, `space-y-6`, `p-6`, `space-y-2`, `gap-2` | `px-page-x`, `space-y-card-gap`, `p-card`, `space-y-section`, `p-section`, `space-y-inline`, `gap-inline` |
| captain-approval | `src/features/captain-approval/components/intake-load-error.tsx` | `p-6` | `p-section` |
| captain-approval | `src/features/captain-approval/components/intake-radio-group.tsx` | `space-y-2`, `gap-3`, `p-4` | `space-y-inline`, `gap-stack`, `p-card` |
| captain-approval | `src/features/captain-approval/components/pending-intake.tsx` | `gap-3`, `p-4`, `p-6`, `px-[18px]`, `py-3`, `text-[15px]`, `space-y-4` | `gap-stack`, `p-card`, `p-section`, `px-page-x`, `py-stack`, `text-md`, `space-y-card-gap` |
| captain-workspace | `src/features/captain-workspace/components/exercise-row.tsx` | `gap-3`, `p-3`, `gap-4`, `p-4`, `mt-1` | `gap-stack`, `p-stack`, `gap-card-gap`, `p-card`, `mt-inline` |
| captain-workspace | `src/features/captain-workspace/components/mobile-actions.tsx` | `gap-3`, `p-4`, `gap-2`, `px-4` | `gap-stack`, `p-card`, `gap-inline`, `px-page-x` |
| captain-workspace | `src/features/captain-workspace/components/player-file-fact.tsx` | `space-y-2`, `pb-4`, `gap-2`, `px-2`, `py-1` | `space-y-inline`, `pb-card`, `gap-inline`, `px-inline`, `py-inline` |
| captain-workspace | `src/features/captain-workspace/components/player-file-panel.tsx` | `space-y-5`, `space-y-3`, `gap-3`, `p-3`, `space-y-2`, `gap-2`, `gap-1`, `space-y-4`, `space-y-1` | `space-y-card-gap`, `space-y-stack`, `gap-stack`, `p-stack`, `space-y-inline`, `gap-inline` |
| captain-workspace | `src/features/captain-workspace/components/player-file-sheet.tsx` | `p-3`, `p-6`, `mb-5`, `gap-4` | `p-stack`, `p-section`, `mb-card-gap`, `gap-card-gap` |
| captain-workspace | `src/features/captain-workspace/components/player-file-slot.tsx` | `p-6`, `space-y-3` | `p-section`, `space-y-stack` |
| captain-workspace | `src/features/captain-workspace/components/player-file-summary.tsx` | `gap-2`, `px-2`, `py-1` | `gap-inline`, `px-inline`, `py-inline` |
| captain-workspace | `src/features/captain-workspace/components/week-strip.tsx` | `gap-1`, `px-1`, `py-3`, `px-3` | `gap-inline`, `px-inline`, `py-stack`, `px-stack` |
| captain-workspace | `src/features/captain-workspace/components/workspace-content.tsx` | `gap-6`, `space-y-5` | `gap-section`, `space-y-card-gap` |
| captain-workspace | `src/features/captain-workspace/components/workspace-header.tsx` | `gap-x-3`, `pb-4`, `gap-4`, `gap-2`, `gap-1`, `px-3`, `px-5` | `gap-x-stack`, `pb-card`, `gap-card-gap`, `gap-inline`, `px-stack`, `px-page-x` |
| captain-workspace | `src/features/captain-workspace/components/workspace-plan.tsx` | `space-y-5`, `gap-4`, `space-y-2`, `p-6`, `space-y-3` | `space-y-card-gap`, `gap-card-gap`, `space-y-inline`, `p-section`, `space-y-stack` |
| captain-workspace | `src/features/captain-workspace/components/workspace-state.tsx` | `p-6`, `space-y-3`, `px-4` | `p-section`, `space-y-stack`, `px-page-x` |
| captain-workspace | `src/features/captain-workspace/forms/form-answers.tsx` | `py-6`, `gap-2`, `py-4`, `px-3`, `mt-1`, `mt-2` | `py-page-y`, `gap-inline`, `px-stack`, `mt-inline` |
| captain-workspace | `src/features/captain-workspace/forms/form-detail.tsx` | `p-6`, `mb-4`, `gap-3`, `mt-1`, `mt-4`, `space-y-3`, `space-y-2`, `p-3`, `px-6` | `p-section`, `mb-card-gap`, `gap-stack`, `mt-inline`, `mt-card-gap`, `space-y-stack`, `space-y-inline`, `p-stack`, `px-page-x` |
| captain-workspace | `src/features/captain-workspace/forms/form-photos.tsx` | `space-y-3`, `py-4`, `px-4`, `gap-3` | `space-y-stack`, `py-page-y`, `px-page-x`, `gap-stack` |
| captain-workspace | `src/features/captain-workspace/forms/forms-screen.tsx` | `space-y-4`, `gap-6` | `space-y-card-gap`, `gap-section` |
| captain-workspace | `src/features/captain-workspace/forms/forms-state.tsx` | `p-6`, `px-4` | `p-section`, `px-page-x` |
| captain-workspace | `src/features/captain-workspace/forms/forms-timeline.tsx` | `space-y-4`, `gap-3`, `p-6`, `px-3`, `space-y-2`, `gap-2` | `space-y-card-gap`, `gap-stack`, `p-section`, `px-stack`, `space-y-inline`, `gap-inline` |
| captain-workspace | `src/features/captain-workspace/library/exercise-card.tsx` | `gap-2`, `p-4`, `p-3`, `mt-1`, `pt-2`, `px-2`, `py-1` | `gap-inline`, `p-card`, `p-stack`, `mt-inline`, `pt-inline`, `px-inline`, `py-inline` |
| captain-workspace | `src/features/captain-workspace/library/exercise-detail.tsx` | `p-4`, `p-5`, `mb-3.5`, `gap-3`, `p-3`, `text-[15px]`, `gap-2`, `px-4`, `space-y-3`, `p-3.5`, `mb-2.5`, `py-2`, `px-2`, `py-1`, `ps-5`, `text-[13px]` | `p-card`, `mb-card-gap`, `gap-stack`, `p-stack`, `text-md`, `gap-inline`, `px-page-x`, `space-y-stack`, `mb-stack`, `py-inline`, `px-inline`, `ps-card`, `text-row` |
| captain-workspace | `src/features/captain-workspace/library/exercise-form.tsx` | `space-y-3`, `p-6`, `mt-2`, `px-3`, `gap-3`, `p-3`, `text-[15px]`, `mt-1`, `px-5`, `p-[18px]`, `gap-4`, `ms-2`, `gap-2`, `ps-5`, `py-3` | `space-y-stack`, `p-section`, `mt-inline`, `px-stack`, `gap-stack`, `p-stack`, `text-md`, `px-page-x`, `p-card`, `gap-card-gap`, `ms-inline`, `gap-inline`, `ps-card`, `py-stack` |
| captain-workspace | `src/features/captain-workspace/library/exercise-library.tsx` | `gap-5`, `gap-4`, `gap-3`, `gap-2`, `px-5`, `px-3`, `gap-1`, `px-4`, `p-5`, `p-6` | `gap-card-gap`, `gap-stack`, `gap-inline`, `px-page-x`, `px-stack`, `p-card`, `p-section` |
| captain-workspace | `src/features/captain-workspace/library/exercise-preview.tsx` | `p-[18px]`, `mb-3`, `space-y-3`, `p-4`, `gap-2`, `px-3`, `py-2`, `space-y-2`, `ps-5` | `p-card`, `mb-stack`, `space-y-stack`, `gap-inline`, `px-stack`, `py-inline`, `space-y-inline`, `ps-card` |
| captain-workspace | `src/features/captain-workspace/library/exercise-program-picker.tsx` | `px-3`, `mt-4`, `space-y-3`, `p-5`, `space-y-2` | `px-stack`, `mt-card-gap`, `space-y-stack`, `p-card`, `space-y-inline` |
| captain-workspace | `src/features/captain-workspace/money-owed/money-owed-content.tsx` | `p-4` | `p-card` |
| captain-workspace | `src/features/captain-workspace/money-owed/money-owed-entry.tsx` | `p-4` | `p-card` |
| captain-workspace | `src/features/captain-workspace/money-owed/money-owed-view.tsx` | `gap-3`, `p-4`, `space-y-3`, `px-3`, `py-1` | `gap-stack`, `p-card`, `space-y-stack`, `px-stack`, `py-inline` |
| captain-workspace | `src/features/captain-workspace/player-file/archive-menu.tsx` | `mt-2`, `p-2`, `px-3` | `mt-inline`, `p-inline`, `px-stack` |
| captain-workspace | `src/features/captain-workspace/player-file/assessment-cards.tsx` | `p-5`, `mb-3`, `gap-2`, `gap-3`, `mt-3` | `p-card`, `mb-stack`, `gap-inline`, `gap-stack`, `mt-stack` |
| captain-workspace | `src/features/captain-workspace/player-file/billing-entry.tsx` | `p-5`, `mb-4`, `gap-3`, `text-[19px]` | `p-card`, `mb-card-gap`, `gap-stack`, `text-title` |
| captain-workspace | `src/features/captain-workspace/player-file/chat-entry.tsx` | `p-3`, `p-5` | `p-stack`, `p-card` |
| captain-workspace | `src/features/captain-workspace/player-file/checkin-list.tsx` | `space-y-[18px]`, `p-5`, `mb-3`, `text-[19px]`, `space-y-3`, `py-4`, `gap-2`, `px-3`, `py-1`, `gap-3`, `p-3`, `mt-3` | `space-y-card-gap`, `p-card`, `mb-stack`, `text-title`, `space-y-stack`, `py-page-y`, `gap-inline`, `px-stack`, `py-inline`, `gap-stack`, `p-stack`, `mt-stack` |
| captain-workspace | `src/features/captain-workspace/player-file/checkins.tsx` | `space-y-[18px]` | `space-y-card-gap` |
| captain-workspace | `src/features/captain-workspace/player-file/file-content.tsx` | `space-y-3`, `gap-3` | `space-y-stack`, `gap-stack` |
| captain-workspace | `src/features/captain-workspace/player-file/file-disclosure-entry.tsx` | `p-4`, `gap-3`, `mt-3` | `p-card`, `gap-stack`, `mt-stack` |
| captain-workspace | `src/features/captain-workspace/player-file/file-header.tsx` | `gap-2`, `px-4`, `px-3` | `gap-inline`, `px-page-x`, `px-stack` |
| captain-workspace | `src/features/captain-workspace/player-file/file-state.tsx` | `space-y-3`, `p-5`, `px-4` | `space-y-stack`, `p-card`, `px-page-x` |
| captain-workspace | `src/features/captain-workspace/player-file/file-tabs.tsx` | `p-1`, `gap-1`, `px-3` | `p-inline`, `gap-inline`, `px-stack` |
| captain-workspace | `src/features/captain-workspace/player-file/food-today.tsx` | `gap-3.5`, `p-3.5`, `mb-2`, `mb-3`, `my-1.5`, `gap-2` | `gap-card-gap`, `p-card`, `mb-inline`, `mb-stack`, `my-inline`, `gap-inline` |
| captain-workspace | `src/features/captain-workspace/player-file/measurements.tsx` | `p-3.5`, `mb-1`, `gap-3`, `px-2`, `py-1`, `mt-3` | `p-card`, `mb-inline`, `gap-stack`, `px-inline`, `py-inline`, `mt-stack` |
| captain-workspace | `src/features/captain-workspace/player-file/new-assessment-entry.tsx` | `gap-2`, `p-5` | `gap-inline`, `p-card` |
| captain-workspace | `src/features/captain-workspace/player-file/nutrition-summary.tsx` | `space-y-3`, `gap-3`, `py-4`, `mt-1`, `px-2`, `py-1` | `space-y-stack`, `gap-stack`, `py-page-y`, `mt-inline`, `px-inline`, `py-inline` |
| captain-workspace | `src/features/captain-workspace/player-file/overview-activity.tsx` | `gap-3`, `p-3.5`, `mb-3`, `gap-2`, `mt-2`, `py-3`, `mt-1` | `gap-stack`, `p-card`, `mb-stack`, `gap-inline`, `mt-inline`, `py-stack` |
| captain-workspace | `src/features/captain-workspace/player-file/overview-facts.tsx` | `space-y-[18px]`, `px-5`, `py-[18px]`, `mb-2`, `text-[19px]`, `py-3`, `mt-1` | `space-y-card-gap`, `px-page-x`, `py-page-y`, `mb-inline`, `text-title`, `py-stack`, `mt-inline` |
| captain-workspace | `src/features/captain-workspace/player-file/overview.tsx` | `space-y-3`, `gap-3` | `space-y-stack`, `gap-stack` |
| captain-workspace | `src/features/captain-workspace/player-file/plan-context.tsx` | `px-5`, `py-[18px]`, `text-[19px]` | `px-page-x`, `py-page-y`, `text-title` |
| captain-workspace | `src/features/captain-workspace/player-file/progress-history.tsx` | `space-y-[18px]`, `space-y-4`, `p-5`, `text-[19px]`, `gap-3`, `p-3`, `mt-2` | `space-y-card-gap`, `p-card`, `text-title`, `gap-stack`, `p-stack`, `mt-inline` |
| captain-workspace | `src/features/captain-workspace/player-file/progress-summary.tsx` | `px-5`, `py-[18px]`, `mb-3`, `text-[19px]`, `gap-3`, `space-y-2`, `p-4`, `text-[11px]` | `px-page-x`, `py-page-y`, `mb-stack`, `text-title`, `gap-stack`, `space-y-inline`, `p-card`, `text-micro` |
| captain-workspace | `src/features/captain-workspace/player-file/reminder.tsx` | `space-y-2`, `p-5`, `px-4` | `space-y-inline`, `p-card`, `px-page-x` |
| captain-workspace | `src/features/captain-workspace/player-file/status-cards.tsx` | `gap-[18px]`, `px-5`, `py-[18px]`, `my-1.5`, `text-[19px]`, `text-[12.5px]`, `mt-3`, `px-4` | `gap-card-gap`, `px-page-x`, `py-page-y`, `my-inline`, `text-title`, `mt-stack` |
| captain-workspace | `src/features/captain-workspace/player-file/training-adherence.tsx` | `gap-3.5`, `p-3.5`, `mt-1` | `gap-card-gap`, `p-card`, `mt-inline` |
| captain-workspace | `src/features/captain-workspace/queue/queue-row.tsx` | `gap-3`, `p-4`, `gap-2`, `px-3`, `py-1`, `px-5` | `gap-stack`, `p-card`, `gap-inline`, `px-stack`, `py-inline`, `px-page-x` |
| captain-workspace | `src/features/captain-workspace/queue/queue-screen.tsx` | `space-y-6`, `gap-4`, `px-5`, `p-5`, `mt-2`, `gap-2`, `px-4`, `ms-2`, `p-1`, `space-y-3`, `px-6` | `space-y-section`, `gap-card-gap`, `px-page-x`, `p-card`, `mt-inline`, `gap-inline`, `ms-inline`, `p-inline`, `space-y-stack` |
| captain-workspace | `src/features/captain-workspace/queue/queue-state.tsx` | `p-6`, `mt-2`, `mt-3`, `px-5` | `p-section`, `mt-inline`, `mt-stack`, `px-page-x` |
| captain-workspace | `src/features/captain-workspace/queue/review-dialog.tsx` | `space-y-5`, `p-6`, `gap-3`, `p-4`, `space-y-3` | `space-y-card-gap`, `p-section`, `gap-stack`, `p-card`, `space-y-stack` |
| captain-workspace | `src/features/captain-workspace/queue/task-compose.tsx` | `mt-3`, `space-y-2`, `gap-2`, `p-1.5`, `gap-1`, `px-3` | `mt-stack`, `space-y-inline`, `gap-inline`, `p-inline`, `px-stack` |
| captain-workspace | `src/features/captain-workspace/queue/task-detail.tsx` | `p-[18px]`, `mb-2.5`, `gap-2`, `px-3`, `mb-3.5`, `gap-2.5`, `mt-1`, `my-2.5`, `px-4` | `p-card`, `mb-stack`, `gap-inline`, `px-stack`, `mb-card-gap`, `gap-stack`, `mt-inline`, `my-stack`, `px-page-x` |
| captain-workspace | `src/features/captain-workspace/queue/task-media.tsx` | `px-3`, `gap-2`, `mt-3`, `py-3` | `px-stack`, `gap-inline`, `mt-stack`, `py-stack` |
| captain-workspace | `src/features/captain-workspace/queue/task-row.tsx` | `gap-3`, `p-2.5`, `mt-1`, `px-2.5`, `py-1`, `text-[11px]`, `px-3` | `gap-stack`, `p-stack`, `mt-inline`, `px-stack`, `py-inline`, `text-micro` |
| captain-workspace | `src/features/captain-workspace/queue/tasks-screen.tsx` | `space-y-4`, `gap-1`, `p-1`, `px-3`, `ms-1`, `gap-4`, `p-[18px]`, `py-12` | `space-y-card-gap`, `gap-inline`, `p-inline`, `px-stack`, `ms-inline`, `gap-card-gap`, `p-card`, `py-section` |
| captain-workspace | `src/features/captain-workspace/queue/tasks-state.tsx` | `p-6`, `py-9`, `mt-3`, `mt-2`, `px-4` | `p-section`, `py-section`, `mt-stack`, `mt-inline`, `px-page-x` |
| captain-workspace | `src/features/captain-workspace/route.test.ts` | `space-y-6` | `space-y-section` |
| captain-workspace | `src/features/captain-workspace/training/alternatives-sheet.tsx` | `space-y-3`, `p-5`, `gap-3`, `text-[19px]`, `px-3`, `gap-2` | `space-y-stack`, `p-card`, `gap-stack`, `text-title`, `px-stack`, `gap-inline` |
| captain-workspace | `src/features/captain-workspace/training/assignment-sheet.tsx` | `space-y-3`, `p-5`, `text-[19px]`, `px-3`, `gap-3`, `px-4` | `space-y-stack`, `p-card`, `text-title`, `px-stack`, `gap-stack`, `px-page-x` |
| captain-workspace | `src/features/captain-workspace/training/cardio-block.tsx` | `gap-2.5`, `px-[18px]`, `py-3.5`, `text-[19px]`, `px-3`, `space-y-3`, `p-[18px]` | `gap-stack`, `px-page-x`, `py-card`, `text-title`, `px-stack`, `space-y-stack`, `p-card` |
| captain-workspace | `src/features/captain-workspace/training/cardio-row.tsx` | `space-y-3`, `p-4`, `gap-2` | `space-y-stack`, `p-card`, `gap-inline` |
| captain-workspace | `src/features/captain-workspace/training/custom-exercise.tsx` | `px-[18px]`, `pb-3`, `px-3` | `px-page-x`, `pb-stack`, `px-stack` |
| captain-workspace | `src/features/captain-workspace/training/day-exercises.tsx` | `gap-2.5`, `px-[18px]`, `py-3.5`, `text-[19px]`, `p-5` | `gap-stack`, `px-page-x`, `py-card`, `text-title`, `p-card` |
| captain-workspace | `src/features/captain-workspace/training/day-rail.tsx` | `gap-2`, `px-3.5`, `py-3`, `text-[11.5px]`, `my-2`, `px-3`, `px-4` | `gap-inline`, `px-card`, `py-stack`, `text-micro`, `my-inline`, `px-stack`, `px-page-x` |
| captain-workspace | `src/features/captain-workspace/training/day-summary.tsx` | `gap-[18px]`, `px-5`, `py-[18px]`, `text-[19px]`, `gap-2`, `text-[10.5px]` | `gap-card-gap`, `px-page-x`, `py-page-y`, `text-title`, `gap-inline`, `text-micro` |
| captain-workspace | `src/features/captain-workspace/training/editor-header.tsx` | `gap-3`, `pt-5`, `gap-1`, `text-[30px]`, `px-3`, `py-1`, `gap-2`, `px-4` | `gap-stack`, `pt-card`, `gap-inline`, `text-stat`, `px-stack`, `py-inline`, `px-page-x` |
| captain-workspace | `src/features/captain-workspace/training/exercise-fields.tsx` | `p-3`, `gap-2.5`, `gap-2`, `text-[11px]`, `gap-3` | `p-stack`, `gap-stack`, `gap-inline`, `text-micro` |
| captain-workspace | `src/features/captain-workspace/training/exercise-row.tsx` | `mx-[18px]`, `px-[18px]`, `pt-2`, `text-[11px]`, `gap-2`, `gap-3`, `py-3`, `text-[11.5px]`, `text-[10.5px]`, `space-y-3`, `pb-[18px]`, `pt-1`, `px-3.5`, `px-3`, `ms-1.5`, `px-2`, `py-1` | `mx-card-gap`, `px-page-x`, `pt-inline`, `text-micro`, `gap-inline`, `gap-stack`, `py-stack`, `space-y-stack`, `pb-card`, `px-card`, `px-stack`, `ms-inline`, `px-inline`, `py-inline` |
| captain-workspace | `src/features/captain-workspace/training/injury-note.tsx` | `mx-[18px]`, `mb-3`, `gap-2`, `px-3`, `py-2`, `px-4` | `mx-card-gap`, `mb-stack`, `gap-inline`, `px-stack`, `py-inline`, `px-page-x` |
| captain-workspace | `src/features/captain-workspace/training/inline-search.tsx` | `gap-2.5`, `px-4`, `py-3`, `text-[12.5px]`, `mx-4`, `gap-2`, `pb-3`, `px-3`, `my-2`, `gap-1.5`, `pb-3.5` | `gap-stack`, `px-page-x`, `py-stack`, `mx-card-gap`, `gap-inline`, `pb-stack`, `px-stack`, `my-inline`, `pb-card` |
| captain-workspace | `src/features/captain-workspace/training/player-program-content.tsx` | `space-y-3` | `space-y-stack` |
| captain-workspace | `src/features/captain-workspace/training/player-program-summary-entry.tsx` | `p-4` | `p-card` |
| captain-workspace | `src/features/captain-workspace/training/player-program-summary.tsx` | `p-4`, `space-y-3`, `p-3.5`, `gap-2`, `px-3`, `gap-1`, `p-1`, `py-4`, `py-6` | `p-card`, `space-y-stack`, `gap-inline`, `px-stack`, `p-inline`, `py-page-y` |
| captain-workspace | `src/features/captain-workspace/training/program-cardio-prescription.tsx` | `space-y-1`, `py-3` | `space-y-inline`, `py-stack` |
| captain-workspace | `src/features/captain-workspace/training/program-entry.tsx` | `p-5` | `p-card` |
| captain-workspace | `src/features/captain-workspace/training/program-prescription-row.tsx` | `gap-3`, `py-3`, `mt-1` | `gap-stack`, `py-stack`, `mt-inline` |
| captain-workspace | `src/features/captain-workspace/training/program-week-pill.tsx` | `px-3`, `py-1` | `px-stack`, `py-inline` |
| captain-workspace | `src/features/captain-workspace/training/route.test.ts` | `space-y-6` | `space-y-section` |
| captain-workspace | `src/features/captain-workspace/training/set-plan-editor.tsx` | `space-y-3`, `pb-2`, `px-3` | `space-y-stack`, `pb-inline`, `px-stack` |
| captain-workspace | `src/features/captain-workspace/training/start-choice.tsx` | `space-y-3`, `gap-3`, `p-5`, `mb-1`, `mt-2`, `text-[19px]`, `text-[12.5px]`, `px-3`, `my-2` | `space-y-stack`, `gap-stack`, `p-card`, `mb-inline`, `mt-inline`, `text-title`, `text-xs`, `px-stack`, `my-inline` |
| captain-workspace | `src/features/captain-workspace/training/template-entry.tsx` | `p-5` | `p-card` |
| captain-workspace | `src/features/captain-workspace/training/training-content.tsx` | `p-5`, `space-y-[18px]` | `p-card`, `space-y-card-gap` |
| captain-workspace | `src/features/captain-workspace/training/training-editor-entry.tsx` | `p-5` | `p-card` |
| captain-workspace | `src/features/captain-workspace/training/training-editor.tsx` | `space-y-[18px]`, `space-y-3.5`, `gap-4`, `space-y-3`, `p-5`, `gap-3`, `py-3` | `space-y-card-gap`, `gap-card-gap`, `space-y-stack`, `p-card`, `gap-stack`, `py-stack` |
| captain-workspace | `src/features/captain-workspace/training/training-entry.tsx` | `p-5` | `p-card` |
| captain-workspace | `src/features/captain-workspace/training/training-facts.tsx` | `p-5`, `gap-3`, `mt-1`, `px-3`, `py-1`, `space-y-4`, `pt-4`, `gap-4`, `gap-2`, `px-2.5`, `py-1.5`, `space-y-2`, `ms-2`, `pt-3`, `gap-1.5`, `py-2` | `p-card`, `gap-stack`, `mt-inline`, `px-stack`, `py-inline`, `space-y-card-gap`, `pt-card`, `gap-card-gap`, `gap-inline`, `space-y-inline`, `ms-inline`, `pt-stack` |
| captain-workspace | `src/features/captain-workspace/training/warmup-block.tsx` | `gap-2.5`, `px-[18px]`, `py-3.5`, `text-[19px]`, `pb-3`, `gap-2`, `px-3`, `py-3`, `mx-[18px]`, `mb-3.5`, `px-3.5`, `px-2.5`, `py-1` | `gap-stack`, `px-page-x`, `py-card`, `text-title`, `pb-stack`, `gap-inline`, `px-stack`, `py-stack`, `mx-card-gap`, `mb-card-gap`, `px-card`, `py-inline` |
| captain-workspace | `src/features/captain-workspace/training/warmup-library-picker.tsx` | `mx-[18px]`, `mb-3`, `p-3`, `px-3`, `gap-2`, `my-2` | `mx-card-gap`, `mb-stack`, `p-stack`, `px-stack`, `gap-inline`, `my-inline` |
| captain-workspace | `src/features/captain-workspace/training/warmup-row.tsx` | `gap-2`, `px-[18px]`, `py-2.5` | `gap-inline`, `px-page-x`, `py-stack` |
| captain-workspace | `src/features/captain-workspace/training/week-menu.tsx` | `gap-2`, `px-3`, `space-y-3`, `p-5`, `text-[19px]`, `gap-3`, `p-3` | `gap-inline`, `px-stack`, `space-y-stack`, `p-card`, `text-title`, `gap-stack`, `p-stack` |
| chat | `src/features/chat/components/chat-composer.tsx` | `mb-2`, `px-4`, `py-2`, `gap-2`, `gap-2.5`, `text-[13px]` | `mb-inline`, `px-page-x`, `py-inline`, `gap-inline`, `gap-stack`, `text-row` |
| chat | `src/features/chat/components/chat-thread.tsx` | `pb-4`, `py-8`, `gap-2.5`, `pt-1`, `text-[11px]`, `gap-1`, `px-3.5`, `py-3`, `px-3`, `py-2.5`, `mt-1`, `text-[10px]` | `pb-card`, `py-page-y`, `gap-stack`, `pt-inline`, `text-micro`, `gap-inline`, `px-card`, `py-stack`, `px-stack`, `mt-inline` |
| coach-page | `src/features/coach-page/components/coach-link-card.tsx` | `space-y-4`, `p-5`, `space-y-1`, `p-3`, `space-y-3`, `px-4` | `space-y-card-gap`, `p-card`, `space-y-inline`, `p-stack`, `space-y-stack`, `px-page-x` |
| coach-page | `src/features/coach-page/components/coach-page-loading.tsx` | `p-6` | `p-section` |
| coach-page | `src/features/coach-page/components/copy-link-button.tsx` | `space-y-2` | `space-y-inline` |
| coach-page | `src/features/coach-page/components/join-requests-list.tsx` | `space-y-3`, `gap-3.5`, `gap-3`, `gap-2`, `p-5` | `space-y-stack`, `gap-card-gap`, `gap-stack`, `gap-inline`, `p-card` |
| coach-page | `src/features/coach-page/components/join-requests.tsx` | `space-y-4`, `p-5`, `space-y-3` | `space-y-card-gap`, `p-card`, `space-y-stack` |
| coach-page | `src/features/coach-page/components/public-about.tsx` | `gap-10`, `mb-3`, `mt-6`, `space-y-6`, `gap-6`, `p-6`, `gap-3` | `gap-section`, `mb-stack`, `mt-section`, `space-y-section`, `p-section`, `gap-stack` |
| coach-page | `src/features/coach-page/components/public-app-preview.tsx` | `gap-12`, `mb-3`, `mt-8`, `space-y-7`, `gap-4`, `mb-2`, `p-3`, `space-y-5`, `p-5`, `gap-2`, `py-4`, `gap-1`, `p-4`, `mt-3` | `gap-section`, `mb-stack`, `mt-section`, `space-y-section`, `gap-card-gap`, `mb-inline`, `p-stack`, `space-y-card-gap`, `p-card`, `gap-inline`, `py-page-y`, `mt-stack` |
| coach-page | `src/features/coach-page/components/public-coach-layout.tsx` | `gap-6`, `space-y-6`, `p-8`, `p-12`, `pt-8`, `pb-8`, `px-4` | `gap-section`, `space-y-section`, `p-section`, `pt-section`, `pb-section`, `px-page-x` |
| coach-page | `src/features/coach-page/components/public-duration-tabs.tsx` | `mt-8`, `space-y-6`, `gap-2`, `px-5` | `mt-section`, `space-y-section`, `gap-inline`, `px-page-x` |
| coach-page | `src/features/coach-page/components/public-facts.tsx` | `px-6`, `gap-6`, `py-4`, `gap-3` | `px-page-x`, `gap-section`, `py-page-y`, `gap-stack` |
| coach-page | `src/features/coach-page/components/public-hero.tsx` | `gap-12`, `space-y-6`, `gap-4`, `gap-2`, `gap-3`, `px-6`, `py-8`, `p-6` | `gap-section`, `space-y-section`, `gap-card-gap`, `gap-inline`, `gap-stack`, `px-page-x`, `py-page-y`, `p-section` |
| coach-page | `src/features/coach-page/components/public-numbers.tsx` | `px-6`, `py-8`, `gap-8`, `mt-2`, `mt-6` | `px-page-x`, `py-page-y`, `gap-section`, `mt-inline`, `mt-section` |
| coach-page | `src/features/coach-page/components/public-package-cards.tsx` | `mb-3`, `mt-6` | `mb-stack`, `mt-section` |
| coach-page | `src/features/coach-page/components/public-request-status.tsx` | `space-y-4`, `p-6`, `px-6` | `space-y-card-gap`, `p-section`, `px-page-x` |
| coach-page | `src/features/coach-page/components/public-specialties.tsx` | `gap-3`, `px-4`, `py-2` | `gap-stack`, `px-page-x`, `py-inline` |
| coach-page | `src/features/coach-page/components/public-spots.tsx` | `gap-3`, `gap-1` | `gap-stack`, `gap-inline` |
| coach-page | `src/features/coach-page/components/public-steps.tsx` | `mb-3`, `mt-8`, `gap-6`, `p-6`, `my-4` | `mb-stack`, `mt-section`, `gap-section`, `p-section`, `my-card-gap` |
| coach-page | `src/features/coach-page/components/public-tier-cards.tsx` | `gap-6`, `gap-5`, `p-6`, `gap-3`, `px-3`, `py-1`, `p-4`, `gap-2`, `mt-2`, `space-y-3`, `pt-5`, `mt-0.5` | `gap-section`, `gap-card-gap`, `p-section`, `gap-stack`, `px-stack`, `py-inline`, `p-card`, `gap-inline`, `mt-inline`, `space-y-stack`, `pt-card` |
| coach-page | `src/features/coach-page/components/public-waitlist.tsx` | `mt-2` | `mt-inline` |
| coach-page | `src/features/coach-page/components/workspace-join-card.tsx` | `p-[18px]`, `mb-3`, `gap-2.5`, `px-2.5`, `py-1`, `mt-3`, `gap-2` | `p-card`, `mb-stack`, `gap-stack`, `px-stack`, `py-inline`, `mt-stack`, `gap-inline` |
| coach-page | `src/features/coach-page/components/workspace-join-loading.tsx` | `p-5` | `p-card` |
| coach-page | `src/features/coach-page/join-requests.test.ts` | `my-6` | `my-section` |
| dashboard | `src/features/dashboard/components/dashboard-screen.tsx` | `gap-4`, `mt-1`, `space-y-6`, `p-5`, `gap-3`, `space-y-2`, `gap-6` | `gap-card-gap`, `mt-inline`, `space-y-section`, `p-card`, `gap-stack`, `space-y-inline`, `gap-section` |
| dashboard | `src/features/dashboard/components/next-task-card.tsx` | `space-y-4`, `p-6`, `px-5` | `space-y-card-gap`, `p-section`, `px-page-x` |
| dashboard | `src/features/dashboard/components/player-finder.tsx` | `space-y-4`, `p-5`, `gap-3`, `px-4`, `mb-2`, `py-2` | `space-y-card-gap`, `p-card`, `gap-stack`, `px-page-x`, `mb-inline`, `py-inline` |
| dashboard | `src/features/dashboard/components/smart-alerts.tsx` | `space-y-4`, `p-5`, `space-y-2`, `gap-3`, `p-3`, `px-3` | `space-y-card-gap`, `p-card`, `space-y-inline`, `gap-stack`, `p-stack`, `px-stack` |
| dashboard | `src/features/dashboard/components/start-steps-card.tsx` | `p-6`, `mt-2`, `mt-6`, `gap-4`, `py-5`, `space-y-2` | `p-section`, `mt-inline`, `mt-section`, `gap-card-gap`, `py-page-y`, `space-y-inline` |
| dashboard | `src/features/dashboard/components/workspace-activity.tsx` | `px-5`, `pb-1.5`, `pt-[18px]`, `text-[19px]`, `p-5`, `gap-3`, `px-[18px]`, `py-3.5`, `mt-1`, `text-[11.5px]` | `px-page-x`, `pb-inline`, `pt-card`, `text-title`, `p-card`, `gap-stack`, `py-card`, `mt-inline`, `text-micro` |
| dashboard | `src/features/dashboard/components/workspace-error.tsx` | `p-5`, `ms-2`, `px-3` | `p-card`, `ms-inline`, `px-stack` |
| dashboard | `src/features/dashboard/components/workspace-home.tsx` | `space-y-3`, `gap-3` | `space-y-stack`, `gap-stack` |
| dashboard | `src/features/dashboard/components/workspace-tasks.tsx` | `px-5`, `pb-1.5`, `pt-[18px]`, `text-[19px]`, `gap-3`, `px-[18px]`, `py-3.5`, `mt-1`, `text-[11.5px]`, `px-3.5`, `text-[12.5px]` | `px-page-x`, `pb-inline`, `pt-card`, `text-title`, `gap-stack`, `py-card`, `mt-inline`, `text-micro`, `px-card`, `text-xs` |
| dashboard | `src/features/dashboard/fleet-ui-dashboard.test.ts` | `space-y-6`, `space-y-4`, `p-5` | `space-y-section`, `space-y-card-gap`, `p-card` |
| dashboard | `src/features/dashboard/home/home-confirmations.tsx` | `p-[18px]`, `mb-2.5`, `text-[15px]`, `px-2`, `py-4`, `gap-3`, `p-2.5`, `px-2.5`, `py-1` | `p-card`, `mb-stack`, `text-md`, `px-inline`, `py-page-y`, `gap-stack`, `p-stack`, `px-stack`, `py-inline` |
| dashboard | `src/features/dashboard/home/home-hero.tsx` | `gap-3`, `p-[18px]`, `gap-[22px]`, `px-6`, `py-[22px]`, `mb-2`, `px-[9px]`, `py-[3px]`, `text-[11px]`, `text-[52px]`, `text-[64px]`, `mt-1.5`, `text-[13px]`, `mt-3`, `gap-2` | `gap-stack`, `p-card`, `gap-section`, `px-page-x`, `py-page-y`, `mb-inline`, `px-stack`, `py-inline`, `text-micro`, `text-stat-large`, `text-stat-large-wide`, `mt-inline`, `text-row`, `mt-stack`, `gap-inline` |
| dashboard | `src/features/dashboard/home/home-invite.tsx` | `pe-3.5`, `ps-10` | `pe-card`, `ps-touch` |
| dashboard | `src/features/dashboard/home/home-needs.tsx` | `gap-2.5`, `px-5`, `pb-1.5`, `pt-[18px]`, `text-[19px]`, `px-3.5`, `text-[12.5px]`, `p-5`, `gap-1.5`, `px-2.5`, `py-0.5`, `text-[11.5px]`, `mt-1`, `gap-3`, `px-[18px]`, `py-3.5` | `gap-stack`, `px-page-x`, `pb-inline`, `pt-card`, `text-title`, `px-card`, `text-xs`, `p-card`, `gap-inline`, `px-stack`, `py-inline`, `text-micro`, `mt-inline`, `py-card` |
| dashboard | `src/features/dashboard/home/home-panel.tsx` | `p-5`, `mb-4`, `gap-3`, `text-[19px]`, `space-y-4` | `p-card`, `mb-card-gap`, `gap-stack`, `text-title`, `space-y-card-gap` |
| dashboard | `src/features/dashboard/home/home-roster-panel.tsx` | `space-y-4`, `gap-3`, `p-4`, `mt-2`, `text-[22px]` | `space-y-card-gap`, `gap-stack`, `p-card`, `mt-inline`, `text-h` |
| dashboard | `src/features/dashboard/home/home-side-cards.tsx` | `space-y-3`, `px-5`, `py-[18px]`, `mb-1.5`, `gap-3`, `px-4`, `py-2.5`, `text-[13px]`, `mt-1`, `text-[11.5px]`, `px-3.5`, `text-[12.5px]` | `space-y-stack`, `px-page-x`, `py-page-y`, `mb-inline`, `gap-stack`, `py-stack`, `text-row`, `mt-inline`, `text-micro`, `px-card`, `text-xs` |
| dashboard | `src/features/dashboard/home/home-start.tsx` | `p-5`, `text-[19px]`, `mt-4`, `gap-4`, `py-4`, `space-y-2` | `p-card`, `text-title`, `mt-card-gap`, `gap-card-gap`, `py-page-y`, `space-y-inline` |
| dashboard | `src/features/dashboard/home/home-task-list.tsx` | `p-[18px]`, `mb-2.5`, `gap-2`, `text-[15px]`, `px-[7px]`, `text-[11px]`, `px-2`, `py-8`, `gap-3`, `p-2.5`, `px-2.5`, `py-1`, `text-[11.5px]` | `p-card`, `mb-stack`, `gap-inline`, `text-md`, `px-inline`, `text-micro`, `py-page-y`, `gap-stack`, `p-stack`, `px-stack`, `py-inline` |
| dashboard | `src/features/dashboard/home/home-tasks.tsx` | `px-5`, `pt-4`, `text-[19px]`, `p-5`, `gap-3`, `py-3`, `px-4` | `px-page-x`, `pt-card`, `text-title`, `p-card`, `gap-stack`, `py-stack` |
| dashboard | `src/features/dashboard/home/home-tiles.tsx` | `gap-3`, `p-3`, `p-[18px]`, `text-[11px]` | `gap-stack`, `p-stack`, `p-card`, `text-micro` |
| dashboard | `src/features/dashboard/home/home-week-chart.tsx` | `p-[18px]`, `mb-2.5`, `gap-2`, `text-[15px]`, `px-1`, `pt-1.5`, `pt-1`, `mt-3` | `p-card`, `mb-stack`, `gap-inline`, `text-md`, `px-inline`, `pt-inline`, `mt-stack` |
| demo | `src/features/demo/components/demo-banner.tsx` | `mb-4`, `gap-x-4`, `px-4`, `pb-3` | `mb-card-gap`, `gap-x-card-gap`, `px-page-x`, `pb-stack` |
| demo | `src/features/demo/components/demo-highlights.tsx` | `space-y-5`, `p-6`, `space-y-4`, `gap-3`, `pt-2` | `space-y-card-gap`, `p-section`, `gap-stack`, `pt-inline` |
| demo | `src/features/demo/components/demo-screen.tsx` | `gap-6`, `p-6`, `space-y-5`, `gap-3`, `space-y-2` | `gap-section`, `p-section`, `space-y-card-gap`, `gap-stack`, `space-y-inline` |
| demo | `src/features/demo/guided/captain-pane.tsx` | `px-2` | `px-inline` |
| demo | `src/features/demo/guided/guided.css` | Fixed CSS values | `px-control`, `px-page-x`, `p-inline` |
| demo | `src/features/demo/guided/money.tsx` | `ms-2` | `ms-inline` |
| demo | `src/features/demo/guided/phone-pane.tsx` | `px-2` | `px-inline` |
| feedback | `src/features/feedback/components/feedback-button.tsx` | `p-6`, `gap-2`, `px-3` | `p-section`, `gap-inline`, `px-stack` |
| feedback | `src/features/feedback/components/feedback-sheet.tsx` | `p-6`, `mt-4`, `space-y-4`, `p-3`, `gap-3` | `p-section`, `mt-card-gap`, `space-y-card-gap`, `p-stack`, `gap-stack` |
| forms | `src/features/forms/components/answer-flow.tsx` | `space-y-5`, `p-6`, `gap-2`, `space-y-4`, `text-[22px]`, `gap-4`, `p-5`, `px-5`, `py-3`, `mt-5`, `gap-3`, `text-[11.5px]` | `space-y-card-gap`, `p-section`, `gap-inline`, `text-h`, `gap-card-gap`, `p-card`, `px-page-x`, `py-stack`, `mt-card-gap`, `gap-stack`, `text-micro` |
| forms | `src/features/forms/components/assessment-editor.tsx` | `px-5`, `py-[18px]`, `mb-3`, `text-[19px]`, `gap-2`, `px-4`, `py-3`, `mt-4`, `gap-3`, `mt-3`, `p-5` | `px-page-x`, `py-page-y`, `mb-stack`, `text-title`, `gap-inline`, `py-stack`, `mt-card-gap`, `gap-stack`, `mt-stack`, `p-card` |
| forms | `src/features/forms/components/assessment-fields.tsx` | `mt-2`, `px-3`, `mb-3`, `mt-[18px]`, `text-[19px]`, `gap-2`, `my-3`, `gap-3`, `p-4` | `mt-inline`, `px-stack`, `mb-stack`, `mt-card-gap`, `text-title`, `gap-inline`, `my-stack`, `gap-stack`, `p-card` |
| forms | `src/features/forms/components/assessment-library-list.tsx` | `gap-[14px]`, `p-5`, `gap-[10px]`, `px-5`, `py-[18px]`, `gap-2`, `text-[11.5px]`, `px-[10px]`, `py-[3px]`, `text-[18px]`, `text-[12.5px]`, `pt-[10px]`, `p-2`, `px-3`, `mt-1`, `mt-[22px]`, `mb-[18px]`, `mt-2`, `py-3` | `gap-card-gap`, `p-card`, `gap-stack`, `px-page-x`, `py-page-y`, `gap-inline`, `text-micro`, `px-stack`, `py-inline`, `text-title`, `pt-stack`, `p-inline`, `mt-inline`, `mt-section`, `mb-card-gap`, `py-stack` |
| forms | `src/features/forms/components/assessment-library-metrics.tsx` | `py-3`, `px-5`, `py-[18px]`, `gap-3` | `py-stack`, `px-page-x`, `py-page-y`, `gap-stack` |
| forms | `src/features/forms/components/assessment-panel.tsx` | `px-5`, `py-[18px]`, `mb-3`, `text-[19px]`, `py-3`, `py-2`, `gap-1`, `p-2`, `mt-3` | `px-page-x`, `py-page-y`, `mb-stack`, `text-title`, `py-stack`, `py-inline`, `gap-inline`, `p-inline`, `mt-stack` |
| forms | `src/features/forms/components/assessment-schedule-entry.tsx` | `p-5` | `p-card` |
| forms | `src/features/forms/components/assessment-workspace.tsx` | `p-5`, `px-4`, `space-y-[18px]`, `text-[30px]`, `ms-3`, `px-3`, `gap-[18px]`, `space-y-4`, `px-5`, `text-[19px]` | `p-card`, `px-page-x`, `space-y-card-gap`, `text-stat`, `ms-stack`, `px-stack`, `gap-card-gap`, `text-title` |
| forms | `src/features/forms/components/form-builder.tsx` | `mb-[18px]`, `gap-[14px]`, `text-[30px]`, `gap-2`, `px-3`, `px-5`, `text-[12.5px]`, `gap-[18px]`, `p-5`, `gap-[10px]`, `px-[18px]`, `py-3`, `gap-1`, `px-[10px]`, `text-[11.5px]`, `mb-2`, `text-[11px]` | `mb-card-gap`, `gap-card-gap`, `text-stat`, `gap-inline`, `px-stack`, `px-page-x`, `p-card`, `gap-stack`, `py-stack`, `text-micro`, `mb-inline` |
| forms | `src/features/forms/components/form-card.tsx` | `p-4`, `mt-3`, `gap-4` | `p-card`, `mt-stack`, `gap-card-gap` |
| forms | `src/features/forms/components/form-preview.tsx` | `px-4`, `py-5`, `mb-3`, `text-[19px]`, `py-4`, `mt-3`, `px-5` | `px-page-x`, `py-page-y`, `mb-stack`, `text-title`, `mt-stack` |
| forms | `src/features/forms/components/forms-library-page.tsx` | `p-5`, `ms-3`, `px-4`, `space-y-[18px]`, `gap-2`, `px-5`, `gap-[14px]`, `text-[30px]`, `mt-1`, `text-[13px]` | `p-card`, `ms-stack`, `px-page-x`, `space-y-card-gap`, `gap-inline`, `gap-card-gap`, `text-stat`, `mt-inline`, `text-row` |
| forms | `src/features/forms/components/library-list.tsx` | `space-y-3`, `p-5`, `py-3`, `px-4` | `space-y-stack`, `p-card`, `py-stack`, `px-page-x` |
| forms | `src/features/forms/components/library-metrics.tsx` | `gap-3`, `p-4`, `p-5`, `mt-3` | `gap-stack`, `p-card`, `mt-stack` |
| forms | `src/features/forms/components/library-schedules-entry.tsx` | `p-5`, `mb-4`, `gap-3`, `px-5` | `p-card`, `mb-card-gap`, `gap-stack`, `px-page-x` |
| forms | `src/features/forms/components/pending-forms.tsx` | `p-5`, `text-[19px]`, `mt-3`, `space-y-3`, `gap-3` | `p-card`, `text-title`, `mt-stack`, `space-y-stack`, `gap-stack` |
| forms | `src/features/forms/components/player-form-page.tsx` | `p-6`, `p-5` | `p-section`, `p-card` |
| forms | `src/features/forms/components/question-chips.tsx` | `gap-2`, `px-3`, `py-2` | `gap-inline`, `px-stack`, `py-inline` |
| forms | `src/features/forms/components/question-editor.tsx` | `px-[14px]`, `text-[15px]`, `mb-3`, `gap-3`, `px-[18px]`, `py-[14px]`, `text-[11.5px]`, `px-[10px]`, `py-[3px]`, `pb-[18px]`, `mb-[14px]`, `gap-2`, `py-3`, `mb-2`, `mb-4`, `px-[6px]`, `py-[10px]`, `mb-[2px]`, `mt-[10px]`, `text-[12.5px]` | `px-card`, `text-md`, `mb-stack`, `gap-stack`, `px-page-x`, `py-card`, `text-micro`, `px-stack`, `py-inline`, `pb-card`, `mb-card-gap`, `gap-inline`, `py-stack`, `mb-inline`, `px-inline`, `mt-stack` |
| forms | `src/features/forms/components/question-field.tsx` | `px-3`, `mb-[10px]`, `space-y-2`, `px-[14px]`, `pb-3`, `text-[13px]`, `space-y-3`, `py-4`, `pt-3`, `ms-2`, `gap-1`, `gap-2`, `gap-3`, `px-4`, `gap-4`, `p-5`, `px-5` | `px-stack`, `mb-stack`, `space-y-inline`, `px-card`, `pb-stack`, `text-row`, `space-y-stack`, `py-page-y`, `pt-stack`, `ms-inline`, `gap-inline`, `gap-stack`, `px-page-x`, `gap-card-gap`, `p-card` |
| forms | `src/features/forms/components/question-rules.tsx` | `px-3`, `my-3`, `gap-3`, `mt-2`, `gap-2`, `py-3`, `text-[13px]`, `py-[10px]` | `px-stack`, `my-stack`, `gap-stack`, `mt-inline`, `gap-inline`, `py-stack`, `text-row` |
| forms | `src/features/forms/components/question-toggle.tsx` | `gap-3`, `py-3`, `text-[13px]` | `gap-stack`, `py-stack`, `text-row` |
| forms | `src/features/forms/components/request-manager.tsx` | `px-4`, `space-y-4`, `px-5`, `p-4`, `gap-3`, `ms-3` | `px-page-x`, `space-y-card-gap`, `p-card`, `gap-stack`, `ms-stack` |
| forms | `src/features/forms/components/request-picker.tsx` | `space-y-4`, `p-5`, `mt-2`, `p-3`, `ms-3`, `gap-3`, `px-5` | `space-y-card-gap`, `p-card`, `mt-inline`, `p-stack`, `ms-stack`, `gap-stack`, `px-page-x` |
| forms | `src/features/forms/components/request-review.tsx` | `space-y-4`, `p-5`, `px-4`, `space-y-3`, `mt-2`, `p-3`, `px-5` | `space-y-card-gap`, `p-card`, `px-page-x`, `space-y-stack`, `mt-inline`, `p-stack` |
| forms | `src/features/forms/components/schedule-editor.tsx` | `mb-[14px]`, `px-5`, `py-4`, `gap-2`, `mt-1`, `py-3`, `gap-3`, `px-3` | `mb-card-gap`, `px-page-x`, `py-page-y`, `gap-inline`, `mt-inline`, `py-stack`, `gap-stack`, `px-stack` |
| forms | `src/features/forms/components/schedule-section.tsx` | `mt-4`, `gap-2`, `py-3` | `mt-card-gap`, `gap-inline`, `py-stack` |
| forms | `src/features/forms/components/template-link-entry.tsx` | `gap-2`, `p-4`, `px-5`, `px-[14px]`, `text-[12.5px]` | `gap-inline`, `p-card`, `px-page-x`, `px-card`, `text-xs` |
| forms | `src/features/forms/components/themed-select.tsx` | `gap-2`, `px-[14px]`, `p-1`, `px-3` | `gap-inline`, `px-card`, `p-inline`, `px-stack` |
| forms | `src/features/forms/components/v11-form-builder.tsx` | `mb-4`, `gap-3`, `p-3`, `px-5`, `mb-3`, `space-y-2.5`, `p-4`, `gap-2`, `gap-3.5`, `px-4`, `py-5`, `gap-1` | `mb-card-gap`, `gap-stack`, `p-stack`, `px-page-x`, `mb-stack`, `space-y-stack`, `p-card`, `gap-inline`, `gap-card-gap`, `py-page-y` |
| forms | `src/features/forms/components/v11-form-settings.tsx` | `gap-3`, `px-3`, `py-2`, `p-5`, `px-5`, `mb-3`, `mt-2` | `gap-stack`, `px-stack`, `py-inline`, `p-card`, `px-page-x`, `mb-stack`, `mt-inline` |
| forms | `src/features/forms/components/v11-library-list.tsx` | `gap-3`, `p-5`, `gap-2`, `p-4`, `px-2`, `py-1`, `text-[11px]`, `mt-1`, `gap-1`, `px-4` | `gap-stack`, `p-card`, `gap-inline`, `px-inline`, `py-inline`, `text-micro`, `mt-inline`, `px-page-x` |
| forms | `src/features/forms/components/v11-question-card.tsx` | `px-3`, `gap-3`, `p-4`, `space-y-3`, `space-y-2`, `mb-2`, `gap-2`, `mb-3` | `px-stack`, `gap-stack`, `p-card`, `space-y-stack`, `space-y-inline`, `mb-inline`, `gap-inline`, `mb-stack` |
| forms | `src/features/forms/components/v11-question-controls.ts` | `px-3` | `px-stack` |
| forms | `src/features/forms/components/v11-question-options.tsx` | `gap-2`, `space-y-2` | `gap-inline`, `space-y-inline` |
| forms | `src/features/forms/components/v11-question-preview.tsx` | `space-y-4`, `text-[15px]`, `gap-2`, `space-y-3`, `p-3` | `space-y-card-gap`, `text-md`, `gap-inline`, `space-y-stack`, `p-stack` |
| forms | `src/features/forms/components/v11-template-chooser.tsx` | `p-5`, `mb-4`, `gap-3` | `p-card`, `mb-card-gap`, `gap-stack` |
| inbox | `src/features/inbox/components/checkin-detail.tsx` | `space-y-4`, `gap-4`, `p-4`, `px-4`, `gap-3` | `space-y-card-gap`, `gap-card-gap`, `p-card`, `px-page-x`, `gap-stack` |
| inbox | `src/features/inbox/components/conversation-bubbles.tsx` | `p-6`, `text-[12.5px]`, `gap-2`, `px-3.5`, `py-2.5`, `text-[11px]`, `text-[10px]` | `p-section`, `text-xs`, `gap-inline`, `px-card`, `py-stack`, `text-micro` |
| inbox | `src/features/inbox/components/conversation-compose.tsx` | `space-y-2.5`, `gap-1.5`, `px-[11px]`, `text-[11.5px]`, `gap-2`, `p-1.5`, `ms-2`, `px-2`, `text-[13px]` | `space-y-stack`, `gap-inline`, `px-stack`, `text-micro`, `p-inline`, `ms-inline`, `px-inline`, `text-row` |
| inbox | `src/features/inbox/components/conversation-list.tsx` | `p-[18px]`, `p-6`, `text-[12.5px]`, `gap-3`, `px-2.5`, `py-2.5`, `text-[13px]`, `text-[11.5px]`, `px-2`, `py-0.5`, `text-[11px]` | `p-card`, `p-section`, `text-xs`, `gap-stack`, `px-stack`, `py-stack`, `text-row`, `text-micro`, `px-inline`, `py-inline` |
| inbox | `src/features/inbox/components/conversation-pane.tsx` | `gap-2.5`, `p-[18px]`, `pb-2.5`, `text-[13px]`, `text-[11.5px]`, `px-3.5` | `gap-stack`, `p-card`, `pb-stack`, `text-row`, `text-micro`, `px-card` |
| inbox | `src/features/inbox/components/conversation-screen.tsx` | `gap-3`, `p-4`, `text-[12.5px]` | `gap-stack`, `p-card`, `text-xs` |
| inbox | `src/features/inbox/components/flag-chip.tsx` | `px-3`, `py-1` | `px-stack`, `py-inline` |
| inbox | `src/features/inbox/components/form-check-detail.tsx` | `space-y-4`, `px-4` | `space-y-card-gap`, `px-page-x` |
| inbox | `src/features/inbox/components/inbox-groups.tsx` | `space-y-4`, `gap-2`, `px-4`, `space-y-3` | `space-y-card-gap`, `gap-inline`, `px-page-x`, `space-y-stack` |
| inbox | `src/features/inbox/components/inbox-row.tsx` | `gap-3`, `p-4`, `space-y-2`, `gap-2` | `gap-stack`, `p-card`, `space-y-inline`, `gap-inline` |
| inbox | `src/features/inbox/components/inbox-screen.tsx` | `space-y-6`, `gap-4`, `p-1`, `px-5`, `gap-2`, `p-4`, `ms-3`, `px-4`, `p-5`, `gap-5`, `space-y-3`, `mt-2`, `space-y-5`, `p-6`, `gap-3` | `space-y-section`, `gap-card-gap`, `p-inline`, `px-page-x`, `gap-inline`, `p-card`, `ms-stack`, `space-y-stack`, `mt-inline`, `space-y-card-gap`, `p-section`, `gap-stack` |
| inbox | `src/features/inbox/components/reply-box.tsx` | `space-y-4`, `gap-2`, `px-4`, `px-6` | `space-y-card-gap`, `gap-inline`, `px-page-x` |
| inbox | `src/features/inbox/components/workspace-assessment.tsx` | `space-y-3.5`, `text-[19px]`, `px-3`, `gap-2.5` | `space-y-card-gap`, `text-title`, `px-stack`, `gap-stack` |
| inbox | `src/features/inbox/components/workspace-checkin.tsx` | `px-5`, `gap-3`, `py-[11px]`, `text-[13px]`, `py-3.5`, `px-4`, `gap-2.5` | `px-page-x`, `gap-stack`, `py-stack`, `text-row`, `py-card` |
| inbox | `src/features/inbox/components/workspace-controls.tsx` | `gap-3.5`, `text-[30px]`, `mt-1`, `text-[13px]`, `gap-2`, `px-3.5`, `gap-2.5`, `gap-1`, `p-1`, `px-3`, `gap-1.5`, `text-[12.5px]` | `gap-card-gap`, `text-stat`, `mt-inline`, `text-row`, `gap-inline`, `px-card`, `gap-stack`, `p-inline`, `px-stack`, `text-xs` |
| inbox | `src/features/inbox/components/workspace-detail.tsx` | `gap-3`, `px-5`, `py-[18px]`, `text-[19px]`, `mt-1`, `px-3.5`, `text-[12.5px]`, `p-5`, `px-3`, `pb-3.5` | `gap-stack`, `px-page-x`, `py-page-y`, `text-title`, `mt-inline`, `px-card`, `p-card`, `px-stack`, `pb-card` |
| inbox | `src/features/inbox/components/workspace-empty.tsx` | `px-5`, `py-10`, `mb-1.5`, `mt-2.5`, `text-[19px]` | `px-page-x`, `py-section`, `mb-inline`, `mt-stack`, `text-title` |
| inbox | `src/features/inbox/components/workspace-fact.tsx` | `gap-3`, `px-[18px]`, `py-2.5`, `text-[13px]`, `gap-2` | `gap-stack`, `px-page-x`, `py-stack`, `text-row`, `gap-inline` |
| inbox | `src/features/inbox/components/workspace-flags.tsx` | `gap-2`, `px-5`, `pt-4`, `px-2.5`, `py-1`, `text-[11.5px]` | `gap-inline`, `px-page-x`, `pt-card`, `px-stack`, `py-inline`, `text-micro` |
| inbox | `src/features/inbox/components/workspace-kpis.tsx` | `gap-2.5`, `px-5`, `py-4`, `px-3.5`, `py-3`, `text-[11.5px]`, `my-1`, `text-[22px]` | `gap-stack`, `px-page-x`, `py-page-y`, `px-card`, `py-stack`, `text-micro`, `my-inline`, `text-h` |
| inbox | `src/features/inbox/components/workspace-list.tsx` | `p-5`, `px-4`, `pb-1`, `pt-3`, `text-[11px]` | `p-card`, `px-page-x`, `pb-inline`, `pt-stack`, `text-micro` |
| inbox | `src/features/inbox/components/workspace-reply.tsx` | `space-y-3`, `px-5`, `py-4`, `gap-2`, `px-3`, `text-[12.5px]`, `px-3.5`, `py-3`, `gap-2.5` | `space-y-stack`, `px-page-x`, `py-page-y`, `gap-inline`, `px-stack`, `text-xs`, `px-card`, `py-stack`, `gap-stack` |
| inbox | `src/features/inbox/components/workspace-row.tsx` | `gap-3`, `px-4`, `py-3.5`, `gap-2`, `px-2.5`, `py-1`, `text-[11.5px]`, `mt-1` | `gap-stack`, `px-page-x`, `py-card`, `gap-inline`, `px-stack`, `py-inline`, `text-micro`, `mt-inline` |
| inbox | `src/features/inbox/components/workspace-screen.tsx` | `space-y-[18px]`, `p-5`, `px-3`, `gap-4`, `px-5`, `py-1.5`, `py-3` | `space-y-card-gap`, `p-card`, `px-stack`, `gap-card-gap`, `px-page-x`, `py-inline`, `py-stack` |
| install | `src/features/install/components/install-button.tsx` | `space-y-2`, `p-4`, `gap-2`, `p-6`, `mt-5` | `space-y-inline`, `p-card`, `gap-inline`, `p-section`, `mt-card-gap` |
| install | `src/features/install/components/install-sheet.tsx` | `p-6`, `mt-2`, `mt-4`, `mt-5`, `gap-2` | `p-section`, `mt-inline`, `mt-card-gap`, `gap-inline` |
| install | `src/features/install/components/ios-steps.tsx` | `mt-5`, `space-y-4`, `gap-3` | `mt-card-gap`, `space-y-card-gap`, `gap-stack` |
| install | `src/features/install/install-button.test.ts` | `space-y-2` | `space-y-inline` |
| ko-preview | `src/features/ko-preview/components/feed-card.tsx` | `p-3`, `gap-2`, `mt-2`, `space-y-2`, `mt-1`, `px-3` | `p-stack`, `gap-inline`, `mt-inline`, `space-y-inline`, `px-stack` |
| ko-preview | `src/features/ko-preview/components/ko-chat.tsx` | `gap-2`, `px-4`, `gap-3`, `p-4`, `pb-3`, `px-3`, `p-3`, `mb-2`, `ps-3`, `mt-2` | `gap-inline`, `px-page-x`, `gap-stack`, `p-card`, `pb-stack`, `px-stack`, `p-stack`, `mb-inline`, `ps-stack`, `mt-inline` |
| ko-preview | `src/features/ko-preview/components/ko-confirm.tsx` | `gap-2`, `px-4` | `gap-inline`, `px-page-x` |
| ko-preview | `src/features/ko-preview/components/ko-digest.tsx` | `gap-3`, `p-4`, `space-y-2` | `gap-stack`, `p-card`, `space-y-inline` |
| ko-preview | `src/features/ko-preview/components/ko-feed.tsx` | `p-4`, `space-y-4`, `gap-3`, `space-y-2`, `gap-2` | `p-card`, `space-y-card-gap`, `gap-stack`, `space-y-inline`, `gap-inline` |
| ko-preview | `src/features/ko-preview/components/ko-message.tsx` | `gap-2`, `px-3`, `py-2` | `gap-inline`, `px-stack`, `py-inline` |
| ko-preview | `src/features/ko-preview/components/ko-panel.tsx` | `gap-3`, `p-4`, `gap-2`, `px-4`, `space-y-5`, `p-5`, `p-3`, `mt-3`, `mt-2`, `mt-1`, `px-2`, `px-3` | `gap-stack`, `p-card`, `gap-inline`, `px-page-x`, `space-y-card-gap`, `p-stack`, `mt-stack`, `mt-inline`, `px-inline`, `px-stack` |
| ko-preview | `src/features/ko-preview/components/ko-teaser-panel.tsx` | `p-5`, `mt-3`, `mt-2`, `my-6`, `space-y-2`, `px-3`, `py-3`, `gap-2`, `p-3` | `p-card`, `mt-stack`, `mt-inline`, `my-section`, `space-y-inline`, `px-stack`, `py-stack`, `gap-inline`, `p-stack` |
| ko-preview | `src/features/ko-preview/components/ko-teaser.tsx` | `px-2`, `py-0.5`, `p-5`, `mt-3`, `px-4` | `px-inline`, `py-inline`, `p-card`, `mt-stack`, `px-page-x` |
| ko-preview | `src/features/ko-preview/components/ko-typing.tsx` | `gap-2`, `gap-1`, `px-4`, `py-3` | `gap-inline`, `px-page-x`, `py-stack` |
| ko-preview | `src/features/ko-preview/components/ko-widget.tsx` | `mb-2`, `px-3`, `py-2`, `p-4`, `mt-3`, `px-4`, `ms-3` | `mb-inline`, `px-stack`, `py-inline`, `p-card`, `mt-stack`, `px-page-x`, `ms-stack` |
| marketing | `src/features/marketing/components/features-grid.tsx` | `gap-2` | `gap-inline` |
| marketing | `src/features/marketing/components/hero-phones.tsx` | `gap-2`, `py-2` | `gap-inline`, `py-inline` |
| marketing | `src/features/marketing/components/landing.module.css` | Fixed CSS values | `text-sm`, `text-row`, `text-xs`, `text-md`, `text-title`, `text-micro` |
| marketing | `src/features/marketing/components/preview.module.css` | Fixed CSS values | `text-row`, `text-micro`, `text-md`, `text-xs`, `text-sm`, `text-title` |
| marketing | `src/features/marketing/components/site-header.tsx` | Fixed CSS values | `px-4` |
| marketing | `src/features/marketing/components/stats-strip.tsx` | `gap-2` | `gap-inline` |
| marketing | `src/features/marketing/components/story-screens.tsx` | `space-y-2`, `gap-2` | `space-y-inline`, `gap-inline` |
| marketing | `src/features/marketing/marketing.test.ts` | Previous spacing expectations | `text-xs` |
| meal-plans | `src/features/meal-plans/components/calculator-apply.tsx` | `p-4`, `gap-3`, `gap-2`, `px-3` | `p-card`, `gap-stack`, `gap-inline`, `px-stack` |
| meal-plans | `src/features/meal-plans/components/calculator-content.tsx` | `gap-3`, `p-5`, `px-4` | `gap-stack`, `p-card`, `px-page-x` |
| meal-plans | `src/features/meal-plans/components/calculator-field.tsx` | `gap-2`, `p-4`, `px-3`, `px-4` | `gap-inline`, `p-card`, `px-stack`, `px-page-x` |
| meal-plans | `src/features/meal-plans/components/calculator-inputs.tsx` | `gap-4`, `gap-3`, `gap-2`, `p-4`, `px-3` | `gap-card-gap`, `gap-stack`, `gap-inline`, `p-card`, `px-stack` |
| meal-plans | `src/features/meal-plans/components/calculator-results.tsx` | `gap-4`, `gap-3`, `p-5`, `px-4`, `p-4` | `gap-card-gap`, `gap-stack`, `p-card`, `px-page-x` |
| meal-plans | `src/features/meal-plans/components/calculator-view.tsx` | `p-6`, `mt-3`, `gap-5`, `p-5`, `gap-3`, `mb-3`, `gap-2`, `px-3`, `gap-4` | `p-section`, `mt-stack`, `gap-card-gap`, `p-card`, `gap-stack`, `mb-stack`, `gap-inline`, `px-stack` |
| meal-plans | `src/features/meal-plans/components/custom-food-sheet.tsx` | `p-5`, `gap-3`, `mt-4`, `gap-4`, `gap-1`, `px-3` | `p-card`, `gap-stack`, `mt-card-gap`, `gap-card-gap`, `gap-inline`, `px-stack` |
| meal-plans | `src/features/meal-plans/components/editor/alternatives-sheet.tsx` | `p-4`, `gap-2`, `py-4`, `py-3`, `py-2`, `pt-3` | `p-card`, `gap-inline`, `py-page-y`, `py-stack`, `py-inline`, `pt-stack` |
| meal-plans | `src/features/meal-plans/components/editor/food-row.tsx` | `gap-2`, `p-3`, `gap-3`, `text-[11.5px]`, `px-2` | `gap-inline`, `p-stack`, `gap-stack`, `text-micro`, `px-inline` |
| meal-plans | `src/features/meal-plans/components/editor/food-search.tsx` | `gap-2`, `px-4`, `gap-2.5`, `p-4`, `p-6`, `pb-3`, `px-3` | `gap-inline`, `px-page-x`, `gap-stack`, `p-card`, `p-section`, `pb-stack`, `px-stack` |
| meal-plans | `src/features/meal-plans/components/editor/meal-card.tsx` | `mb-3`, `gap-2.5`, `px-[18px]`, `py-3.5`, `text-[19px]`, `px-2`, `pb-3` | `mb-stack`, `gap-stack`, `px-page-x`, `py-card`, `text-title`, `px-inline`, `pb-stack` |
| meal-plans | `src/features/meal-plans/components/editor/meal-menu.tsx` | `gap-2`, `p-3` | `gap-inline`, `p-stack` |
| meal-plans | `src/features/meal-plans/components/editor/meal-targets.tsx` | `gap-4`, `p-4`, `gap-2`, `p-2` | `gap-card-gap`, `p-card`, `gap-inline`, `p-inline` |
| meal-plans | `src/features/meal-plans/components/editor/player-editor.tsx` | `mb-[18px]`, `gap-3.5`, `text-[30px]`, `gap-2`, `mb-3`, `mb-3.5`, `gap-4`, `p-5`, `mt-[18px]`, `gap-[18px]`, `px-5`, `py-[18px]`, `mb-1.5`, `text-[19px]`, `text-[12.5px]`, `mt-3`, `ms-3`, `px-4` | `mb-card-gap`, `gap-card-gap`, `text-stat`, `gap-inline`, `mb-stack`, `p-card`, `mt-card-gap`, `px-page-x`, `py-page-y`, `mb-inline`, `text-title`, `mt-stack`, `ms-stack` |
| meal-plans | `src/features/meal-plans/components/editor/player-facts.tsx` | `px-5`, `py-[18px]`, `mb-1.5` | `px-page-x`, `py-page-y`, `mb-inline` |
| meal-plans | `src/features/meal-plans/components/editor/target-calculator.tsx` | `mb-[18px]`, `gap-5`, `p-5`, `gap-4`, `mt-2`, `gap-2`, `px-3` | `mb-card-gap`, `gap-card-gap`, `p-card`, `mt-inline`, `gap-inline`, `px-stack` |
| meal-plans | `src/features/meal-plans/components/editor/target-tiles.tsx` | `mb-[18px]`, `gap-3`, `px-4`, `py-3.5`, `gap-1`, `my-2`, `text-[26px]`, `mb-2` | `mb-card-gap`, `gap-stack`, `px-page-x`, `py-card`, `gap-inline`, `my-inline`, `text-h`, `mb-inline` |
| meal-plans | `src/features/meal-plans/components/editor/week-card.tsx` | `px-5`, `py-[18px]`, `mb-2.5`, `text-[19px]`, `gap-1.5`, `text-[11px]`, `mt-1.5`, `mt-2.5`, `text-[11.5px]`, `mt-2` | `px-page-x`, `py-page-y`, `mb-stack`, `text-title`, `gap-inline`, `text-micro`, `mt-inline`, `mt-stack` |
| meal-plans | `src/features/meal-plans/components/food-form-entry.tsx` | `gap-4`, `p-5`, `gap-3` | `gap-card-gap`, `p-card`, `gap-stack` |
| meal-plans | `src/features/meal-plans/components/food-form.tsx` | `px-3`, `gap-4`, `gap-3`, `p-3`, `p-4`, `text-[15px]`, `p-[18px]`, `p-5`, `gap-2`, `p-2`, `gap-1` | `px-stack`, `gap-card-gap`, `gap-stack`, `p-stack`, `p-card`, `text-md`, `gap-inline`, `p-inline` |
| meal-plans | `src/features/meal-plans/components/food-picker.tsx` | `gap-3`, `p-4`, `mt-2`, `px-3`, `ms-3`, `gap-2`, `p-3`, `ms-2`, `px-2` | `gap-stack`, `p-card`, `mt-inline`, `px-stack`, `ms-stack`, `gap-inline`, `p-stack`, `ms-inline`, `px-inline` |
| meal-plans | `src/features/meal-plans/components/food-preview.tsx` | `gap-3`, `p-[18px]`, `gap-4`, `p-5`, `p-4` | `gap-stack`, `p-card`, `gap-card-gap` |
| meal-plans | `src/features/meal-plans/components/food-units-editor.tsx` | `px-3`, `gap-3`, `p-[18px]`, `p-5`, `gap-2`, `gap-1` | `px-stack`, `gap-stack`, `p-card`, `gap-inline` |
| meal-plans | `src/features/meal-plans/components/foods-library-entry.tsx` | `gap-2`, `px-5`, `gap-5`, `gap-4`, `text-[30px]`, `mt-1`, `ms-1`, `px-3`, `gap-3`, `px-4` | `gap-inline`, `px-page-x`, `gap-card-gap`, `text-stat`, `mt-inline`, `ms-inline`, `px-stack`, `gap-stack` |
| meal-plans | `src/features/meal-plans/components/household-quantity.tsx` | `gap-2`, `ms-2`, `px-3` | `gap-inline`, `ms-inline`, `px-stack` |
| meal-plans | `src/features/meal-plans/components/item-row.tsx` | `gap-3`, `p-4`, `gap-2`, `gap-1` | `gap-stack`, `p-card`, `gap-inline` |
| meal-plans | `src/features/meal-plans/components/library/food-drawer.tsx` | `px-3`, `p-5`, `gap-3`, `my-3`, `mt-4`, `gap-4`, `p-3`, `px-4` | `px-stack`, `p-card`, `gap-stack`, `my-stack`, `mt-card-gap`, `gap-card-gap`, `p-stack`, `px-page-x` |
| meal-plans | `src/features/meal-plans/components/library/food-units.tsx` | `px-3`, `gap-3`, `gap-2`, `p-2` | `px-stack`, `gap-stack`, `gap-inline`, `p-inline` |
| meal-plans | `src/features/meal-plans/components/library/foods-table.test.ts` | `gap-1` | `gap-inline` |
| meal-plans | `src/features/meal-plans/components/library/foods-table.tsx` | `text-[11.5px]`, `px-4`, `py-3`, `gap-3`, `mb-1`, `gap-1`, `p-8` | `text-micro`, `px-page-x`, `py-stack`, `gap-stack`, `mb-inline`, `gap-inline`, `p-section` |
| meal-plans | `src/features/meal-plans/components/live-targets.tsx` | `gap-4`, `p-4`, `gap-2` | `gap-card-gap`, `p-card`, `gap-inline` |
| meal-plans | `src/features/meal-plans/components/meal-editor.tsx` | `gap-4`, `p-4`, `gap-2`, `ms-2`, `px-3`, `gap-1`, `gap-3` | `gap-card-gap`, `p-card`, `gap-inline`, `ms-inline`, `px-stack`, `gap-stack` |
| meal-plans | `src/features/meal-plans/components/meal-library-page.tsx` | `gap-4`, `gap-3.5`, `p-5`, `my-2`, `gap-2`, `gap-1` | `gap-card-gap`, `p-card`, `my-inline`, `gap-inline` |
| meal-plans | `src/features/meal-plans/components/nutrition-workspace-entry.tsx` | `gap-5`, `p-5`, `mt-3` | `gap-card-gap`, `p-card`, `mt-stack` |
| meal-plans | `src/features/meal-plans/components/plan-builder.tsx` | `gap-5`, `gap-4`, `gap-2`, `px-4` | `gap-card-gap`, `gap-inline`, `px-page-x` |
| meal-plans | `src/features/meal-plans/components/player-plans.tsx` | `gap-5`, `gap-3`, `p-5`, `gap-2`, `px-3`, `p-4` | `gap-card-gap`, `gap-stack`, `p-card`, `gap-inline`, `px-stack` |
| meal-plans | `src/features/meal-plans/components/smart-notes-panel.tsx` | `gap-4`, `p-5`, `gap-3`, `gap-2` | `gap-card-gap`, `p-card`, `gap-stack`, `gap-inline` |
| meal-plans | `src/features/meal-plans/components/targets-bar.tsx` | `gap-4`, `p-5`, `gap-2`, `gap-3`, `px-3` | `gap-card-gap`, `p-card`, `gap-inline`, `gap-stack`, `px-stack` |
| meal-plans | `src/features/meal-plans/components/v11-assign-dialog.tsx` | `p-5`, `mb-4`, `gap-4`, `gap-2`, `px-3` | `p-card`, `mb-card-gap`, `gap-card-gap`, `gap-inline`, `px-stack` |
| meal-plans | `src/features/meal-plans/components/v11-editor.tsx` | `gap-4`, `gap-2`, `px-5`, `gap-3`, `p-5` | `gap-card-gap`, `gap-inline`, `px-page-x`, `gap-stack`, `p-card` |
| meal-plans | `src/features/meal-plans/components/v11-food-picker.tsx` | `p-5`, `mb-3`, `gap-2`, `px-3`, `my-2`, `py-4`, `gap-3`, `py-2`, `p-3` | `p-card`, `mb-stack`, `gap-inline`, `px-stack`, `my-inline`, `py-page-y`, `gap-stack`, `py-inline`, `p-stack` |
| meal-plans | `src/features/meal-plans/components/v11-food-row.tsx` | `gap-2`, `px-4`, `py-2.5`, `mt-1`, `px-2` | `gap-inline`, `px-page-x`, `py-stack`, `mt-inline`, `px-inline` |
| meal-plans | `src/features/meal-plans/components/v11-foods-table.tsx` | `px-1.5`, `py-1`, `px-1`, `py-3`, `px-3`, `gap-2`, `p-8` | `px-inline`, `py-inline`, `py-stack`, `px-stack`, `gap-inline`, `p-section` |
| meal-plans | `src/features/meal-plans/components/v11-macros.tsx` | `gap-4`, `p-5`, `gap-2`, `gap-1` | `gap-card-gap`, `p-card`, `gap-inline` |
| meal-plans | `src/features/meal-plans/components/v11-meal.tsx` | `p-4`, `gap-2`, `px-3`, `py-3`, `mt-3` | `p-card`, `gap-inline`, `px-stack`, `py-stack`, `mt-stack` |
| meal-plans | `src/features/meal-plans/components/v11-new-plan.tsx` | `gap-1.5`, `p-5`, `gap-2`, `px-5`, `px-4` | `gap-inline`, `p-card`, `px-page-x` |
| muscle-analytics | `src/features/muscle-analytics/components/analytics-panel.tsx` | `space-y-6`, `gap-4`, `p-4`, `gap-3`, `gap-1.5`, `space-y-2` | `space-y-section`, `gap-card-gap`, `p-card`, `gap-stack`, `gap-inline`, `space-y-inline` |
| muscle-analytics | `src/features/muscle-analytics/components/analytics-skeleton.tsx` | `space-y-5` | `space-y-card-gap` |
| muscle-analytics | `src/features/muscle-analytics/components/analytics-tab.tsx` | `space-y-5`, `p-5`, `p-6`, `space-y-1`, `space-y-3`, `px-5` | `space-y-card-gap`, `p-card`, `p-section`, `space-y-inline`, `space-y-stack`, `px-page-x` |
| muscle-analytics | `src/features/muscle-analytics/components/balance-bar.tsx` | `space-y-3`, `p-4`, `gap-2`, `p-3` | `space-y-stack`, `p-card`, `gap-inline`, `p-stack` |
| muscle-analytics | `src/features/muscle-analytics/components/body-map.tsx` | `gap-5`, `mt-3`, `gap-2`, `px-2`, `py-1`, `ms-1`, `p-3` | `gap-card-gap`, `mt-stack`, `gap-inline`, `px-inline`, `py-inline`, `ms-inline`, `p-stack` |
| muscle-analytics | `src/features/muscle-analytics/components/quick-stats.tsx` | `gap-2`, `gap-3`, `space-y-2`, `p-3`, `p-4` | `gap-inline`, `gap-stack`, `space-y-inline`, `p-stack`, `p-card` |
| muscle-analytics | `src/features/muscle-analytics/components/week-slider.tsx` | `space-y-1`, `gap-3` | `space-y-inline`, `gap-stack` |
| notifications | `src/features/notifications/components/captain-notifications-entry.tsx` | `px-4`, `mb-3`, `p-3.5`, `p-4`, `gap-2.5`, `p-2`, `text-[13px]`, `text-[11.5px]` | `px-page-x`, `mb-stack`, `p-card`, `gap-stack`, `p-inline`, `text-row`, `text-micro` |
| notifications | `src/features/notifications/components/captain-notifications-state-entry.tsx` | `p-5`, `mt-3`, `px-4` | `p-card`, `mt-stack`, `px-page-x` |
| notifications | `src/features/notifications/components/notification-dropdown.tsx` | `p-4`, `mt-2`, `gap-3`, `px-5`, `py-4`, `pe-8`, `p-3`, `gap-2`, `ms-[48px]`, `mt-1`, `text-[11.5px]` | `p-card`, `mt-inline`, `gap-stack`, `px-page-x`, `py-page-y`, `pe-section`, `p-stack`, `gap-inline`, `ms-touch`, `text-micro` |
| notifications | `src/features/notifications/push/components/push-toggle-card.tsx` | `p-6`, `gap-4`, `mt-2` | `p-section`, `gap-card-gap`, `mt-inline` |
| nutrition | `src/features/nutrition/components/food-actions.tsx` | `gap-2`, `px-2`, `py-2`, `text-[10px]` | `gap-inline`, `px-inline`, `py-inline`, `text-micro` |
| nutrition | `src/features/nutrition/components/food-water.tsx` | `space-y-2`, `gap-3`, `px-3`, `py-2.5` | `space-y-inline`, `gap-stack`, `px-stack`, `py-stack` |
| nutrition | `src/features/nutrition/components/macro-ring.tsx` | `gap-5`, `p-5`, `space-y-4`, `space-y-1`, `gap-1` | `gap-card-gap`, `p-card`, `space-y-card-gap`, `space-y-inline`, `gap-inline` |
| nutrition | `src/features/nutrition/components/macro-tiles.tsx` | `gap-3.5`, `p-[18px]`, `gap-2`, `text-[44px]`, `gap-2.5`, `gap-1.5`, `text-[13px]` | `gap-card-gap`, `p-card`, `gap-inline`, `text-stat-wide`, `gap-stack`, `text-row` |
| nutrition | `src/features/nutrition/components/meal-card.tsx` | `space-y-4`, `p-4`, `space-y-3`, `gap-3`, `px-3`, `py-2.5`, `gap-0.5`, `text-[15px]`, `mt-3` | `space-y-card-gap`, `p-card`, `space-y-stack`, `gap-stack`, `px-stack`, `py-stack`, `gap-inline`, `text-md`, `mt-stack` |
| nutrition | `src/features/nutrition/components/nutrition-screen.tsx` | `gap-3`, `px-[18px]`, `pt-[18px]`, `space-y-4`, `px-5`, `pt-6`, `text-[26px]`, `gap-2` | `gap-stack`, `px-page-x`, `pt-card`, `space-y-card-gap`, `pt-section`, `text-h`, `gap-inline` |
| onboarding | `src/features/onboarding/components/chip-group.tsx` | `space-y-3`, `gap-2`, `px-5`, `py-[18px]` | `space-y-stack`, `gap-inline`, `px-page-x`, `py-page-y` |
| onboarding | `src/features/onboarding/components/day-picker.tsx` | `space-y-3`, `gap-2`, `px-2` | `space-y-stack`, `gap-inline`, `px-inline` |
| onboarding | `src/features/onboarding/components/intake-moment.tsx` | `gap-8`, `px-5`, `py-10`, `space-y-6`, `p-6` | `gap-section`, `px-page-x`, `py-section`, `space-y-section`, `p-section` |
| onboarding | `src/features/onboarding/components/intake-question.tsx` | `space-y-4`, `space-y-2`, `px-5`, `py-[18px]` | `space-y-card-gap`, `space-y-inline`, `px-page-x`, `py-page-y` |
| onboarding | `src/features/onboarding/components/intake-v6.tsx` | `gap-5`, `px-5`, `py-6`, `space-y-3`, `px-3`, `space-y-2` | `gap-card-gap`, `px-page-x`, `py-page-y`, `space-y-stack`, `px-stack`, `space-y-inline` |
| onboarding | `src/features/onboarding/components/intake-wizard.tsx` | `gap-6`, `px-5`, `pt-6`, `space-y-3`, `gap-2`, `p-4`, `gap-3` | `gap-section`, `px-page-x`, `pt-section`, `space-y-stack`, `gap-inline`, `p-card`, `gap-stack` |
| onboarding | `src/features/onboarding/components/metric-slider.tsx` | `space-y-2` | `space-y-inline` |
| onboarding | `src/features/onboarding/components/step-basics.tsx` | `space-y-5`, `space-y-2`, `mb-2`, `gap-2`, `space-y-3` | `space-y-card-gap`, `space-y-inline`, `mb-inline`, `gap-inline`, `space-y-stack` |
| onboarding | `src/features/onboarding/components/step-food.tsx` | `space-y-6` | `space-y-section` |
| onboarding | `src/features/onboarding/components/step-health.tsx` | `space-y-6` | `space-y-section` |
| onboarding | `src/features/onboarding/components/step-schedule.tsx` | `space-y-6`, `space-y-3`, `mb-2`, `gap-2`, `px-5` | `space-y-section`, `space-y-stack`, `mb-inline`, `gap-inline`, `px-page-x` |
| player-home | `src/features/player-home/components/captain-row.tsx` | `gap-3`, `px-3.5`, `py-3`, `gap-0.5`, `text-[13px]`, `text-[10px]` | `gap-stack`, `px-card`, `py-stack`, `gap-inline`, `text-row`, `text-micro` |
| player-home | `src/features/player-home/components/day-preview-card.tsx` | `space-y-2`, `px-3`, `py-1`, `space-y-3`, `gap-3`, `space-y-5`, `p-5` | `space-y-inline`, `px-stack`, `py-inline`, `space-y-stack`, `gap-stack`, `space-y-card-gap`, `p-card` |
| player-home | `src/features/player-home/components/greeting.tsx` | `gap-3`, `space-y-1` | `gap-stack`, `space-y-inline` |
| player-home | `src/features/player-home/components/home-header.tsx` | `gap-3`, `pb-1`, `text-[17px]`, `gap-0.5`, `text-[13px]`, `text-[22px]` | `gap-stack`, `pb-inline`, `text-title`, `gap-inline`, `text-row`, `text-h` |
| player-home | `src/features/player-home/components/home-hero.tsx` | `p-5`, `gap-3`, `gap-4`, `gap-1.5`, `text-[13px]`, `text-[30px]`, `px-3`, `gap-2`, `gap-2.5`, `text-[19px]` | `p-card`, `gap-stack`, `gap-card-gap`, `gap-inline`, `text-row`, `text-stat`, `px-stack`, `text-title` |
| player-home | `src/features/player-home/components/home-screen.tsx` | `gap-3`, `px-[18px]`, `pt-[18px]`, `space-y-4`, `px-5`, `pt-6`, `mt-6`, `text-[13px]` | `gap-stack`, `px-page-x`, `pt-card`, `space-y-card-gap`, `pt-section`, `mt-section`, `text-row` |
| player-home | `src/features/player-home/components/home-tiles.tsx` | `p-4`, `gap-3`, `gap-2.5`, `text-[13px]`, `text-[30px]`, `gap-1`, `gap-1.5`, `text-[34px]` | `p-card`, `gap-stack`, `text-row`, `text-stat`, `gap-inline` |
| player-home | `src/features/player-home/components/morning-row.tsx` | `gap-3`, `px-5`, `py-3`, `space-y-3`, `px-4`, `pb-4` | `gap-stack`, `px-page-x`, `py-stack`, `space-y-stack`, `pb-card` |
| player-home | `src/features/player-home/components/next-task-card.tsx` | `space-y-3`, `p-5`, `text-[22px]`, `text-[12.5px]`, `px-5`, `space-y-4`, `p-6` | `space-y-stack`, `p-card`, `text-h`, `text-xs`, `px-page-x`, `space-y-card-gap`, `p-section` |
| player-home | `src/features/player-home/components/next-task-slot.tsx` | `px-5`, `py-3` | `px-page-x`, `py-stack` |
| player-home | `src/features/player-home/components/nutrition-slot.tsx` | `space-y-2`, `p-5` | `space-y-inline`, `p-card` |
| player-home | `src/features/player-home/components/streak-pill.tsx` | `gap-2`, `px-3`, `py-1` | `gap-inline`, `px-stack`, `py-inline` |
| player-home | `src/features/player-home/components/streak-sheet.tsx` | `space-y-6`, `text-[46px]`, `gap-2`, `space-y-2`, `px-2` | `space-y-section`, `text-stat-large`, `gap-inline`, `space-y-inline`, `px-inline` |
| player-home | `src/features/player-home/components/today-card.tsx` | `space-y-2`, `px-4`, `space-y-5`, `p-5` | `space-y-inline`, `px-page-x`, `space-y-card-gap`, `p-card` |
| player-home | `src/features/player-home/components/tomorrow-card.tsx` | `text-[10px]`, `gap-0.5`, `text-[15px]`, `gap-3`, `px-4`, `py-3.5` | `text-micro`, `gap-inline`, `text-md`, `gap-stack`, `px-page-x`, `py-card` |
| player-home | `src/features/player-home/components/v3-home.tsx` | `gap-3`, `gap-2.5` | `gap-stack` |
| player-home | `src/features/player-home/components/week-strip.tsx` | `p-4`, `gap-1`, `gap-3`, `text-[10px]`, `mt-2`, `p-2` | `p-card`, `gap-inline`, `gap-stack`, `text-micro`, `mt-inline`, `p-inline` |
| player-home | `src/features/player-home/components/weekly-rest-card.tsx` | `space-y-3`, `p-5` | `space-y-stack`, `p-card` |
| player-home | `src/features/player-home/v6-flag-off.test.ts` | Previous spacing expectations | Scale expectations/snapshots |
| player-preview | `src/features/player-preview/components/phone-frame.tsx` | `p-3` | `p-stack` |
| player-preview | `src/features/player-preview/components/preview-nutrition.tsx` | `space-y-4`, `gap-3`, `p-4`, `space-y-3`, `p-3`, `space-y-2`, `pt-2` | `space-y-card-gap`, `gap-stack`, `p-card`, `space-y-stack`, `p-stack`, `space-y-inline`, `pt-inline` |
| player-preview | `src/features/player-preview/components/preview-program.tsx` | `space-y-4`, `space-y-3`, `p-3`, `space-y-2`, `pt-3` | `space-y-card-gap`, `space-y-stack`, `p-stack`, `space-y-inline`, `pt-stack` |
| player-preview | `src/features/player-preview/components/preview-screen.tsx` | `space-y-4`, `space-y-6`, `p-4`, `gap-3`, `p-3`, `gap-1`, `pb-2`, `space-y-3`, `p-2`, `py-2`, `mt-1` | `space-y-card-gap`, `space-y-section`, `p-card`, `gap-stack`, `p-stack`, `gap-inline`, `pb-inline`, `space-y-stack`, `p-inline`, `py-inline`, `mt-inline` |
| player-preview | `src/features/player-preview/components/preview-week.tsx` | `space-y-3`, `space-y-2`, `p-3`, `mt-2`, `px-2`, `py-1` | `space-y-stack`, `space-y-inline`, `p-stack`, `mt-inline`, `px-inline`, `py-inline` |
| player-profile | `src/features/player-profile/components/checkins-tab.tsx` | `gap-4`, `space-y-3`, `p-5`, `gap-2`, `px-3`, `py-1`, `gap-x-6`, `gap-y-1`, `p-3` | `gap-card-gap`, `space-y-stack`, `p-card`, `gap-inline`, `px-stack`, `py-inline`, `gap-x-section`, `gap-y-inline`, `p-stack` |
| player-profile | `src/features/player-profile/components/intake-tab.tsx` | `space-y-1`, `gap-4`, `space-y-4`, `p-5`, `space-y-3` | `space-y-inline`, `gap-card-gap`, `space-y-card-gap`, `p-card`, `space-y-stack` |
| player-profile | `src/features/player-profile/components/plan-tab.tsx` | `gap-4`, `p-5`, `gap-3`, `px-4`, `space-y-4`, `gap-2` | `gap-card-gap`, `p-card`, `gap-stack`, `px-page-x`, `space-y-card-gap`, `gap-inline` |
| player-profile | `src/features/player-profile/components/profile-screen.tsx` | `gap-2`, `space-y-4`, `p-5`, `space-y-6`, `gap-4`, `px-4` | `gap-inline`, `space-y-card-gap`, `p-card`, `space-y-section`, `gap-card-gap`, `px-page-x` |
| player-profile | `src/features/player-profile/components/profile-tabs.tsx` | `gap-1`, `p-1`, `px-1` | `gap-inline`, `p-inline`, `px-inline` |
| player-profile | `src/features/player-profile/components/progress-tab.tsx` | `space-y-4`, `space-y-5`, `p-5`, `gap-3`, `p-3` | `space-y-card-gap`, `p-card`, `gap-stack`, `p-stack` |
| player-shell | `src/features/player-shell/components/assessments-screen.tsx` | `space-y-3`, `px-[18px]`, `pt-4`, `gap-3` | `space-y-stack`, `px-page-x`, `pt-card`, `gap-stack` |
| player-shell | `src/features/player-shell/components/captain-heading.tsx` | `gap-3`, `gap-0.5` | `gap-stack`, `gap-inline` |
| player-shell | `src/features/player-shell/components/captain-pending-assessment.tsx` | `gap-3`, `px-3.5`, `py-3`, `gap-0.5` | `gap-stack`, `px-card`, `py-stack`, `gap-inline` |
| player-shell | `src/features/player-shell/components/captain-profile-card.tsx` | `gap-3`, `gap-4`, `text-[30px]`, `mt-1`, `text-[13px]`, `gap-2`, `px-3`, `px-4`, `py-2`, `space-y-2`, `px-5`, `space-y-5`, `p-6`, `space-y-3`, `p-5`, `p-4`, `text-[15px]` | `gap-stack`, `gap-card-gap`, `text-stat`, `mt-inline`, `text-row`, `gap-inline`, `px-stack`, `px-page-x`, `py-inline`, `space-y-inline`, `space-y-card-gap`, `p-section`, `space-y-stack`, `p-card`, `text-md` |
| player-shell | `src/features/player-shell/components/captain-profile-screen.tsx` | `space-y-3`, `px-[18px]`, `pt-4`, `gap-3`, `p-4`, `text-[15px]`, `text-[13px]` | `space-y-stack`, `px-page-x`, `pt-card`, `gap-stack`, `p-card`, `text-md`, `text-row` |
| player-shell | `src/features/player-shell/components/captain-question.tsx` | `space-y-1`, `space-y-3`, `p-5`, `gap-2`, `px-4`, `px-3` | `space-y-inline`, `space-y-stack`, `p-card`, `gap-inline`, `px-page-x`, `px-stack` |
| player-shell | `src/features/player-shell/components/captain-screen.tsx` | `space-y-3`, `px-[18px]`, `pt-4`, `space-y-5`, `px-5`, `pt-6` | `space-y-stack`, `px-page-x`, `pt-card`, `space-y-card-gap`, `pt-section` |
| player-shell | `src/features/player-shell/components/no-captain-screen.tsx` | `gap-5`, `px-6`, `py-12`, `px-4` | `gap-card-gap`, `px-page-x`, `py-section` |
| player-shell | `src/features/player-shell/components/player-assessments.tsx` | `space-y-3`, `gap-3`, `p-4`, `px-2.5`, `py-1`, `text-[15px]`, `mt-0.5`, `px-4`, `pt-1.5`, `py-3.5`, `ms-1`, `text-[11px]`, `px-5`, `pt-5`, `p-5`, `mt-1` | `space-y-stack`, `gap-stack`, `p-card`, `px-stack`, `py-inline`, `text-md`, `mt-inline`, `px-page-x`, `pt-inline`, `py-card`, `ms-inline`, `text-micro`, `pt-card` |
| player-shell | `src/features/player-shell/components/player-shell.tsx` | `pb-3`, `gap-2`, `px-5`, `space-y-3`, `pt-3`, `p-4`, `mt-2`, `px-4` | `pb-stack`, `gap-inline`, `px-page-x`, `space-y-stack`, `pt-stack`, `p-card`, `mt-inline` |
| player-shell | `src/features/player-shell/components/start-gate-screen.tsx` | `space-y-5`, `px-5`, `pt-6`, `mt-3`, `mb-2`, `space-y-3`, `gap-3`, `p-4`, `gap-2`, `pt-3`, `px-4` | `space-y-card-gap`, `px-page-x`, `pt-section`, `mt-stack`, `mb-inline`, `space-y-stack`, `gap-stack`, `p-card`, `gap-inline`, `pt-stack` |
| player-shell | `src/features/player-shell/shell-feedback.test.ts` | `gap-2`, `px-5`, `space-y-3`, `pt-3` | `gap-inline`, `px-page-x`, `space-y-stack`, `pt-stack` |
| program-generator | `src/features/program-generator/components/brief-sheet.tsx` | `space-y-2`, `p-[18px]`, `space-y-5`, `gap-4`, `gap-3`, `mb-2`, `gap-2` | `space-y-inline`, `p-card`, `space-y-card-gap`, `gap-card-gap`, `gap-stack`, `mb-inline`, `gap-inline` |
| program-generator | `src/features/program-generator/components/generate-button.tsx` | `p-5`, `p-6`, `space-y-4`, `space-y-5`, `space-y-3`, `p-4`, `gap-2` | `p-card`, `p-section`, `space-y-card-gap`, `space-y-stack`, `gap-inline` |
| program-generator | `src/features/program-generator/components/generated-exercise.tsx` | `gap-3`, `p-3`, `space-y-2`, `gap-2`, `px-3`, `py-1`, `space-y-4`, `p-6` | `gap-stack`, `p-stack`, `space-y-inline`, `gap-inline`, `px-stack`, `py-inline`, `space-y-card-gap`, `p-section` |
| program-generator | `src/features/program-generator/components/generated-week.tsx` | `space-y-4`, `gap-2`, `px-4`, `space-y-3`, `p-6` | `space-y-card-gap`, `gap-inline`, `px-page-x`, `space-y-stack`, `p-section` |
| program-generator | `src/features/program-generator/components/swap-sheet.tsx` | `space-y-4`, `p-6`, `space-y-2` | `space-y-card-gap`, `p-section`, `space-y-inline` |
| programs | `src/features/programs/a11y.test.ts` | `gap-3`, `p-4` | `gap-stack`, `p-card` |
| programs | `src/features/programs/components/builder-header.tsx` | `gap-4`, `space-y-2`, `gap-3`, `px-3`, `py-1`, `gap-2`, `p-3` | `gap-card-gap`, `space-y-inline`, `gap-stack`, `px-stack`, `py-inline`, `gap-inline`, `p-stack` |
| programs | `src/features/programs/components/builder-menu.tsx` | `space-y-3`, `p-5` | `space-y-stack`, `p-card` |
| programs | `src/features/programs/components/builder-navigation.tsx` | `space-y-3`, `p-4`, `gap-2`, `pb-2`, `gap-1`, `py-3` | `space-y-stack`, `p-card`, `gap-inline`, `pb-inline`, `py-stack` |
| programs | `src/features/programs/components/cardio-editor.tsx` | `space-y-4`, `p-4`, `gap-2`, `space-y-2`, `p-1` | `space-y-card-gap`, `p-card`, `gap-inline`, `space-y-inline`, `p-inline` |
| programs | `src/features/programs/components/custom-exercise-sheet.tsx` | `p-5`, `space-y-4`, `gap-2`, `px-3`, `gap-3` | `p-card`, `space-y-card-gap`, `gap-inline`, `px-stack`, `gap-stack` |
| programs | `src/features/programs/components/day-editor.tsx` | `gap-2`, `space-y-4`, `p-4`, `p-6`, `gap-3`, `p-5`, `space-y-3` | `gap-inline`, `space-y-card-gap`, `p-card`, `p-section`, `gap-stack`, `space-y-stack` |
| programs | `src/features/programs/components/exercise-drawer.tsx` | `p-4`, `mb-4` | `p-card`, `mb-card-gap` |
| programs | `src/features/programs/components/exercise-picker.tsx` | `gap-y-4`, `p-4`, `ps-11`, `gap-2`, `px-2`, `py-2`, `space-y-3`, `gap-3`, `p-2`, `p-1`, `gap-1` | `gap-y-card-gap`, `p-card`, `ps-touch`, `gap-inline`, `px-inline`, `py-inline`, `space-y-stack`, `gap-stack`, `p-inline` |
| programs | `src/features/programs/components/exercise-row.tsx` | `gap-3`, `p-3`, `space-y-4`, `p-4`, `space-y-2`, `me-2`, `px-3`, `py-1` | `gap-stack`, `p-stack`, `space-y-card-gap`, `p-card`, `space-y-inline`, `me-inline`, `px-stack`, `py-inline` |
| programs | `src/features/programs/components/program-builder.tsx` | `space-y-6`, `gap-4`, `p-5`, `gap-3`, `p-4`, `space-y-3`, `gap-5`, `space-y-4` | `space-y-section`, `gap-card-gap`, `p-card`, `gap-stack`, `space-y-stack`, `space-y-card-gap` |
| programs | `src/features/programs/components/reps-sheet.tsx` | `space-y-4`, `p-5`, `gap-3`, `gap-2`, `space-y-3` | `space-y-card-gap`, `p-card`, `gap-stack`, `gap-inline`, `space-y-stack` |
| programs | `src/features/programs/components/rest-confirmation.tsx` | `space-y-4`, `p-5`, `gap-3` | `space-y-card-gap`, `p-card`, `gap-stack` |
| programs | `src/features/programs/components/rest-sheet.tsx` | `space-y-4`, `p-5`, `gap-3`, `gap-2` | `space-y-card-gap`, `p-card`, `gap-stack`, `gap-inline` |
| programs | `src/features/programs/components/rir-sheet.tsx` | `space-y-4`, `p-5`, `gap-3`, `gap-2` | `space-y-card-gap`, `p-card`, `gap-stack`, `gap-inline` |
| programs | `src/features/programs/picker-optimistic.test.ts` | `min-h-12` | Scale expectations/snapshots |
| progress | `src/features/progress/components/checkin-history.tsx` | `space-y-3`, `p-4` | `space-y-stack`, `p-card` |
| progress | `src/features/progress/components/checkin-sheet.tsx` | `p-5`, `space-y-4`, `gap-2`, `space-y-2`, `p-2` | `p-card`, `space-y-card-gap`, `gap-inline`, `space-y-inline`, `p-inline` |
| progress | `src/features/progress/components/line-chart.tsx` | `space-y-3`, `p-3`, `gap-3` | `space-y-stack`, `p-stack`, `gap-stack` |
| progress | `src/features/progress/components/progress-gallery.tsx` | `space-y-2`, `gap-2`, `space-y-4`, `p-4`, `space-y-3`, `gap-3`, `gap-1`, `px-3`, `p-3`, `space-y-5` | `space-y-inline`, `gap-inline`, `space-y-card-gap`, `p-card`, `space-y-stack`, `gap-stack`, `px-stack`, `p-stack` |
| progress | `src/features/progress/components/progress-screen.tsx` | `space-y-3`, `px-[18px]`, `pt-[18px]`, `space-y-4`, `px-5`, `pt-6`, `gap-3`, `p-5`, `gap-2`, `p-2`, `space-y-2`, `p-4`, `py-3` | `space-y-stack`, `px-page-x`, `pt-card`, `space-y-card-gap`, `pt-section`, `gap-stack`, `p-card`, `gap-inline`, `p-inline`, `space-y-inline`, `py-stack` |
| progress | `src/features/progress/components/progress-v3.tsx` | `p-4`, `gap-2`, `text-[26px]`, `p-1`, `px-3.5`, `text-[13px]`, `gap-2.5`, `text-[40px]`, `px-2.5`, `py-5`, `gap-1.5`, `text-[32px]`, `px-4` | `p-card`, `gap-inline`, `text-h`, `p-inline`, `px-card`, `text-row`, `gap-stack`, `text-stat-wide`, `px-stack`, `py-page-y`, `text-stat`, `px-page-x` |
| progress | `src/features/progress/components/rank-overview.tsx` | `gap-3`, `p-5`, `mt-1` | `gap-stack`, `p-card`, `mt-inline` |
| progress | `src/features/progress/components/weight-overview.tsx` | `space-y-3`, `p-5`, `gap-3`, `gap-x-2` | `space-y-stack`, `p-card`, `gap-stack`, `gap-x-inline` |
| rank-review | `src/features/rank-review/components/board-list.tsx` | `space-y-3`, `gap-3`, `p-4` | `space-y-stack`, `gap-stack`, `p-card` |
| rank-review | `src/features/rank-review/components/crown-card.tsx` | `gap-5`, `p-5`, `space-y-2` | `gap-card-gap`, `p-card`, `space-y-inline` |
| rank-review | `src/features/rank-review/components/crown-prize-editor.tsx` | `space-y-3`, `p-4`, `px-3`, `gap-3`, `px-4` | `space-y-stack`, `p-card`, `px-stack`, `gap-stack`, `px-page-x` |
| rank-review | `src/features/rank-review/components/leaderboard-screen.tsx` | `space-y-5`, `px-4` | `space-y-card-gap`, `px-page-x` |
| rank-review | `src/features/rank-review/components/month-switch.tsx` | `gap-3` | `gap-stack` |
| rank-review | `src/features/rank-review/components/podium.tsx` | `p-[18px]`, `gap-2.5`, `pt-2.5`, `gap-1`, `px-1.5`, `py-2.5` | `p-card`, `gap-stack`, `pt-stack`, `gap-inline`, `px-inline`, `py-stack` |
| rank-review | `src/features/rank-review/components/prize-month-control.tsx` | `px-3` | `px-stack` |
| rank-review | `src/features/rank-review/components/ranks-soon.tsx` | `px-4`, `py-10`, `gap-4`, `p-8` | `px-page-x`, `py-section`, `gap-card-gap`, `p-section` |
| rank-review | `src/features/rank-review/components/team-crown-link.tsx` | `mb-4`, `gap-3`, `p-3` | `mb-card-gap`, `gap-stack`, `p-stack` |
| rank-review | `src/features/rank-review/components/workspace-board-list.tsx` | `p-[18px]`, `px-[7px]`, `py-0.5`, `text-[9.5px]`, `gap-3`, `p-2.5` | `p-card`, `px-inline`, `py-inline`, `text-micro`, `gap-stack`, `p-stack` |
| rank-review | `src/features/rank-review/components/workspace-leaderboard.tsx` | `space-y-4`, `pb-5`, `gap-1`, `p-[3px]`, `px-3` | `space-y-card-gap`, `pb-card`, `gap-inline`, `p-inline`, `px-stack` |
| ranks | `src/features/ranks/components/crown-race.tsx` | `space-y-3`, `p-5`, `gap-2`, `gap-4` | `space-y-stack`, `p-card`, `gap-inline`, `gap-card-gap` |
| ranks | `src/features/ranks/components/hall-of-fame.tsx` | `space-y-3`, `gap-3` | `space-y-stack`, `gap-stack` |
| ranks | `src/features/ranks/components/level-up-panel.tsx` | `p-6`, `gap-5` | `p-section`, `gap-card-gap` |
| ranks | `src/features/ranks/components/points-log.tsx` | `space-y-3`, `p-4`, `gap-3`, `py-3`, `space-y-1` | `space-y-stack`, `p-card`, `gap-stack`, `py-stack`, `space-y-inline` |
| ranks | `src/features/ranks/components/rank-chip.tsx` | `gap-2`, `px-3` | `gap-inline`, `px-stack` |
| ranks | `src/features/ranks/components/rank-hero.tsx` | `gap-3`, `p-6` | `gap-stack`, `p-section` |
| ranks | `src/features/ranks/components/rank-journey.tsx` | `space-y-4`, `p-4`, `gap-2` | `space-y-card-gap`, `p-card`, `gap-inline` |
| ranks | `src/features/ranks/components/rank-screen.tsx` | `space-y-4`, `px-5`, `pt-6` | `space-y-card-gap`, `px-page-x`, `pt-section` |
| ranks | `src/features/ranks/components/rank-v6.tsx` | `gap-2`, `px-5`, `pt-[18px]`, `pb-1`, `text-[19px]`, `text-[11.5px]`, `py-1`, `gap-3`, `pb-4`, `p-5` | `gap-inline`, `px-page-x`, `pt-card`, `pb-inline`, `text-title`, `text-micro`, `py-inline`, `gap-stack`, `pb-card`, `p-card` |
| ranks | `src/features/ranks/components/share-rank-button.tsx` | `space-y-2` | `space-y-inline` |
| ranks | `src/features/ranks/components/team-board.tsx` | `space-y-3`, `p-4`, `space-y-2`, `gap-3`, `px-5`, `py-3`, `p-3`, `mt-1`, `text-[11.5px]` | `space-y-stack`, `p-card`, `space-y-inline`, `gap-stack`, `px-page-x`, `py-stack`, `p-stack`, `mt-inline`, `text-micro` |
| readiness | `src/features/readiness/__snapshots__/v6-secondary.test.ts.snap` | Previous spacing expectations | Scale expectations/snapshots |
| readiness | `src/features/readiness/components/coach-reduction-banner.tsx` | `p-4` | `p-card` |
| readiness | `src/features/readiness/components/daily-panel.tsx` | `space-y-4`, `gap-2` | `space-y-card-gap`, `gap-inline` |
| readiness | `src/features/readiness/components/decision-card.tsx` | `space-y-4`, `p-5`, `gap-2`, `px-3`, `px-4` | `space-y-card-gap`, `p-card`, `gap-inline`, `px-stack`, `px-page-x` |
| readiness | `src/features/readiness/components/morning-questions.tsx` | `space-y-3`, `space-y-5`, `p-5`, `text-[22px]`, `mt-1`, `text-[12.5px]`, `gap-2`, `px-3` | `space-y-stack`, `space-y-card-gap`, `p-card`, `text-h`, `mt-inline`, `text-xs`, `gap-inline`, `px-stack` |
| readiness | `src/features/readiness/components/morning-result.tsx` | `gap-3`, `p-5`, `mt-1` | `gap-stack`, `p-card`, `mt-inline` |
| readiness | `src/features/readiness/components/questions-sheet.tsx` | `space-y-4`, `p-5`, `px-4` | `space-y-card-gap`, `p-card`, `px-page-x` |
| readiness | `src/features/readiness/components/readiness-row.tsx` | `gap-3`, `px-4`, `py-2`, `px-3` | `gap-stack`, `px-page-x`, `py-inline`, `px-stack` |
| readiness | `src/features/readiness/components/readiness-tab.tsx` | `space-y-4`, `gap-4`, `gap-2` | `space-y-card-gap`, `gap-card-gap`, `gap-inline` |
| readiness | `src/features/readiness/components/rest-hero.tsx` | `space-y-4`, `p-6`, `gap-2` | `space-y-card-gap`, `p-section`, `gap-inline` |
| readiness | `src/features/readiness/components/water-glass.tsx` | `gap-5`, `p-5`, `space-y-2`, `px-4` | `gap-card-gap`, `p-card`, `space-y-inline`, `px-page-x` |
| readiness | `src/features/readiness/components/water-strip.tsx` | `space-y-2`, `p-4`, `gap-3`, `mt-2`, `gap-1` | `space-y-inline`, `p-card`, `gap-stack`, `mt-inline`, `gap-inline` |
| readiness | `src/features/readiness/components/week-rings.tsx` | `p-3`, `gap-1`, `gap-2` | `p-stack`, `gap-inline` |
| roster | `src/features/roster/components/captain-account-content.tsx` | `gap-1` | `gap-inline` |
| roster | `src/features/roster/components/captain-account-menu.tsx` | `gap-2`, `px-3`, `py-2.5`, `p-2` | `gap-inline`, `px-stack`, `py-stack`, `p-inline` |
| roster | `src/features/roster/components/captain-frame-nav.tsx` | `px-2`, `gap-0.5`, `text-[10px]`, `px-1` | `px-inline`, `gap-inline`, `text-micro` |
| roster | `src/features/roster/components/captain-more-sheet.tsx` | `p-3`, `px-2`, `mt-3` | `p-stack`, `px-inline`, `mt-stack` |
| roster | `src/features/roster/components/captain-nav-groups.tsx` | `px-2`, `pb-1`, `pt-3`, `text-[11px]`, `gap-2`, `space-y-0.5`, `gap-2.5`, `px-2.5`, `text-[13px]`, `py-3`, `px-1.5` | `px-inline`, `pb-inline`, `pt-stack`, `text-micro`, `gap-inline`, `space-y-inline`, `gap-stack`, `px-stack`, `text-row`, `py-stack` |
| roster | `src/features/roster/components/captain-nav.tsx` | `space-y-1`, `px-3`, `pt-3`, `gap-3`, `px-2` | `space-y-inline`, `px-stack`, `pt-stack`, `gap-stack`, `px-inline` |
| roster | `src/features/roster/components/captain-search-palette.tsx` | `p-3`, `gap-2`, `px-3`, `mt-2`, `space-y-1`, `gap-3` | `p-stack`, `gap-inline`, `px-stack`, `mt-inline`, `space-y-inline`, `gap-stack` |
| roster | `src/features/roster/components/captain-top-bar.tsx` | `mb-3`, `gap-2`, `px-2`, `py-2`, `ps-1.5`, `px-3`, `px-1.5`, `py-1`, `text-[10px]` | `mb-stack`, `gap-inline`, `px-inline`, `py-inline`, `ps-inline`, `px-stack`, `text-micro` |
| roster | `src/features/roster/components/captain-workspace-frame.tsx` | `gap-3`, `px-3`, `pb-4`, `p-3`, `p-2.5`, `gap-2`, `px-2`, `space-y-3`, `pt-4`, `text-[13px]`, `text-[11px]` | `gap-stack`, `px-page-x`, `pb-card`, `py-page-y`, `p-stack`, `gap-inline`, `px-inline`, `space-y-stack`, `pt-card`, `text-row`, `text-micro` |
| roster | `src/features/roster/components/invite-assessments.tsx` | `space-y-3`, `gap-3`, `p-4`, `mt-2`, `mt-1`, `py-3`, `gap-2`, `px-3`, `mb-3` | `space-y-stack`, `gap-stack`, `p-card`, `mt-inline`, `py-stack`, `gap-inline`, `px-stack`, `mb-stack` |
| roster | `src/features/roster/components/invite-button.tsx` | `gap-2`, `px-4` | `gap-inline`, `px-page-x` |
| roster | `src/features/roster/components/invite-content.tsx` | `p-5`, `space-y-3`, `space-y-5`, `px-4` | `p-card`, `space-y-stack`, `space-y-card-gap`, `px-page-x` |
| roster | `src/features/roster/components/invite-form.tsx` | `space-y-5`, `gap-4`, `gap-3`, `mt-2`, `gap-2`, `space-y-4`, `p-4`, `p-5`, `mt-1`, `px-3`, `py-2`, `px-4`, `pt-3` | `space-y-card-gap`, `gap-card-gap`, `gap-stack`, `mt-inline`, `gap-inline`, `p-card`, `px-stack`, `py-inline`, `px-page-x`, `pt-stack` |
| roster | `src/features/roster/components/invite-result.tsx` | `space-y-5`, `mt-2`, `gap-4`, `p-6`, `mt-1`, `gap-2`, `space-y-2`, `px-3`, `px-4` | `space-y-card-gap`, `mt-inline`, `gap-card-gap`, `p-section`, `gap-inline`, `space-y-inline`, `px-stack`, `px-page-x` |
| roster | `src/features/roster/components/invite-summary.tsx` | `space-y-5`, `p-5`, `gap-3`, `py-3`, `pt-4`, `mb-3`, `gap-2`, `px-3`, `py-2` | `space-y-card-gap`, `p-card`, `gap-stack`, `py-stack`, `pt-card`, `mb-stack`, `gap-inline`, `px-stack`, `py-inline` |
| roster | `src/features/roster/components/package-picker.tsx` | `space-y-3`, `mb-2`, `gap-3`, `p-3`, `gap-2`, `px-3` | `space-y-stack`, `mb-inline`, `gap-stack`, `p-stack`, `gap-inline`, `px-stack` |
| roster | `src/features/roster/components/players-empty-state.tsx` | `min-h-[clamp(24rem,calc(100svh-16rem),40rem)]`, `px-5`, `py-8`, `px-8`, `gap-5`, `space-y-2`, `gap-2.5`, `gap-3`, `pt-0.5`, `px-6` | `px-page-x`, `py-page-y`, `gap-card-gap`, `space-y-inline`, `gap-stack`, `pt-inline` |
| roster | `src/features/roster/components/radar-card.tsx` | `space-y-3`, `p-5`, `gap-2`, `gap-3`, `py-3`, `px-4` | `space-y-stack`, `p-card`, `gap-inline`, `gap-stack`, `py-stack`, `px-page-x` |
| roster | `src/features/roster/components/roster-row.tsx` | `gap-4`, `p-4`, `gap-3`, `px-2`, `py-1`, `space-y-2`, `px-3` | `gap-card-gap`, `p-card`, `gap-stack`, `px-inline`, `py-inline`, `space-y-inline`, `px-stack` |
| roster | `src/features/roster/components/roster-screen.tsx` | `gap-2`, `px-4`, `space-y-6`, `gap-4`, `mb-1`, `gap-3`, `space-y-3`, `p-4` | `gap-inline`, `px-page-x`, `space-y-section`, `gap-card-gap`, `mb-inline`, `gap-stack`, `space-y-stack`, `p-card` |
| roster | `src/features/roster/v6/player-row.tsx` | `text-[15px]`, `px-2.5`, `text-[11.5px]`, `gap-3`, `p-3`, `mt-1.5`, `text-[13.5px]`, `py-2`, `gap-2.5`, `px-[7px]`, `py-0.5`, `text-[9.5px]` | `text-md`, `px-stack`, `text-micro`, `gap-stack`, `p-stack`, `mt-inline`, `text-row`, `py-inline`, `px-inline` |
| roster | `src/features/roster/v6/roster.tsx` | `space-y-4`, `gap-2`, `px-4`, `gap-1`, `p-[3px]`, `px-3`, `text-[11.5px]`, `ms-1.5`, `p-5`, `px-1.5`, `py-1`, `px-2.5`, `py-2` | `space-y-card-gap`, `gap-inline`, `px-page-x`, `p-inline`, `px-stack`, `text-micro`, `ms-inline`, `p-card`, `px-inline`, `py-inline` |
| roster | `src/features/roster/v6/week-dots.tsx` | `gap-[3px]` | `gap-inline` |
| settings | `src/features/settings/__snapshots__/v6-legacy.test.ts.snap` | Previous spacing expectations | Scale expectations/snapshots |
| settings | `src/features/settings/components/avatar-picker.tsx` | `mt-4` | `mt-card-gap` |
| settings | `src/features/settings/components/captain-profile-card.tsx` | `space-y-6`, `p-4`, `p-8`, `gap-4`, `gap-3` | `space-y-section`, `p-card`, `p-section`, `gap-card-gap`, `gap-stack` |
| settings | `src/features/settings/components/captain-profile-fields.tsx` | `px-4`, `py-3`, `space-y-4`, `space-y-2` | `px-page-x`, `py-stack`, `space-y-card-gap`, `space-y-inline` |
| settings | `src/features/settings/components/captain-settings.tsx` | `px-5`, `py-[18px]`, `mb-2`, `text-[19px]`, `space-y-[18px]`, `gap-3`, `gap-3.5`, `text-[13px]`, `mt-3`, `mt-2` | `px-page-x`, `py-page-y`, `mb-inline`, `text-title`, `space-y-card-gap`, `gap-stack`, `gap-card-gap`, `text-row`, `mt-stack`, `mt-inline` |
| settings | `src/features/settings/components/delete-account-card.tsx` | `space-y-4`, `p-6`, `p-4` | `space-y-card-gap`, `p-section`, `p-card` |
| settings | `src/features/settings/components/export-card.tsx` | `space-y-4`, `p-6` | `space-y-card-gap`, `p-section` |
| settings | `src/features/settings/components/glass-toggle.tsx` | `gap-4`, `p-6` | `gap-card-gap`, `p-section` |
| settings | `src/features/settings/components/invite-message-form.tsx` | `space-y-4`, `p-6`, `p-4` | `space-y-card-gap`, `p-section`, `p-card` |
| settings | `src/features/settings/components/payment-method-row.tsx` | `space-y-2`, `py-3`, `gap-3`, `px-2`, `p-1` | `space-y-inline`, `py-stack`, `gap-stack`, `px-inline`, `p-inline` |
| settings | `src/features/settings/components/payment-methods-card.tsx` | `px-5`, `py-[18px]`, `mb-2`, `text-[19px]`, `px-4` | `px-page-x`, `py-page-y`, `mb-inline`, `text-title` |
| settings | `src/features/settings/components/player-account.tsx` | `space-y-3`, `pb-6`, `gap-3`, `text-[22px]`, `px-4`, `p-3`, `py-3`, `p-4` | `space-y-stack`, `pb-section`, `gap-stack`, `text-h`, `px-page-x`, `p-stack`, `py-stack`, `p-card` |
| settings | `src/features/settings/components/player-identity.tsx` | `p-[18px]`, `gap-3.5`, `text-[26px]`, `gap-1`, `mt-2` | `p-card`, `gap-card-gap`, `text-h`, `gap-inline`, `mt-inline` |
| settings | `src/features/settings/components/player-preferences.tsx` | `px-3`, `gap-3`, `px-4`, `p-[3px]`, `py-2` | `px-stack`, `gap-stack`, `px-page-x`, `p-inline`, `py-inline` |
| settings | `src/features/settings/components/player-profile-editor.tsx` | `space-y-4`, `px-4`, `pb-4` | `space-y-card-gap`, `px-page-x`, `pb-card` |
| settings | `src/features/settings/components/player-reminder.tsx` | `px-4`, `py-2`, `gap-3`, `gap-0.5`, `mt-1` | `px-page-x`, `py-inline`, `gap-stack`, `gap-inline`, `mt-inline` |
| settings | `src/features/settings/components/player-stat-tiles.tsx` | `gap-2`, `gap-0.5`, `p-3`, `text-[22px]`, `text-[11px]` | `gap-inline`, `p-stack`, `text-h`, `text-micro` |
| settings | `src/features/settings/components/player-theme.tsx` | `gap-3`, `px-4`, `p-[3px]`, `px-3` | `gap-stack`, `px-page-x`, `p-inline`, `px-stack` |
| settings | `src/features/settings/components/profile-form.tsx` | `space-y-4`, `p-6` | `space-y-card-gap`, `p-section` |
| settings | `src/features/settings/components/public-page-settings.tsx` | `space-y-6`, `p-6`, `mb-2`, `gap-6`, `gap-3` | `space-y-section`, `p-section`, `mb-inline`, `gap-section`, `gap-stack` |
| settings | `src/features/settings/components/public-slug-field.tsx` | `space-y-2` | `space-y-inline` |
| settings | `src/features/settings/components/public-specialty-editor.tsx` | `space-y-3`, `gap-2`, `px-4` | `space-y-stack`, `gap-inline`, `px-page-x` |
| settings | `src/features/settings/components/settings-screen.tsx` | `space-y-5`, `gap-1`, `px-3` | `space-y-card-gap`, `gap-inline`, `px-stack` |
| settings | `src/features/settings/components/social-links-fields.tsx` | `space-y-4`, `gap-4`, `pe-12` | `space-y-card-gap`, `gap-card-gap`, `pe-touch` |
| settings | `src/features/settings/components/timezone-fields.tsx` | `space-y-2`, `gap-4`, `px-4`, `py-3` | `space-y-inline`, `gap-card-gap`, `px-page-x`, `py-stack` |
| settings | `src/features/settings/components/workspace-fact.tsx` | `gap-3`, `py-2.5`, `text-[13px]` | `gap-stack`, `py-stack`, `text-row` |
| settings | `src/features/settings/components/workspace-language-card.tsx` | `p-3.5`, `mb-2` | `p-card`, `mb-inline` |
| settings | `src/features/settings/components/workspace-options.tsx` | `space-y-4` | `space-y-card-gap` |
| settings | `src/features/settings/components/workspace-page-card.tsx` | `p-3.5`, `mb-3`, `gap-3`, `gap-2`, `px-4`, `gap-4`, `pb-4`, `text-[13px]`, `mt-2` | `p-card`, `mb-stack`, `gap-stack`, `gap-inline`, `px-page-x`, `gap-card-gap`, `pb-card`, `text-row`, `mt-inline` |
| settings | `src/features/settings/components/workspace-preferences.tsx` | `px-4`, `text-[13px]`, `px-5`, `py-[18px]`, `mb-3`, `text-[19px]`, `space-y-2`, `mb-2`, `gap-2`, `px-3`, `pt-1` | `px-page-x`, `text-row`, `py-page-y`, `mb-stack`, `text-title`, `space-y-inline`, `mb-inline`, `gap-inline`, `px-stack`, `pt-inline` |
| settings | `src/features/settings/components/workspace-save-status.tsx` | `gap-2`, `px-3` | `gap-inline`, `px-stack` |
| settings | `src/features/settings/components/workspace-sheet.tsx` | `p-5`, `mb-4`, `gap-3`, `text-[19px]` | `p-card`, `mb-card-gap`, `gap-stack`, `text-title` |
| supplements | `src/features/supplements/components/captain-supplements.tsx` | `space-y-4`, `p-5`, `gap-3`, `px-4`, `p-3`, `space-y-3`, `p-4`, `px-3`, `py-1`, `gap-2` | `space-y-card-gap`, `p-card`, `gap-stack`, `px-page-x`, `p-stack`, `space-y-stack`, `px-stack`, `py-inline`, `gap-inline` |
| supplements | `src/features/supplements/components/player-supplements.tsx` | `px-4`, `p-5`, `text-[19px]`, `mt-3`, `px-5`, `pt-[18px]`, `pb-1`, `gap-3`, `py-3`, `mt-1`, `text-[11.5px]`, `space-y-4`, `space-y-2`, `gap-4`, `p-4` | `px-page-x`, `p-card`, `text-title`, `mt-stack`, `pt-card`, `pb-inline`, `gap-stack`, `py-stack`, `mt-inline`, `text-micro`, `space-y-card-gap`, `space-y-inline`, `gap-card-gap` |
| supplements | `src/features/supplements/components/supplement-editor.tsx` | `p-6`, `space-y-4`, `mt-1`, `px-3`, `p-3`, `gap-3`, `px-6`, `px-4` | `p-section`, `space-y-card-gap`, `mt-inline`, `px-stack`, `p-stack`, `gap-stack`, `px-page-x` |
| templates | `src/features/templates/components/assign-sheet.tsx` | `p-6`, `gap-4`, `gap-2`, `mb-2`, `gap-3`, `px-4`, `py-3` | `p-section`, `gap-card-gap`, `gap-inline`, `mb-inline`, `gap-stack`, `px-page-x`, `py-stack` |
| templates | `src/features/templates/components/library-card.tsx` | `px-5`, `py-[18px]`, `gap-3`, `py-3`, `px-2.5`, `py-1`, `mb-1`, `mt-2.5`, `text-[19px]`, `text-[12.5px]`, `mt-3.5`, `gap-2`, `gap-1`, `px-3.5` | `px-page-x`, `py-page-y`, `gap-stack`, `py-stack`, `px-stack`, `py-inline`, `mb-inline`, `mt-stack`, `text-title`, `mt-card-gap`, `gap-inline`, `px-card` |
| templates | `src/features/templates/components/library-menu.tsx` | `mt-1`, `gap-1`, `p-2`, `px-3` | `mt-inline`, `gap-inline`, `p-inline`, `px-stack` |
| templates | `src/features/templates/components/library-view.tsx` | `mb-[18px]`, `gap-3.5`, `text-[30px]`, `mt-1`, `mb-3.5`, `gap-2`, `px-4`, `mb-3`, `p-5`, `mt-5`, `gap-3` | `mb-card-gap`, `gap-card-gap`, `text-stat`, `mt-inline`, `gap-inline`, `px-page-x`, `mb-stack`, `p-card`, `mt-card-gap`, `gap-stack` |
| templates | `src/features/templates/components/preview-sheet.tsx` | `p-6`, `gap-4`, `gap-2`, `px-3`, `py-2`, `p-4`, `gap-1.5`, `gap-3` | `p-section`, `gap-card-gap`, `gap-inline`, `px-stack`, `py-inline`, `p-card`, `gap-stack` |
| templates | `src/features/templates/components/save-template-button.tsx` | `gap-1` | `gap-inline` |
| templates | `src/features/templates/components/template-card.tsx` | `gap-4`, `p-5`, `gap-3`, `space-y-1.5`, `px-2.5`, `py-0.5`, `px-3`, `py-2`, `gap-2` | `gap-card-gap`, `p-card`, `gap-stack`, `space-y-inline`, `px-stack`, `py-inline`, `gap-inline` |
| templates | `src/features/templates/components/template-section.tsx` | `gap-4`, `gap-3`, `p-5`, `gap-2`, `px-4` | `gap-card-gap`, `gap-stack`, `p-card`, `gap-inline`, `px-page-x` |
| templates | `src/features/templates/components/templates-screen.tsx` | `gap-6`, `space-y-2`, `gap-2`, `p-1` | `gap-section`, `space-y-inline`, `gap-inline`, `p-inline` |
| templates | `src/features/templates/components/workspace-player-picker.tsx` | `p-6`, `mb-4`, `gap-2`, `mt-4` | `p-section`, `mb-card-gap`, `gap-inline`, `mt-card-gap` |
| templates | `src/features/templates/components/workspace-program-card.tsx` | `p-[18px]`, `mb-2.5`, `gap-2`, `px-2`, `py-0.5`, `text-[10.5px]`, `my-2.5`, `gap-1`, `text-[10px]`, `my-3`, `mt-3`, `gap-1.5`, `px-3`, `mt-2` | `p-card`, `mb-stack`, `gap-inline`, `px-inline`, `py-inline`, `text-micro`, `my-stack`, `mt-stack`, `px-stack`, `mt-inline` |
| templates | `src/features/templates/components/workspace-programs-view.tsx` | `space-y-4`, `px-3`, `gap-1`, `p-[3px]`, `text-[11.5px]`, `ms-1`, `p-5`, `gap-4`, `gap-1.5`, `p-[18px]` | `space-y-card-gap`, `px-stack`, `gap-inline`, `p-inline`, `text-micro`, `ms-inline`, `p-card`, `gap-card-gap` |
| voice-notes | `src/features/voice-notes/components/captain-thread.tsx` | `gap-2.5`, `pt-1`, `text-[11px]`, `px-3.5`, `py-3`, `px-3`, `py-2.5` | `gap-stack`, `pt-inline`, `text-micro`, `px-card`, `py-stack`, `px-stack` |
| voice-notes | `src/features/voice-notes/components/captain-voice-notes.tsx` | `space-y-4`, `p-5` | `space-y-card-gap`, `p-card` |
| voice-notes | `src/features/voice-notes/components/player-voice-notes.tsx` | `space-y-2.5`, `space-y-4`, `p-5` | `space-y-stack`, `space-y-card-gap`, `p-card` |
| voice-notes | `src/features/voice-notes/components/voice-note-list.tsx` | `space-y-3`, `space-y-1`, `gap-2`, `px-2`, `py-0.5`, `pt-2`, `text-[12.5px]` | `space-y-stack`, `space-y-inline`, `gap-inline`, `px-inline`, `py-inline`, `pt-inline` |
| voice-notes | `src/features/voice-notes/components/voice-recorder.tsx` | `space-y-3`, `gap-2`, `ms-2` | `space-y-stack`, `gap-inline`, `ms-inline` |
| welcome | `src/features/welcome/components/welcome-flow.tsx` | `px-5`, `gap-6`, `px-6`, `gap-3`, `space-y-3`, `pt-6`, `gap-1`, `space-y-6` | `px-page-x`, `gap-section`, `gap-stack`, `space-y-stack`, `pt-section`, `gap-inline`, `space-y-section` |
| welcome | `src/features/welcome/components/welcome-role-card.tsx` | `space-y-1` | `space-y-inline` |
| workout | `src/features/workout/components/done-panel.tsx` | `space-y-5`, `p-8`, `px-5` | `space-y-card-gap`, `p-section`, `px-page-x` |
| workout | `src/features/workout/components/exercise-alternatives.tsx` | `pb-2`, `space-y-2`, `gap-3`, `px-3`, `py-2` | `pb-inline`, `space-y-inline`, `gap-stack`, `px-stack`, `py-inline` |
| workout | `src/features/workout/components/exercise-header.tsx` | `space-y-3`, `gap-4`, `p-4`, `space-y-2`, `gap-x-6` | `space-y-stack`, `gap-card-gap`, `p-card`, `space-y-inline`, `gap-x-section` |
| workout | `src/features/workout/components/exercise-lightbox.tsx` | `p-4` | `p-card` |
| workout | `src/features/workout/components/finish-hero.tsx` | `p-4`, `mb-3`, `gap-3`, `mt-2`, `text-[22px]`, `gap-3.5`, `gap-1.5`, `gap-2`, `gap-0.5`, `p-3`, `text-[13px]` | `p-card`, `mb-stack`, `gap-stack`, `mt-inline`, `text-h`, `gap-card-gap`, `gap-inline`, `p-stack`, `text-row` |
| workout | `src/features/workout/components/finish-record.tsx` | `gap-3`, `p-3.5`, `gap-0.5`, `text-[15px]`, `text-[13px]` | `gap-stack`, `p-card`, `gap-inline`, `text-md`, `text-row` |
| workout | `src/features/workout/components/finish-share.tsx` | `space-y-2`, `gap-2`, `px-5` | `space-y-inline`, `gap-inline`, `px-page-x` |
| workout | `src/features/workout/components/focus-screen.tsx` | `gap-3`, `px-[18px]`, `space-y-4`, `px-5`, `space-y-3`, `py-[18px]`, `px-2.5`, `py-1`, `p-4`, `py-4`, `mt-1` | `gap-stack`, `px-page-x`, `space-y-card-gap`, `space-y-stack`, `py-page-y`, `px-stack`, `py-inline`, `p-card`, `mt-inline` |
| workout | `src/features/workout/components/form-check-button.tsx` | `space-y-2`, `p-5`, `space-y-4`, `gap-2` | `space-y-inline`, `p-card`, `space-y-card-gap`, `gap-inline` |
| workout | `src/features/workout/components/history-calendar.tsx` | `gap-2.5`, `p-3.5`, `gap-2`, `text-[15px]`, `gap-1`, `text-[11px]`, `text-[13px]`, `gap-3.5`, `gap-1.5` | `gap-stack`, `p-card`, `gap-inline`, `text-md`, `text-micro`, `text-row`, `gap-card-gap` |
| workout | `src/features/workout/components/history-screen.tsx` | `gap-2`, `p-2`, `space-y-3`, `px-[18px]`, `pt-4`, `space-y-4`, `px-5`, `pt-6`, `gap-3`, `text-[22px]`, `space-y-2`, `px-3`, `p-4` | `gap-inline`, `p-inline`, `space-y-stack`, `px-page-x`, `pt-card`, `space-y-card-gap`, `pt-section`, `gap-stack`, `text-h`, `space-y-inline`, `px-stack`, `p-card` |
| workout | `src/features/workout/components/history-sets.tsx` | `gap-2`, `px-3`, `py-2` | `gap-inline`, `px-stack`, `py-inline` |
| workout | `src/features/workout/components/history-workout.tsx` | `px-3.5`, `py-3`, `p-4`, `gap-3`, `space-y-1`, `text-[10px]`, `gap-0.5`, `px-2`, `py-1`, `text-[11px]`, `mt-3`, `space-y-4`, `space-y-2` | `px-card`, `py-stack`, `p-card`, `gap-stack`, `space-y-inline`, `text-micro`, `gap-inline`, `px-inline`, `py-inline`, `mt-stack`, `space-y-card-gap` |
| workout | `src/features/workout/components/next-up.tsx` | `gap-2`, `p-4` | `gap-inline`, `p-card` |
| workout | `src/features/workout/components/offline-workout.tsx` | `space-y-3` | `space-y-stack` |
| workout | `src/features/workout/components/player-workout-v3.tsx` | `gap-3.5`, `px-[18px]`, `pb-6`, `gap-2.5`, `gap-1`, `gap-3` | `gap-card-gap`, `px-page-x`, `pb-section`, `gap-stack`, `gap-inline` |
| workout | `src/features/workout/components/pr-burst.tsx` | `px-5`, `px-6`, `py-4`, `gap-1` | `px-page-x`, `py-page-y`, `gap-inline` |
| workout | `src/features/workout/components/rest-panel.tsx` | `space-y-3`, `p-5`, `gap-3`, `text-[22px]`, `gap-2`, `px-4`, `gap-5`, `py-10`, `px-3` | `space-y-stack`, `p-card`, `gap-stack`, `text-h`, `gap-inline`, `px-page-x`, `gap-card-gap`, `py-section`, `px-stack` |
| workout | `src/features/workout/components/session-feedback.tsx` | `space-y-3.5`, `gap-3.5`, `gap-2`, `pb-2`, `gap-1.5`, `text-[13px]`, `px-3.5`, `py-3`, `pt-1`, `text-[19px]`, `space-y-5`, `p-5`, `space-y-3`, `pb-3`, `gap-3`, `space-y-2`, `p-3` | `space-y-card-gap`, `gap-card-gap`, `gap-inline`, `pb-inline`, `text-row`, `px-card`, `py-stack`, `pt-inline`, `text-title`, `p-card`, `space-y-stack`, `pb-stack`, `gap-stack`, `space-y-inline`, `p-stack` |
| workout | `src/features/workout/components/set-controls.tsx` | `px-6` | `px-page-x` |
| workout | `src/features/workout/components/set-dots.tsx` | `gap-2`, `px-2`, `py-2`, `gap-1` | `gap-inline`, `px-inline`, `py-inline` |
| workout | `src/features/workout/components/set-rows.tsx` | `space-y-2`, `gap-2`, `space-y-1`, `p-2`, `px-4` | `space-y-inline`, `gap-inline`, `p-inline`, `px-page-x` |
| workout | `src/features/workout/components/warmup-card.tsx` | `px-4`, `py-3.5`, `px-5`, `py-[18px]`, `mb-2`, `mb-1.5`, `gap-2`, `text-[15px]`, `px-2.5`, `py-1`, `gap-2.5`, `py-2`, `text-[13px]`, `mt-1` | `px-page-x`, `py-card`, `py-page-y`, `mb-inline`, `gap-inline`, `text-md`, `px-stack`, `py-inline`, `gap-stack`, `text-row`, `mt-inline` |
| workout | `src/features/workout/components/warmup-nav.tsx` | `px-[18px]`, `pt-2.5`, `gap-1`, `px-2`, `text-[11px]` | `px-page-x`, `pt-stack`, `gap-inline`, `px-inline`, `text-micro` |
| workout | `src/features/workout/components/warmup-preview.tsx` | `space-y-2`, `gap-2` | `space-y-inline`, `gap-inline` |
| workout | `src/features/workout/components/warmup-workout.tsx` | `space-y-3`, `space-y-1`, `text-[26px]`, `pb-1`, `text-[12.5px]`, `px-5`, `py-[18px]`, `px-2.5`, `py-1` | `space-y-stack`, `space-y-inline`, `text-h`, `pb-inline`, `px-page-x`, `py-page-y`, `px-stack`, `py-inline` |
| workout | `src/features/workout/components/workout-clock.tsx` | `text-[13px]` | `text-row` |
| workout | `src/features/workout/components/workout-exercise.tsx` | `p-4` | `p-card` |
| workout | `src/features/workout/components/workout-hint.tsx` | `gap-2` | `gap-inline` |
| workout | `src/features/workout/components/workout-overview-exercise.tsx` | `gap-3`, `p-2.5`, `gap-[3px]`, `text-[15px]` | `gap-stack`, `p-stack`, `gap-inline`, `text-md` |
| workout | `src/features/workout/components/workout-overview.tsx` | `gap-3`, `text-[22px]`, `px-1`, `pt-1`, `text-[15px]`, `gap-2`, `px-3.5`, `text-[13px]`, `py-2.5`, `px-[18px]`, `pt-4`, `gap-2.5`, `text-[19px]` | `gap-stack`, `text-h`, `px-inline`, `pt-inline`, `text-md`, `gap-inline`, `px-card`, `text-row`, `py-stack`, `px-page-x`, `pt-card`, `text-title` |
| workout | `src/features/workout/components/workout-set.tsx` | `gap-3.5`, `gap-1`, `text-[13px]`, `gap-2.5`, `p-4`, `space-y-3`, `px-4` | `gap-card-gap`, `gap-inline`, `text-row`, `gap-stack`, `p-card`, `space-y-stack`, `px-page-x` |
| workout | `src/features/workout/components/workout-value.tsx` | `gap-2`, `px-2.5`, `py-3`, `text-[44px]` | `gap-inline`, `px-stack`, `py-stack`, `text-stat-wide` |
| Primitives | `src/ui/audio-player.tsx` | `gap-3`, `p-2`, `pe-4` | `gap-stack`, `p-inline`, `pe-card` |
| Primitives | `src/ui/bottom-nav.test.ts` | `px-0.5`, `py-2` | `px-inline`, `py-inline` |
| Primitives | `src/ui/bottom-nav.tsx` | `gap-1`, `p-2`, `px-0.5`, `py-2` | `gap-inline`, `p-inline`, `px-inline`, `py-inline` |
| Primitives | `src/ui/button.tsx` | `min-h-10`, `px-3`, `px-4`, `px-5`, `gap-2` | `px-control`, `gap-inline` |
| Primitives | `src/ui/card-grid.tsx` | `gap-4` | Shared token values |
| Primitives | `src/ui/cardio-cards.tsx` | `space-y-3`, `space-y-2`, `p-4` | `space-y-stack`, `space-y-inline`, `p-card` |
| Primitives | `src/ui/chip.tsx` | `min-h-12`, `px-4` | `px-page-x` |
| Primitives | `src/ui/disclosure.tsx` | `gap-3`, `px-4`, `py-3`, `pb-4` | `gap-stack`, `px-page-x`, `py-stack`, `pb-card` |
| Primitives | `src/ui/edit-in-place.tsx` | `py-3`, `ps-4`, `pe-12` | `py-stack`, `ps-card`, `pe-touch` |
| Primitives | `src/ui/empty-state.tsx` | `gap-4`, `px-6`, `py-8`, `space-y-1.5`, `gap-2`, `gap-3`, `px-3`, `py-2`, `px-4` | `gap-card-gap`, `px-page-x`, `py-page-y`, `space-y-inline`, `gap-inline`, `gap-stack`, `px-stack`, `py-inline` |
| Primitives | `src/ui/error-state.tsx` | `gap-3`, `p-6` | `gap-stack`, `p-section` |
| Primitives | `src/ui/fact-row.tsx` | `gap-x-4`, `gap-y-1`, `py-[11px]`, `text-[12.5px]` | `gap-x-card-gap`, `gap-y-inline`, `py-stack`, `text-xs` |
| Primitives | `src/ui/glass-card.tsx` | `p-3`, `p-4`, `p-6` | `p-card-gap` |
| Primitives | `src/ui/in-app-browser-warning.tsx` | `gap-3`, `p-3`, `px-4` | `gap-stack`, `p-stack`, `px-page-x` |
| Primitives | `src/ui/language-switch.tsx` | `gap-1`, `p-1`, `px-3` | `gap-inline`, `p-inline`, `px-stack` |
| Primitives | `src/ui/liquid-controls.test.ts` | `px-2`, `px-4` | `px-inline`, `px-page-x` |
| Primitives | `src/ui/loading-state.tsx` | `space-y-4`, `gap-4` | `space-y-card-gap`, `gap-card-gap` |
| Primitives | `src/ui/page-container.test.ts` | `px-4`, `px-6` | `px-page-x` |
| Primitives | `src/ui/page-container.tsx` | `px-4`, `px-6` | `px-page-x` |
| Primitives | `src/ui/pill-nav.tsx` | `gap-2`, `px-1.5`, `px-4`, `text-[13px]` | `gap-inline`, `px-inline`, `px-page-x`, `text-row` |
| Primitives | `src/ui/responsive-dialog.tsx` | `gap-4` | `gap-card-gap` |
| Primitives | `src/ui/route-loading.tsx` | `space-y-5`, `p-4` | `space-y-card-gap`, `p-card` |
| Primitives | `src/ui/row-link.tsx` | `gap-3`, `px-4`, `py-3` | `gap-stack`, `px-page-x`, `py-stack` |
| Primitives | `src/ui/save-status.tsx` | `gap-2` | `gap-inline` |
| Primitives | `src/ui/segmented.tsx` | `gap-1`, `p-1`, `px-3` | `gap-inline`, `p-inline`, `px-stack` |
| Primitives | `src/ui/skeleton.tsx` | `space-y-3`, `p-6`, `space-y-5`, `space-y-4`, `gap-4`, `p-5` | `space-y-stack`, `p-section`, `space-y-card-gap`, `gap-card-gap`, `p-card` |
| Primitives | `src/ui/stat.tsx` | `p-3` | `p-stack` |
| Primitives | `src/ui/stepper.tsx` | `p-1.5`, `gap-2`, `p-4` | `p-inline`, `gap-inline`, `p-card` |
| Primitives | `src/ui/surface-depth.test.ts` | `p-6` | Scale expectations/snapshots |
| Primitives | `src/ui/sync-pill.tsx` | `gap-2`, `px-3`, `py-2` | `gap-inline`, `px-stack`, `py-inline` |
| Primitives | `src/ui/text-field.tsx` | `gap-2`, `px-4` | `gap-inline`, `px-page-x` |
| Primitives | `src/ui/tier-badge.tsx` | `px-2.5`, `py-1`, `text-[11px]` | `px-stack`, `py-inline`, `text-micro` |
| Primitives | `src/ui/toast.tsx` | `gap-2`, `px-4`, `gap-3`, `p-3` | `gap-inline`, `px-page-x`, `gap-stack`, `p-stack` |
| Primitives | `src/ui/tour-replay.tsx` | `px-4` | `px-page-x` |
| Primitives | `src/ui/tour.tsx` | `p-5`, `mt-2`, `mt-4`, `gap-2`, `px-3`, `px-4` | `p-card`, `mt-inline`, `mt-card-gap`, `gap-inline`, `px-stack`, `px-page-x` |
| Primitives | `src/ui/ui.test.ts` | `p-6`, `p-3`, `p-4`, `px-2`, `py-3` | `p-card-gap`, `px-inline`, `py-stack` |
| Primitives | `src/ui/underline-tabs.tsx` | `gap-x-1`, `gap-y-1`, `px-4`, `py-3` | `gap-x-inline`, `gap-y-inline`, `px-page-x`, `py-stack` |
| Primitives | `src/ui/spacing-system.test.ts` | No scale regression coverage | Responsive tokens, primitives, source scans and reference exceptions |
