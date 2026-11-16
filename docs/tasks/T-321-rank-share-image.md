# T-321 — Rank share image redesign (story 1080×1920)

Owner, 2026-11-16, on the live rank share image: «ايه القرف ده». Today's image has:
- a tiny medal (about 170 px wide even though `size: 480` is passed);
- a dull green ellipse on a flat background;
- one mixed Arabic/English line, «Youssef بقى   حديد», with broken order and big gaps;
- nothing else.

The image must look premium and be worth posting on Instagram or WhatsApp stories.

## Where
- `src/features/share-card/rank-image.tsx`: the `next/og` `ImageResponse` that the rank and crown share routes call.
- Medal art: `src/ui/medal-art.tsx` with `medal-art-parts.ts`, and colors in `medal-colors.ts`.
- Messages: `src/features/share-card/messages.ts` plus `standard/`.

## Reference
Use `docs/mockups/ranks/rank-luxury-v7.html` as the look: luxury metal emblems, no "KO" text, and the rank-up moment section. Match its feel: dark background, metal glow in the rank's own colors, and fine light rays or particles drawn with simple SVG or CSS that Satori supports.

## Do
1. **Fix the medal size.** Find why `MedalArt` renders small inside Satori (likely a fixed viewBox with width and height attributes, or a nested svg without explicit size) and make it render at about **640 px** wide, centered in the upper half. Add a test that the produced SVG root has width 640 for the OG paint set.
2. **Background.**
   - Use a near-black base, a large soft radial glow in the rank's own main color (iron grey, bronze, silver, gold, platinum, diamond, legend), and a subtle diagonal brand slash in lime at low opacity.
   - Do not use flat green for every rank.
   - Use the colors from `medal-colors.ts` and `og-colors.ts`. No new hex values outside those files; add any new paint you need to them.
3. **Text layout.** Each piece goes on its own line so mixed scripts never share a line:
   - The small label «رتبة جديدة» / "New rank".
   - The rank name, very large (about 120 px), in the rank color. Arabic in Arabic and English in English.
   - The player's first name, about 64 px, white.
   - A stats row of 2–3 pills with the real lifetime points and the total workouts (`my_points` already gives lifetime; get workouts from `my_medals()` workouts, which already exists from 0121). Arabic: «{n} نقطة», «{n} تمرين».
   - The captain line «مع الكابتن {name}», muted, only when there is a captain.
   - At the bottom, the real KOCHIVO logo. Use the brand image from `public/brand/` (the one the landing page uses), not the letter-spaced text, plus the slogan line «خطوتك الجاية بتبدأ من هنا».
   - Wrap each line in its own `dir` so Arabic and Latin never mix inside one line. Keep `shareText` only if it still helps.
4. **Crown variant:** the same layout, with the crown art, gold glow and the text «{name} أخد تاج الشهر».
5. **Keep the rest:** security checks, caching headers and route behavior stay exactly the same. Only the visual output and the extra `my_medals` read change. If `my_medals` fails, render without the workouts pill.

## Tests
- Update `rank-image.test.ts`.
- Assert the title lines are separate elements, the stats pills render with the given numbers, the captain line is omitted when empty, and the medal is rendered at 640.
- Render 3 sample PNGs (iron, gold and legend) to a temp folder outside the repo and mention their paths in your final message, so the reviewer can look at them. Do not commit the PNGs.

## Rules
AGENTS.md applies in full. Use only fonts that `ogFont()` already loads. No new dependencies.

## Gates
npm run typecheck, npm run lint, and the share-card tests. The orchestrator runs build and check.
