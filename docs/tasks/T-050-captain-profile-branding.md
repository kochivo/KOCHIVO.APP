# T-050 — Captain profile and branding

**Phase:** 3 · **Depends on:** T-045 merged · **Status:** ready

## Problem
The captain settings page has a basic `profile-form.tsx`: name, phone and timezone. The owner wants a full profile and branding section: photo, bio, location, timezone, units and contact links. Players see it on their captain page.

## Already exists, build on it
- `public.profiles` (0002) has `full_name`, `phone` and `timezone` (default `Africa/Cairo`).
- `guard_profile_update()` and `profiles_update_self` restrict self-updates to safe columns, and 0040 uses a column grant for `tour_seen_at`. Follow that pattern; do not add a `captains` table or a `user_id` column, because `profiles.id` is the user id.
- `src/features/settings`: `profile-form.tsx`, `settings-screen.tsx`, `data/settings.ts`, `schema.ts` and `glass-toggle.tsx`.
- `compressImage` in `src/lib/compress-image.ts`; follow the upload pattern from `meal-plans/data/custom-food-photo.ts`.
- T-045 primitives: `glass`, `glass-strong`, `PageContainer`, `CardGrid`, `Button` (primary is full width on mobile), and `hover-lift`.

## Files
- `supabase/migrations/0046_captain_profile.sql`:
  - New `profiles` columns:
    - `bio text`, at most 280 characters
    - `location text`, at most 80
    - `units text not null default 'metric'`, checked to `metric` or `imperial`
    - `avatar_path text`
    - `social jsonb not null default '{}'`, with a check that the keys are a subset of `whatsapp, instagram, tiktok, facebook, youtube, x` and every value is a string of at most 200 characters
  - Grant `update` on those columns to `authenticated`, and extend `guard_profile_update` if it lists allowed columns. Only the row owner can update (the existing `profiles_update_self`). Role and plan stay locked.
  - A player may read their captain's `full_name, bio, location, avatar_path, social` through `my_captain_id()`. Add a security-definer function or view limited to those columns if the existing profile read policy does not already allow it. Never expose phone, plan or email to the player.
  - New public bucket `captain-avatars`: 512 KB, jpeg and webp only. Owners write only under `<uid>/`; anyone may read.
- PGlite test `supabase/tests/captain-profile.test.ts`:
  - A captain updates their own fields.
  - Captain B cannot update captain A.
  - A player reads their captain's public fields but not the phone.
  - Role and plan cannot be changed.
  - Bad social keys or overlong values are rejected.
  - An avatar upload outside `<uid>/` is rejected.
- `src/features/settings/schema.ts` (zod):
  - WhatsApp: a `https://wa.me/<digits>` link or an Egyptian or international number, normalised to `https://wa.me/<digits>`.
  - Each other link must be `https://` on its own domain (instagram.com, tiktok.com, facebook.com or fb.com, youtube.com or youtu.be, x.com or twitter.com).
  - Timezone must be one of `Intl.supportedValuesOf('timeZone')`, with a fallback list.
- `data/settings.ts`: a server action to save the profile. Avatar upload is compressed to 256 px webp and replaces the old file only after the row update succeeds.
- UI in `src/features/settings/components/`. Split it so each file stays under 250 lines:
  - `captain-profile-card.tsx`: one large `glass-strong` card, `rounded-card p-4 md:p-8`, `max-w-2xl mx-auto`. At the top, a 64 px round avatar with an upload control (an icon button with a translated `aria-label`), then the title «البروفايل والبراند» and a muted one-line description.
  - Fields, using the `TextField` styles:
    - name
    - bio (textarea, placeholder «مدرب أونلاين، خسارة دهون وقوة. 6 سنين خبرة»)
    - location (placeholder «Cairo, Egypt»)
    - timezone select (default `Africa/Cairo`, with the hint «بنظبط بيها مواعيد الإشعارات والأيام ورا بعض»)
    - units, a two-option `Segmented` control: «متري (كجم/سم)» and «إنجليزي (رطل/بوصة)»
  - `social-links-fields.tsx`: the section heading «روابط التواصل» in small muted text (no all-caps English label). A `grid grid-cols-1 md:grid-cols-2 gap-4` of inputs, each with its lucide icon:
    - WhatsApp → `Phone`
    - Instagram → `Instagram`
    - TikTok → `Music2`
    - Facebook → `Facebook`
    - YouTube → `Youtube`
    - X → `Twitter`

    Use only icons that exist in the installed lucide-react; check its exports. Inputs use a deeper field token, with a lime focus ring from the tokens.
  - Footer: the primary «احفظ التعديلات» (lime, the only primary on the screen) and a ghost or secondary «إلغاء» that resets the form. Show inline field errors, and `toast.success` on save. The save is optimistic, with a rollback toast on failure.
- Units: store the preference now, and make `formatWeight`/`formatLength` helpers in `src/lib/units.ts` respect it, with unit tests. Do **not** convert stored data; storage stays in kg and cm. Wiring the helpers into every screen is out of scope; list the screens that would need it in the final message.
- Player side: on the player's captain page (`/player/captain`, find the component), show the captain's avatar, name, bio and contact links. Links open in a new tab with `rel="noopener noreferrer"`. Empty links are hidden.
- `messages.ts`: Egyptian Arabic and English.

## Out of scope
- White-label or custom domains. The owner deferred it on 2026-11-03.
- Converting historical data to imperial.

## Requirements
- Tokens only. No `bg-[#c5ff22]` or `white/[x]` in components; the owner's requested styles map to `bg-lime`, `glass-strong`, `text-muted` and the T-045 utilities.
- RTL logical properties. Files under 250 lines. No new dependencies.
- The perf budget must pass; lazy-load the card if needed.

## Acceptance
- [ ] A captain edits their photo, bio, location, timezone, units and links, and sees the changes at once.
- [ ] Their players see the public part. Nobody else can edit it.
- [ ] `npm run check`, `npm run build` and the perf budget pass.
