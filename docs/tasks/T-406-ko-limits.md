# T-406: KO limits: daily caps for chat, monthly credits for big captain actions

Owner approved the mockup on 2026-11-19: `docs/mockups/ko/limits/limits.png`. The HTML is `docs/mockups/ko/limits/index.html`.
Background and cost math: `docs/ko/KO-QUOTA-STUDY.md`.

## The model (owner decision)

1. **Normal KO chat is included, with no counter.** This covers players and captains: questions, logging a meal, renewals, reminders, small edits.
   - Daily cap per person:

     | | Free captain (`entry`) | Paid captain (`champion`, `legend`, `empire`) |
     |---|---|---|
     | Each player | 5 messages and 1 meal photo | 10 messages and 2 meal photos |
     | The captain | 20 messages | 40 messages |

   - A player's cap follows their captain's tier.
   - The day is the player's local day: `localDate()` with the player timezone.
2. **Big actions use monthly captain credits ("رصيد الحاجات الكبيرة").** Today these are `create_training` and `create_nutrition`. Any future action that writes a whole program or plan, a monthly report, or messages to many players must use the same credit check.

   | Tier | Credits per month |
   |---|---|
   | `entry` | 10 |
   | `champion` | 100 |
   | `legend` | 250 |
   | `empire` | 750 |

   - One big action costs 1 credit.
   - Credits reset on the 1st of each month, Africa/Cairo.
   - Credits are spent **only when the action is confirmed and succeeds**, not at preview.
3. **Hidden safety cap per captain per month.** All KO Gemini calls by the captain and their players together:

   | Tier | Gemini calls per month |
   |---|---|
   | `entry` | 1,500 |
   | `champion` | 6,000 |
   | `legend` | 10,000 |
   | `empire` | 25,000 |

   - When it is hit, KO answers with buttons only (same as the daily-cap reply), and one `console.warn` is logged for the owner.
   - This is not shown in the UI.
4. All numbers live in **one config file**, `src/features/ko-account/data/limits.ts`, so the owner can change them without touching logic. The SQL takes the limits as checked parameters from that file, as described below.
5. MCP (Claude and ChatGPT) does not use Gemini. It keeps `ko_rate_take` 12/60 and is **not** counted here.

## Database: new migration `0158_ko_usage.sql` (additive only)

- **Do not edit any earlier migration.** Do not change `ko_rate_take`.
- **Do not apply it to production.** The owner applies it after review.
- **Table `security_private.ko_usage_daily`:**
  - Columns: `user_id uuid`, `day date`, `messages int`, `photos int`.
  - Primary key: `(user_id, day)`.
  - No grants to anon or authenticated.
- **Table `security_private.ko_usage_monthly`:**
  - Columns: `captain_id uuid`, `month date` (first day of the month), `calls int`, `credits int`.
  - Primary key: `(captain_id, month)`.
  - No grants.
- **Function `public.ko_usage_take(p_day date, p_kind text, p_msg_cap int, p_photo_cap int, p_month_cap int) returns text`:** security definer, `search_path=''`.
  - Auth:
    - Caller = `auth.uid()`.
    - Raise `42501` when there is no caller or the caller is anonymous.
    - Call `public.require_active_caller()`.
  - Validate the inputs:
    - `p_kind` is in `('message','photo')`.
    - `p_day` is within one day of `now()`, which allows for timezones.
    - The caps are between 1 and 100000.
  - Resolve the owning captain: the caller if the caller is a captain, otherwise the caller's active coach. Reuse the existing coach-client relation that `current_tier` uses.
  - Do both increments atomically.
  - Return one of `'ok'`, `'daily'` or `'monthly'`. Never increment past a cap.
  - **Trust:** the caps come from the server route, and the server route is the only caller. Also clamp server-side: the caps can never exceed the `empire` values. That way a client calling the RPC directly with huge caps gains at most the top tier.
- **Function `public.ko_credit_take(p_month date, p_cap int) returns boolean`:**
  - Captain only.
  - Same validation pattern.
  - Atomically increments `credits` when below the cap.
- **Function `public.ko_usage_summary() returns table(credits_used int, credits_cap int, month date)`:**
  - The captain reads their own credit use.
  - The cap comes from `current_tier` × the same values. Put the tier-to-credits mapping in a small SQL `case`, kept in sync with `limits.ts` by a test.
- RLS:
  - Enable RLS on both tables, with no policies. Access goes only through the functions.
  - Revoke everything, and grant execute on the three functions to authenticated only.
- PGlite test `supabase/tests/ko-usage.test.ts` covers:
  - the daily cap stops at the cap;
  - a photo counts separately;
  - the monthly cap is shared by a captain and their players;
  - another captain's players don't count;
  - anonymous is refused;
  - out-of-range caps and days are refused or clamped;
  - credits stop at the cap and reset in a new month;
  - a player can't call `ko_credit_take`.

## Server (`ko-account`)

- `data/limits.ts` holds the numbers above, keyed by tier, plus `isBigAction(kind)`.
- In `route.ts`, after the existing `rateLimited` 12/60 check and before `planIntent`:
  - Call `ko_usage_take` with `kind = photo ? 'photo' : 'message'` and the caps for the captain's tier.
  - Get the tier from the existing `current_tier` RPC or an equivalent read; add a small reader in `data/`.
  - `'daily'` or `'monthly'` → reply `{ kind: 'message', text: t('limitReached'), quick: [...] }` with the three fixed buttons. **No Gemini call.**
- The quick buttons are «تمرين النهارده», «أكل النهارده» and «تقدّمي».
  - They send fixed texts that the route answers **without Gemini**: today's workout and today's meals through the existing readers, and progress through `readProgress`.
  - Add these to the existing suggestion shortcut (`suggest.meal` already works like this), and make them skip `ko_usage_take`.
  - Add `quick?: string[]` (max 3) to `accountReplySchema` if T-405 has not landed yet. If it has, reuse it.
- Confirm path, after `verifyApproval` and before `commitApproval`, when the action is a big action (`training`, `nutrition`):
  - Call `ko_credit_take`. When it returns false, reply `t('creditsOut')` with status 409, and spend nothing.
  - When `commitApproval` fails after the take, accept the lost credit. Note it in the reviewer notes. No refund logic.
- Preview of a big action:
  - Add the line «هياخد 1 من رصيد الحاجات الكبيرة.» to the action card `detail`.
  - When credits are already at the cap, replace the action with the out-of-credits message and the upgrade card.

## Client (`ko-preview`)

- **Captain credit meter** at the top of the KO chat log, for captains only, exactly as in mockup panel 2:
  - card: `space-y-inline rounded-control border border-line p-stack`;
  - title «رصيد الحاجات الكبيرة» in `text-sm font-bold`, with `{used} من {cap}` in `tabular-nums text-sm`;
  - bar: `h-2 overflow-hidden rounded-full bg-surface-raised` with an inner `h-full rounded-full bg-lime` whose width is the used percent;
  - line in `text-xs text-muted`: «الكلام العادي مش بيتحسب. بيتجدد أول {month}.»
  - Load it from a new GET-free path: a `contextOnly`-style form flag `usage=1` on the same route, which calls `ko_usage_summary`.
  - Loading: hide the card. Error: hide the card. It is not critical.
- **Out-of-credits card** (mockup panel 3), for captains:
  - text: «عايز رصيد أكبر؟»;
  - a row with the next tier and its monthly credits;
  - buttons «رقّي الباقة», which links to the existing upgrade or pricing page the captain already uses, and «بعدين».
- **Quick buttons** (mockup panel 1): secondary controls, `min-h-12`. Tapping one sends its text.
- Keep `ko-chat.tsx` under 250 lines. Put the meter in its own component, `ko-credit-meter.tsx`.

## Messages
- Put every string in `messages.ts`: `ar`, `arStd` and `en`, with Latin digits.
- Keys:
  - `limitReached`: «خلصت رسايلك معايا النهارده، وبترجع بكره الصبح. لحد كده الزراير دي شغالة:»
  - `creditsOut`: «رصيد الحاجات الكبيرة خلص الشهر ده ({used} من {cap})، وبيتجدد أول {month}. الكلام العادي والتعديلات الصغيرة شغالين عادي.»
  - `creditCost`, `creditMeterTitle`, `creditMeterNote`, `upgradeTitle`, `upgrade`, `later`.

## Out of scope
- Payments and buying credits. There are no top-ups for now.
- Showing usage to players.
- MCP limits.
- Changing `ko_rate_take`.
- Applying the migration.
- No new dependency. No `.env*` changes.

## Tests (deterministic)
- `limits.test.ts`:
  - every tier has every number;
  - the SQL `case` values match `limits.ts` (read the migration text);
  - `isBigAction`.
- Route:
  - `'daily'` returns the limit message and quick buttons, with no Gemini call (fetcher not called);
  - quick-button texts skip `ko_usage_take` and Gemini;
  - a big-action confirm calls `ko_credit_take`, and a false result means no `commitApproval`;
  - a small-action confirm doesn't take credit.
- UI:
  - the meter renders `used/cap` and the bar width;
  - the meter is hidden for players and on error;
  - the quick buttons send their text;
  - 48px targets.
- PGlite: the suite above.

## Rules
AGENTS.md:
- max 250 lines per file;
- one component per file;
- no `any`;
- `import type`;
- strings in messages;
- logical CSS only;
- `min-h-12`;
- dates via `localDate`;
- no `Math.random`;
- every new table has RLS and a test.

## Checks
- `npx tsc --noEmit -p .`
- `npx eslint src/features/ko-account src/features/ko-core src/features/ko-preview`
- `npx vitest run src/features/ko-account src/features/ko-core src/features/ko-preview supabase/tests/ko-usage.test.ts`

Report in the AGENTS.md final format, with a one-line description of every visible change, and list the migration as **not applied**.
