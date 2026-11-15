alter table public.coach_invites add column start_gate boolean not null default false;
alter table public.form_requests add column blocks_access boolean not null default false;

-- Unique slots constrain the count even if a future trusted writer bypasses the RPC.
create table public.coach_invite_forms (
  invite_id uuid not null references public.coach_invites(id) on delete cascade,
  form_id uuid not null references public.forms(id),
  position smallint not null check (position between 0 and 4),
  primary key (invite_id,form_id),
  unique (invite_id,position)
);
create index coach_invite_forms_form on public.coach_invite_forms(form_id);
alter table public.coach_invite_forms enable row level security;
create policy active_caller on public.coach_invite_forms as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy invite_forms_owner on public.coach_invite_forms for select to authenticated using (
  exists (select 1 from public.coach_invites i where i.id=invite_id and i.captain_id=(select auth.uid())));
revoke all on public.coach_invite_forms from public,anon,authenticated;
grant select on public.coach_invite_forms to authenticated;
create index form_requests_start_gate on public.form_requests(player_id) where blocks_access;

create function public.create_player_invite_v2(p_name text,p_whatsapp text,p_package uuid,p_kind text,p_quantity int,
  p_price_egp int,p_paid_egp int,p_free_trial boolean,p_starts_on date,p_form_ids uuid[],p_gate boolean)
returns text language plpgsql security definer set search_path = '' as $$
declare v_code text; v_invite uuid;
begin
  perform public.require_active_caller();
  if p_form_ids is null or p_gate is null or cardinality(p_form_ids)>5
    or cardinality(p_form_ids)<>(select count(distinct id) from unnest(p_form_ids) id) then
    raise exception 'invalid invite forms' using errcode='22023';
  end if;
  -- Serialize validation with edits/archival of the selected forms.
  perform 1 from public.forms where id=any(p_form_ids) order by id for update;
  if exists (select 1 from unnest(p_form_ids) selected(form_id) where not exists (
    select 1 from public.forms f where f.id=selected.form_id and f.captain_id=auth.uid() and f.archived_at is null
      and exists (select 1 from public.form_questions q where q.form_id=f.id))) then
    raise exception 'invalid invite forms' using errcode='22023';
  end if;
  v_code := public.create_player_invite(p_name,p_whatsapp,p_package,p_kind,p_quantity,
    p_price_egp,p_paid_egp,p_free_trial,p_starts_on);
  update public.coach_invites set start_gate=p_gate and cardinality(p_form_ids)>0
    where code=v_code and captain_id=auth.uid() returning id into strict v_invite;
  insert into public.coach_invite_forms(invite_id,form_id,position)
    select v_invite,id,(position-1)::smallint from unnest(p_form_ids) with ordinality as f(id,position);
  return v_code;
end; $$;
revoke all on function public.create_player_invite_v2(text,text,uuid,text,int,int,int,boolean,date,uuid[],boolean) from public,anon,authenticated;
grant execute on function public.create_player_invite_v2(text,text,uuid,text,int,int,int,boolean,date,uuid[],boolean) to authenticated;

create or replace function public.redeem_invite(p_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_invite public.coach_invites; v_id uuid; d int; v_captain public.profiles;
begin
  perform public.require_active_caller();
  if (select role from public.profiles where id = (select auth.uid())) <> 'player' then
    raise exception 'only players can redeem invites' using errcode = '42501';
  end if;
  select * into v_invite from public.coach_invites
    where code = p_code and redeemed_at is null and expires_at > now() for update;
  if not found then raise exception 'invite is invalid or expired' using errcode = 'P0002'; end if;
  if v_invite.kind is not null then
    -- A reserved link skips INSERT triggers, so repeat their target guards under
    -- the same captain lock. It already occupies a slot in the player limit.
    select * into strict v_captain from public.profiles where id=v_invite.captain_id for update;
    if v_captain.suspended_at is not null then
      raise exception 'captain is suspended' using errcode='42501';
    end if;
    if v_captain.captain_status <> 'approved' and not exists
      (select 1 from public.admins where user_id=v_captain.id) then
      raise exception 'captain approval required' using errcode='42501';
    end if;
    select id into v_id from public.coach_clients where captain_id=v_invite.captain_id
      and player_id=auth.uid() and archived_at is null and pending for update;
  end if;
  if v_id is null then
    v_id := security_private.attach_coach_player(security_private.starter_uuidv7(),v_invite.captain_id,auth.uid(),v_invite.access_until);
    update public.coach_clients set pending = true where id = v_id;
  end if;
  if v_invite.kind is not null then
    d := case when v_invite.kind='days' then v_invite.quantity else v_invite.access_until-v_invite.starts_on end;
    perform security_private.activate_player_plan(v_id,v_invite.package_id,v_invite.kind,v_invite.quantity,
      v_invite.price_egp,v_invite.paid_egp,v_invite.free_trial,v_invite.starts_on,v_invite.access_until,d);
  end if;
  insert into public.form_requests(id,form_id,player_id,captain_id,sent_at,due_at,blocks_access)
    select security_private.starter_uuidv7(),f.form_id,auth.uid(),v_invite.captain_id,now(),null,v_invite.start_gate
    from public.coach_invite_forms f where f.invite_id=v_invite.id order by f.position;
  update public.coach_invites set redeemed_by = auth.uid(), redeemed_at = now() where id = v_invite.id;
  return v_id;
end; $$;
