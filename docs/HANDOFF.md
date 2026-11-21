# KOCHIVO handoff

Written 2026-11-21 for Codex or any other agent continuing while the owner's Claude subscription is paused.

## Start here

1. Read, in this order:
   - `AGENTS.md` (mandatory rules; it wins over this file)
   - this file
   - `docs/ARCHITECTURE.md`
   - `DESIGN.md` (for anything visible)
   - `docs/RELEASE-CHECKLIST.md` (before any publish)
   - the task card in `docs/tasks/`
2. Read the owner's saved decisions: `C:\Users\ALY\.claude\projects\C--Users-ALY-Desktop-KOCHIVO-REBRAND\memory\MEMORY.md`. Each line links to a file in that folder. Open the ones that touch your task.
3. **Reply to the owner in simple Egyptian Arabic.** They are not a developer. Say what changed for the user, what you verified, and what you did not.

## Where things stand

| Item | State |
|---|---|
| Local `master`, `origin/master`, `origin/staging` | all at `13c36cc7` |
| Production | `13c36cc7` is live on kochivo.site (Vercel, fra1) |
| Latest DB migration | `0162_ko_memory`, applied to production |
| Last full gates (at `13c36cc7`) | release audit 0 findings, 7106 tests passed, 1 skipped, build passed, perf budget passed |
| Vercel runtime errors (2026-11-21) | none in the default range |
| Supabase security advisor (2026-11-21) | 0 errors, 78 warnings, 1 info, none on the T-420 objects. 74 warnings are `auth_allow_anonymous_sign_ins` |

### Shipped most recently

- **T-413 to T-418:** nutrition numbers, data safety, ranks and billing numbers, progress chart, plural forms, KO gaps and freeze rules. Migrations 0159, 0160, 0161.
- **T-419:** KO knows the user's name and role, handles small talk, gives a useful fallback, uses Latin digits. The phone sheet clears the status bar. The Gemini line under the composer is gone (owner decision); the disclosure stays in the privacy policy.
- **T-420:** KO learning:
  - per-user memory (`public.ko_memories`, 30 rows maximum)
  - corrections through the `remember` tool, inside the existing Gemini call
  - anonymous ratings (`security_private.ko_feedback`, kept 90 days)
  - the "KO فاكر إيه عنك" view with a learning switch
  - API at `src/app/[locale]/api/ko/learning/`
  - weekly review steps in `docs/runbooks/ko-feedback-review.md`

Gemini is not trained or fine-tuned. "KO learns" means better facts, saved per-user memory, prompt rules, and eval cases.

## Next work, in order

1. **Verify T-419 and T-420 for real. Neither has run on a real phone or with live Gemini.** The owner has to do the signed-in phone checks:
   - Sheet on an installed iPhone app: top clears the clock, bottom nav is covered, keyboard and drag-to-close work.
   - «انا اسمي ايه», «عارفني؟», «تعرف تعمل ايه».
   - «حمو يعني أحمد سامي», then «حمو اتمرن النهارده؟». Check the saved note, «تراجع», and the memory view.
   - A correction: «لأ، الجدول عندي يعني برنامج التمرين».
   - Ratings, delete one memory, delete all, learning switch off.
2. **Other checks still waiting on the owner's device:**
   - KO meal confirm («نفّذ»)
   - KO program creation end to end
   - rest-day nutrition numbers
3. **Live KO eval** (`src/features/ko-account/eval/ko-eval.live.test.ts`). It spends the free Gemini quota, so ask the owner first. The T-419 and T-420 cases have not been run live.
4. **Fix whatever those checks find.** One card per fix.

### Parked: do not start without the owner's word

- Medals (approved mockup, needs a card and an additive migration)
- KO meal photo (T-405); `KO_MEAL_ESTIMATE` stays off until the accuracy test
- PDF program import
- Fasting mode
- AI quota numbers (no numbers until the owner's feasibility study)

## Hard rules

- **Never publish, push, or apply a migration without the owner saying so for that change.** Production and staging share one database.
- **Never push to `master`.** Publishing is `git push origin master:staging`.
- **AGENTS.md says agents do not commit.** Leave work uncommitted unless the owner explicitly tells you to commit.
- Never commit `.claude/launch.json` or the untracked `.t4*` log files. Stage exact paths, never `git add -A` in the main repo.
- Never touch `.env*` (except `.env.example`), `assets-source/`, `brand/`. Never ask for, print, or store secrets.
- Migrations are additive only. No drops, renames, type changes, or data rewrites. Never edit an applied migration.
- No new dependencies.
- **The look must not change unless the owner approved it.** For a visible change, show a mockup built from the real screens and get an OK first (`docs/mockups/ko/learning/index.html` is the pattern). Desktop captain layout stays as it is.
- **Never edit text through PowerShell `Get-Content`/`Set-Content`.** It corrupts Arabic.
- Keep the owner's email and users' data out of external services, logs, and docs.
- Do not claim something works unless you verified it. Say what you could not check.

## How to work

### Gates

Run these in the main repo before calling work done:

```powershell
npm run check
```

```powershell
npm run build
```

```powershell
npx vitest run src/lib/perf-budget.test.ts
```

CI runs the perf test after the build, and `npm run check` does not include it. Budgets are in `src/lib/perf-budget.test.ts`.

Worktree caveats: builds can fail through a linked `node_modules`, and `git` can hit `EPERM` inside a sandbox. If vitest hits `spawn EPERM`, add `--pool threads --configLoader native`.

### Code traps

- A feature's `server.ts` must `import 'server-only'` and may only re-export modules that also import it (`src/lib/shared-surface-imports.test.ts`).
- Files in `src/` have a 250-line ESLint limit. `ko-account/data/route.ts` and `ko-preview/components/ko-chat.tsx` are near it, so put new logic in new files.
- Every string goes in `messages.ts` for `ar`, `arStd`, and `en`.
- Plurals use `key.<Intl.PluralRules category>`.

### KO answer flow

1. `ko-account/data/facts.ts` builds the facts, including `[me]` and `[memory]`.
2. `data/intents.ts` (`planIntent`) calls Gemini with tools.
3. `data/answer-guard.ts` (`reviewAnswer`) checks the answer against the facts.
4. `data/execute.ts` runs the intent.
5. `data/reply.ts` (`chatReply`) normalizes digits and sends the reply.

Keep Gemini calls low: the project is on the free tier. Prefer rules and SQL.

### Using Codex accounts from an orchestrator

- Homes: `~/.codex` (A), `~/.codex-b`, `~/.codex-c`, `~/.codex-d`, `~/.codex-e`.
- Last known limits: A, B and D until Nov 21, C until Nov 22, E was the one in use. Check before relying on this.
- Each task gets its own worktree: `git worktree add ../KOCHIVO-WT/<task> HEAD --detach`, then a `node_modules` junction to the main repo.
- Land with:

  ```bash
  git add -A
  git diff --cached --no-renames --binary HEAD -- . ':!node_modules' > ../<task>.patch
  git reset
  ```

  Then run `git apply --3way` in the main repo, followed by `git reset`. Check `git status --short | grep "^ D"` for leftover deletions.
- `C:\Users\ALY\Desktop\KOCHIVO-WT` holds about 170 old worktrees. Do not clean them up without asking.

### Publishing (only on the owner's word)

1. Follow `docs/RELEASE-CHECKLIST.md`.
2. If there is a migration, check production first and apply it **before** the code. Strip `begin`/`commit` when using the Supabase `apply_migration` tool. Without that tool, give the owner the SQL for the Supabase SQL editor.
3. Run `git push origin master:staging`. This needs network access.
4. CI takes about 25 minutes, then moves `master` itself. `gh` is not installed, so poll:

   ```bash
   git fetch origin master && git rev-parse --short origin/master
   ```

   If `master` does not move after about 30 minutes, run the perf test first.
5. Vercel then builds production (a few minutes). Confirm the commit is live, `x-vercel-id` shows `fra1`, and no runtime errors appear.

`/en/...` and `/ar/...` redirect to the unprefixed path. To check English text, request the plain path with the cookie `NEXT_LOCALE=en`.

### Project references

- Supabase production project: `hkgaercmtdmoksrhzcya`
- Vercel project: `prj_Ytv4V2m6yj9ZBelteZN9ImmHFi2S`
- Vercel team: `team_DlHzHt7KXn49kTJcMzzlIUHa`
- Site: https://kochivo.site

If login-code emails fail, check Supabase `auth_logs` for SMTP errors first. The cause has been the email provider account (Resend), not the app.

## Final message format

Use the format in `AGENTS.md` section 8 for the technical report, then add a short plain summary in Egyptian Arabic for the owner.
