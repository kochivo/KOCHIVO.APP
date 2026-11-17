begin;
alter table public.captain_packages add column max_freeze_days int
  check (max_freeze_days between 0 and 90);
grant update (max_freeze_days) on public.captain_packages to authenticated;
alter table public.coach_clients add column frozen_until date;

create table public.freeze_requests (
  id uuid primary key,
  player_id uuid not null references public.profiles(id) on delete cascade,
  captain_id uuid not null references public.profiles(id) on delete cascade,
  days int not null check (days between 1 and 90),
  note text check (char_length(note)<=200),
  status text not null default 'pending' check (status in ('pending','approved','declined','cancelled')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create unique index freeze_requests_pending on public.freeze_requests(player_id,captain_id) where status='pending';
create index freeze_requests_captain on public.freeze_requests(captain_id,status,created_at);
create index freeze_requests_allowance on public.freeze_requests(player_id,captain_id,decided_at) where status='approved';
create index coach_clients_freeze_due on public.coach_clients(frozen_until) where frozen_until is not null;
alter table public.freeze_requests enable row level security;
revoke all on public.freeze_requests from public,anon,authenticated;
grant select on public.freeze_requests to authenticated;
create policy active_caller on public.freeze_requests as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy freeze_requests_read on public.freeze_requests for select to authenticated
  using ((player_id=(select auth.uid()) or captain_id=(select auth.uid())) and exists (
    select 1 from public.coach_clients c where c.player_id=freeze_requests.player_id
      and c.captain_id=freeze_requests.captain_id and c.archived_at is null));

-- Choose the payment before joining its package: a newer payment without a package disables requests.
create function security_private.freeze_allowance(p_player uuid,p_captain uuid) returns int
language sql stable security definer set search_path='' as $$
  select greatest(0,coalesce(pkg.max_freeze_days,0)-coalesce((
    select sum(r.days)::int from public.freeze_requests r
    where r.player_id=p_player and r.captain_id=p_captain and r.status='approved'
      and (r.decided_at at time zone captain.timezone)::date between p.period_start and p.period_end
  ),0)) from public.profiles captain
  cross join lateral (select payment.* from public.player_payments payment
    where payment.player_id=p_player and payment.captain_id=p_captain
      and public.user_today(p_captain) between payment.period_start and payment.period_end
    order by payment.period_start desc,payment.created_at desc,payment.id desc limit 1) p
  left join public.captain_packages pkg on pkg.id=p.package_id and pkg.captain_id=p_captain
  where captain.id=p_captain;
$$;
revoke all on function security_private.freeze_allowance(uuid,uuid) from public,anon,authenticated;

create function public.remaining_freeze_days(p_captain uuid) returns int
language plpgsql stable security definer set search_path='' as $$ begin
  perform public.require_active_caller();
  if not exists (select 1 from public.coach_clients c where c.player_id=auth.uid() and c.captain_id=p_captain
    and c.archived_at is null and not c.pending and c.frozen_at is null
    and c.access_until>=public.user_today(p_captain)) then return 0; end if;
  return coalesce(security_private.freeze_allowance(auth.uid(),p_captain),0);
end $$;

create function public.request_player_freeze(p_id uuid,p_captain uuid,p_days int,p_note text default null)
returns void language plpgsql security definer set search_path='' as $$
declare c public.coach_clients;
begin
  perform public.require_active_caller();
  select * into c from public.coach_clients where player_id=auth.uid() and captain_id=p_captain
    and archived_at is null for update;
  if not found or c.pending or c.frozen_at is not null or c.access_until<public.user_today(p_captain) then
    raise exception 'active unfrozen player link required' using errcode='42501'; end if;
  if p_days is null or p_days not between 1 and 90 or char_length(p_note)>200 then
    raise exception 'invalid freeze request' using errcode='22023'; end if;
  if p_days>coalesce(security_private.freeze_allowance(c.player_id,c.captain_id),0) then
    raise exception 'freeze allowance exceeded' using errcode='22023'; end if;
  insert into public.freeze_requests(id,player_id,captain_id,days,note)
    values (p_id,c.player_id,c.captain_id,p_days,nullif(btrim(p_note),''));
end $$;

create function public.cancel_freeze_request(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare r public.freeze_requests;
begin
  perform public.require_active_caller();
  select * into r from public.freeze_requests where id=p_id and player_id=auth.uid() for update;
  if not found then raise exception 'own freeze request required' using errcode='42501'; end if;
  if r.status='cancelled' then return; end if;
  if r.status<>'pending' then raise exception 'freeze request already decided' using errcode='22023'; end if;
  update public.freeze_requests set status='cancelled',decided_at=now() where id=r.id;
end $$;

create function public.decide_freeze_request(p_id uuid,p_approve boolean) returns void
language plpgsql security definer set search_path='' as $$
declare r public.freeze_requests; c public.coach_clients; decision text;
begin
  perform public.require_active_caller();
  if p_approve is null then raise exception 'decision required' using errcode='22023'; end if;
  decision := case when p_approve then 'approved' else 'declined' end;
  select * into r from public.freeze_requests where id=p_id and captain_id=auth.uid() for update;
  if not found or not exists (select 1 from public.profiles where id=auth.uid() and role='captain') then
    raise exception 'own captain request required' using errcode='42501'; end if;
  if r.status=decision then return; end if;
  if r.status<>'pending' then raise exception 'freeze request already decided' using errcode='22023'; end if;
  select * into c from public.coach_clients where player_id=r.player_id and captain_id=r.captain_id
    and archived_at is null for update;
  if not found then raise exception 'active link required' using errcode='42501'; end if;
  if p_approve then
    if c.pending or c.frozen_at is not null or c.access_until<public.user_today(c.captain_id) then
      raise exception 'active unfrozen player link required' using errcode='22023'; end if;
    if r.days>coalesce(security_private.freeze_allowance(r.player_id,r.captain_id),0) then
      raise exception 'freeze allowance exceeded' using errcode='22023'; end if;
    update public.coach_clients set frozen_at=now(),frozen_until=public.user_today(c.captain_id)+r.days where id=c.id;
  end if;
  update public.freeze_requests set status=decision,decided_at=now() where id=r.id;
end $$;
revoke all on function public.remaining_freeze_days(uuid),public.request_player_freeze(uuid,uuid,int,text),
  public.cancel_freeze_request(uuid),public.decide_freeze_request(uuid,boolean) from public,anon,authenticated;
grant execute on function public.remaining_freeze_days(uuid),public.request_player_freeze(uuid,uuid,int,text),
  public.cancel_freeze_request(uuid),public.decide_freeze_request(uuid,boolean) to authenticated;

create function security_private.release_due_freezes() returns void
language sql security definer set search_path='' as $$
  update public.coach_clients set
    -- Calendar days in the captain's zone: an evening approval still returns every frozen day.
    access_until=access_until+greatest(0,public.user_today(captain_id)-(frozen_at at time zone public.safe_timezone(captain_id))::date),
    frozen_at=null,frozen_until=null
  where frozen_at is not null and frozen_until<=public.user_today(captain_id);
$$;
revoke all on function security_private.release_due_freezes() from public,anon,authenticated;
grant execute on function security_private.release_due_freezes() to service_role,postgres;
do $$ begin
  if exists (select 1 from pg_namespace where nspname='cron') then
    execute $cron$select cron.schedule('release-due-freezes','10 6 * * *',
      'select security_private.release_due_freezes()')$cron$;
  end if;
end $$;

do $migration$
declare definition text; fragment text := 'frozen_at=null where id=c.id;';
begin
  definition := pg_catalog.pg_get_functiondef('public.set_player_frozen(uuid,boolean)'::regprocedure);
  if (length(definition)-length(replace(definition,fragment,'')))/length(fragment)<>1 then
    raise exception 'set_player_frozen drift'; end if;
  execute replace(definition,fragment,'frozen_at=null,frozen_until=null where id=c.id;');
end $migration$;

do $$ declare expression text; begin
  select pg_get_constraintdef(oid) into expression from pg_constraint
    where conrelid='public.notifications'::regclass and conname='notifications_type_check';
  if expression is null then raise exception 'Missing notifications_type_check'; end if;
  alter table public.notifications drop constraint notifications_type_check;
  execute 'alter table public.notifications add constraint notifications_type_check check (' ||
    substring(expression from 7) || ' or type in (''freeze_requested'',''freeze_approved'',''freeze_declined''))';
end $$;
create function security_private.notify_freeze_request() returns trigger
language plpgsql security definer set search_path='' as $$
declare recipient uuid; event_type text;
begin
  if tg_op='INSERT' then recipient:=new.captain_id; event_type:='freeze_requested';
  elsif old.status='pending' and new.status in ('approved','declined') then
    recipient:=new.player_id; event_type:='freeze_'||new.status;
  else return new; end if;
  insert into public.notifications(user_id,type,payload)
    values (recipient,event_type,jsonb_build_object('request_id',new.id,'player_id',new.player_id,
      'days',new.days,'display_name',(select full_name from public.profiles
        where id=case when tg_op='INSERT' then new.player_id else new.captain_id end),
      'captain_name',(select full_name from public.profiles where id=new.captain_id)));
  return new;
end $$;
revoke all on function security_private.notify_freeze_request() from public,anon,authenticated;
create trigger freeze_request_notifications after insert or update of status on public.freeze_requests
  for each row execute function security_private.notify_freeze_request();
commit;
