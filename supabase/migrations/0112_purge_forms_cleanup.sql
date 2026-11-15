begin;

-- Only purge workers may remove history; normal captain deletion remains restricted.
create or replace function security_private.purge_account_forms(user_ids uuid[]) returns void
language plpgsql set search_path = '' as $$
declare request_ids uuid[]; form_ids uuid[];
begin
  -- Block new FK references while the graph is removed, including concurrent sends.
  perform 1 from public.profiles where id = any(user_ids) order by id for update;
  select array_agg(id) into form_ids from (
    select id from public.forms where captain_id = any(user_ids) order by id for update
  ) owned;
  select array_agg(id) into request_ids from (
    select id from public.form_requests
    where captain_id = any(user_ids) or player_id = any(user_ids) or form_id = any(form_ids)
    order by id for update
  ) requests;

  delete from public.form_answers where request_id = any(request_ids)
    or question_id in (select id from public.form_questions where form_id = any(form_ids));
  delete from security_private.assessment_deliveries where request_id = any(request_ids)
    or player_id = any(user_ids) or schedule_id in (
      select id from public.assessment_schedules where captain_id = any(user_ids)
        or player_id = any(user_ids) or form_id = any(form_ids));
  delete from public.assessment_schedules where captain_id = any(user_ids)
    or player_id = any(user_ids) or form_id = any(form_ids);
  delete from public.form_requests where id = any(request_ids);
  delete from public.coach_invite_forms where form_id = any(form_ids);
  delete from public.form_questions where form_id = any(form_ids);
  delete from public.forms where id = any(form_ids);
end;
$$;
revoke all on function security_private.purge_account_forms(uuid[]) from public, anon, authenticated, service_role;

create or replace function public.purge_deleted_accounts() returns int
language plpgsql security definer set search_path = '' as $$
declare user_ids uuid[]; v_count int;
begin
  -- Snapshot and lock the same eligible accounts for cleanup and the final delete.
  select array_agg(id) into user_ids from (
    select p.id from public.profiles p
    where p.deletion_requested_at < now() - interval '7 days'
      and not exists (select 1 from public.admins a where a.user_id = p.id)
    order by p.id for update
  ) due;
  perform security_private.purge_account_forms(user_ids);
  delete from auth.users where id = any(user_ids);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function security_private.purge_demo_workspaces() returns int
language plpgsql security definer set search_path = '' as $$
declare workspace record; user_ids uuid[]; total int := 0;
begin
  for workspace in select w.captain_id,w.player_ids from security_private.demo_workspaces w
    where w.expires_at<=now() or w.captain_id in
      (select id from public.profiles where demo_expires_at<=now()) for update loop
    user_ids := array_prepend(workspace.captain_id,workspace.player_ids);
    perform security_private.purge_account_forms(user_ids);
    -- Demo uploads are blocked; never delete directly from storage.objects.
    delete from auth.users where id=any(user_ids);
    delete from security_private.demo_workspaces where captain_id=workspace.captain_id;
    total := total+1;
  end loop;
  select array_agg(id) into user_ids from (
    select u.id from auth.users u where u.is_anonymous and u.created_at<=now()-interval '24 hours'
      and not exists(select 1 from security_private.demo_workspaces w
        where w.captain_id=u.id or u.id=any(w.player_ids)) order by u.id for update
  ) abandoned;
  perform security_private.purge_account_forms(user_ids);
  delete from auth.users where id=any(user_ids);
  return total;
end;
$$;

-- CREATE OR REPLACE preserves the existing worker ACLs.
commit;
