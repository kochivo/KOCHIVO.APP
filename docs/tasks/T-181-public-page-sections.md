# T-181: Public page sections (specialties, numbers, spots, facts, waitlist) and their settings

**Phase:** Public page (owner approval 2026-11-11; design v2 approved 2026-11-13) · **Depends on:** T-179, T-180 · **Status:** ready

## Goal
Fill the T-179 slots with T-180 data, as in `docs/mockups/landing/coach-page.html`, so every captain's page shows that captain's own data. Then let the captain control it from settings. Everything stays behind the flag.

## Files
- `src/features/coach-page/` (data loader for `coach_public_page` and `coach_public_stats`, section components, messages, tests).
- `src/features/settings/` (the public page settings block), messages, tests.
- This card.

## Requirements
1. **Load.** Call `coach_public_page` and `coach_public_stats` in parallel, inside the same request as `loadPublicCoach`. A stats error or `null` hides the numbers strip; it never breaks the page. A `coach_public_page` error hides the T-181 slots only.
2. **Sections:**
   - **Specialties:** angled chips under the tagline. Hidden when empty.
   - **Numbers strip:** players, workouts logged, adherence %, and years of experience (from the profile; hide that cell when null). Numbers count up once on view, with `formatNumber` and LTR units. Under it the honesty line: «الأرقام بتتحسب من تطبيق كوتشيفو نفسه، مش مكتوبة بإيد الكابتن».
   - **Spots line** under the hero CTAs, with the small 10-segment bar:
     - «فاضل N أماكن» when `spots_left` ≤ 10;
     - nothing when more than 10 are left;
     - when `accepting` is false: «مفيش أماكن دلوقتي», and the primary action (hero, dock and closing band) becomes «بلّغني لما يفضى مكان».
   - **«عنّي» facts:** years of experience and languages, each row hidden when empty.
3. **Waitlist button.**
   - A signed-out visitor goes to the signup with a return URL.
   - A signed-in player inserts the waitlist row. It is idempotent: the second tap shows «إنت في قايمة الانتظار».
   - A player already linked to this captain sees the existing `member` state.
4. **Captain settings, «صفحتك العامة» block:**
   - specialties as an editable chip list (max 6), years of experience, languages;
   - the «اظهر الأرقام» toggle, which explains the 5-player minimum;
   - a link to the packages settings (packages and the featured tier are managed there already);
   - a live preview link to `/c/<slug>`;
   - optimistic saves with error rollback.
5. **Pure helpers, unit tested:** `spotsLabel(spots, accepting)`, `statsCells(stats, years)`, and the specialty validation.

## Acceptance
- [ ] Unit tests for the helpers.
- [ ] Component tests for each section: present, empty, error and full.
- [ ] Tests for the waitlist's three paths.
- [ ] Settings tests.
- [ ] A flag-off test: the public page and settings are unchanged.
- [ ] All gates pass. Report the `/c/[slug]` budget.

## Out of scope
- Waitlist notifications.
- Package changes.
- Before/after photos, testimonials, and page view analytics.
