# T-281 — One liquid-glass button style everywhere, and success popups after key actions

**Phase:** polish · **Depends on:** none · **Status:** ready
Read `AGENTS.md`, `docs/ARCHITECTURE.md` and `docs/tasks/V11-FIDELITY.md` first.

## Goal
On 2026-11-15 the owner approved the buttons and the action popups in the new landing and demo mockup. The mockup is `docs/mockups/landing/demo.html` and `docs/mockups/landing/index.html`; open them in a browser and click around. The owner asked for two changes in the real system.

1. **One button style in every screen**: the captain workspace, the player app, sheets and dialogs, and the public site.
   - Today `<Button>` is used in some places.
   - About 160 components instead hand-roll `bg-lime ... text-on-lime` or `glass ...` classes. Each one looks a little different.
2. **A clear popup when something is added or saved.**
   - It needs an icon tile, a bold title and a short detail line, as in the demo.
   - Example: «اتضاف للبرنامج · بنش بريس · اليوم 1».
   - Today the toast is one line of plain text.

## The button look (copy it from the mockup)
- **Primary:**
  - `background: linear-gradient(180deg, #cdf56f, #a9e03c)`;
  - text `on-lime`;
  - `box-shadow: inset 0 1px 0 rgb(255 255 255/.55), inset 0 -2px 0 rgb(0 0 0/.12), 0 6px 20px -4px rgb(182 233 79/.45)`.
  - Hover: `filter: brightness(1.06)`. Active: `scale(.97)`.
- **Secondary (liquid glass):**
  - `background: linear-gradient(180deg, rgb(255 255 255/.09), rgb(255 255 255/.04))`;
  - `border: 1px solid rgb(255 255 255/.13)`;
  - `box-shadow: inset 0 1px 0 rgb(255 255 255/.1)`.
  - Hover background: `rgb(255 255 255/.1)`.
  - **No backdrop blur on buttons.**
- **Ghost and danger:** keep their current look, and give them the same radius and press behaviour.
- **Light theme:** derive the primary from the same lime tokens. The secondary uses `ink` at low alpha, so it stays visible on light surfaces. Run the existing `contrast.test.ts`.
- **Radius:** the existing `rounded-control`.
- **Sizes:** sm 40px (only inside dense rows), md 48px (the default), lg 56px.
- Put the colours in `globals.css` `@theme` as tokens (for example `--color-lime-top`, `--color-lime-bottom`). No hex values in components.

## The success popup
- Extend `src/ui/toast.tsx`. Keep the queue, timers, pause on hover and focus, and the portal into the open modal dialog.
  - Today the call is `success(text: string)`.
  - Also accept `success({ title, detail?, icon? })`. `icon` is one of: `program`, `meal`, `player`, `payment`, `message`, `form`, `template`, `check` (the default).
  - The icon maps to a lucide icon in a 36px tile, tinted lime-soft. Errors keep the danger tint.
- **Layout:**
  - glass-strong card;
  - icon tile at the start, then the title (semibold) and the detail (muted, one line, ellipsis);
  - the close button stays 48px.
- **Motion:** enter with opacity and translateY(8px) over 300ms, leave with a fade over 200ms. With reduced motion, no animation.
- **Where:** keep the current position (`toast-stack`, above the bottom nav on phones). On screens ≥1024px, put it at the top end corner of the main area.
- **Where to call it:**
  - Upgrade these existing success calls (and add any that are missing) to the rich form. Search `useToast(` to find them.
  - Every title and detail lives in each feature's `messages.ts`, in `ar`, `arStd` and `en`. Short and plain.

| Action | Title (ar) | Detail |
|---|---|---|
| Exercise added to a program | اتضاف للبرنامج | exercise name · day |
| Program saved or assigned | اتحفظ البرنامج / البرنامج وصل لـ{name} | program name |
| Meal plan saved or assigned | اتحفظ النظام / النظام وصل لـ{name} | plan name · calories |
| Food added or swapped | اتضاف للوجبة / اتبدّل الصنف | food · grams |
| Player invite created | لينك {name} جاهز | package |
| Payment recorded | اتسجّلت الدفعة | name · amount |
| Assessment reviewed or reply sent | اتبعت ردك لـ{name} | form name |
| Template saved | اتحفظ القالب | template name |
| Package created or edited | اتحفظت الباقة | name · duration |

## Files
- `src/ui/button.tsx`, `src/ui/secondary-button-class.ts`, `src/ui/icon-button.tsx`, `src/ui/toast.tsx`, `src/ui/messages.ts` and their tests.
- `src/app/globals.css`: add the tokens and the shared button classes in a new `src/app/controls.css`, with a single `@import` line in `globals.css`. Do not touch `surfaces.css`; T-282 owns it.
- Feature components that hand-roll primary or secondary buttons: replace them with `<Button>`, or with `buttonClass()` for `<Link>` and `<a>`.
  - Add `buttonClass({ variant, size, block })` to `button.tsx`, so that links get the same look without a nested `<button>`.
- Feature `messages.ts` files and the components that call `useToast().success`.

## Requirements
1. After this card, these patterns must not appear on interactive elements outside `src/ui`:
   - `bg-lime ... text-on-lime`;
   - `glass ... min-h-12 ... rounded-control`.
   Add a test that scans `src/features` and `src/app` for them on `<button`, `<a` and `<Link`, the way `clickable-primitives.test.ts` does.
   - Chips, badges and progress bars are not buttons; leave them alone.
2. Visual only:
   - Same handlers and same labels.
   - Same placement. Keep `aria-*` and `data-*` attributes.
   - One primary action per screen still holds.
3. The `success(text)` string form keeps working, so nothing breaks while callers migrate.
4. Keep the existing perf budget: no new dependency, and no budget increase. The toast icon map must not pull every lucide icon into each route; import the 8 icons by name.
5. RTL: logical properties only. Touch targets ≥48px.
6. Tests:
   - queue behaviour with the object form;
   - icon mapping;
   - the hand-rolled button scan;
   - `buttonClass` output;
   - the light theme contrast for both variants.

## Acceptance
- [ ] Every primary and secondary button in the captain workspace, the player app and the public site looks like the mockup.
- [ ] Adding an exercise, saving or assigning a program or meal plan, creating an invite, recording a payment, sending an assessment reply, and saving a template or package each shows the rich popup with the right icon, title and detail.
- [ ] `npm run check`, `npm run build` and `src/lib/perf-budget.test.ts` pass.

## Out of scope
- Spacing values (T-278), layouts, new features, data changes and `surfaces.css` (T-282).

## References
- Mockup: `docs/mockups/landing/demo.html` (classes `.btn.go`, `.btn.gl`, `.toast`)
