begin;
create table security_private.app_secrets (
  name text primary key,
  value text not null check (length(value) > 0)
);
alter table security_private.app_secrets enable row level security;
revoke all on table security_private.app_secrets from public, anon, authenticated, service_role;

drop function public.award_meal_check();
create function public.award_meal_check(p_day date, p_receipt text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_secret text;
  v_expected text;
begin
  perform public.require_active_caller();
  if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and role='player')
    or not public.player_can_write() then
    raise exception 'active player required' using errcode='42501';
  end if;
  select value into v_secret from security_private.app_secrets where name='meal_receipt';
  if v_secret is null or p_day is null or p_day <> (now() at time zone 'Africa/Cairo')::date then
    raise exception 'valid meal receipt required' using errcode='42501';
  end if;
  v_expected := encode(extensions.hmac(auth.uid()::text || ':' || p_day::text, v_secret, 'sha256'), 'hex');
  if p_receipt is null or p_receipt <> v_expected then
    raise exception 'valid meal receipt required' using errcode='42501';
  end if;
  perform security_private.award_points(auth.uid(),'meal_check',p_day::text,1::smallint,'counted',p_day);
end $$;
revoke all on function public.award_meal_check(date,text) from public, anon, authenticated, service_role;
grant execute on function public.award_meal_check(date,text) to authenticated;
commit;
