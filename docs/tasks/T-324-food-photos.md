# T-324 — Photos for the 241 new library foods

Owner decision 2026-11-16: every food in the library gets a photo. 61 foods already have one. The 241 foods added by T-315 have none and show the empty placeholder.

## Style (match the 61 existing photos)
- Dark slate stone surface, soft side light, three-quarter top-down angle, 4:3 landscape.
- One dark matte ceramic plate or bowl, centered, with the food filling about 70% of the frame.
- Realistic home-style portion. For a cooked dish, show it cooked and plated the way it is served in its region. For a raw food, show it raw.
- A small natural garnish is fine (lemon wedge, parsley) only when it is part of the dish.
- No text, logos, hands, cutlery clutter, people, or extra dishes.
- Reference: `assets-source/food-photos/food_koshari-v1.webp`, `food_chicken_breast-v1.webp`, `food_apple-v1.webp`, `food_foul-v1.webp`.

## Output
- One image per food, named `<photo_file stem>.png` (for example `food_grilled_mullet-v1.png`). The orchestrator converts it to 600×450 webp.
- The food list and file names come from `supabase/seed/source/foods-starter.json` (`photo_file`), for the rows that have no file in `assets-source/food-photos/`.
- Generated with Codex built-in image generation, split into five batches (accounts A–E).

## Landing (orchestrator, owner OK needed for each step)
1. Convert to 600×450 webp, under 60 KB each, and review every image for the wrong food, text, or artifacts. Regenerate any bad ones.
2. Add the files to `assets-source/food-photos/` and to `food-photos-manifest.json` (same "AI-generated illustrative" note).
3. Upload to the `food-media` bucket and set `foods.photo_path` for those seed keys only. Never change rows that already have a photo.

## Out of scope
Captain foods, the player screens, and any code change.
