begin;
create table public.crown_winners (
  captain_id uuid references public.profiles(id) on delete cascade,
  month date check (month = date_trunc('month', month)::date),
  player_id uuid not null references public.profiles(id) on delete cascade,
  adherence int not null check (adherence between 1 and 100),
  done int not null check (done >= 4),
  planned int not null check (planned >= 8),
  primary key (captain_id, month)
);
alter table public.crown_winners enable row level security;
revoke all on public.crown_winners from public, anon, authenticated, service_role;
-- Winner ids are available only through the RPC, which masks teammates' ids.
grant select (captain_id, month, adherence, done, planned) on public.crown_winners to authenticated;
create policy captain_winners on public.crown_winners for select to authenticated
  using (captain_id = (select auth.uid())
    and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'captain'));
create policy player_winners on public.crown_winners for select to authenticated
  using (case when (select public.is_suspended()) then false
    else captain_id = (select public.my_captain_id()) end);
create policy active_caller on public.crown_winners as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));

create function security_private.freeze_crown_winners(p_month date)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_month is null or p_month <> date_trunc('month', p_month)::date
    or p_month >= date_trunc('month', now() at time zone 'Africa/Cairo')::date then
    raise exception 'completed month required' using errcode = '22023';
  end if;
  insert into public.crown_winners(captain_id, month, player_id, adherence, done, planned)
    select p.id, p_month, b.player_id, b.adherence, b.done, b.planned
    from public.profiles p cross join lateral security_private.points_board(p.id, p_month) b
    where p.role = 'captain' and b.position = 1 and b.done >= 4 and b.adherence > 0
    on conflict (captain_id, month) do nothing;
end $$;
revoke all on function security_private.freeze_crown_winners(date) from public, anon, authenticated, service_role;

do $$ declare v_month date;
begin
  for v_month in select m::date from generate_series(
    (select date_trunc('month', min(earned_on)) from public.points_log),
    date_trunc('month', now() at time zone 'Africa/Cairo') - interval '1 month', interval '1 month') m
  loop perform security_private.freeze_crown_winners(v_month); end loop;
end $$;

create function public.crown_hall_of_fame()
returns table(month date, player_id uuid, display_name text, adherence int, done int, planned int)
language plpgsql stable security definer set search_path = '' as $$
declare v_captain uuid; v_role public.user_role;
begin
  perform public.require_active_caller();
  if auth.uid() is null then raise exception 'authenticated caller required' using errcode = '42501'; end if;
  select p.role into v_role from public.profiles p where p.id = auth.uid();
  v_captain := case when v_role = 'captain' then auth.uid() else public.my_captain_id() end;
  return query select w.month,
    case when v_role = 'captain' or w.player_id = auth.uid() then w.player_id end,
    case when v_role = 'captain' then p.full_name else split_part(btrim(p.full_name), ' ', 1) end,
    w.adherence, w.done, w.planned
    from public.crown_winners w join public.profiles p on p.id = w.player_id
    where w.captain_id = v_captain order by w.month desc limit 12;
end $$;
revoke all on function public.crown_hall_of_fame() from public, anon, authenticated, service_role;
grant execute on function public.crown_hall_of_fame() to authenticated;

do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    -- Checking Cairo time avoids assuming a fixed UTC offset across DST changes.
    execute $cron$select cron.schedule('freeze-crown-winners', '10 * * * *',
      $job$select security_private.freeze_crown_winners(
        (date_trunc('month', now() at time zone 'Africa/Cairo') - interval '1 month')::date)
      where extract(day from now() at time zone 'Africa/Cairo') = 1
        and extract(hour from now() at time zone 'Africa/Cairo') = 0$job$)$cron$;
  end if;
end $$;
commit;
