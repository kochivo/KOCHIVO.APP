# T-231 — Player: "Captain and your subscription" page and "My assessments" page

**Phase:** player v3 · **Depends on:** none · **Status:** ready

## Goal
Today the v6/v3 captain tab mixes several things in one page: the captain's details, the subscription, renewal, and assessments. The owner wants them split. Captain details, subscription and renewal get their own page. Assessments get their own page, where the player sees what is due, fills it in, and sees past results. The captain tab will become a pure chat in T-230, which runs after this card.

## Files
Create or modify only these:
- `src/app/[locale]/(player)/player/captain/profile/page.tsx` (new, thin route)
- `src/app/[locale]/(player)/player/assessments/page.tsx` (new, thin route)
- `src/features/player-shell/components/captain-profile-card.tsx` (new): the captain details block that is today inline in `captain-screen.tsx`: avatar, name, location, bio, social chips, status, dates, WhatsApp
- `src/features/player-shell/components/captain-profile-screen.tsx` (new): mockup screen 3
- `src/features/player-shell/components/assessments-screen.tsx` (new): mockup screen 4
- `src/features/player-shell/components/captain-screen.tsx`: change only this: render the new `CaptainProfileCard` instead of the inline `profile` JSX. Behavior stays identical in both branches.
- `src/features/player-shell/components/player-assessments.tsx` and its entry, only as needed to support the page layout (due vs past)
- `src/features/player-shell/index.ts`: export the two screens through dynamic `-entry` files, following `captain-screen-entry.tsx`, so the player route's first load does not grow
- `src/features/progress/components/progress-screen.tsx`: v6 branch only
- the player home component that shows a pending assessment, if one exists (see 4)
- messages files for the strings (`ar`, `arStd`, `en`) and tests

## Requirements
1. **`/player/captain/profile`** matches mockup screen 3 at 390×844:
   - header: a back button to `/player/captain` (use the existing back pattern) and the title «الكابتن واشتراكك»;
   - a centered captain card: 80px avatar, name, location, bio, social chips;
   - a subscription card: «اشتراكك», status chip, «عضو من … / لحد …», a progress bar from `startedOn` to `accessUntil`, and «فاضل N يوم». Compute the days with the player timezone and `localDate`, as today;
   - a renewal card: «جدد باقتك» + one line + the existing `RenewalEntry`, loaded dynamically exactly as `captain-screen.tsx` does. Make its main button the single lime action. Hide the card when `pending` or `archivedAt`, as today;
   - WhatsApp as an outline button. If there is no contact, use the existing disabled state;
   - loading, error and "no captain" states reuse the ones in `captain-screen.tsx`.
2. **`/player/assessments`** matches mockup screen 4:
   - «مطلوب منك»: the due assessments. The first gets a gold card and a full-width lime «سجّل التقييم». The others are gold-bordered rows with an outline «سجّل» chip. Both open the existing fill flow (whatever `PlayerAssessments actionable` uses today, such as `/player/forms/[requestId]`).
   - «اللي سجلته قبل كده»: past results with name, date, and the headline value if the data has one, plus a chevron to the existing detail if one exists.
   - An empty state for each section.
   - Keep every existing behavior of `PlayerAssessments` (charts, guard, etc.). Lay it out to the mockup; never drop a feature.
3. **Progress page (v6 branch only):** replace the inline `<PlayerAssessments />` block with one fixed row «تقييماتي» and a chevron that links to `/player/assessments`. Also show a small gold count when something is due. The legacy branch is unchanged.
4. **Home:** if the v3 home already shows a pending-assessment card, point it to `/player/assessments`. If it does not, add nothing here; T-230 adds the chat banner.
5. The KOCHIVO icon set rules from AGENTS.md apply. Use tokens only. RTL logical classes. Touch targets ≥ 48px. Every string goes in messages.
6. **Perf:** keep `/player` ≤ 300 KiB and `/c/[slug]` ≤ 200 KiB. Run `npx vitest run src/lib/perf-budget.test.ts` after the build.

## Acceptance
- [ ] Both routes render with real data. Their states are tested: loading, error, empty, pending/archived (renewal hidden), and no contact (WhatsApp disabled).
- [ ] The captain tab (`/player/captain`) looks and behaves exactly as before. This card only extracts the card component.
- [ ] Tests cover the days-left computation, the due/past split, and the progress row link.
- [ ] `npm run check`, `npm run build` and the perf budget pass.

## Out of scope
- Making the captain tab a chat, and removing renewal/assessments from it: T-230.
- Any DB change.
- The captain workspace.

## References
- Mockup: `docs/mockups/player-v3/12-chat-split.html`, screens 3 and 4. Shared rules: `docs/mockups/player-v3/README.md`.
