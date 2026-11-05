-- Only the privileged workspace provisioner may attach an anonymous player.
-- Demo logs are purged through auth cascades; uploaded objects need a separate storage lifecycle.
create policy demo_no_uploads on storage.objects as restrictive for insert to authenticated
  with check (not exists(select 1 from public.profiles where id=(select auth.uid()) and demo_expires_at is not null));

create function security_private.guard_demo_player_role() returns trigger
language plpgsql security definer set search_path = '' as $$ begin
  if old.role='player' and old.role_confirmed and old.demo_expires_at is not null
    and new.role<>old.role and exists(select 1 from security_private.demo_workspaces where old.id=any(player_ids)) then
    raise exception 'demo role already selected' using errcode='42501';
  end if;
  return new;
end; $$;
revoke all on function security_private.guard_demo_player_role() from public,anon,authenticated;
create trigger profiles_demo_player_role before update of role on public.profiles
  for each row execute function security_private.guard_demo_player_role();

create or replace function security_private.guard_anonymous_client() returns trigger
language plpgsql security definer set search_path = '' as $$ begin
  if security_private.is_anonymous_user(new.player_id) and not exists (
    select 1 from security_private.demo_workspaces w
    join public.profiles c on c.id=w.captain_id
    join public.profiles p on p.id=new.player_id
    where w.captain_id=new.captain_id and new.player_id=any(w.player_ids)
      and w.expires_at>now() and c.demo_expires_at=w.expires_at and p.demo_expires_at=w.expires_at
      and not exists(select 1 from public.coach_clients l where l.player_id=new.player_id)
  ) then raise exception 'anonymous accounts are demo only' using errcode='42501'; end if;
  return new;
end; $$;

create function public.create_demo_player_workspace() returns void
language plpgsql security definer set search_path = '' as $$
declare
  player uuid := auth.uid(); captain uuid; template uuid; program uuid;
  today date := (now() at time zone 'Africa/Cairo')::date;
  old_sub text := current_setting('request.jwt.claim.sub',true);
  old_claims text := current_setting('request.jwt.claims',true);
begin
  if player is null or (auth.jwt()->>'is_anonymous')::boolean is distinct from true
    or not security_private.is_anonymous_user(player) then
    raise exception 'anonymous caller required' using errcode='42501';
  end if;
  perform public.require_active_caller();
  perform 1 from public.profiles where id=player for update;
  if not found then raise exception 'profile required' using errcode='42501'; end if;
  if exists(select 1 from security_private.demo_workspaces where player=any(player_ids)) then return; end if;
  if exists(select 1 from security_private.demo_workspaces where captain_id=player)
    or exists(select 1 from public.profiles where id=player and role_confirmed) then
    raise exception 'demo role already selected' using errcode='42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(312026,50);
  if (select count(*) from security_private.demo_workspaces where created_at>now()-interval '1 hour')>=50 then
    raise exception 'demo_limit' using errcode='P0001';
  end if;
  captain := security_private.starter_uuidv7();
  insert into auth.users(id,raw_user_meta_data)
    values(captain,jsonb_build_object('role','player','full_name','كابتن تجريبي'));
  insert into security_private.demo_workspaces(captain_id,player_ids) values(captain,array[player]);
  update public.profiles set role='captain',role_confirmed=true,captain_status='approved',
    demo_expires_at=now()+interval '24 hours' where id=captain;
  update public.profiles set role='player',role_confirmed=true,full_name='لاعب تجريبي',
    demo_expires_at=now()+interval '24 hours' where id=player;
  insert into public.coach_clients(id,captain_id,player_id,started_on,access_until,pending)
    values(security_private.starter_uuidv7(),captain,player,today-14,today+30,false);
  insert into public.player_intake(player_id,birth_year,sex,height_cm,weight_kg,target_weight_kg,
    training_days,session_minutes,experience,completed_at)
    values(player,1995,'male',175,75,73,array[0,1,2,3,4,5,6]::smallint[],60,'under_1y',now());
  -- Reuse assignment validation and copying as the generated captain, restoring claims before return.
  perform set_config('request.jwt.claim.sub',captain::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',captain,'is_anonymous',false)::text,true);
  select p.id into strict template from public.programs p join security_private.starter_templates t
    on t.payload->>'title'=p.title and t.key='beginner-full-body'
    where p.captain_id=captain and p.is_template;
  program := public.assign_program_template(template,player);
  update public.program_days set weekday=((position-1+extract(dow from today)::int)%7)::smallint
    where program_id=program;
  update public.programs set settings=settings || jsonb_build_object('repeatWeekly',true,'weeklyStartedOn',today-14)
    where id=program;
  select p.id into strict template from public.nutrition_plans p join security_private.starter_templates t
    on t.payload->>'title'=p.title and t.key='maintenance'
    where p.captain_id=captain and p.is_template;
  perform public.assign_nutrition_template(template,player);
  perform set_config('request.jwt.claim.sub',old_sub,true);
  perform set_config('request.jwt.claims',old_claims,true);
  perform security_private.demo_history(player,1,7,1);
  perform security_private.demo_meal_logs(player,0);
end; $$;
revoke all on function public.create_demo_player_workspace() from public,anon;
grant execute on function public.create_demo_player_workspace() to authenticated;

create or replace function security_private.purge_demo_workspaces() returns int
language plpgsql security definer set search_path = '' as $$
declare workspace record; total int := 0;
begin
  for workspace in select w.captain_id,w.player_ids from security_private.demo_workspaces w
    where w.expires_at<=now() or w.captain_id in
      (select id from public.profiles where demo_expires_at<=now()) for update loop
    -- Demo uploads are blocked; auth cascades remove all relational content and logs.
    delete from auth.users where id=any(array_prepend(workspace.captain_id,workspace.player_ids));
    delete from security_private.demo_workspaces where captain_id=workspace.captain_id;
    total := total+1;
  end loop;
  delete from auth.users u where u.is_anonymous and u.created_at<=now()-interval '24 hours'
    and not exists(select 1 from security_private.demo_workspaces w
      where w.captain_id=u.id or u.id=any(w.player_ids));
  return total;
end; $$;
