# T-321b — Rank share image: build design F "explosion" from the owner's pick

The owner picked direction **F** from `docs/mockups/ranks/rank-share-v4.html`; see the first row of `rank-share-v4.jpg`. Rebuild `src/features/share-card/rank-image.tsx` so the PNG matches that design as closely as Satori allows. This worktree already holds the T-321 work: separate text lines, real stats, the logo and the medal-size fix. Keep all of that and replace the visuals.

## The design, top to bottom (1080×1920)
1. **Background**
   - Near-black base.
   - A radial glow in the rank colour, centred at y≈690 (main metal at about 60% alpha, fading out by about 45% of the width).
   - A wider faint glow underneath it.
2. **Speed lines, rings, sparks and flare.** Draw them all in ONE inline `<svg>` of 1080×1920 placed absolutely behind everything; Satori does not support conic gradients, masks or blend modes.
   - About 90 thin rays from the centre (540, 690). Each ray starts about 280 px from the centre and fades out by about 1300 px. They alternate between the rank colour and white at low opacity.
   - Three concentric ellipses (shock rings) around the medal. Diameters 560, 760 and 980, scaleY 0.9, rank colour, stroke widths 8/6/4, opacity 0.55/0.38/0.21.
   - About 26 glowing particles. Use a deterministic pseudo-random seed (no `Math.random`), small circles in the light metal colour with a blurred halo.
   - About 10 small glass shards: triangles with a light gradient fill and a thin white stroke, scattered between y=250 and y=1150.
   - A horizontal lens flare through the medal centre. It is 1600×14, rotated -8°, and its gradient runs transparent → light metal → white → light metal → transparent.
3. **Medal.** About 780 px, centred at y=690, with a glow drop shadow in the rank colour.
4. **Top row** at y≈90 with 90 px side padding:
   - On one side, the real logo from `public/brand/logo-primary.png`.
   - On the other side, a lime pill «رتبة جديدة» / "New rank". Dark text on lime, rotated -4°, with a soft lime shadow.
5. **Text block** starting at about y=1040, centred:
   - The label «وصل لرتبة» / "Reached", about 44 px, in the light metal colour.
   - **The rank name, very large and 3D:**
     - About 250 px; use 195 px for names longer than 4 letters, like أسطورة.
     - Skewed -6°.
     - Use two stacked layers. The back layer is the dark metal colour with stacked `textShadow` steps (0 2px, 0 4px … 0 16px, darkening to black, plus a big soft glow) to make the extrusion. The front layer has a vertical metal gradient using `backgroundClip: 'text'` (white → light → main → dark band → main → light).
   - The player's first name, about 92 px, white, with a dark shadow.
   - Two stat cards: lifetime points and total workouts. Each is skewed -8°, with a rank-colour tinted gradient background, a rank-colour border, a big white number (about 80 px) and a small label in the light metal colour. If the workouts read fails, show only the points card.
6. **Footer** at the bottom, about 70 px from the edge:
   - «مع الكابتن {name}», muted, shown only when there is a captain.
   - Below it, `KOCHIVO.SITE` in lime with wide letter spacing.
7. **Crown variant:** the same layout, using the crown art, the gold palette and the crown title text.

## Rules
- Colours come only from `medal-colors.ts` and `og-colors.ts`. Add any new paint you need there (for example a lime-on-dark ink). Do not put raw hex values in `rank-image.tsx`.
- Use only the font `ogFont()` loads. If the 3D layering pushes `rank-image.tsx` past 250 lines, split it into small helpers, for example `rank-image-burst.tsx` for the SVG and `rank-title-3d.tsx`.
- Keep the security checks, caching headers and route behaviour exactly as they are.
- Do not change `medal-art.tsx` beyond the existing T-321 fix.

## Tests
- Update `rank-image.test.ts` to check:
  - the burst SVG is present;
  - the particles are the same on every render (same seed, same output);
  - the long-name font size is used for أسطورة;
  - the pill text and the KOCHIVO.SITE footer are there.
- Keep the existing assertions: separate lines, stats, the captain line omitted when empty, and the medal at the right size.
- Render iron, gold and legend PNGs for the Arabic locale, plus gold for English, into `C:/Users/ALY/AppData/Local/Temp/kochivo-t321b/`. List those paths in your final message.

## Gates
npm run typecheck, npm run lint, and the share-card and ui tests.
