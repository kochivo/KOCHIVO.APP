# T-382: KO teaser as a small corner card (v6, desktop)

**Migration:** none. **Owner decision 2026-11-18:** the KO popup blurs the whole page. Match canvas page «إصلاح شاشات الكمبيوتر», screen 7 (`docs/mockups/desktop-fixes/f5-07-ko.dc.html`).

## Files
- `src/features/ko-preview/components/ko-teaser.tsx`, `ko-teaser-panel.tsx`, the ko-preview messages, tests

## What to build
1. On desktop the teaser is a small card anchored to the bottom end corner (about 360px wide). No backdrop, no blur, and the page behind stays usable.
2. Content as in the mockup: the KO mark, «أنا KO، مساعدك في الجيم», one line that it is still training, three example requests, and the existing «عايز أجربه أول واحد» action. A close button with a translated `aria-label`.
3. Closing hides it, using the same dismissal storage the teaser uses today. Escape closes it. Focus is not trapped.
4. On the phone keep today's behaviour.
5. Keep the KO helmet identity exactly as it is.

## Rules for this card
- Desktop layout stays as it is today (sidebar, header, page width). Only the page content changes. Phone layouts must keep working.
- Change only the v6 workspace view (`NEXT_PUBLIC_CAPTAIN_WORKSPACE=1`). The flag-off markup and its hash tests stay unchanged.
- Strings in ar, arStd (behind the `NEXT_PUBLIC_INTERNATIONAL` getter, as in other v6 message files) and en. Tokens only, logical properties only, 48px targets, files under 250 lines.
- No migrations, no new dependencies, no data writes changed.

## Done when
- Tests cover: no backdrop or blur class on desktop, close and Escape, and the existing dismissal still respected.
- `npm run check` passes.
