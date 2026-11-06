-- KOCHIVO stores InBody records in public.body_scans, not inbody_records.
-- Reference only: the hosted project already has this SELECT policy.
-- captain_since(player_id) returns a date only for the current authenticated
-- captain's unarchived player relationship and rejects suspended callers.
-- Its NULL result denies unrelated captains; its date preserves the existing
-- rule that a new captain cannot read scans from before their relationship.
begin;

alter table public.body_scans enable row level security;
grant select on public.body_scans to authenticated;

drop policy if exists body_scans_coach on public.body_scans;
create policy body_scans_coach
on public.body_scans
for select
to authenticated
using (
  scan_date >= (
    public.captain_since(player_id) at time zone 'Africa/Cairo'
  )::date
);

-- Existing owner policies and the restrictive active_caller policy stay intact.
commit;
