create table public.player_payments (
  id uuid primary key default gen_random_uuid(),
  captain_id uuid not null references public.profiles(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  amount_egp int check (amount_egp between 0 and 100000),
  days int not null check (days between 1 and 365),
  period_start date not null,
  period_end date not null,
  created_at timestamptz not null default now()
);
create index player_payments_captain_created on public.player_payments(captain_id, created_at desc);
create index player_payments_player on public.player_payments(player_id);
alter table public.player_payments enable row level security;
revoke all on public.player_payments from public, anon, authenticated;
grant select on public.player_payments to authenticated;
create policy player_payments_captain_select on public.player_payments for select to authenticated
  using (captain_id = (select auth.uid()));
create policy player_payments_player_select on public.player_payments for select to authenticated
  using (player_id = (select auth.uid()));

create function public.renew_player(p_player uuid, p_days int, p_amount int default null)
returns date language plpgsql security definer set search_path = '' as $$
declare
  v_relationship uuid;
  v_access date;
  v_start date;
  v_end date;
begin
  if public.is_suspended() or not exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'captain'
  ) then
    raise exception 'active captain required' using errcode = '42501';
  end if;
  select id, access_until into v_relationship, v_access from public.coach_clients
    where captain_id = (select auth.uid()) and player_id = p_player and archived_at is null
    for update;
  if not found then
    raise exception 'active captain relationship required' using errcode = '42501';
  end if;
  if p_days is null or p_days not between 1 and 365
    or (p_amount is not null and p_amount not between 0 and 100000) then
    raise exception 'invalid days or amount' using errcode = '22023';
  end if;
  v_start := greatest(v_access + 1, current_date);
  v_end := v_start + p_days - 1;
  update public.coach_clients set access_until = v_end where id = v_relationship;
  insert into public.player_payments (captain_id, player_id, amount_egp, days, period_start, period_end)
    values (auth.uid(), p_player, p_amount, p_days, v_start, v_end);
  return v_end;
end;
$$;
revoke all on function public.renew_player(uuid, int, int) from public, anon, authenticated;
grant execute on function public.renew_player(uuid, int, int) to authenticated;
