-- T-253: immutable uploaded images, one pending receipt, and atomic decisions.
begin;
create table public.payment_receipts (
  id uuid primary key,
  player_id uuid not null references public.profiles(id) on delete cascade,
  captain_id uuid not null references public.profiles(id) on delete cascade,
  renewal_request_id uuid references public.player_renewal_requests(id),
  amount_egp int not null check (amount_egp between 1 and 100000),
  method text check (method in ('instapay','vodafone_cash','cash','bank_transfer')),
  photo_path text not null check (split_part(photo_path,'/',1)=player_id::text
    and split_part(photo_path,'/',2)=captain_id::text
    and photo_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'),
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  revision int not null default 1 check (revision>0),
  decline_reason text check (char_length(decline_reason) between 1 and 200
    and decline_reason=btrim(decline_reason) and decline_reason !~ E'[\n\r]'),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  check (player_id<>captain_id),
  check ((decided_at is not null)=(status<>'pending')),
  check ((decline_reason is not null)=(status='declined'))
);
create unique index payment_receipts_pending on public.payment_receipts(captain_id,player_id) where status='pending';
create index payment_receipts_player on public.payment_receipts(player_id,created_at desc);
create index payment_receipts_renewal on public.payment_receipts(renewal_request_id);
create function security_private.guard_receipted_renewal() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.status<>old.status and exists (select 1 from public.payment_receipts r
    where r.renewal_request_id=old.id and r.status='pending') then
    raise exception 'decide pending receipt first' using errcode='22023';
  end if;
  return new;
end; $$;
revoke all on function security_private.guard_receipted_renewal() from public,anon,authenticated;
create trigger renewal_receipt_guard before update of status on public.player_renewal_requests
  for each row execute function security_private.guard_receipted_renewal();
alter table public.payment_receipts enable row level security;
revoke all on public.payment_receipts from public,anon,authenticated;
grant select on public.payment_receipts to authenticated;
create policy active_caller on public.payment_receipts as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy payment_receipts_read on public.payment_receipts for select to authenticated
  using (player_id=(select auth.uid()) or (captain_id=(select auth.uid()) and public.is_captain_of(player_id)));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values ('payment-receipts','payment-receipts',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy payment_receipts_active_caller on storage.objects as restrictive for all to authenticated
  using (bucket_id<>'payment-receipts' or not (select public.is_suspended()))
  with check (bucket_id<>'payment-receipts' or not (select public.is_suspended()));
create policy payment_receipts_upload on storage.objects for insert to authenticated
  with check (bucket_id='payment-receipts' and split_part(name,'/',1)=(select auth.uid())::text
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'
    and exists (select 1 from public.coach_clients c where c.player_id=(select auth.uid())
      and c.captain_id::text=split_part(name,'/',2) and c.archived_at is null and not c.pending));
create policy payment_receipts_photo_read on storage.objects for select to authenticated
  using (bucket_id='payment-receipts' and (split_part(name,'/',1)=(select auth.uid())::text
    or (split_part(name,'/',2)=(select auth.uid())::text and exists (
      select 1 from public.payment_receipts r where r.photo_path=name and r.captain_id=(select auth.uid())
        and public.is_captain_of(r.player_id)))));

create function public.submit_payment_receipt(p_id uuid,p_captain uuid,p_amount int,p_method text,p_photo text,
  p_renewal uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
  perform public.require_active_caller();
  -- Renewal decisions already lock the request before the membership.
  if p_renewal is not null then
    perform 1 from public.player_renewal_requests r where r.id=p_renewal and r.player_id=auth.uid()
      and r.captain_id=p_captain and r.status='pending' for update;
    if not found then raise exception 'renewal unavailable' using errcode='22023'; end if;
  end if;
  perform 1 from public.coach_clients c where c.player_id=auth.uid() and c.captain_id=p_captain
    and c.archived_at is null and not c.pending for update;
  if not found then raise exception 'membership unavailable' using errcode='42501'; end if;
  if split_part(p_photo,'/',1) is distinct from auth.uid()::text
    or split_part(p_photo,'/',2) is distinct from p_captain::text
    or not exists (select 1 from storage.objects where bucket_id='payment-receipts' and name=p_photo) then
    raise exception 'uploaded photo required' using errcode='22023';
  end if;
  insert into public.payment_receipts(id,player_id,captain_id,renewal_request_id,amount_egp,method,photo_path)
    values (p_id,auth.uid(),p_captain,p_renewal,p_amount,p_method,p_photo)
    on conflict (captain_id,player_id) where status='pending' do update
      set renewal_request_id=excluded.renewal_request_id,amount_egp=excluded.amount_egp,
        method=excluded.method,photo_path=excluded.photo_path,created_at=now(),revision=public.payment_receipts.revision+1
    returning id into result;
  return result;
end; $$;

create function public.accept_payment_receipt(p_receipt uuid,p_days int default null,p_package uuid default null,
  p_message text default null,p_photo text default null,p_revision int default null) returns void
language plpgsql security definer set search_path='' as $$
declare r public.payment_receipts; request public.player_renewal_requests; pkg uuid; offer uuid; expected_renewal uuid;
begin
  perform public.require_active_caller();
  select renewal_request_id into expected_renewal from public.payment_receipts where id=p_receipt and captain_id=auth.uid();
  if not found then raise exception 'receipt unavailable' using errcode='42501'; end if;
  if expected_renewal is not null then
    perform 1 from public.player_renewal_requests where id=expected_renewal for update;
  end if;
  perform 1 from public.coach_clients c join public.payment_receipts receipt
    on receipt.player_id=c.player_id and receipt.captain_id=c.captain_id
    where receipt.id=p_receipt and c.captain_id=auth.uid() and c.archived_at is null and not c.pending for update of c;
  if not found then raise exception 'receipt unavailable' using errcode='42501'; end if;
  select * into r from public.payment_receipts where id=p_receipt and captain_id=auth.uid() for update;
  if r.renewal_request_id is distinct from expected_renewal then raise exception 'receipt changed' using errcode='22023'; end if;
  if r.photo_path is distinct from p_photo or r.revision is distinct from p_revision then
    raise exception 'receipt changed' using errcode='22023';
  end if;
  if r.status='accepted' then return; end if;
  if r.status<>'pending' then raise exception 'receipt already declined' using errcode='22023'; end if;
  if p_message is null or char_length(btrim(p_message)) not between 1 and 1000 then
    raise exception 'confirmation message required' using errcode='22023';
  end if;
  pkg := p_package;
  if r.renewal_request_id is not null then
    select * into request from public.player_renewal_requests where id=r.renewal_request_id for update;
    if request.status<>'pending' or request.player_id<>r.player_id or request.captain_id<>r.captain_id then
      raise exception 'renewal already decided' using errcode='22023';
    end if;
    pkg := request.package_id; offer := request.offer_id;
  end if;
  -- This is the manual payment path: dates, session balances and sale snapshots stay there.
  -- 0105 tags the new player_payments row with the method the player chose on the receipt.
  perform set_config('kochivo.payment_method',coalesce(r.method,''),true);
  begin
    perform public.renew_player_offer(r.player_id,offer,p_days=>p_days,p_package=>pkg,p_amount=>r.amount_egp);
  exception when sqlstate 'P0206' then
    perform public.renew_player_offer(r.player_id,null,p_days=>p_days,p_package=>pkg,p_amount=>r.amount_egp);
  end;
  perform set_config('kochivo.payment_method','',true);
  update public.payment_receipts set status='accepted',decided_at=now() where id=r.id;
  if r.renewal_request_id is not null then
    update public.player_renewal_requests set status='approved',updated_at=now(),decided_at=now() where id=r.renewal_request_id;
  end if;
  -- The existing chat trigger also delivers the player's notification. The receipt id deduplicates it.
  insert into public.chat_messages(id,captain_id,player_id,sender_id,body)
    values (r.id,r.captain_id,r.player_id,r.captain_id,btrim(p_message));
end; $$;

create function public.decline_payment_receipt(p_receipt uuid,p_reason text,p_photo text default null,p_revision int default null) returns void
language plpgsql security definer set search_path='' as $$
declare r public.payment_receipts;
begin
  perform public.require_active_caller();
  if p_reason is null or char_length(btrim(p_reason)) not between 1 and 200 or p_reason ~ E'[\n\r]' then
    raise exception 'one-line reason required' using errcode='22023';
  end if;
  perform 1 from public.coach_clients c join public.payment_receipts receipt
    on receipt.player_id=c.player_id and receipt.captain_id=c.captain_id
    where receipt.id=p_receipt and c.captain_id=auth.uid() and c.archived_at is null and not c.pending for update of c;
  if not found then raise exception 'receipt unavailable' using errcode='42501'; end if;
  select * into r from public.payment_receipts where id=p_receipt and captain_id=auth.uid() for update;
  if r.photo_path is distinct from p_photo or r.revision is distinct from p_revision then
    raise exception 'receipt changed' using errcode='22023';
  end if;
  if r.status='declined' then return; end if;
  if r.status<>'pending' then raise exception 'receipt already accepted' using errcode='22023'; end if;
  update public.payment_receipts set status='declined',decided_at=now(),decline_reason=btrim(p_reason) where id=r.id;
end; $$;
revoke all on function public.submit_payment_receipt(uuid,uuid,int,text,text,uuid),
  public.accept_payment_receipt(uuid,int,uuid,text,text,int),public.decline_payment_receipt(uuid,text,text,int) from public,anon,authenticated;
grant execute on function public.submit_payment_receipt(uuid,uuid,int,text,text,uuid),
  public.accept_payment_receipt(uuid,int,uuid,text,text,int),public.decline_payment_receipt(uuid,text,text,int) to authenticated;
commit;
