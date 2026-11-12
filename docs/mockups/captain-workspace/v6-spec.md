# v6 visual spec (owner-approved 2026-11-12)

The owner approved `v6-owner-review.html` and asked for the app to match it **100%**. Anything the mockup does not show (analysis, readiness, check-ins, progress charts, billing details, empty, loading and error states) must be built from the same pieces below, so it looks like it belongs to the same screen.

## Screens and their cards
| Mockup screen | Card |
|---|---|
| ٧ قايمة اللاعبين, ٨ ملف اللاعب (shell, header, tabs, نظرة عامة, المتابعات) | T-188 |
| ١ تمارين اللاعب (التمرين tab) | T-189 |
| ٢ نظام الأكل (الأكل tab) | T-190 |
| ٥ التقييمات, ٦ جدولة تقييم للاعب (التقييمات tab) | T-191 |
| ٣ القايمة والأسماء, ٤ لاعب جديد | T-187 (landed first) |

## How to read the mockup
Open the HTML file in a browser and switch screens with the dashed buttons at the top. That bar and the dashed «إيه اللي اتغير / الفكرة» notes are explanations for the owner, **not** product UI. Copy every visible Arabic string exactly, character for character, into `messages.ts` (`ar`), and add a short plain `en`. Do not touch `arStd` (the reviewer reconciles standard Arabic afterwards).

## Mockup class to code mapping
Use tokens and existing `src/ui/` components. No hex values.

| Mockup | Code |
|---|---|
| `--deep` page, radial lime glow | the existing captain shell background (already matches) |
| `.card` | `glass rounded-card` + `border border-line-soft` |
| `.card.strong` | `glass-strong rounded-card` |
| `.pad` (18px 20px) | `px-5 py-[18px]` or `p-5` |
| `h1` 30px Changa 600 | `font-display text-[30px] font-semibold leading-tight` |
| `h2` 19px Changa 600 | `font-display text-[19px] font-semibold` |
| body 14px Alexandria | default body |
| small 12–12.5px | `text-xs` / `text-[12.5px]` |
| `.num` (Manrope 800, tabular) | `font-display font-extrabold tabular-nums` |
| `.muted` / `.faint` / `.lime` | `text-muted` / `text-faint` / `text-lime` |
| `.btn` 46px pill | `Button` from `@/ui/button`, `min-h-12 rounded-full` |
| `.btn.pri` | primary (lime) variant. **One per screen.** |
| `.btn.sm` 38px | small variant, still `min-h-12` hit area on touch |
| `.tabs` underline tabs | new `@/ui/underline-tabs.tsx` (T-188 creates it; others reuse) |
| `.day` / `.day.on` pill chips | `Chip` from `@/ui/chip` (on = ink background, deep text) |
| `.fact` label/value rows with hairline | new `@/ui/fact-row.tsx` (T-188 creates it; others reuse) |
| `.targets` / `.t` stat tiles with bar | `Stat`-style tile + `ProgressBar` from `@/ui/progress-bar`; warn colour when over 100% |
| `.ex` grid rows with hairlines | a list inside one `.card`, rows separated by `border-t border-line-soft`, `min-h-16` |
| `.add` search row (dashed top border) | inline search input row at the end of the list, `border-t border-dashed` |
| `.sugg` suggestion pills | small `Chip`s, muted |
| `.status` «محفوظ» | new `@/ui/save-status.tsx` (T-188 creates it): icon + «محفوظ» when saved, «بيتحفظ…» while saving, error + retry on failure. Never a toast for a plain save. |
| `.stepper` 1-2-3 | small numbered steps, current = lime circle |
| `.week` 7 dots | the T-187 adherence strip component; reuse it |
| `.note` dashed boxes | **not product UI** |

Icons: the mockup uses Tabler names; use the closest `lucide-react` icon (e.g. `ti-cloud-check` → `CloudCheck`, `ti-send` → `Send`, `ti-dots` → `Ellipsis`, `ti-calculator` → `Calculator`).

## Layout rules
- Desktop: sidebar 236px, main padding 26px/36px, two-column `layout` = 300px side panel + content, gap 18px; the side panel is sticky.
- At ≤1000px the two columns stack; at ≤760px the sidebar hides and the bottom nav shows (existing behaviour). Every screen must work at 390px wide with no horizontal scroll.
- RTL logical properties only. Touch targets ≥48px.

## Parts not in the mockup
Build them from the same parts, in the same order of importance:
- Page section = `h2` + content inside a `.card`.
- Numbers = `.t` tiles (label top, big Manrope number, optional bar, optional small hint).
- Lists = `.ex`-style rows in one card, with a `.fact`-style label/value where it fits.
- Charts keep their current chart code but sit inside a `.card` with an `h2`, using lime for the main series and `muted` for the rest.
- Empty state: one short line in `text-faint` inside the card, plus at most one button. Loading: skeleton rows with the same heights. Error: one line and «جرّب تاني».

## Verification (every card)
1. Run the app with `NEXT_PUBLIC_CAPTAIN_WORKSPACE=1` and the demo/test captain.
2. Open the mockup screen and the real route side by side at **1440×900** and **390×844**.
3. Same order of sections, same labels, same buttons, same primary action, same spacing rhythm. List any difference you could not avoid under "Notes for reviewer" with the reason.
