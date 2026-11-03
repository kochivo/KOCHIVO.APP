alter table public.exercises add column archived_at timestamptz;
alter table public.foods add column archived_at timestamptz;

-- Existing owner update and restrictive active_caller policies cover these columns.
-- Keep SELECT policies unchanged so plans and history can still resolve archived IDs.
create index exercises_library_owner on public.exercises (owner_id) where archived_at is null;
create index foods_library_owner on public.foods (owner_id) where archived_at is null;
