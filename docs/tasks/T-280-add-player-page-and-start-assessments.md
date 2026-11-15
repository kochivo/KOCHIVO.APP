# T-280 — Add player as a full page, with assessments required before the player starts

**Phase:** feature (owner approved mockup 2026-11-14) · **Depends on:** T-279 committed · **Status:** ready
Read `docs/tasks/V11-FIDELITY.md` first. The approved design is `docs/mockups/captain-workspace/v14-subpages.html`, sections «1. ضيف لاعب» and «1-ب». Match it.

## Goal
Today «ضيف لاعب» is a sheet (`src/features/roster/components/invite-sheet.tsx`, `invite-form.tsx`, `invite-result.tsx`). The owner wants two changes:
- a full sub-page with three clear steps;
- a new third step: the captain picks assessments the player must answer before they can use the app.

## Data (new migration `0108_invite_start_forms.sql`, additive only)
Existing schema:
- `coach_invites` (0003, plan columns in 0069);
- `create_player_invite(...)` and `redeem_invite(p_code)` (latest in 0069);
- `forms`, `form_requests` and `form_answers` (0091).

Changes:
1. **New table `public.coach_invite_forms`:**
   - columns `invite_id uuid references coach_invites(id) on delete cascade`, `form_id uuid references forms(id)`, `position smallint`, with primary key `(invite_id, form_id)`;
   - at most 5 forms per invite;
   - RLS: the captain who owns the invite can select. Inserts go only through the RPC.
2. **`coach_invites.start_gate boolean not null default false`.** When true, the forms block the app until they are answered.
3. **`form_requests.blocks_access boolean not null default false`.**
4. **Add `public.create_player_invite_v2(...)`.** It has the same arguments as `create_player_invite`, plus `p_form_ids uuid[]` and `p_gate boolean`.
   - Validate that every form belongs to the caller, is not archived, and has at least one question.
   - Keep the old function unchanged so older clients keep working.
5. **Replace `redeem_invite`.** Keep its current body from 0069 exactly. After the player is linked, insert one `form_requests` row per invite form:
   - `due_at` null;
   - `blocks_access = start_gate`;
   - use `sent_at = now()`, and use ids the same way the existing request code does.
6. **Test `supabase/tests/invite-start-forms.test.ts`.** Cover:
   - RLS (another captain cannot read the rows);
   - the v2 RPC rejects another captain's form, an archived form, and more than 5 forms;
   - redeem creates the requests with the right `blocks_access`;
   - an invite without forms behaves exactly as before.

## Captain UI
1. **Route.** Add `/captain/players/new` (thin route → roster feature). The «ضيف لاعب» buttons now link there, and the sheet is removed. Keep `invite-form` logic: validation, packages, custom duration, paid, discount, free trial and start date. Reuse T-279's duration presets and labels.
2. **Layout as in the mockup:**
   - Header: back button, the crumb «اللاعبين», title and subtitle. On desktop, «إلغاء» and «اعمل لينك الدعوة» sit at the end of the header.
   - Steps:
     1. «بيانات اللاعب»;
     2. «الباقة والدفع» (package cards, plus a dashed card for «مدة وسعر مخصوص»);
     3. «قبل ما يبدأ», tagged «اختياري».
   - Desktop: a sticky summary on the other side, showing initials, the package, the from and to dates, the amount paid, «فاضل عليه», and the «أول ما يفتح اللينك» flow chips.
   - Mobile:
     - the title takes its own line;
     - the steps already done collapse to one row with an «عدّل» button;
     - a sticky footer holds «فاضل» and the primary button above the safe area. Nothing is hidden under the nav.
3. **Step 3:**
   - The step lists the captain's active assessments, using `assessment-library` data: title, question count, and an «معاينة» link that opens the existing preview.
   - Add a «تقييم جديد» row that opens the assessment editor in a new tab or route, and returns.
   - Add the switch «لازم يملاها قبل ما يدخل» with its helper text. It is on by default once one form is picked, and disabled while none are picked.
   - Empty state: no assessments yet → one line plus «اعمل أول تقييم».
4. **Result screen («لينك {name} جاهز»):**
   - avatar initials, then name, package and «N تقييم قبل ما يبدأ»;
   - the link field with a copy button;
   - «ابعته على واتساب» as the primary button, then «انسخ اللينك», then «ضيف لاعب تاني».

## Player UI
1. **The gate.** When the player has any pending `form_requests` with `blocks_access`, the player shell shows the gate screen instead of home, program and food:
   - «أهلًا {name}» and «كابتن {captain} محتاج يعرف عنك شوية حاجات قبل ما يجهزلك البرنامج»;
   - a progress bar («خلصت 1 من 2»);
   - one task row per form, marked done or «ابدأ»;
   - a locked line «البرنامج والأكل هيفتحوا أول ما تبعت»;
   - a sticky «كمّل: {next form}» button.
   Chat and settings stay reachable. Reuse the existing player assessment answer screen.
2. **When the last blocking form is answered,** the app opens normally. The captain already gets the answered-assessment notification and queue item. Do not add a new type.

## Rules
- Write every string in the messages files (ar; arStd gated with the env getter; en).
- No hex in components. Use logical properties only. Touch targets must be at least 48px.
- Make no change to how invites without forms work.

## Acceptance
- [ ] The captain can create an invite with 0–5 start assessments, with or without the gate.
- [ ] A player who redeems a gated invite sees only the gate until every blocking form is answered. Then the app opens.
- [ ] Unit tests cover the step 3 state (the switch is disabled with no forms) and the gate decision (pending blocking forms lead to the gate).
- [ ] The PGlite test above passes.
- [ ] The layout matches the mockup at 390px and at desktop.
- [ ] `npm run check` and `npm run build` pass. The perf budget holds.

## Out of scope
- Applying 0108 to production. The owner approves that separately.
- Editing assessments, which is T-277.
- Packages page changes.
