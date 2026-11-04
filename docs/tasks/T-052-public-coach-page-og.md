# T-052 — Public coach page, join link, and share previews

**Phase:** 3 · **Depends on:** T-050 merged (it adds the profile fields: avatar, bio, location, social) · **Status:** ready

## 1. Public page `/c/[slug]`
- `supabase/migrations/0049_coach_public_page.sql`:
  - `profiles.public_slug text unique`: lowercase `a-z0-9-`, 3–30 characters, captains only, and a reserved list (`admin`, `api`, `login`, …).
  - A security-definer function `public.coach_public_profile(slug text)` that returns only `id, full_name, bio, location, avatar_path, social` for captains who are not suspended. Grant it to `anon` and `authenticated`. No table access for anon.
- In captain settings (the T-050 card), add a slug field with a live «kochivo.site/c/…» preview and a copy button.
- A thin route `src/app/[locale]/c/[slug]/page.tsx` calls a new `features/coach-page`. Use the T-045 glass styles: avatar, name, bio, location, social links, and one primary button «ابدأ التدريب معي». An unknown slug returns a 404.

## 2. Join through the link
- The primary button links to `/login?tab=signup&coach=<slug>`. Do not use a raw `ref=<uuid>`.
- After sign-up, do **not** auto-link the player. Strangers would use up the captain's paid seats and could reach their workspace. Create a **join request** instead:
  - In `0049`, add `public.coach_join_requests` with columns `id, captain_id, player_id, created_at, status` (`pending`, `accepted` or `declined`), unique on (captain, player) while pending.
  - RLS: the player creates and reads their own requests; the captain reads and updates theirs.
  - Accepting a request goes through the same server path as redeeming an invite (`redeem-invite.ts` logic and its seat-limit checks), so plan limits still apply.
- The captain's task home and roster show pending requests with accept and decline. This must not create a second primary action; use secondary buttons.
- PGlite tests:
  - anon can read only the public fields.
  - A request is created and accepted within the seat limits, and rejected when the plan is full.
  - Another captain cannot accept it.

## 3. Share previews (Open Graph)
- Root `src/app/[locale]/layout.tsx` metadata:
  - `metadataBase` = `https://kochivo.site`
  - title template and description, in Arabic and English by locale
  - `openGraph` and `twitter` (`summary_large_image`)
- Keep the marketing page's existing `openGraph` in `src/app/[locale]/page.tsx` and align it with the root.
- `src/app/[locale]/opengraph-image.tsx` using built-in `next/og` `ImageResponse` (no new dependency), 1200×630:
  - dark brand background with a subtle lime light
  - the KOCHIVO wordmark and the English slogan (keep the slogan in English, per the owner's 2026-11-03 decision)
  - one Arabic line
  - Colours come from a small constants file that mirrors the tokens; this is the one allowed place, because OG images cannot read CSS variables.
- `/c/[slug]` gets its own `generateMetadata` and `opengraph-image.tsx` with the coach's name and photo.
- Test: the metadata objects include title, description and images for both locales.

## Requirements
- No new dependencies. Tokens only (except the OG constants file). RTL. Files under 250 lines. The perf budget must pass.

## Acceptance
- [ ] A visitor opens `kochivo.site/c/ahmed` without signing in and sees the coach.
- [ ] Signing up from it sends the captain a join request.
- [ ] A WhatsApp share shows a proper preview image.
- [ ] `npm run check`, `npm run build` and the perf budget pass.
