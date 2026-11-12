# T-208: Public pricing page, renewal offers, tier badge and VIP priority (mockup v6-packages-offers)

**Phase:** Captain packages v2 (owner approved 2026-11-12) · **Status:** ready · **Depends on:** T-206, T-200 (follow-up screen) · **Migration:** none
**Messages:** `ar` (Egyptian), `arStd`, `en`. Copy Arabic strings from the mockup exactly.
**Rules:** AGENTS.md in full. Tokens only, logical properties, touch targets of at least 48px, 250 lines per file, no new deps, no Get-Content/Set-Content, no commits.

Read first: `docs/mockups/captain-workspace/v6-packages-offers.html` screens «اللاعب بيشوف إيه» and «إزاي هيتبني».

## Files
- `src/features/coach-page/`: the pricing section of the public page.
- The player renewal / join package chooser. Find it under `src/features/billing/` (player-facing parts), `onboarding/` or `player-*`, and list the path you use.
- `src/features/inbox/`: priority ordering only.
- Roster/player-file name rendering for the tier badge: the smallest shared spot.
- Messages and tests.

## Requirements
1. **Public pricing section**
   - Offer banner with a live countdown. Use the client clock, and when it reaches 0 show the ended state; no server polling.
   - Title «اختار باقتك مع كابتن {name}».
   - Duration switch built only from the durations that exist.
   - One card per tier showing:
     - name and description;
     - final price, with the list price struck through when an offer applies;
     - «شهرك بـ … جنيه بس» line;
     - feature list. Features in another tier but missing from this one show as «—» rows, matching the mockup;
     - «اختار {tier}» button.
   - The featured tier gets the lime card and the «الأكثر طلبًا» badge.
   - A tier the offer does not cover shows «العرض مش على الفئة دي».
   - It must work without JavaScript for the first paint: server-rendered default duration (the featured tier's middle duration).
2. **Player app renewal/join chooser**
   - Same cards, filtered by `applicableOffers` with `isRenewal`.
   - Choosing a card sends the existing request/activation flow with `tier_id`, `offer_id` and `list_price_egp`.
   - The server re-validates the offer. Never trust the client price.
3. **Tier badge:** a small pill with the tier name and color next to the player name in the roster, the player file header and follow-up rows. The «أساسي» tier gets no badge.
4. **VIP priority in follow-up**
   - Items from players on the captain's featured tier, or on a tier the captain marks «أولوية في الرد», sort first inside each group of the T-200 screen, and carry the badge.
   - If T-206 has no priority flag, use the featured tier only and note it.

## Acceptance
- [ ] Matches the mockup at 1440×900 and 390×844; differences listed.
- [ ] Tests:
  - price display with and without an offer;
  - countdown end state with injected `now`;
  - renewal-only and new-only offers;
  - server rejects a tampered price;
  - badge hidden for «أساسي»;
  - priority ordering is stable.
- [ ] `npm run check` and `npm run build` pass; summary lines pasted.
