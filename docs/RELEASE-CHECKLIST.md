# Before publish

Before every publish:

1. Review the diff against the task card.
2. Confirm gates are green: tsc, eslint, audit:release, vitest, build, then perf. Publish with `git push origin master:staging`; never push to `master` directly. Wait for the Checks workflow to pass and promote the tested commit to `master`. If a check fails, nothing was published to production: fix, commit, and push to `staging` again. Vercel also builds a preview for `staging`; it is not the public site.
3. Check new migrations are numbered, have RLS and tests, were checked against production data first, and are applied before code that needs them.
4. Redeploy changed edge functions.
5. Confirm Supabase Security Advisor has no new findings.
6. After deploy, verify the release SHA is live and `x-vercel-id` shows fra1; watch Sentry for 15 quiet minutes. For emergency rollback, promote the previous production deployment in Vercel (one click), then fix forward through `staging`.
7. Keep secrets out of chat, PRs, and commits.

Optional owner setup (once, not done by this card): in GitHub settings, protect `master` so only the workflow can update it, if the plan allows it.

Meal receipt owner setup (once, after migration 0088; do not put the value in the repository):
generate a random 32-byte hex secret (for example, `openssl rand -hex 32`), set
`KO_MEAL_RECEIPT_SECRET` in Vercel production, and insert the same value via the production SQL editor:

```sql
insert into security_private.app_secrets(name, value) values ('meal_receipt', '<secret>');
```

Redeploy production after setting the environment variable. Until both values are set and match,
meal points are not awarded; meal analysis still works.
