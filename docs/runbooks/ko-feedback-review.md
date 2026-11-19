# Weekly KO feedback review

Run this query from a read-only session with access to the private feedback table.

```sql
begin read only;

select reason, intent, count(*) as reports,
       jsonb_agg(jsonb_build_object(
         'created_at', created_at, 'role', role, 'sources', sources,
         'question', question, 'answer', answer
       ) order by created_at desc) as replies
from security_private.ko_feedback
where not helpful and created_at >= now() - interval '7 days'
group by reason, intent
order by reports desc, reason, intent;

rollback;
```

1. Start with the groups with the most reports. Read the examples and identify the recurring failures.
2. Turn the most frequent failures into specific prompt rules in `src/features/ko-account/data/intents.ts`.
3. Add a representative case for each rule in `src/features/ko-account/eval/cases.ts`. Replace personal details with invented examples and specify the expected tools and arguments.
4. Run the eval and check that the new cases pass alongside the existing cases.
