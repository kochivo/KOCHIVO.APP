# T-122 — KO entry and plan quota for the program generator

**Phase:** KO core · **Depends on:** T-120, T-121 · **Status:** draft (owner decisions below)

## Goal
A captain can also say or type "Ahmed, beginner, 4 days, fat loss, bad knee" to KO and land
on the same generated preview. Generations are counted per captain per month against their
plan, so ENTRY gets a taste and paid plans get more. The free Gemini tier is spent only on
turning one short message into a brief.

## Files
Create or modify only these:
- `supabase/migrations/0076_ko_usage.sql`: `ko_usage` table and `consume_ko_quota` RPC
- `supabase/tests/ko-usage.test.ts`
- `src/features/ko-account/intents.ts`: replace `create_training` with `generate_program` (brief fields only)
- `src/features/ko-account/execute.ts`: build the brief, return a link to the preview
- `src/features/ko-account/drafts.ts`: remove the training branch (nutrition stays)
- `src/features/ko-account/messages.ts`
- `src/features/program-generator/hooks/use-generator.ts`: accept a brief from the URL
- `src/features/program-generator/data/consume-quota.ts`
- Matching tests under both features
- This task card.

## Requirements
1. **`generate_program` tool:** arguments are exactly the T-120 brief fields plus `player`.
   Gemini never chooses exercises or numbers. Missing goal, level or days → `clarify`. The reply
   is a templated message plus a link that opens the T-121 preview prefilled; nothing is saved
   from chat.
2. **Quota:** `public.ko_usage(captain_id, month date, kind text, count int)` with RLS (owner
   read only, writes only through the RPC). `consume_ko_quota(kind)` is security definer: it locks
   the row, compares with the plan limit, increments it, and returns remaining or raises
   `ko_quota_exceeded`. It is called once when the captain taps Generate (UI or KO link), never
   for swaps or regenerate within the same brief session.
3. Limits live in SQL next to the existing captain plan limits, as one config row per plan and
   kind, so the owner can set them without code changes. Values are **not decided yet** (pending
   the feasibility study); ship with placeholder limits that the owner sets before launch. The
   UI shows "x left this month" and an upgrade message at 0.
4. Replace the in-memory KO rate limit with a per-user daily message counter in the same table
   (`kind = 'message'`), because a Vercel instance memory map is neither shared nor durable.

## Acceptance
- [ ] PGlite tests: a captain cannot read or change another captain's usage; limit enforced;
      concurrent calls cannot exceed the limit; suspended callers rejected
- [ ] KO tests with an injected fetcher: a complete message yields a brief link; an incomplete one yields clarify
- [ ] `npm run check` and `npm run build` pass

## Out of scope
- Voice parsing changes beyond the existing audio path
- Billing UI
- Nutrition quota

## Owner decisions
- Monthly limits per plan: after the feasibility study.
- Free Gemini tier only for pilot accounts with consent until the paid key (`KO_GEMINI_PAID`) is set.
