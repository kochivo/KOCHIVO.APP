-- T-206: additive catalog and immutable sale snapshots; no public UI changes.
begin;
create function public.valid_tier_features(value jsonb) returns boolean
language sql immutable set search_path='' as $$
  select case when jsonb_typeof(value)='array' then jsonb_array_length(value)<=10 and not exists
    (select 1 from jsonb_array_elements(value) e where jsonb_typeof(e)<>'string' or char_length(e #>> '{}')>80) else false end;
$$;
create table public.captain_package_tiers (
  id uuid primary key default security_private.starter_uuidv7(),
  captain_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  description text not null default '' check (char_length(description)<=80),
  color text not null default 'muted' check (color in ('muted','lime','warn','danger')),
  position int not null default 0 check (position>=0), features jsonb not null default '[]' check (public.valid_tier_features(features)),
  is_featured boolean not null default false, archived_at timestamptz, created_at timestamptz not null default now(),
  unique(id,captain_id)
);
create index package_tiers_captain on public.captain_package_tiers(captain_id,position);
create unique index package_tiers_featured on public.captain_package_tiers(captain_id) where is_featured;
alter table public.captain_packages add column tier_id uuid references public.captain_package_tiers(id),
  add constraint package_tier_owner foreign key(tier_id,captain_id) references public.captain_package_tiers(id,captain_id);
create index captain_packages_tier on public.captain_packages(tier_id);
insert into public.captain_package_tiers(captain_id,name) select distinct captain_id,'أساسي' from public.captain_packages;
update public.captain_packages p set tier_id=t.id from public.captain_package_tiers t where t.captain_id=p.captain_id;
grant update(tier_id) on public.captain_packages to authenticated;
create table public.captain_offers (
  id uuid primary key default security_private.starter_uuidv7(), captain_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  kind text not null check (kind in ('percent','amount','bonus_days')), value numeric not null,
  scope text not null default 'all' check (scope in ('all','tiers','packages')),
  tier_ids uuid[] not null default '{}', package_ids uuid[] not null default '{}',
  starts_at timestamptz not null, ends_at timestamptz not null check (ends_at>starts_at),
  for_new boolean not null default true, for_renewals boolean not null default true check (for_new or for_renewals),
  max_uses int check (max_uses>0), used_count int not null default 0 check (used_count>=0),
  paused_at timestamptz, created_at timestamptz not null default now(),
  check ((kind='percent' and value between 1 and 90) or (kind='amount' and value>0)
    or (kind='bonus_days' and value between 1 and 365 and value=trunc(value))),
  check ((scope='all' and cardinality(tier_ids)=0 and cardinality(package_ids)=0)
    or (scope='tiers' and cardinality(tier_ids)>0 and cardinality(package_ids)=0)
    or (scope='packages' and cardinality(package_ids)>0 and cardinality(tier_ids)=0))
);
create index captain_offers_captain on public.captain_offers(captain_id,starts_at,ends_at);
create function security_private.validate_offer_targets() returns trigger
language plpgsql security definer set search_path='' as $$ begin
  if exists(select 1 from unnest(new.tier_ids) targets(target_id) where target_id is null or not exists
      (select 1 from public.captain_package_tiers t where t.id=targets.target_id and t.captain_id=new.captain_id))
    or exists(select 1 from unnest(new.package_ids) targets(target_id) where target_id is null or not exists
      (select 1 from public.captain_packages p where p.id=targets.target_id and p.captain_id=new.captain_id)) then
    raise exception 'offer targets must belong to captain' using errcode='23514';
  end if; return new;
end; $$;
create trigger offer_targets before insert or update on public.captain_offers for each row execute function security_private.validate_offer_targets();
-- Mirror coach_public_profile (0064), without exposing private profile columns.
create function public.package_catalog_published(p_captain uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.profiles p where p.id=p_captain and p.public_slug is not null
    and p.role='captain' and p.captain_status='approved' and p.role_confirmed and p.suspended_at is null
    and p.demo_expires_at is null and not exists(select 1 from public.admins a where a.user_id=p.id));
$$;
revoke all on function public.package_catalog_published(uuid) from public;
grant execute on function public.package_catalog_published(uuid) to anon,authenticated;
alter table public.captain_package_tiers enable row level security;
alter table public.captain_offers enable row level security;
revoke all on public.captain_package_tiers,public.captain_offers from public,anon,authenticated;
grant select on public.captain_package_tiers,public.captain_offers,public.captain_packages to anon,authenticated;
grant insert,delete on public.captain_package_tiers to authenticated;
grant update(name,description,color,position,features,is_featured,archived_at) on public.captain_package_tiers to authenticated;
-- The usage ledger is server-written; owners cannot reset the count to reopen a full offer.
grant insert(id,captain_id,name,kind,value,scope,tier_ids,package_ids,starts_at,ends_at,for_new,for_renewals,max_uses,paused_at),
  update(name,kind,value,scope,tier_ids,package_ids,starts_at,ends_at,for_new,for_renewals,max_uses,paused_at),delete on public.captain_offers to authenticated;
create policy tier_owner on public.captain_package_tiers for all to authenticated
  using (captain_id=(select auth.uid()) and exists(select 1 from public.profiles where id=(select auth.uid()) and role='captain'))
  with check (captain_id=(select auth.uid()) and exists(select 1 from public.profiles where id=(select auth.uid()) and role='captain'));
create policy offer_owner on public.captain_offers for all to authenticated
  using (captain_id=(select auth.uid()) and exists(select 1 from public.profiles where id=(select auth.uid()) and role='captain'))
  with check (captain_id=(select auth.uid()) and exists(select 1 from public.profiles where id=(select auth.uid()) and role='captain'));
create policy active_caller on public.captain_package_tiers as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy active_caller on public.captain_offers as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy public_tiers on public.captain_package_tiers for select to anon,authenticated
  using (archived_at is null and public.package_catalog_published(captain_id));
create policy public_packages on public.captain_packages for select to anon,authenticated
  using (archived_at is null and public.package_catalog_published(captain_id));
create policy public_offers on public.captain_offers for select to anon,authenticated
  using (paused_at is null and starts_at<=now() and ends_at>now() and (max_uses is null or used_count<max_uses)
    and public.package_catalog_published(captain_id));
alter table public.player_payments
  add column tier_id uuid references public.captain_package_tiers(id),
  add column offer_id uuid references public.captain_offers(id),
  add column list_price_egp int check (list_price_egp>=0), add column bonus_days int check (bonus_days between 0 and 365);
-- Base packages still cap at 365; only recorded bonus days extend that bound.
alter table public.player_payments drop constraint player_payments_days_check,
  add constraint player_payments_days_check check (days between 1 and 365+coalesce(bonus_days,0));
create index payment_tier on public.player_payments(tier_id);
create index payment_offer on public.player_payments(offer_id);
create function security_private.package_sale(p_captain uuid,p_package uuid,p_offer uuid,p_renewal boolean,p_price int)
returns jsonb language plpgsql security definer set search_path='' as $$
declare pkg public.captain_packages; offer public.captain_offers; price int := p_price; bonus int := 0;
begin
  select * into pkg from public.captain_packages where id=p_package and captain_id=p_captain;
  if p_offer is not null then
    select * into offer from public.captain_offers where id=p_offer and captain_id=p_captain for update;
    if not found or pkg.id is null or pkg.archived_at is not null or offer.paused_at is not null
      or offer.starts_at>now() or offer.ends_at<=now() or (offer.max_uses is not null and offer.used_count>=offer.max_uses)
      or (p_renewal and not offer.for_renewals) or (not p_renewal and not offer.for_new)
      or (offer.scope='tiers' and not coalesce(pkg.tier_id=any(offer.tier_ids),false))
      or (offer.scope='packages' and not pkg.id=any(offer.package_ids)) then
      raise exception 'offer unavailable: expired, paused, full or ineligible' using errcode='P0206';
    end if;
    price := greatest(0,round(case offer.kind when 'percent' then pkg.price_egp*(1-offer.value/100)
      when 'amount' then pkg.price_egp-offer.value else pkg.price_egp end))::int;
    bonus := case when offer.kind='bonus_days' then offer.value::int else 0 end;
    update public.captain_offers set used_count=used_count+1 where id=offer.id;
  end if;
  return jsonb_build_object('tier',pkg.tier_id,'offer',p_offer,'list',coalesce(pkg.price_egp,p_price),'price',price,
    'bonus',case when p_package is null then null else bonus end);
end; $$;
-- Retain current timezone, ownership, PT, freeze and trial behavior. Abort on schema drift.
do $migration$
declare patch record; definition text; renewal text; activation text; plan text;
begin
  for patch in select * from (values
    ('public.renew_player(uuid,integer,integer,integer,uuid)', 'declare c public.coach_clients;', 'declare sale jsonb; c public.coach_clients;'),
    ('public.renew_player(uuid,integer,integer,integer,uuid)', '  if p_days is null',
      E'  sale := security_private.package_sale(auth.uid(),p_package,null,true,p_price);\n  if p_days is null'),
    ('public.renew_player(uuid,integer,integer,integer,uuid)', '  v_start := greatest',
      E'  p_days := p_days+coalesce((sale->>''bonus'')::int,0);\n  v_start := greatest'),
    ('public.renew_player(uuid,integer,integer,integer,uuid)', 'price_egp,package_id)', 'price_egp,package_id,tier_id,offer_id,list_price_egp,bonus_days)'),
    ('public.renew_player(uuid,integer,integer,integer,uuid)', 'v_end,p_price,p_package);',
      'v_end,p_price,p_package,(sale->>''tier'')::uuid,(sale->>''offer'')::uuid,(sale->>''list'')::int,(sale->>''bonus'')::int);'),
    ('security_private.activate_player_plan(uuid,uuid,text,integer,integer,integer,boolean,date,date,integer)',
      'declare c public.coach_clients;', 'declare sale jsonb; c public.coach_clients;'),
    ('security_private.activate_player_plan(uuid,uuid,text,integer,integer,integer,boolean,date,date,integer)',
      '  update public.coach_clients set billing_started_at',
      E'  sale := security_private.package_sale(c.captain_id,p_package,null,false,p_price);\n  p_days := p_days+coalesce((sale->>''bonus'')::int,0);\n  p_end := p_end+coalesce((sale->>''bonus'')::int,0);\n  update public.coach_clients set billing_started_at'),
    ('security_private.activate_player_plan(uuid,uuid,text,integer,integer,integer,boolean,date,date,integer)',
      'package_id,notes)', 'package_id,notes,tier_id,offer_id,list_price_egp,bonus_days)'),
    ('security_private.activate_player_plan(uuid,uuid,text,integer,integer,integer,boolean,date,date,integer)',
      'p_package,case when p_trial then ''free_trial'' end);',
      'p_package,case when p_trial then ''free_trial'' end,(sale->>''tier'')::uuid,(sale->>''offer'')::uuid,(sale->>''list'')::int,(sale->>''bonus'')::int);')
  ) as patches(signature,old_sql,new_sql) loop
    definition := pg_get_functiondef(patch.signature::regprocedure);
    if (length(definition)-length(replace(definition,patch.old_sql,'')))/length(patch.old_sql)<>1 then
      raise exception 'package sale source drift: % / %',patch.signature,patch.old_sql;
    end if; execute replace(definition,patch.old_sql,patch.new_sql);
  end loop;
  renewal := pg_get_functiondef('public.renew_player(uuid,integer,integer,integer,uuid)'::regprocedure);
  renewal := 'create function public.renew_player_offer(p_player uuid,p_offer uuid,p_days int default null,p_amount int default null,p_price int default null,p_package uuid default null) RETURNS '
    ||split_part(renewal,'RETURNS ',2);
  renewal := replace(renewal,'package_sale(auth.uid(),p_package,null,true,p_price)',
    E'package_sale(auth.uid(),p_package,p_offer,true,p_price);\n  p_price := (sale->>''price'')::int');
  execute renewal;
  plan := pg_get_functiondef('security_private.activate_player_plan(uuid,uuid,text,integer,integer,integer,boolean,date,date,integer)'::regprocedure);
  plan := 'create function security_private.activate_player_plan_offer(p_link uuid,p_package uuid,p_kind text,p_quantity int,p_price int,p_paid int,p_trial boolean,p_start date,p_end date,p_days int,p_offer uuid) RETURNS '
    ||split_part(plan,'RETURNS ',2);
  plan := replace(plan,'package_sale(c.captain_id,p_package,null,false,p_price)',
    E'package_sale(c.captain_id,p_package,p_offer,false,p_price);\n  if p_trial and p_offer is not null then raise exception ''trial cannot use offer'' using errcode=''22023''; end if;\n  p_price := (sale->>''price'')::int');
  execute plan;
  activation := pg_get_functiondef('public.activate_player(uuid,uuid,text,integer,integer,integer,boolean)'::regprocedure);
  if position('today,today+d,d);' in activation)=0 then raise exception 'activation source drift'; end if;
  activation := 'create function public.activate_player_offer(p_link uuid,p_offer uuid,p_package uuid,p_kind text,p_quantity int,p_price_egp int,p_paid_egp int,p_free_trial boolean) RETURNS '
    ||split_part(activation,'RETURNS ',2);
  activation := replace(replace(activation,'security_private.activate_player_plan(',
    'security_private.activate_player_plan_offer('),'today,today+d,d);','today,today+d,d,p_offer);');
  execute activation;
end $migration$;
revoke all on function public.valid_tier_features(jsonb),security_private.validate_offer_targets(),
  security_private.package_sale(uuid,uuid,uuid,boolean,int),
  security_private.activate_player_plan_offer(uuid,uuid,text,int,int,int,boolean,date,date,int,uuid) from public,anon,authenticated;
-- CHECK functions execute as the caller; this validates JSON only and reads no data.
grant execute on function public.valid_tier_features(jsonb) to authenticated;
revoke all on function public.renew_player_offer(uuid,uuid,int,int,int,uuid),
  public.activate_player_offer(uuid,uuid,uuid,text,int,int,int,boolean) from public,anon,authenticated;
grant execute on function public.renew_player_offer(uuid,uuid,int,int,int,uuid),
  public.activate_player_offer(uuid,uuid,uuid,text,int,int,int,boolean) to authenticated;
create function public.player_package_tier(p_player uuid) returns setof public.captain_package_tiers
language plpgsql stable security definer set search_path='' as $$ begin
  perform public.require_active_caller();
  return query select t.* from public.coach_clients c
    cross join lateral (select p.package_id from public.player_payments p where p.captain_id=c.captain_id
      and p.player_id=c.player_id and p.period_start<=public.user_today(c.captain_id)
      order by p.period_start desc,p.created_at desc,p.id desc limit 1) p
    join public.captain_packages pkg on pkg.id=p.package_id
    join public.captain_package_tiers t on t.id=pkg.tier_id
    where c.player_id=p_player and (c.player_id=auth.uid() or c.captain_id=auth.uid())
      and c.archived_at is null and not c.pending and c.frozen_at is null
      and c.access_until>=public.user_today(c.captain_id) and t.archived_at is null;
end; $$;
revoke all on function public.player_package_tier(uuid) from public,anon;
grant execute on function public.player_package_tier(uuid) to authenticated;
commit;
