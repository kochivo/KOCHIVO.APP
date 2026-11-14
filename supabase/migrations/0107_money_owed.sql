begin;

create function public.captain_money_owed()
returns table (player_id uuid, amount_egp bigint, reason text, since date)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_active_caller();
  if not exists (select 1 from public.profiles where id=auth.uid() and role='captain') then
    raise exception 'captain required' using errcode='42501';
  end if;
  -- A receipt supersedes its renewal and expiry; installments supersede expiry.
  -- Selecting one reason avoids counting the same subscription more than once.
  return query
  select c.player_id,
    case when receipt.id is not null then receipt.amount_egp::bigint
      when renewal.id is not null then requested.price_egp::bigint
      when partial.amount>0 then partial.amount
      else coalesce(current_package.price_egp,last_payment.price_egp)::bigint end,
    case when receipt.id is not null then 'receipt_pending'
      when renewal.id is not null then 'renewal_pending'
      when partial.amount>0 then 'partial' else 'expired' end,
    case when receipt.id is not null then (receipt.created_at at time zone public.safe_timezone(auth.uid()))::date
      when renewal.id is not null then (renewal.created_at at time zone public.safe_timezone(auth.uid()))::date
      when partial.amount>0 then partial.since else c.access_until end
  from public.coach_clients c
  left join public.payment_receipts receipt on receipt.captain_id=c.captain_id
    and receipt.player_id=c.player_id and receipt.status='pending'
  left join public.player_renewal_requests renewal on renewal.captain_id=c.captain_id
    and renewal.player_id=c.player_id and renewal.status='pending'
  left join public.captain_packages requested on requested.id=renewal.package_id and requested.captain_id=c.captain_id
  left join lateral (
    select p.package_id,p.price_egp from public.player_payments p
    where p.captain_id=c.captain_id and p.player_id=c.player_id
    order by p.period_end desc,p.created_at desc,p.id desc limit 1
  ) last_payment on true
  left join public.captain_packages current_package on current_package.id=last_payment.package_id
    and current_package.captain_id=c.captain_id
  left join lateral (
    select sum(d.amount)::bigint as amount,
      min((d.created_at at time zone public.safe_timezone(auth.uid()))::date) as since
    from (
      select p.created_at,greatest(0,p.price_egp-coalesce(p.amount_egp,0)-coalesce((
        select sum(pc.amount_egp) from public.payment_collections pc
        where pc.payment_id=p.id and pc.captain_id=c.captain_id and pc.player_id=c.player_id
      ),0)) as amount
      from public.player_payments p where p.captain_id=c.captain_id and p.player_id=c.player_id
        and p.price_egp is not null
    ) d where d.amount>0
  ) partial on true
  where c.captain_id=auth.uid() and c.archived_at is null and not c.pending
    and (receipt.id is not null or renewal.id is not null or partial.amount>0
      or c.access_until<public.user_today(auth.uid()))
  order by c.player_id;
end;
$$;
revoke all on function public.captain_money_owed() from public,anon,authenticated;
grant execute on function public.captain_money_owed() to authenticated;

commit;
