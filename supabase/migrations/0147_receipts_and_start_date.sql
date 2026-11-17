begin;

alter table public.coach_clients add column subscription_starts_on date;

create or replace function public.player_can_write()
returns boolean language plpgsql stable security definer set search_path = '' as $$ begin
  perform public.require_active_caller();
  return exists (select 1 from public.coach_clients where player_id=(select auth.uid())
    and archived_at is null and not pending and frozen_at is null
    and (subscription_starts_on is null or public.user_today(captain_id) >= subscription_starts_on)
    and (awaiting_plans_at is not null or public.user_today(captain_id) <= access_until));
end; $$;

-- Preserve redemption's current guards, form handling and activation behavior.
do $migration$
declare definition text; old_text text := $old$  update public.coach_invites set redeemed_by = auth.uid(), redeemed_at = now() where id = v_invite.id;$old$;
begin
  definition := pg_catalog.pg_get_functiondef('public.redeem_invite(text)'::regprocedure);
  if (length(definition)-length(replace(definition,old_text,'')))/length(old_text) <> 1 then
    raise exception 'subscription start redemption drift';
  end if;
  execute replace(definition,old_text,$new$  update public.coach_clients set subscription_starts_on=v_invite.starts_on where id=v_id;
  update public.coach_invites set redeemed_by = auth.uid(), redeemed_at = now() where id = v_invite.id;$new$);
end;
$migration$;

-- The captain reads the same partial-debt balance that collection enforces.
create function public.receipt_debt(p_player uuid) returns bigint
language plpgsql stable security definer set search_path='' as $$
begin
  perform public.require_active_caller();
  -- Archived players' receipts stay listed for declining; they owe this captain nothing actionable.
  if not public.is_captain_of(p_player) then return 0; end if;
  return (select coalesce(sum(security_private.payment_due(p.id)),0)
    from public.player_payments p where p.captain_id=auth.uid() and p.player_id=p_player);
end; $$;
revoke all on function public.receipt_debt(uuid) from public,anon,authenticated;
grant execute on function public.receipt_debt(uuid) to authenticated;

-- Keep photo/revision checks, retry, payment-method context and notification flow.
do $migration$
declare definition text;
  old_text text := $old$  begin
    perform public.renew_player_offer(r.player_id,offer,p_days=>p_days,p_package=>pkg,p_amount=>r.amount_egp);
  exception when sqlstate 'P0206' then
    perform public.renew_player_offer(r.player_id,null,p_days=>p_days,p_package=>pkg,p_amount=>r.amount_egp);
  end;$old$;
begin
  definition := pg_catalog.pg_get_functiondef('public.accept_payment_receipt(uuid,integer,uuid,text,text,integer)'::regprocedure);
  if (length(definition)-length(replace(definition,old_text,'')))/length(old_text) <> 1 then
    raise exception 'installment receipt acceptance drift';
  end if;
  execute replace(definition,old_text,$new$  if r.renewal_request_id is null and public.receipt_debt(r.player_id)>0 then
    -- Collection locks the membership and rejects any amount above the balance.
    perform public.collect_player_payment(r.player_id,r.amount_egp);
  else
    begin
      perform public.renew_player_offer(r.player_id,offer,p_days=>p_days,p_package=>pkg,p_amount=>r.amount_egp);
    exception when sqlstate 'P0206' then
      perform public.renew_player_offer(r.player_id,null,p_days=>p_days,p_package=>pkg,p_amount=>r.amount_egp);
    end;
  end if;$new$);
end;
$migration$;

commit;
