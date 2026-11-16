begin;

create function security_private.notify_assessment_requested() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  -- The schedule worker inserts its own initial notice after creating the request.
  -- Deferring until commit lets that path finish before deciding whether to notify.
  if exists (select 1 from security_private.assessment_deliveries where request_id=new.id)
    or not exists (select 1 from public.form_requests where id=new.id) then return new; end if;
  insert into public.notifications(user_id,type,payload)
    select recipient.id,'form_requested',jsonb_build_object(
      'name',(select title from public.forms where id=new.form_id),'request_id',new.id,'form_id',new.form_id)
    from public.profiles recipient where recipient.id=new.player_id
      and recipient.id is distinct from auth.uid() and recipient.suspended_at is null;
  return new;
exception when others then
  -- Notification delivery must never roll back creation of a real assessment request.
  return new;
end $$;
revoke all on function security_private.notify_assessment_requested() from public,anon,authenticated;
create constraint trigger assessment_requested after insert on public.form_requests
  deferrable initially deferred for each row execute function security_private.notify_assessment_requested();

create function security_private.notify_assessment_replied() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if not ((old.reviewed_at is null and new.reviewed_at is not null)
    or (new.captain_reply is distinct from old.captain_reply and nullif(btrim(new.captain_reply),'') is not null)) then
    return new;
  end if;
  insert into public.notifications(user_id,type,payload)
    select recipient.id,'coach_replied',jsonb_build_object('kind','assessment',
      'request_id',new.id,'form_id',new.form_id,'player_id',new.player_id,
      'captain_name',(select full_name from public.profiles where id=new.captain_id))
    from public.profiles recipient where recipient.id=new.player_id
      and recipient.id is distinct from auth.uid() and recipient.suspended_at is null;
  return new;
exception when others then
  -- Notification delivery must never roll back a captain's review or reply.
  return new;
end $$;
revoke all on function security_private.notify_assessment_replied() from public,anon,authenticated;
create trigger assessment_replied after update of reviewed_at,captain_reply on public.form_requests
  for each row execute function security_private.notify_assessment_replied();
commit;
