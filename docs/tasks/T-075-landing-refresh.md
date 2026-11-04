# T-075 — Landing page refresh: new features, readiness section, richer plan cards

**Phase:** 3 · **Status:** ready (owner request, 2026-11-04). The owner approved the mockup `kochivo_landing_v2_with_new_features`. Keep the current structure, tokens and `marketing-*` utilities; this is a content and section update, not a redesign.

## Files
- `src/features/marketing/content.ts` and `src/features/marketing/messages.ts` (Arabic + English)
- `src/features/marketing/components/*`: edit `hero.tsx`, `features-grid.tsx`, `player-section.tsx`, `pricing.tsx`, `stats-strip.tsx` if needed
- New: `components/readiness-section.tsx` plus small visual parts it needs (≤ 250 lines each)
- The marketing page route only to insert the new section
- `src/features/marketing/*.test.ts` (update and add tests)

## Changes
1. **Hero**
   - Keep the English slogan block exactly as is (owner decision: the slogan stays English).
   - Change the supporting line to: «تمرين وأكل ومتابعة كل لاعبينك في مكان واحد، وتعرف لاعبك جاهز ولا لأ قبل ما يبدأ تمرينه.» ("Training, meals and check-ins for all your players in one place, and you know if your player is ready before they start their workout."). English: "Training, meals and check-ins for every player in one place — and you know who is ready before they train."
   - The existing player/coach preview toggle: add a **rest-day** player state (calm blue phone with the moon, «النهارده يوم راحة» "today is a rest day", the sleep chips with 7 selected, «عضلاتك: خفيف» "your muscles: light") next to the training state. The training state shows the slim water strip (1.5 / 3 L).
   - Use the rest-mood tokens from `globals.css` (`[data-mood="rest"]` scope or the `calm` / `water` tokens added in T-074). No hex in components.
2. **New section `readiness-section.tsx`**, placed right after the stats strip.
   - Eyebrow «جديد» ("new"). Title «اعرف لاعبك جاهز ولا لأ قبل التمرين» ("know if your player is ready before training"). Sub: «أرقام بسيطة من سؤالين الصبح والسِتات اللي سجّلها، وإنت اللي بتاخد القرار.» ("simple numbers from two morning questions and the sets they logged, and you make the call").
   - Three cards:
     - **readiness rings**: sleep / water / soreness concentric rings with score 72, using the same tokens as the readiness tab. Body text says it flags under 5 h sleep.
     - **today's decision**: original 18 vs suggested 14 sets bars, plus a static "apply to today's workout" pill (not a link).
     - **muscle map**: a mini front/back silhouette with lime heat, a push/pull bar at 68/32, and one danger dot.
   - Reuse the existing T-073 `BodyMap` from `@/features/muscle-analytics` **only if** it stays light. Otherwise draw a tiny static SVG. The marketing route must stay inside its perf budget (200 KB); do not import readiness or analytics feature code into the landing route if it costs bytes.
   - All visuals are `aria-hidden` decorative SVGs with a text description next to them. Label this sample data like the existing preview label does.
3. **Player section**
   - Title «التطبيق بيتغيّر مع يومه» ("the app changes with their day").
   - Description: training day is lime with only the workout; on rest days the whole app turns calm blue with the two morning questions and the water glass.
   - Items:
     - focus mode
     - daily water (a goal that fits their weight, one tap per glass)
     - workout history (see last weight before every set)
     - offline
     - feels like an app
   - Keep personal-best and record-and-send if they fit; max 6 items.
   - Add the small 8-week progress line card (bench press 92.5 kg, «رقم جديد» "new record"), as a static SVG.
4. **Features grid**: 8 items, with lucide icons:
   - workout builder
   - your templates + KOCHIVO templates (make once, assign to many)
   - flexible meal plans
   - supplements
   - drop-off radar
   - one inbox (videos, check-ins, voice notes)
   - readiness (sleep, water, soreness daily)
   - muscle analytics (push/pull balance and load)
5. **Pricing cards** (keep prices and limits exactly; see the comment in `content.ts`). Each plan card gets:
   - **who it's for**:
     - Entry: «لو لسه بادئ» ("if you're just starting")
     - Champion: «كابتن بيكبر» ("a growing coach")
     - Legend: «للكابتن المحترف» ("for the pro coach")
     - Empire: «للتيمات والجيمات» ("for teams and gyms")
   - a **check list** of the key features, using `Check` icons:
     - «برامج تمرين وأنظمة أكل» ("training programs and meal plans")
     - «قوالب كوتشيفو + قوالبك» ("KOCHIVO templates + your own")
     - «جاهزية اللاعب وتحليل العضلات» ("player readiness and muscle analytics")
     - «تطبيق اللاعب يشتغل أوفلاين» ("player app works offline")
     - «فيديوهات ورسايل صوتية» ("videos and voice notes")
   - Every plan has every feature (the only difference is the player limit), so:
     - Show the same list on each card, with the player-limit row emphasized first.
     - Add one line under the grid: «كل المميزات في كل الباقات، الفرق في عدد اللاعبين بس» ("every feature in every plan; the only difference is the number of players").
     - Do **not** invent tier-only perks (no "priority support" etc.).
   - Cards keep equal height; the Legend card stays highlighted as most popular.
6. **FAQ**: add one Q/A: «اللاعب لازم يدفع؟» ("does the player have to pay?") already exists. Add «الكابتن بيعرف لاعبه نايم كويس؟» ("does the coach know if their player slept well?") with the answer «أيوه، اللاعب بيجاوب سؤالين الصبح ويسجل المية، وإنت بتشوف رقم جاهزيته وتقرر تخفف التمرين ولا لأ.» ("yes: the player answers two morning questions and logs water, and you see their readiness score and decide whether to lighten the workout") + English.

## Rules
- Every string goes in `marketing/messages.ts` (Egyptian Arabic + short plain English). No emoji.
- Tokens only; logical properties; `motion-reduce` respected for any animation (at most one subtle animation on the page).
- Responsive down to 360 px with no horizontal scroll. Plan cards are 1 column on mobile, 2 on sm, 4 on lg.
- Keep the existing SEO metadata, nav anchors, the white-label strip and the footer.
- No new dependencies. Files ≤ 250 lines.

## Tests
- Update marketing content tests for the new strings and the counts: 8 features, 4 plans with unchanged prices and limits, and the same check list on each plan.
- Render test: the readiness section exists with its heading, and the pricing note line exists.
- Perf budget must pass after the build, without changing budgets.

## Acceptance
- [ ] The landing page shows the new hero line and rest-day preview, the readiness section, the updated player section, 8 features, plan cards with audience + feature checklist + note, and the new FAQ.
- [ ] `npx tsc --noEmit -p .`, `npx eslint .`, `npx vitest run --maxWorkers=2`, `npm run build` and the perf budget pass.
