begin;

create or replace function security_private.deduct_pt_session() returns trigger
language plpgsql security definer set search_path = '' as $$
declare c public.coach_clients;
begin
  if new.completed_at is null then return new; end if;
  if tg_op='UPDATE' then if old.completed_at is not null then return new; end if; end if;
  select * into c from public.coach_clients where player_id=new.player_id and archived_at is null
    and not pending and frozen_at is null and access_until >= public.user_today(captain_id)
    and coalesce(new.started_at,new.completed_at) >= billing_started_at
    and new.training_date >= (billing_started_at at time zone public.safe_timezone(new.player_id))::date
    and new.training_date <= (((access_until+1)::timestamp at time zone public.safe_timezone(captain_id)
      - interval '1 microsecond') at time zone public.safe_timezone(new.player_id))::date
    and sessions_left > 0 for update;
  if not found then return new; end if;
  -- Check after locking the relationship so concurrent completions serialize their charges.
  if new.program_day_id is not null and exists (
    select 1 from public.workout_sessions s
    join public.session_deductions d on d.session_id=s.id
    where s.id<>new.id and s.player_id=new.player_id
      and s.program_day_id=new.program_day_id and s.training_date=new.training_date
      and s.completed_at is not null
  ) then return new; end if;
  insert into public.session_deductions(session_id,link_id) values (new.id,c.id) on conflict do nothing;
  if not found then return new; end if;
  update public.coach_clients set sessions_left=sessions_left-1 where id=c.id;
  if c.sessions_left=1 then
    insert into public.notifications(user_id,type,payload) values (c.captain_id,'sessions_used_up',
      jsonb_build_object('player_id',new.player_id,'session_id',new.id));
  end if;
  return new;
end; $$;

commit;
