alter table public.ko_action_receipts set schema ko_private;
drop policy active_caller on ko_private.ko_action_receipts;
create policy ko_owner_only on ko_private.ko_action_receipts for all to postgres using (true) with check (true);
create policy ko_owner_only on security_private.ko_approval_config for all to postgres using (true) with check (true);

create or replace function ko_private.record_receipt(p_token text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_action jsonb := ko_private.verified_approval(p_token);
begin
  perform public.require_active_caller();
  if not exists (select 1 from public.my_approval_route_profile() p
    where p.role = 'captain' and p.role_confirmed and p.captain_status = 'approved' and not p.is_admin) then
    raise exception 'approved captain required' using errcode = '42501';
  end if;
  insert into ko_private.ko_action_receipts(captain_id, action_id)
    values (auth.uid(), (v_action ->> 'id')::uuid) on conflict do nothing;
  return found;
end;
$$;
