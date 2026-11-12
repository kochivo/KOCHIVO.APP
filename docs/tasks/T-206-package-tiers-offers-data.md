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

## Verification

Implementation scope: data only. No screen, route, dictionary, dependency, existing
migration, offline write path, or feature flag was changed. Migration 0099 has not
been applied to a hosted database.

### Feature inventory

| Item | Location after T-206 |
| --- | --- |
| Existing days/PT packages, prices, durations, archived state | Existing `captain_packages`; 0099 adds only `tier_id` and maps old rows to `أساسي` |
| Tier name, description, token color, order, feature text, featured badge, archive | `captain_package_tiers`; `data/catalog-validation.ts`, `data/catalog-actions.ts` |
| Offer name, percentage/amount/bonus, scope, dates, audience, capacity, pause | `captain_offers`; same validation/actions modules |
| Public published-coach catalog and owner catalog | RLS in 0099; `data/catalog-read.ts` |
| New-player activation, dated invite redemption, free trials | Existing RPCs and shared activation helper retained; guarded 0099 patches add payment snapshots |
| Renewal, PT top-ups, installments, dues, freeze, revenue, history | Existing modules retained; renewal snapshots added; collections remain attached to the original sale |
| Applying an offer atomically | 0099 offer RPC variants; `data/offer-sales.ts`; selected offer is validated and counted in the sale transaction |
| Original list price, tier, offer and bonus history | Nullable snapshot fields on `player_payments`; referenced tiers/offers cannot be deleted from history |
| Lowest price, bonus tie-break, eligibility, status, remaining places | Pure `pricing.ts`, with injected `now` |
| Monthly equivalent and savings | Pure `pricing.ts`; thirty-day month, whole-pound output |
| Player's current tier, including unpublished tiers | Authorized `player_package_tier` RPC and `fetchPlayerTier`; latest started package and active relationship required, including freeze-extended access |
| Public TypeScript API | Billing `index.ts` for pure functions/types and server actions; `server.ts` for server-only catalog reads |
| RPC typing | Local `data/catalog-rpc.ts`; generated `database.ts` changes are limited to new/changed table entries, as required |

### Mockup parity

| Screen/elements | T-206 result |
| --- | --- |
| Captain packages: heading/navigation, public-page link, new tier/action menus | UI deferred to T-207, explicitly out of scope |
| Running/scheduled offers, counts, pause/edit controls, offer creation/presets | Data and mutations provided; controls/preset copy deferred to T-207 |
| Tier cards: name, color, description, features, durations, savings, featured marker, archive | Data provided; presentation deferred to T-207 |
| Tier player counts, duration creation controls, player badges and follow-up priority | Current-tier data provided; UI integration deferred to later cards |
| New offer: name, kind, value, scope, dates, new/renewal toggles, limit | Schema validation and mutations provided; form deferred to T-207 |
| Offer preview: final/list prices, bonus, expiry, remaining places | Snapshot fields and pure helpers provided; rendering deferred to T-207/T-208 |
| Public pricing: banner/countdown, duration selector, cards, features, featured badge, join/renew actions | Data API provided; all rendering deferred to T-208 |
| Build explanation: additive tiers, unchanged old packages, offers and sale history | Implemented in 0099 and tested with PGlite |
| Build explanation: automatic offer closure | Running-offer RLS, pure status calculation and guarded sale RPCs enforce expiry/capacity without a timer job |
| Build explanation: other perks are display text | Stored as feature text; no new entitlement enforcement |

### Checks

- `npm run check`: TypeScript and ESLint passed; release audit blocked by sandbox
  `Error: spawnSync git EPERM`. The test stage was therefore run separately.
- `npm run build`: blocked by the existing `node_modules` junction outside the
  workspace: `Could not find the Next.js package (next/package.json)`.
- `npx tsc --noEmit -p .`: passed (exit 0).
- `npx eslint .`: passed (exit 0).
- Full fallback: `npx vitest run --maxWorkers=2 --configLoader native --pool=threads --testTimeout=60000 --hookTimeout=120000`:
  `Test Files 644 passed | 1 skipped (645)`;
  `Tests 4081 passed | 1 skipped (4082)`; exit 0.
- The longer CLI execution/setup limits address two earlier PGlite timeouts
  that passed in isolation; no assertions or test configuration files changed.
- Focused security run: `Test Files 2 passed (2)`, `Tests 20 passed (20)`.
- `git diff --check`: passed.

### Review findings resolved

- Qualified trigger target IDs to prevent accidental self-comparison from accepting
  a different captain's tier/package.
- Extended the payment duration CHECK by the recorded bonus only; base package
  and custom duration validation remains 1–365 days.
- Matched whole-pound percentage rounding to PostgreSQL numeric arithmetic,
  including 50 EGP minus 55% = 23 EGP.
- Kept current-tier eligibility tied to active relationship access, because
  unfreezing extends that access without rewriting historical payment periods.
- Preserved nullable bonus metadata for custom renewals with no package; the
  existing timezone-equivalence regression passes unchanged.
- Exported server actions through `index.ts`, keeping `server.ts` exclusively
  for explicitly server-only modules; the architecture regression passes.

### Reviewer-approved security-test exceptions

The full test run found two assertions outside this card's Files list that
conflict with the required public catalog:

- `supabase/tests/rls-cross-tenant.test.ts`: “keeps anon off all tables, private
  helpers inaccessible and the inbox subject to underlying RLS” previously required zero
  anonymous table grants. T-206 explicitly requires SELECT grants governed by
  published-coach RLS on tiers, packages and running offers.
- `supabase/tests/security-pass-2.test.ts`: “keeps anonymous API execution limited
  to invite_preview and the public coach page” previously fixed the anonymous function list
  to two names. The published-catalog predicate must be executable by anonymous
  readers for the new policies to evaluate safely.

The reviewer approved edits to these two files for narrow catalog read
exceptions. `rls-cross-tenant.test.ts` now allows SELECT on the three named public
tables only, while preserving the global anonymous write denial and every other
assertion. New behavioral coverage proves archived tiers, paused/ended/full/
scheduled offers, and unpublished or otherwise ineligible coaches stay hidden;
anonymous INSERT/UPDATE/DELETE remain denied. Active packages of published
coaches are included; archived packages and unpublished/ineligible coaches'
packages are proven hidden by the same behavioral test.
`security-pass-2.test.ts` adds only
the read-only `package_catalog_published` predicate to the exact RPC allowlist.

The final reviewer approval includes active `captain_packages` of published
coaches in that SELECT-only exception. The focused security run reports
`Test Files 2 passed (2)`, `Tests 20 passed (20)`. No production policy changed
in the security-test follow-ups. The final full fallback suite is green, with
no remaining catalog scope conflicts. Standard release/build gates still need
an environment that can spawn git and resolve the external dependency junction.
