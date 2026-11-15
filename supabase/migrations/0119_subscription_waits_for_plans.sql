begin;

alter table public.coach_clients add column awaiting_plans_at timestamptz;

create function security_private.start_player_subscription(p_link uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.coach_clients; waited int;
begin
  select * into c from public.coach_clients where id=p_link for update;
  if not found or c.awaiting_plans_at is null then return; end if;
  waited := greatest(0,floor(extract(epoch from (now()-c.awaiting_plans_at))/86400)::int);
  update public.coach_clients set access_until=access_until+waited,
    billing_started_at=now(),awaiting_plans_at=null,
    -- A later unfreeze must only credit time after this waiting period ends.
    frozen_at=case when frozen_at is not null then now() end where id=c.id;
  update public.player_payments set period_start=period_start+waited,period_end=period_end+waited
    where id=(select id from public.player_payments
      where captain_id=c.captain_id and player_id=c.player_id and created_at>=c.created_at
      order by created_at desc,id desc limit 1);
end;
$$;
revoke all on function security_private.start_player_subscription(uuid) from public,anon,authenticated;

create function public.start_player_subscription(p_link uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_active_caller();
  perform 1 from public.coach_clients where id=p_link and captain_id=auth.uid()
    and archived_at is null and not pending for update;
  if not found or not exists (select 1 from public.profiles where id=auth.uid() and role='captain') then
    raise exception 'own active captain link required' using errcode='42501';
  end if;
  perform security_private.start_player_subscription(p_link);
end;
$$;
revoke all on function public.start_player_subscription(uuid) from public,anon,authenticated;
grant execute on function public.start_player_subscription(uuid) to authenticated;

create function security_private.start_subscription_when_plans_ready()
returns trigger language plpgsql security definer set search_path = '' as $$
declare link uuid;
begin
  if new.is_template or new.player_id is null or new.status<>'active' then return new; end if;
  select id into link from public.coach_clients where player_id=new.player_id and captain_id=new.captain_id
    and archived_at is null and not pending and awaiting_plans_at is not null for update;
  if link is not null
    and exists (select 1 from public.programs where player_id=new.player_id and captain_id=new.captain_id
      and status='active' and not is_template)
    and exists (select 1 from public.nutrition_plans where player_id=new.player_id and captain_id=new.captain_id
      and status='active' and not is_template) then
    perform security_private.start_player_subscription(link);
  end if;
  return new;
end;
$$;
revoke all on function security_private.start_subscription_when_plans_ready() from public,anon,authenticated;
create trigger subscription_plans_ready after insert or update on public.programs
  for each row when (new.status='active' and not new.is_template)
  execute function security_private.start_subscription_when_plans_ready();
create trigger subscription_plans_ready after insert or update on public.nutrition_plans
  for each row when (new.status='active' and not new.is_template)
  execute function security_private.start_subscription_when_plans_ready();

-- Patch the installed definitions to retain offer, timezone and payment-method changes.
do $migration$
declare definition text; patch record; target regprocedure;
begin
  foreach target in array array[
    'security_private.activate_player_plan(uuid,uuid,text,integer,integer,integer,boolean,date,date,integer)'::regprocedure,
    'security_private.activate_player_plan_offer(uuid,uuid,text,integer,integer,integer,boolean,date,date,integer,uuid)'::regprocedure
  ] loop
    definition := pg_get_functiondef(target);
    if (length(definition)-length(replace(definition,'billing_started_at=now(),access_until=p_end','')))
      /length('billing_started_at=now(),access_until=p_end') <> 1 then
      raise exception 'Subscription activation source drift: %',target;
    end if;
    execute replace(definition,'billing_started_at=now(),access_until=p_end',
      $new$awaiting_plans_at=case when
        exists (select 1 from public.programs where player_id=c.player_id and captain_id=c.captain_id and status='active' and not is_template)
        and exists (select 1 from public.nutrition_plans where player_id=c.player_id and captain_id=c.captain_id and status='active' and not is_template)
        then null else now() end,billing_started_at=now(),access_until=p_end$new$);
  end loop;
  for patch in select * from (values
    ('security_private.deduct_pt_session()',
      'and not pending and frozen_at is null',
      'and not pending and frozen_at is null and awaiting_plans_at is null'),
    ('public.queue_expiry_reminders(date)',
      'and not c.pending and c.frozen_at is null',
      'and not c.pending and c.frozen_at is null and c.awaiting_plans_at is null'),
    ('public.set_player_frozen(uuid,boolean)',
      'access_until=access_until+greatest(0,floor(extract(epoch from (now()-c.frozen_at))/86400)::int)',
      'access_until=access_until+case when c.awaiting_plans_at is null then greatest(0,floor(extract(epoch from (now()-c.frozen_at))/86400)::int) else 0 end')
  ) as patches(signature,old_sql,new_sql) loop
    definition := pg_get_functiondef(patch.signature::regprocedure);
    if (length(definition)-length(replace(definition,patch.old_sql,'')))/length(patch.old_sql) <> 1 then
      raise exception 'Subscription source drift: %',patch.signature;
    end if;
    execute replace(definition,patch.old_sql,patch.new_sql);
  end loop;
end $migration$;

commit;
