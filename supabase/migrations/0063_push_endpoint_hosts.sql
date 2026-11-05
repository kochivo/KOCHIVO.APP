-- No production database is queried here; the actual deleted count is logged at apply time.
do $$
declare removed bigint;
begin
  delete from public.push_subscriptions
  where not (length(endpoint) <= 1000 and endpoint ~
    '^https://(fcm\.googleapis\.com|([a-z0-9-]+\.)+push\.apple\.com|updates\.push\.services\.mozilla\.com|push\.services\.mozilla\.com|([a-z0-9-]+\.)+notify\.windows\.com)/[^[:space:]#\\]*$');
  get diagnostics removed = row_count;
  raise notice '0063: deleted % non-allow-listed push endpoints', removed;
end $$;

alter table public.push_subscriptions drop constraint push_subscriptions_endpoint_check;
alter table public.push_subscriptions add constraint push_subscriptions_endpoint_check check (
  length(endpoint) <= 1000 and endpoint ~
  '^https://(fcm\.googleapis\.com|([a-z0-9-]+\.)+push\.apple\.com|updates\.push\.services\.mozilla\.com|push\.services\.mozilla\.com|([a-z0-9-]+\.)+notify\.windows\.com)/[^[:space:]#\\]*$'
);
