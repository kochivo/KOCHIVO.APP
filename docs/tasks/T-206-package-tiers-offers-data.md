# T-206: Package tiers and offers: data and pricing (migration 0099)

**Phase:** Captain packages v2 (owner approved mockup 2026-11-12; features are display text, except the three enforced items below) · **Status:** ready · **Depends on:** none
**Migration:** `supabase/migrations/0099_package_tiers_offers.sql`, additive only. The reviewer applies it to production after the owner OKs it. **Flag:** data only, no UI.
**Rules:** AGENTS.md in full. Every new table needs RLS and a PGlite test in `supabase/tests/`. No new deps. Use `uuidv7()` for ids. Dates use the captain's timezone helpers (0094/0097), never a hardcoded Cairo literal. Never rewrite text files with Get-Content/Set-Content. Do not commit.

Read first: `docs/mockups/captain-workspace/v6-packages-offers.html`, all four screens, especially «إزاي هيتبني». Then read the current model in `supabase/migrations/0037_captain_finance.sql`, the later migrations that change `captain_packages` or payments/activations, `src/features/billing/` (types, data, renew, finance) and `src/types/database.ts`.

## Files
- `supabase/migrations/0099_package_tiers_offers.sql` (new) and `supabase/tests/package-tiers-offers.test.ts` (new).
- `src/types/database.ts`: entries for the new and changed tables only.
- A new pure module `src/features/billing/pricing.ts` and its test.
- `src/features/billing/data/`: read and write functions for tiers and offers, plus their tests.
- `src/features/billing/index.ts` / `server.ts`: exports.
- This card: append a "Verification" section.

## Requirements
1. **Table `captain_package_tiers`**
   - Columns: `id`, `captain_id`, `name` (1–40), `description` (≤ 80), `color` (a token name from a fixed list, never a hex value), `position`, `features` (jsonb array of strings, at most 10, each ≤ 80), `is_featured` (boolean), `archived_at`, `created_at`.
   - At most one featured tier per captain, enforced by a partial unique index.
2. **`captain_packages` gets `tier_id uuid null`**, referencing the tiers table.
   - The migration creates one tier named «أساسي» per captain who already has packages, and points those packages at it.
   - Nothing else about existing packages changes: prices, days and archived state all stay as they are.
3. **Table `captain_offers`**
   - Columns: `id`, `captain_id`, `name` (1–40), `kind` (`percent` | `amount` | `bonus_days`), `value` (percent 1–90; amount > 0 in EGP; bonus_days 1–365), `scope` (`all` | `tiers` | `packages`), `tier_ids uuid[]`, `package_ids uuid[]`, `starts_at`, `ends_at` (must be > `starts_at`), `for_new` (bool), `for_renewals` (bool; at least one of the two true), `max_uses` (null = unlimited), `used_count` (default 0), `paused_at`, `created_at`.
   - Ids listed in `tier_ids` / `package_ids` must belong to the same captain. Enforce this with a trigger.
4. **RLS on both new tables**
   - The captain has full control of their own rows. Suspended captains are blocked, following the 0026 restrictive policy pattern.
   - Anyone may read active tiers, active packages and currently running offers, but only for coaches whose public page is published. Read the public coach-page policy and mirror it.
   - Players and other captains can never write.
5. **Payments snapshot**
   - Wherever a payment or activation is recorded, also store `tier_id`, `offer_id`, `list_price_egp` and `bonus_days` (nullable, additive columns).
   - Increment the offer's `used_count` atomically in the same transaction as the payment.
   - Refuse the offer when it is expired, paused or full, raising a clear `errcode`.
   - Find the existing RPC or insert path and patch it with the guarded `pg_get_functiondef` approach (see 0055/0070/0097/0098), raising if the expected text is not found.
6. **`pricing.ts` (pure, `now` injected)**
   - `applicableOffers(offers, { packageId, tierId, isRenewal, now })`
   - `bestOffer(...)`: the lowest final price wins. On a tie, bonus days win.
   - `finalPrice(listPrice, offer)`: rounds to a whole pound and never goes below 0.
   - `monthlyEquivalent(price, days)` and `savingsPercent(monthPrice, price, days)`, which feed «وفّر 11%» and «شهرك بـ …».
   - `offerStatus(offer, now)`: `scheduled` | `running` | `ended` | `paused` | `full`.
   - `remainingSlots(offer)`.
7. **Display-only features.** Only three things are enforced, and later cards build them:
   - the tier badge;
   - VIP priority in the follow-up screen;
   - offers closing automatically.

   This card provides the data each of those needs: a `player tier` read helper that returns the active tier of a player's current package.

## Out of scope
UI (T-207, T-208). Online payments.

## Acceptance
- [ ] Migration is additive; existing packages map to «أساسي» unchanged; the PGlite test covers:
  - RLS: own, other captain, player, anon and published page;
  - the cross-captain id trigger;
  - one featured tier per captain;
  - offer expiry, pause and full refusal;
  - the atomic `used_count`;
  - the payment snapshot.
- [ ] Unit tests for every `pricing.ts` function, including rounding, ties, scope matching and new-vs-renewal.
- [ ] `npm run check` and `npm run build` pass; summary lines pasted.
