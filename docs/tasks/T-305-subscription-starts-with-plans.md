# T-305: a player's subscription starts only when the captain has set their plans

## Problem
When a captain activates a player (invite with a package, join request plus a package, or the activate flow), `security_private.activate_player_plan` (and `activate_player_plan_offer`) immediately set `billing_started_at = now()` and `access_until = p_end`. The clock starts on day one even if the player has no training program and no nutrition plan yet. The player pays for days on which there is nothing to do.

Owner decision (2026-11-15, option a): the subscription starts when **both** plans are set: an active training program **and** an active nutrition plan. The captain can also start it early with a «ابدأ الاشتراك دلوقتي» button.

## Model
Reuse the freeze pattern from `public.set_player_frozen`: it adds the frozen days to `access_until` when the player is unfrozen. Do the same for waiting days.

- **New migration `supabase/migrations/0119_subscription_waits_for_plans.sql`**, additive only:
  - Add `coach_clients.awaiting_plans_at timestamptz null`. Null means the clock runs, which is today's behaviour; existing rows stay null.
  - Activation:
    - After activation, if the player lacks an active non-template program or an active non-template nutrition plan from this captain, set `awaiting_plans_at = now()`.
    - Start from the **latest** definitions of `security_private.activate_player_plan` and `security_private.activate_player_plan_offer` in the migrations folder; the latest is in `0105_payment_methods.sql` or later, so grep for it. Keep their security, `search_path` and grants.
    - Prefer a small patch-by-anchor `do $migration$` block (as `0115` and `0118` do) that raises on source drift over pasting the whole body.
  - A private helper, `security_private.start_player_subscription(p_link uuid)`:
    - If `awaiting_plans_at` is set:
      - add the whole waited days to `access_until`, exactly like unfreeze (`floor(epoch/86400)`);
      - set `billing_started_at = now()` and clear `awaiting_plans_at`;
      - shift `period_start` and `period_end` of that link's latest `player_payments` row by the same days, so receipts and money owed match.
    - Otherwise it does nothing; it is idempotent.
  - Triggers on `programs` and `nutrition_plans`:
    - They fire when a non-template row for a player becomes `status = 'active'` (on insert or update).
    - If that player's live link from the same captain is awaiting and both plans are now active, call the helper.
    - Make the trigger `security definer` in `security_private`, with execute revoked from `public`, `anon` and `authenticated`.
  - Public RPC `public.start_player_subscription(p_link uuid)` for the captain button:
    - `require_active_caller()`;
    - own non-archived, non-pending link only, else `42501`;
    - calls the helper;
    - grant execute to `authenticated` only.
  - While awaiting:
    - `security_private.deduct_pt_session()` must not charge a PT credit. Add `and awaiting_plans_at is null` to its link lookup; start from the 0116 text.
    - `public.queue_expiry_reminders` must skip awaiting links. Start from its latest definition in the migrations.
  - Freeze and awaiting interplay: `set_player_frozen` stays as is. If a captain freezes an awaiting player, the waited days are counted once by whichever ends last. Keep it simple and test that no day is counted twice: when unfreezing an awaiting link, do not add frozen days. They are added when the subscription starts.
- **Types**: add the column to `src/types/database.ts` (and `app-database.ts` if that is where `coach_clients` is typed).

## UI
- **Captain player file** (the header or subscription block where days left and freeze are shown today):
  - When `awaiting_plans_at` is set, show «الاشتراك هيبدأ لما تحط نظام التمرين ونظام الأكل» and which plan is missing.
  - Add a secondary button «ابدأ الاشتراك دلوقتي». It calls the RPC, refreshes, and shows the standard success popup. Keep the one-primary-action rule on that screen.
- **Captain roster and player rows**: where days left show, show «مستني الأنظمة» instead of a countdown while awaiting.
- **Player home** (`src/features/player-home`):
  - While awaiting, show a short calm line in the hero area: «الكابتن بيجهزلك الأنظمة، اشتراكك هيبدأ أول ما تجهز».
  - The days-left count does not tick.
  - Find where the player reads their link (`useCaptainContext` or the snapshot) and carry `awaiting_plans_at` the way other link fields are carried.
- Messages in ar, arStd and en (English: "Subscription starts when the training and nutrition plans are set", "Start subscription now", "Waiting for plans", "Your coach is preparing your plans. Your subscription starts when they are ready."). No emoji.

## Tests
- PGlite, new `supabase/tests/subscription-waits-for-plans.test.ts`:
  - activating with no plans sets `awaiting_plans_at`; with both plans active it stays null;
  - activating the second plan starts it: `access_until` moves by the waited days, `billing_started_at` is set, and the payment period shifts;
  - one plan only does not start it;
  - a template or another captain's plan does not start it;
  - the RPC: own link works, another captain's link gives `42501`, a pending link is rejected, and calling it twice changes nothing the second time;
  - no PT credit is deducted while awaiting;
  - expiry reminders skip awaiting links;
  - freeze while awaiting does not double-count days;
  - existing rows (null) behave as before.
- UI: render tests for the captain banner and button, the roster label, and the player line.

## Out of scope
- Old migrations; 0119 redefines on top of them.
- Never apply anything to a hosted database.
- Other billing changes.

## Gates
1. The new test.
2. `npx vitest run supabase/tests src/features/billing src/features/roster src/features/player-home src/features/captain-workspace`
3. `npm run typecheck`
4. `npm run lint`
