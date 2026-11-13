# T-215: Staging screenshot bugs, plus button clarity in assessments and billing (T-211 phase 2, part 1 of 3)

**Phase:** v6 fixes · **Status:** ready · **Depends on:** none · **Migration:** none
**Owner decision:** 2026-11-13. The owner approved the T-211 audit list and asked to add the bugs from their staging screenshots.
**Rules:** follow AGENTS.md in full.
- No new deps.
- Keep files under 250 lines.
- Tokens only; logical properties only.
- All strings go in `messages.ts`, with all three styles: `ar`, `arStd` and `en`.
- No Get-Content/Set-Content. Do not commit.

**Parallel work:** parts 2 (T-216) and 3 (T-217) run at the same time in other checkouts. Touch **only** the files listed under "Your files" below.

## Your files
- `src/features/forms/**`, except `answer-flow.tsx` and `pending-forms.tsx`, which belong to T-217.
- `src/features/captain-workspace/forms/**`
- `src/features/billing/**`
- `src/features/roster/components/captain-shell.tsx` and `src/features/roster/captain-shell.test.ts`

## A. Screenshot bugs (do these first)
1. **Dropdowns open far from their button** (`forms/components/select-position.ts` and `themed-select.tsx`).
   - Today, when the list opens upward, `selectPosition` reserves the full 288px height and places the panel `rect.top - 288 - 4`. A list with 1–2 options therefore floats about 160px above its trigger and covers other fields.
   - Fix: the panel's height must follow its content.
     - Use a max height: `maxBlockSize = available space`.
     - When it opens upward, anchor the panel's **bottom edge** 4px above the trigger, using `insetBlockEnd = viewportHeight - rect.top + 4` and clearing `insetBlockStart`.
     - When it opens downward, keep the current behavior.
   - Update `select-position` tests:
     - a 2-option list opening upward ends exactly 4px above the trigger;
     - a downward list starts 4px below the trigger;
     - the list never goes off-screen.
2. **Alert value field is invisible** (`forms/components/question-rules.tsx`, the text/number branch at about line 48).
   - Inside the amber `bg-warn-soft` row, the value `<input>` uses `bg-transparent` and the faint line border, so the captain sees «نبّهني لو الإجابة [يساوي] … ← وهتطلع…» with no visible place to type the value.
   - Give it a visible surface: `bg-surface`, a `border-line` that shows on amber, `min-w-28`.
   - Add a translated placeholder: ar «اكتب القيمة», arStd «اكتب القيمة», en «Value».
3. **Switch "off" state has no visible track** (`forms/components/question-toggle.tsx`).
   - Off is `bg-surface` plus a faint knob, so only a grey dot shows.
   - Off must show a clear track: a bordered track (`border border-line`) plus a contrasting knob (`bg-muted`). On stays lime.
   - Reuse `src/ui/switch-track.tsx` if its look matches. Read it first.
4. **Top header icons float over page content on desktop** (`roster/components/captain-shell.tsx`, the sticky bar at about line 29).
   - At `lg`, the bar is sticky with a transparent background, so the bell and install buttons sit over cards when scrolling. In the owner's screenshot they hide the fat number on the nutrition cards.
   - At `lg`, the bar must not overlap content. Make it scroll away with the page (`lg:static`), or give it a solid `bg-bg` background. Prefer `lg:static`.
   - Mobile keeps its current sticky bar with its background.
   - Update `captain-shell.test.ts` if it asserts these classes.
5. **Billing row price has no currency** (`billing/components/workspace-billing-row.tsx:54`).
   - It shows «30 يوم · 0». Show the price with the currency token already in `billing/workspace/messages.ts` (`currency: 'جنيه'`), e.g. «30 يوم · 0 جنيه».
   - If the price is 0 or null, show nothing after the days.
6. **Plurals.**
   - `billing/payments/messages.ts` `summary` «… من {n} لاعبين» and the sidebar usage «1 من 5 لاعب» are wrong for some numbers.
   - Use the project's existing plural helper. Grep for `.one` / `.other` keys and how `t` picks them, so that:
     - ar: 1 → «لاعب»; 2 → «لاعبين»; 3–10 → «لاعبين»; 11+ → «لاعب»;
     - en: «player» / «players».
   - Apply this to every `{…} من {limit} لاعب` usage string in `billing/**`: `billing/messages.ts` usage.one/other, `billing/standard/messages.ts`, and `billing/workspace/messages.ts` `usage`/`usageTail`.
7. **Packages page wording and the duplicate create card** (`billing/tiers/**`, route `/captain/billing/packages`).
   - The empty text says «لسه معملتش باقات», but the actions say «فئة جديدة», so the captain does not know what a «فئة» is.
     - Rename the visible concept to match the billing page.
     - ar: newTier «باقة جديدة», addTier «+ باقة جديدة», example «مثلًا: أونلاين بس، حصص في الجيم».
     - Matching arStd and en wording.
     - Keep the internal names (`tier`) as they are.
   - The big empty card with «+ فئة جديدة» repeats the lime header action. When there are no tiers, keep only the empty state with **one** secondary «+ باقة جديدة» inside it, and keep the lime header button. When tiers exist, keep the add card as a secondary bordered tile.
   - Check every tier string («أرشف الفئة» and so on) for the same rename.

## B. Button clarity, from the approved T-211 audit (`docs/tasks/T-211-audit-result.md`)
Fix **every row** in these audit sections that sits in your files:
- "Assessments";
- "Billing";
- the notification/forms rows that point into your folders.

The rules:
- `secondary` → `Button variant="secondary"`, or, for `Link`/`<a>`, the same look. Reuse an existing secondary link style if one exists; otherwise apply the same classes Button secondary uses: `glass`, a border, rounded-full, `min-h-12`.
- `icon-button` → the existing `IconButton` from `src/ui`, keeping the translated `aria-label`.
- `link style` → lime text plus underline on hover/focus, `min-h-12` touch target.
- `keep`, add chevron → add a lucide `ChevronDown` that rotates when open (`group-open:rotate-180`).
- Destructive actions (delete or archive) → secondary with danger text and a danger border token, if one exists in `globals.css`. Check first, and add no new hex.
- Billing extras the owner saw:
  - «إدارة الباقات والعروض» becomes a secondary button;
  - «تفاصيل الفلوس» gets a chevron;
  - offer preset chips («بلاك فرايداي / رمضان / الصيف / رأس السنة») and «+ عرض جديد» become bordered chips or secondary buttons.
- Breadcrumbs «الدفعات ‹» and «التقييمات» → link style.

**Skip legacy-only rows:** components that render only when `captainWorkspaceEnabled()` is false. Flag-off output must stay byte-identical; list the skipped rows in your report.

## Acceptance
- [ ] `select-position` tests as above; toggle off-state test (track has a border class); price/currency and plural tests.
- [ ] Every assessments/billing audit row in your files is fixed or listed as skipped, with a reason.
- [ ] Still one lime primary per screen.
- [ ] Bundle: change classes and markup only. Import `IconButton`/`Button` leaf modules, not barrels; add no new heavy imports.
- [ ] `npm run check` passes. (`npm run build` is run by the reviewer; skip it if your sandbox blocks it, and say so.)

## Out of scope
- Every other feature folder. Those are T-216 and T-217.
- `src/ui/**`, which belongs to T-217.
