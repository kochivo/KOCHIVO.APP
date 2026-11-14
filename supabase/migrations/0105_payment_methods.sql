begin;

create table public.captain_payment_methods (
  captain_id uuid not null references public.profiles(id) on delete cascade,
  method text not null check (method in ('instapay','vodafone_cash','cash','bank_transfer')),
  account_detail text check (char_length(account_detail) <= 80),
  position smallint not null default 0 check (position between 0 and 3),
  updated_at timestamptz not null default now(),
  primary key (captain_id,method),
  check (method='cash' or (account_detail is not null and char_length(btrim(account_detail))>0))
);
alter table public.captain_payment_methods enable row level security;
revoke all on public.captain_payment_methods from public,anon,authenticated;
grant select,insert,delete on public.captain_payment_methods to authenticated;
grant update(captain_id,method,account_detail,position) on public.captain_payment_methods to authenticated;
create policy payment_methods_owner on public.captain_payment_methods for all to authenticated
  using (captain_id=(select auth.uid()) and exists (
    select 1 from public.profiles where id=(select auth.uid()) and role='captain'))
  with check (captain_id=(select auth.uid()) and exists (
    select 1 from public.profiles where id=(select auth.uid()) and role='captain'));
create policy payment_methods_player on public.captain_payment_methods for select to authenticated
  using (exists (select 1 from public.coach_clients c where c.captain_id=captain_payment_methods.captain_id
    and c.player_id=(select auth.uid()) and c.archived_at is null and not c.pending));
create policy active_caller on public.captain_payment_methods as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));

create function security_private.payment_method_updated() returns trigger
language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end;
$$;
revoke all on function security_private.payment_method_updated() from public,anon,authenticated;
create trigger payment_method_updated before update on public.captain_payment_methods
  for each row execute function security_private.payment_method_updated();

alter table public.player_payments add column method text
  check (method in ('instapay','vodafone_cash','cash','bank_transfer'));
alter table public.player_renewal_requests add column method text
  check (method in ('instapay','vodafone_cash','cash','bank_transfer'));
grant insert(method) on public.player_renewal_requests to authenticated;
-- Collections are also recorded payments and may use a different method from the renewal.
alter table public.payment_collections add column method text
  check (method in ('instapay','vodafone_cash','cash','bank_transfer'));

create function security_private.validate_renewal_method() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  -- Nullable methods preserve requests sent by clients released before this migration.
  if new.method is null then return new; end if;
  if exists (select 1 from public.captain_payment_methods where captain_id=new.captain_id) then
    if not exists (select 1 from public.captain_payment_methods
      where captain_id=new.captain_id and method=new.method) then
      raise exception 'Choose an enabled payment method' using errcode='22023';
    end if;
  elsif new.method is not null then
    raise exception 'No payment methods enabled' using errcode='22023';
  end if;
  return new;
end;
$$;
revoke all on function security_private.validate_renewal_method() from public,anon,authenticated;
create trigger validate_renewal_method before insert on public.player_renewal_requests
  for each row execute function security_private.validate_renewal_method();

-- The wrappers keep the existing atomic payment logic and annotate only its new rows.
create function security_private.attach_payment_method() returns trigger
language plpgsql set search_path='' as $$
begin
  new.method=coalesce(new.method,nullif(current_setting('kochivo.payment_method',true),''));
  return new;
end;
$$;
revoke all on function security_private.attach_payment_method() from public,anon,authenticated;
create trigger attach_payment_method before insert on public.player_payments
  for each row execute function security_private.attach_payment_method();
create trigger attach_payment_method before insert on public.payment_collections
  for each row execute function security_private.attach_payment_method();

create function public.renew_player_with_method(p_player uuid,p_days int,p_amount int,p_price int,p_package uuid,p_method text)
returns date language plpgsql security definer set search_path='' as $$
declare result date; previous text := current_setting('kochivo.payment_method',true);
begin
  perform public.require_active_caller();
  if p_method is not null and p_method not in ('instapay','vodafone_cash','cash','bank_transfer') then
    raise exception 'Invalid payment method' using errcode='22023';
  end if;
  perform set_config('kochivo.payment_method',coalesce(p_method,''),true);
  result=public.renew_player(p_player,p_days,p_amount,p_price,p_package);
  perform set_config('kochivo.payment_method',coalesce(previous,''),true);
  return result;
end;
$$;
create function public.collect_payment_with_method(p_player uuid,p_amount int,p_method text)
returns int language plpgsql security definer set search_path='' as $$
declare result int; previous text := current_setting('kochivo.payment_method',true);
begin
  perform public.require_active_caller();
  if p_method is not null and p_method not in ('instapay','vodafone_cash','cash','bank_transfer') then
    raise exception 'Invalid payment method' using errcode='22023';
  end if;
  perform set_config('kochivo.payment_method',coalesce(p_method,''),true);
  result=public.collect_player_payment(p_player,p_amount);
  perform set_config('kochivo.payment_method',coalesce(previous,''),true);
  return result;
end;
$$;
revoke all on function public.renew_player_with_method(uuid,int,int,int,uuid,text),
  public.collect_payment_with_method(uuid,int,text) from public,anon,authenticated;
grant execute on function public.renew_player_with_method(uuid,int,int,int,uuid,text),
  public.collect_payment_with_method(uuid,int,text) to authenticated;

create function public.decide_renewal_with_method(p_request uuid,p_status text)
returns boolean language plpgsql security definer set search_path='' as $$
declare selected text; result boolean; previous text := current_setting('kochivo.payment_method',true);
begin
  perform public.require_active_caller();
  select method into selected from public.player_renewal_requests
    where id=p_request and (captain_id=auth.uid() or player_id=auth.uid()) for update;
  if not found then raise exception 'Request unavailable' using errcode='42501'; end if;
  perform set_config('kochivo.payment_method',coalesce(selected,''),true);
  result=public.decide_player_renewal(p_request,p_status);
  perform set_config('kochivo.payment_method',coalesce(previous,''),true);
  return result;
end;
$$;
revoke all on function public.decide_renewal_with_method(uuid,text) from public,anon,authenticated;
grant execute on function public.decide_renewal_with_method(uuid,text) to authenticated;

create function public.activate_player_with_method(p_link uuid,p_package uuid,p_kind text,p_quantity int,
  p_price int,p_paid int,p_trial boolean,p_catalog boolean,p_method text)
returns boolean language plpgsql security definer set search_path='' as $$
declare result boolean := false; previous text := current_setting('kochivo.payment_method',true);
begin
  perform public.require_active_caller();
  if p_method is not null and p_method not in ('instapay','vodafone_cash','cash','bank_transfer') then
    raise exception 'Invalid payment method' using errcode='22023';
  end if;
  perform set_config('kochivo.payment_method',coalesce(p_method,''),true);
  if p_catalog and p_package is not null and not p_trial then
    result=public.activate_join_package(p_link,p_package,p_paid);
  else
    perform public.activate_player(p_link,p_package,p_kind,p_quantity,p_price,p_paid,p_trial);
  end if;
  perform set_config('kochivo.payment_method',coalesce(previous,''),true);
  return result;
end;
$$;
revoke all on function public.activate_player_with_method(uuid,uuid,text,int,int,int,boolean,boolean,text) from public,anon,authenticated;
grant execute on function public.activate_player_with_method(uuid,uuid,text,int,int,int,boolean,boolean,text) to authenticated;
commit;
