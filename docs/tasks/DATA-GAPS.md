# Data gaps — shared rules for T-253..T-270

These cards add the data that the v11 captain screens need but the database does not store yet.
Mockup board: `docs/mockups/captain-workspace/v13-data-gaps.html` (owner approved 2026-11-14).
Every card's number matches the numbered panel on that board.

## Rules for every card

1. **Additive only.** A migration may add tables, columns, indexes, functions, policies and new values in checks. It never drops or renames anything, and never changes existing rows. Old clients keep working.
2. **Migrations use the next free number** at implementation time. Never edit an existing migration.
3. **The owner applies migrations to production.** Codex writes the migration and its PGlite test. Claude reviews, then asks the owner before applying it to production. Production must be checked first.
4. **RLS on every new table**, plus a test in `supabase/tests/`. That test proves that:
   - a player sees only their own rows;
   - a captain sees only their own players;
   - an outsider sees nothing.
5. **Player writes** for sessions, sets and meal logs go through `saveAndQueue()`. Other new player writes go through a `security definer` RPC, or a narrow column grant plus RLS.
6. **Real data only.** If a value is missing, the UI shows the existing empty state or hides the part. It never shows a made-up number.
7. **Look:** match the board panel and the v11 tokens. Use glass, lime only for the main action, and no hex in components. RTL uses logical properties.
8. **Copy:** every string lives in the feature `messages.ts`. Arabic comes in Egyptian (`ar`) and standard (`arStd`, behind the `NEXT_PUBLIC_INTERNATIONAL` getter where the feature needs it), plus English.
9. **Size:** stay inside `src/lib/perf-budget.test.ts`. Server-only loaders go through `server.ts` entries, so client bundles do not grow.
10. **Gates:** `npm run check` and `npm run build` must pass.

## Order

| Group | Cards | Notes |
|---|---|---|
| Money | T-253 receipts, T-254 payment methods, T-255 money owed | T-255 reads T-253's pending receipts. |
| Training | T-256 program weeks, T-257 target weight, T-258 player RPE | — |
| Player | T-259 goal, T-260 join intake preview, T-261 weekly adherence and sleep | T-260 needs T-259's goal field. |
| Contact | T-262 new notification kinds, T-263 quick replies, T-264 welcome message | T-262 depends on T-253 for receipts. |
| Extras | T-265 lifetime workouts, T-266 income goal, T-267 KO video note, T-268 captain settings, T-269 form scale 1-5, T-270 best lifts | T-267 stays in draft until the owner picks the model, cost and daily cap. |

## Not a data card

Home tasks and the tasks page use different task rules:
- they use different kinds and order;
- absence is 3 days on one and 5 days on the other.

They must share one model. That needs a separate card, written when the owner asks.
