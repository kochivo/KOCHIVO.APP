# T-135 — Rank and crown notifications (in-app and push)

**Phase:** Gamification · **Depends on:** T-133 (landed) · **Status:** ready

## Goal
Migration 0081 inserts three new notification types: `rank_up`, `crown_taken` and `crown_lost`.
The app does not know them yet: the bell would show a missing text and push would send nothing useful.
Teach the in-app list and the push function to show them. All three go to the player only.

Payloads written by the database:
- `rank_up`: `{ tier: 'champion' | 'elite' | 'legend', lifetime: number }`
- `crown_taken` and `crown_lost`: `{ captain_id: uuid, month: 'YYYY-MM-01' }`

## Files
Create or modify only these:
- `src/features/notifications/types.ts`: add the three types; add `tier?: string` to the payload.
- `src/features/notifications/data/notifications.ts`: pass `payload.tier` through, only when it is one of the three tier strings.
- `src/features/notifications/format.ts`: text key, icon and href for the three types.
- `src/features/notifications/messages.ts`: new strings only.
- `src/features/notifications/notifications.test.ts`
- `supabase/functions/send-push/payload.ts`, `supabase/functions/send-push/messages.ts`, `supabase/functions/send-push/payload.test.ts`
- This task card.

## Requirements
1. **Text** (Egyptian Arabic, short English, no emoji):
   - `rank_up`: «اترقيت! بقيت {tier}» / "You ranked up to {tier}". `{tier}` is the translated tier name: بطل / Champion, نخبة / Elite, أسطورة / Legend. Keep the tier names in this feature's `messages.ts`; do not import from `src/ui`.
   - `crown_taken`: «التاج بقى معاك. حافظ عليه» / "The crown is yours. Keep it".
   - `crown_lost`: «التاج اتاخد منك. رجّعه» / "You lost the crown. Take it back".
2. **Unknown tier.** If `payload.tier` is missing or not a known tier, `rank_up` shows a generic «اترقيت لرتبة جديدة» / "You reached a new rank". Never show a raw key or `undefined`.
3. **Icon.** `rank_up` uses lucide `Award`; both crown types use `Crown`.
4. **Link.** All three open `/player/rank` (the screen comes in T-136).
5. **Push.** `send-push` builds a title and body for the three types in ar and en, with the same fallback as item 2, and the URL `/player/rank`. Follow the existing pattern in `payload.ts`; do not change delivery logic in `index.ts`.
6. **No regression.** Existing types keep their text, icon and link.

## Acceptance
- [x] Unit tests: text key, icon and href for each new type; the tier fallback; the loader drops an invalid `tier`; push payload in ar and en for each type and for the fallback.
- [x] Existing notification and send-push tests pass.
- [ ] `npm run check` and `npm run build` pass (sandbox fonts are a known limit).

## Out of scope
- The `/player/rank` screen (T-136) and captain screens (T-137).
- Any migration or change to how notifications are inserted.
- Supabase Realtime.

## Implementation notes
- Added the three notification types and allowlisted `payload.tier` to champion, elite and legend in the loader.
- In-app formatting selects a complete translated message per tier, keeping the existing dropdown unchanged; missing or unknown tiers select generic rank text. Award/Crown icons and all three links target `/player/rank`.
- Push uses the same localized messages and fallback, existing notification title/tag and locale-prefixed rank URL (`/ar/player/rank` or `/en/player/rank`). Delivery and notification insertion are unchanged.
- Notification and send-push suites: 12 files, 77 tests passed using `npm run test -- --configLoader native --pool threads`. The default Vitest config bundler/worker processes hit sandbox `spawn EPERM`.
- Full suite with `npm run test -- --configLoader native --pool threads --maxWorkers 2`: `Test Files 406 passed | 1 skipped (407)`; `Tests 2910 passed | 1 skipped (2911)`.
- `npm run check` passed TypeScript and ESLint, then the release audit was blocked by sandbox `spawnSync git EPERM` before the test step.
- `npm run build` failed only on Google Fonts fetches for Alexandria, Changa and Manrope.
