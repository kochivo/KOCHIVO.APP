-- A stable key so the seed script can upsert global foods idempotently.
alter table public.foods add column seed_key text;
alter table public.foods add constraint foods_seed_key_key unique (seed_key);
