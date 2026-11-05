# Before publish

Before every publish:

1. Review the diff against the task card.
2. Confirm gates are green: tsc, eslint, audit:release, vitest, build, then perf.
3. Check new migrations are numbered, have RLS and tests, were checked against production data first, and are applied before code that needs them.
4. Redeploy changed edge functions.
5. Confirm Supabase Security Advisor has no new findings.
6. After deploy, verify the release SHA is live and `x-vercel-id` shows fra1; watch Sentry for 15 quiet minutes.
7. Keep secrets out of chat, PRs, and commits.
