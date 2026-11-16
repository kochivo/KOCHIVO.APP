begin;

create or replace function public.captain_money_owed()
returns table (player_id uuid, amount_egp bigint, reason text, since date)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_active_caller();
  if not exists (select 1 from public.profiles where id=auth.uid() and role='captain') then
    raise exception 'captain required' using errcode='42501';
  end if;
  return query
  select c.player_id, debt.amount, debt.reason, debt.since
  from public.coach_clients c
  left join public.payment_receipts receipt on receipt.captain_id=c.captain_id
    and receipt.player_id=c.player_id and receipt.status='pending'
  left join public.player_renewal_requests renewal on renewal.captain_id=c.captain_id
    and renewal.player_id=c.player_id and renewal.status='pending'
  left join public.captain_packages requested on requested.id=renewal.package_id and requested.captain_id=c.captain_id
  left join public.captain_offers offer on offer.id=renewal.offer_id
    and security_private.request_offer_valid(c.captain_id,requested.id,renewal.offer_id,true)
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
  cross join lateral (
    -- Existing sales remain owed independently of a new pending sale. A receipt without
    -- a renewal pays that existing debt, so it replaces the partial row instead of adding to it.
    select partial.amount, 'partial'::text as reason, partial.since where partial.amount>0
      and not (receipt.id is not null and receipt.renewal_request_id is null)
    union all
    select case when receipt.id is not null then receipt.amount_egp::bigint
      when renewal.id is not null then case when offer.id is null then requested.price_egp::bigint
        else greatest(0,round(case offer.kind
          when 'percent' then requested.price_egp*(1-offer.value/100)
          when 'amount' then requested.price_egp-offer.value else requested.price_egp end))::bigint end
      else coalesce(current_package.price_egp,last_payment.price_egp)::bigint end,
      case when receipt.id is not null then 'receipt_pending'
        when renewal.id is not null then 'renewal_pending' else 'expired' end,
      case when receipt.id is not null then (receipt.created_at at time zone public.safe_timezone(auth.uid()))::date
        when renewal.id is not null then (renewal.created_at at time zone public.safe_timezone(auth.uid()))::date
        else c.access_until end
    -- Receipt and renewal describe the same pending sale; expiry is only a fallback.
    where receipt.id is not null or renewal.id is not null or (coalesce(partial.amount,0)=0
      and c.frozen_at is null and c.awaiting_plans_at is null and c.access_until<public.user_today(auth.uid()))
  ) debt
  where c.captain_id=auth.uid() and c.archived_at is null and not c.pending
  order by c.player_id, debt.reason;
end;
$$;
revoke all on function public.captain_money_owed() from public,anon,authenticated;
grant execute on function public.captain_money_owed() to authenticated;

commit;
