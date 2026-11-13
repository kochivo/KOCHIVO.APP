# T-228: Player v3 medals screen

**Phase:** Player v3 redesign · **Depends on:** the medals system (approved 2026-11-13, starts only after the current work is live in production), T-222 · **Status:** blocked

## Goal
Match `docs/mockups/player-v3/07-medals.html` on `/player/rank` exactly. Read `docs/mockups/player-v3/README.md` first.

## Why it is blocked
The mockup shows the medals model:
- 7 levels from حديد to أسطورة, with «ذهب» in the example;
- medal sets: الالتزام, أسابيع كاملة, أرقام قياسية, التاج;
- bronze, silver and gold tiers.

Today `ranks` uses a different scale (مبتدئ, بطل, نخبة, أسطورة, التاج) with points. Building this screen on the current rank data would show wrong names, so it waits for the medals data card. The medal tokens (`bronze-*`, `silver-*`, `gold-*`, `platinum-*`, `crown-gem-*`) already exist in `globals.css`.

## When unblocked
1. **Level card.** The hex badge in the level color, «مستواك», the level name in its color, a progress bar, and «فاضلك <n> … على <next level>».
2. **The 7-segment bar.** حديد on one end and أسطورة on the other, with filled segments up to the current level.
3. **The medal grid, 2 columns.** Each card shows the medal icon in its tier colors, the name, and «<tier> · <count>».
   - A locked medal (التاج) has a dashed border and «اتفتح لما توصل أسطورة».
4. **An outline «شارك ميدالياتك»**, using the existing share-card flow.
5. **Home tile.** The home «الميدالية الجاية» tile (T-223) switches from the weekly count to the real next medal.

## Out of scope until then
Everything. Until this card lands, `/player/rank` keeps the current rank screen.
