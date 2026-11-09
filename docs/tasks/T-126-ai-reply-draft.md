# T-126 — AI reply draft in the captain's style

**Phase:** KO core · **Depends on:** T-122 (`ko_usage`), T-125 · **Status:** draft (owner decision below)

## Goal
On a check-in, the captain taps **Draft with KO** and gets a short reply in their own tone,
built from the check-in, its flags and the last few weeks. The captain edits it and sends it.
It is never sent automatically. Each draft is one short Gemini call that counts against the
monthly plan quota.

## Files
Create or modify only these:
- `supabase/migrations/0078_ko_captain_style.sql`: `ko_captain_style` table (RLS and test)
- `supabase/tests/ko-captain-style.test.ts`
- `src/features/ko-account/draft-reply.ts`: build the facts, call the model, validate the result
- `src/features/ko-account/draft-reply.test.ts`: injected fetcher
- `src/app/[locale]/api/ko/draft-reply/route.ts`: thin route
- `src/features/inbox/components/draft-button.tsx`: button, loading, error, quota-left text
- `src/features/inbox/components/reply-box.tsx`: insert the draft into the editable field
- `src/features/settings/components/ko-style-card.tsx`: style settings (tone chips plus up to 3 sample replies)
- Matching `messages.ts` entries, and `src/types/database.ts`
- This task card.

## Requirements
1. **`ko_captain_style(captain_id pk, tone, dialect, samples text[] ≤ 3 × 300 chars)`**
   - `tone` ∈ warm | direct | strict
   - `dialect` ∈ egyptian | msa | english
   - Owner-only RLS plus the restrictive `active_caller` policy.
2. **Route:** same guards as the KO chat route (origin, auth, pilot allowlist, approved captain).
   Load the check-in with the caller's client (RLS), check that it belongs to one of their
   players, call `consume_ko_quota('reply_draft')`, then call the model.
3. **Model input is facts only:**
   - first name
   - this week's weight and waist with deltas
   - the T-125 flags
   - the 7-day sleep and soreness averages
   - the player's note (truncated to 400 chars and marked as untrusted text)
   - style and samples

   No ids, no other players.
4. **Structured output** `{ draft: string ≤ 600 }`, validated with zod; a failure returns an error
   state. The system text says:
   - reply as the captain
   - no medical advice
   - no numbers that aren't in the facts
   - no promises
   - 2–5 sentences in the chosen dialect
5. **Return:** the draft only. It is placed into the reply field and nothing is saved until the
   captain sends. The UI shows how many drafts are left this month and an upgrade message at 0.

## Acceptance
- [ ] Tests: foreign check-in → 404; quota exceeded → no model call; invalid model output → error, no draft
- [ ] The model payload contains no ids and no other players (assert on the injected fetcher body)
- [ ] PGlite: a captain cannot read or write another captain's style
- [ ] `npm run check` and `npm run build` pass

## Out of scope
- Automatic sending
- Drafts for form checks (follow-up)

## Owner decisions
- Monthly draft quota per plan: after the feasibility study (uses the T-122 config rows).
- Free Gemini tier only for pilot captains with consent until `KO_GEMINI_PAID` is set.
