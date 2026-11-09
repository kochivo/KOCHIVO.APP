# T-140 — Checks run before the site goes live, not at the same time

**Phase:** Release safety · **Depends on:** none · **Status:** ready (owner request 2026-11-09)

## Goal
Today a push to `master` does two things at once: Vercel builds and publishes it, and GitHub runs
the checks. If a check fails, the broken version is already live. After this card, new work is
pushed to a `staging` branch. GitHub runs the checks there, and only when every check passes does
GitHub itself move `master` forward. Vercel keeps publishing from `master`, so nothing reaches
production unchecked. No secret and no new dependency is needed.

## Files
Create or modify only these:
- `.github/workflows/checks.yml`
- `docs/RELEASE-CHECKLIST.md`
- `AGENTS.md`: one line in section 7 only.
- `scripts/release-audit.mjs` and its test: only if the audit reads the workflow and must learn the new shape. Otherwise leave them.
- This task card.

## Requirements
1. **Trigger.** The workflow runs on `push` to `staging` and on `workflow_dispatch`. It no longer runs on `push` to `master`.
2. **Job `build`** keeps the same steps in the same order (tsc, eslint, audit, vitest, build, perf budget) and the same public env values. Its permissions stay `contents: read`.
3. **Job `promote`:**
   - `needs: build`; runs only when `github.event_name == 'push'` and `github.ref == 'refs/heads/staging'`.
   - Only this job has `permissions: contents: write`.
   - Checks out with `fetch-depth: 0`, then moves `master` to the tested commit with a fast-forward only push: `git push origin "$GITHUB_SHA:refs/heads/master"`. Never `--force`.
   - If `master` is not an ancestor of the tested commit, the job fails with a clear message that says to merge or rebase `staging` on `master`. It must not overwrite `master`.
   - If `master` already points at the commit, the job succeeds and does nothing.
4. **Concurrency.** Keep one group so two pushes cannot promote out of order; `cancel-in-progress: true` may stay for `build`, but a run must never be cancelled in the middle of the `promote` push. Use a separate non-cancelling group for `promote` if needed.
5. **Header comment** in the workflow: three or four plain lines on the flow (push `staging` → checks → GitHub moves `master` → Vercel deploys), and that a direct push to `master` skips the checks and must not be used.
6. **`docs/RELEASE-CHECKLIST.md`:**
   - Publishing is `git push origin master:staging`. Never push to `master` directly.
   - A failed check means nothing was published: fix, commit, push to `staging` again.
   - Emergency rollback: in Vercel, promote the previous production deployment (one click), then fix forward through `staging`.
   - Owner step, once, in GitHub settings: protect `master` so only the workflow can update it, if the plan allows it. Mark it as optional and not done by this card.
   - Note that Vercel will also build a preview for `staging`; it is not the public site.
   - Keep the existing seven steps; adjust wording only where it is now wrong.
7. **`AGENTS.md` section 7:** the line "Before publish, follow docs/RELEASE-CHECKLIST.md." gains: publishing goes through the `staging` branch; never push to `master`.
8. Do not change `vercel.json`, any secret, or any Vercel or GitHub setting. Do not push anything.

## Acceptance
- [ ] The workflow file is valid YAML and every `run` step is plain bash with `set -euo pipefail` where it has more than one command.
- [ ] A short table under "Implementation notes" walks these cases and the result of each: checks pass and `master` is behind; checks fail; `master` has a commit that `staging` lacks; `master` equals the commit; manual `workflow_dispatch`.
- [ ] If the release audit has a test, it passes; `npm run check` passes apart from the known sandbox `git EPERM`.

## Out of scope
- Deploying from GitHub with a Vercel token, preview environment variables, or end-to-end tests in CI.
- Branch protection (owner step).

## Notes for the reviewer
- The promote push is made with the built-in `GITHUB_TOKEN`. Vercel's GitHub integration deploys on that push; GitHub Actions workflows are not re-triggered by it, which is why the `master` trigger is removed.
- This cannot be proven locally. The first real publish after landing is the test: watch the run, then confirm the production SHA on Vercel.

## Implementation notes

| Case | Result |
|---|---|
| Checks pass and `master` is behind the tested commit | Ancestry passes; a normal fast-forward push moves `master` to that exact SHA for Vercel production. |
| Checks fail | `promote` is skipped because it needs a successful `build`; production stays unchanged. |
| `master` has a commit that `staging` lacks | The explicit ancestry check fails with instructions to merge or rebase `staging` on `master`; no push occurs. |
| `master` equals the tested commit | Promotion succeeds without pushing. |
| Manual `workflow_dispatch` | Checks run on the selected ref; the event guard skips promotion even when that ref is `staging`. |

- The existing workflow-wide `deploy` concurrency group now uses `cancel-in-progress: false`, covering checks and promotion together so a newer run cannot interrupt a push. Pending runs can be replaced and scheduling is not FIFO; the ancestry guard and non-force push prevent an older run from moving `master` backwards.
- Workflow-level `contents: read` remains the build default; only `promote` gets `contents: write`. Checkout fetches full history and promotion refreshes `origin/master` before testing ancestry. A concurrent external update is still protected by the normal non-force push.
- All build steps and public env values are unchanged. The release audit scans generic file content rather than depending on the workflow shape, so its script and test remain unchanged.
- Local validation covers YAML parsing, unchanged build configuration, and the documented event/ancestry cases. GitHub Actions and the Vercel integration still need the first real publish verification described above.
- Validation on 2026-11-09: YAML assertions and exact build-job comparison passed; `git diff --check` passed. `npm run check` passed typecheck and lint, then stopped at the known sandbox `spawnSync git EPERM` in the release audit. The separate release-audit test could not start because Vitest's config loader hit `spawn EPERM`. `npm run build` failed only on sandbox Google Fonts fetches for Alexandria, Changa, and Manrope.
