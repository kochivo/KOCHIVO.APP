# T-147 — Share a rank-up or the crown as an image

**Phase:** Gamification · **Depends on:** T-134, T-136 · **Status:** ready (owner request 2026-11-10)

## Goal
When a player ranks up or holds the crown, they can share a ready story image: their badge, first name, rank
or crown, and the captain's name with the KOCHIVO mark. Free marketing for the captain and the app.

## Files
Create or modify only these:
- `src/app/api/share/rank/route.ts` (new, thin): authenticated GET, returns a PNG for the caller only.
- `src/features/share-card/rank-image.tsx` (new), `src/features/share-card/index.ts`, `src/features/share-card/messages.ts`
- `src/features/ranks/components/share-rank-button.tsx` (new), `src/features/ranks/components/level-up-panel.tsx`,
  `src/features/ranks/components/rank-hero.tsx`, `src/features/ranks/messages.ts`
- Tests in both features.
- This task card.

## Requirements
1. **Route.** Signed-in players only (401 otherwise). Data comes from `my_points()` and the caller's own
   profile and captain name, never from query parameters (no id in the URL, so nobody can render someone
   else's card). `kind=rank|crown` is the only parameter; `crown` returns 404 unless the caller holds the
   crown this month. `Cache-Control: private, no-store`.
2. **Image.** 1080×1920 PNG with `next/og`, reusing the share-card fonts, colors (`og-colors.ts`) and the
   `shareText` Arabic word-order fix. Content: the rank badge art (same shapes as `RankBadge`, drawn for
   `next/og`), «{first name} بقى {tier}» or «{first name} أخد تاج الشهر», the captain's name, and the KOCHIVO
   wordmark. No lifetime numbers, no other players.
3. **Button.** «شارك» / "Share" with a share icon, in the level-up panel and in the rank hero (the hero shows
   `crown` when the player holds it, otherwise `rank`). It fetches the PNG and calls `navigator.share({ files })`
   when `navigator.canShare` accepts files; otherwise it downloads the file. Disabled while loading, error
   line on failure. At least 48px.
4. The level-up panel keeps «كمّل» as its one lime action; Share is secondary.

## Acceptance
- [ ] Tests: route 401 without a user, 404 for `crown` when not the holder, PNG content type and no-store for
  both kinds (Supabase and `ImageResponse` mocked as the existing share-card tests do); button falls back to
  download when files cannot be shared; ar and en labels.
- [ ] `npm run check` and `npm run build` pass (known sandbox limits).

## Out of scope
- Public share pages, Open Graph previews of a player, captain-side sharing.

## Implementation notes

- Added a thin GET handler backed by caller-authenticated profile, points, captain, and current crown reads. Unknown or repeated query parameters are rejected; all responses are private/no-store.
- Story PNGs reuse the OG font, palette, Arabic word-order helper, and complete RankBadge geometry with browser paints resolved to the OG palette. Missing captain links omit the captain line.
- Share is secondary in both panels. Supported files use native sharing; other browsers download the PNG. Cancellation is silent; failures show a translated error.
- Review: RankHero takes `holdsCrown` from rank-screen (one data load, no duplicate fetch).
- Tests cover authorization, another player's crown, query validation, dependency errors, headers, bilingual labels, download/native sharing, and actual 1080×1920 PNG rendering with a bundled test font.
- Review: the route lives at `src/app/[locale]/api/share/rank/route.ts` because src/proxy.ts rewrites every path to /{locale}/...; the public URL stays /api/share/rank.
- Verification: 45 focused tests pass, including actual PNGs for all five badges. Source/script suite: 330 files / 2268 tests pass; perf-budget.test.ts fails on a missing .next chunk. The full SQL run was interrupted. Build fails fetching only Alexandria, Changa, and Manrope from Google Fonts. Release audit's git subprocess is sandbox-blocked; running its rules against shell-supplied tracked/new paths reports 1706 files, 0 findings. Final check results are recorded in the implementation report.
