# KOCHIVO — full audit, 2026-11-16 (afternoon)

**Scope:** the code at commit `05461e06` (production) and migrations 0001–0129. The audit was read only: no file, database row or setting was changed.

| Part | Who | How |
|---|---|---|
| Security and privacy | Codex A | All 129 migrations replayed in PGlite, probes with two captains and a transferred player, 229 tests |
| Data writes | Codex B | 52 write payloads checked against the final schema, PGlite probes |
| Player and captain logic | Codex C | PGlite probes and code tracing |
| UI, design, i18n | Codex D | Scan of all of `src/` against DESIGN.md and AGENTS.md section 4 |
| Speed and reliability | Codex E | Code tracing and PGlite |
| Live site | Claude | Public pages and the sample demo on a 390px phone (ar dark, en light), headers, redirects, Supabase advisors |

Claude re-read the code for every finding below before listing it. The earlier audits (KOCHIVO_FULL_AUDIT.md, plus T-319, T-320 and T-323) were not repeated; a problem from them that is still in the code is marked "still present".

**Not covered:** screens behind sign-in were not used live, because Claude does not sign in with passwords. Those screens were covered through the code only.

## High

### 1. Pain: later exercises that load the painful area are not stopped (BL-01)

- **Where:** `src/features/workout/hooks/use-focus-session.ts:96`.
- **What happens:** pain reports are filtered to the current program exercise only (`program_exercise_id === current.exercise.id`). Example: a player reports knee pain during bench press and keeps going, as T-317 allows. When they reach squats in the same session, nothing blocks them. `use-pain-skips.ts` only holds the skips the player tapped, so nothing else catches this.
- **Why it matters:** it breaks T-317 rule 5 ("later affected exercises keep today's behavior"), and it is a safety issue.
- **Fix:** check every report in the session against the current exercise with `painAffects`. Keep severe reports (severity 5 or sharp) blocking only the exercise they were reported on.

### 2. One pain report can block every account deletion (SEC-01)

- **Where:** `pain_reports.exercise_id` references `exercises(id)` with no `on delete` rule (0123:7), and the `pain_insert` policy never checks `exercise_id`.
- **What happens:** when the purge deletes a captain's exercises while a pain report still points at one of them, the purge fails with 23503. The whole batch rolls back, so other overdue accounts are not deleted either. Verified in PGlite.
  - It can also be done on purpose. A player who moved to another captain can send an old exercise id from the previous captain.
- **Fix:** a new migration that sets the foreign key to `on delete set null`, and makes the insert policy require that the exercise is visible to the player.

### 3. Check-in: answers can be lost when one of two writes fails (DATA-01)

- **Where:** `src/features/forms/data/submit-answers.ts:32-38`. The earlier fix from today (05461e06) sends the answers in two writes.
- **What happens:** if the first write (the empty answers, such as photo-only questions) covers every required question, the trigger marks the request answered. If the second write then fails, a retry takes the "already answered" branch and returns false without saving the missing answers. A captain review between the two writes also blocks the second one. Verified in PGlite.
- **Fix:** a single atomic RPC for submitting answers (new migration). Until then, a smaller step: on retry, when `reviewed_at` is null, insert the missing rows.

## Medium

### 4. A new captain can read the old captain's pain hints (SEC-02)

- **Where:** policy `pain_hint_read` (0123:52).
- **What happens:** the policy only checks `is_captain_of(player)`. After a transfer, captain B reads captain A's `reduce_20` hint, the exercise and its dates. Verified in PGlite.
- **Fix:** replace the policy so a captain reads only hints on their own program exercises.

### 5. Templates drop the Ramadan meal slots (DATA-03 / BL-03)

- **Where:** `nutrition_plan_to_template`, `assign_nutrition_template` and `copy_template` (last defined in 0118).
- **What happens:** none of the three copies `ramadan_slot`. A plan with suhoor/iftar marked by hand comes back with null slots, and the player screen then orders the meals by position, so suhoor and iftar can swap. Verified in PGlite.
- **Fix:** a migration that copies `ramadan_slot` in all three functions.

### 6. Rotating programs get no workout reminders (PERF-05 / BL-05)

- **Where:** `queue_workout_reminders` (0064, patched in 0097) and `queue_ramadan_reminders` (0122:182).
- **What happens:** both require `d.weekday = today`. In a rotating program every weekday is null, so the player gets zero reminders, in normal mode and in Ramadan. Verified in PGlite: 1 reminder for a weekly program, 0 for a rotating one.
- **Fix:** add a rotating branch that follows the same day selection as player home.

### 7. Crown adherence is inflated for rotating programs (BL-02)

- **Where:** `points_board`.
- **What happens:** with null weekdays the planned count falls back to the number of workouts done. 8 of 12 sessions shows 100% instead of about 67%, which changes the crown ranking. Verified in PGlite.

### 8. Subscriptions waiting for plans create the wrong tasks (BL-04)

- **Where:** `src/features/captain-workspace/queue/tasks-model.ts:31-40`.
- **What happens:** a player whose clock is paused while waiting for plans still gets renewal and absence tasks. Once the nominal end date passes, the "missing program" and "missing meal plan" tasks disappear, and those are exactly the tasks needed to start the subscription.

### 9. A cardio-only day still cannot be finished (BL-06, still present)

- **Where:** `src/features/workout/queue.ts`, `focus-screen.tsx` and `player-home/next-task.ts`.
- **What happens:** a day with cardio only has an empty set queue, so it never completes, and home doesn't show it as a task. This is the earlier audit's BL-03.

### 10. Editing a question changes the meaning of past answers (DATA-02)

- **Where:** `src/features/forms/data/save-form.ts:38-56`.
- **What happens:** a question that is kept but changed from weight to waist moves the old answer of 80 from weight to waist in the player file. Verified in PGlite.
- **Fix:** lock the meaning (type, mapping, options) of any question that already has answers, or version it.

### 11. Saving a form is still not atomic (DATA-04, still present)

The save runs as four separate writes, so a failure in the middle leaves the form half saved. This is the earlier audit's DB-04.

### 12. The service worker caches failed responses (PERF-04)

- **Where:** `public/sw.js:87-95`.
- **What happens:** a 503 or 404 for a JS chunk is cached with no `res.ok` check. A short outage becomes a screen that stays broken on that phone until the cache changes.
- **Fix:** cache only `res.ok` responses, and bump the cache version.

### 13. Inbox and forms library make many queries (PERF-01 / PERF-02, still present)

- The inbox makes 101 requests for 100 players, every 60 seconds.
- The forms library makes 84 requests for 20 forms.

### 14. The KO rate limit is per process (SEC-03, still present)

Each server instance keeps its own counter, so the limit on paid model calls is not shared.

### 15. Assessment screens ignore standard Arabic (UI-01)

- **Where:** `answer-flow.tsx`, `player-form-page.tsx`, `request-manager.tsx`, `request-picker.tsx` and `request-review.tsx`.
- **What happens:** these read `messages[locale]` instead of `useT`, so a standard-Arabic user sees Egyptian Arabic on these screens.

### 16. No privacy or terms pages (live)

- **What happens:** the site footer shows «الخصوصية» and «الشروط» as plain text with no link (`site-footer.tsx:13`), and no such route exists.
- **Why it matters:** the app stores photos and health data, and Google sign-in needs a privacy policy URL.
- **What it needs:** the owner's legal text.

### 17. The money-owed row breaks on phones (live)

- **Where:** `src/features/captain-workspace/money-owed/money-owed-view.tsx:39-48`.
- **What happens:** at 390px, with the record-payment action beside it, the player name and description shrink to one letter per line. Seen in the demo at tour step 10; the same component is used in billing.

## Low

18. **Timezone leak (SEC-04, still present):** `safe_timezone(uuid)` returns any user's timezone to any signed-in caller.
19. **404 page:** the 404 page is Next's default black English page. There is no `not-found.tsx`.
20. **Player profile error (UI-02):** the error shows no retry button.
21. **Off-style buttons (UI-03):** 3 assessment buttons don't use the shared button style.
22. **Supabase leaked-password protection:** it is off. It is a dashboard setting for the owner.
23. **SEO files:** there is no `sitemap.xml` or `robots.txt` for the public site.

## Checked and fine

- **RLS coverage:**
  - every public table has RLS and the `active_caller` policy;
  - every definer function sets search_path;
  - foods, recipes, favorites and prices are isolated after a transfer;
  - women-mode photo privacy and the points history boundary are correct (0129 tests pass).
- **Account purge:** a normal account purge leaves zero rows in the 8 new tables.
- **Offline sync:**
  - session, set, drop-set and meal-log payloads pass the real RPCs;
  - replaying them creates no duplicates;
  - parent rows are written before child rows.
- **Write payloads:** all 52 static write payloads match the real columns, and every onConflict target has a unique key.
- **UI rules:** zero hard-coded colors in components, zero RTL violations, zero touch targets under 48px, and the Gym visual credit appears only in the footer.
- **Live site:**
  - all security headers are present (CSP, HSTS preload, X-Frame DENY, nosniff);
  - /captain and /player redirect to login, and the next= open redirect is rejected;
  - the dev pages are blocked;
  - no console errors and no horizontal scroll across the demo tour (13 steps) and the public pages.
- **Gates:** lint and typecheck pass.
