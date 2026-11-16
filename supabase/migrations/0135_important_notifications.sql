begin;
do $$ declare expression text; begin
  select pg_get_constraintdef(oid) into expression from pg_constraint
    where conrelid='public.notifications'::regclass and conname='notifications_type_check';
  if expression is null then raise exception 'Missing notifications_type_check'; end if;
  alter table public.notifications drop constraint notifications_type_check;
  execute 'alter table public.notifications add constraint notifications_type_check check (' ||
    substring(expression from 7) || ' or type in (''checkin_submitted'',''form_answered'',''swap_requested'',
      ''form_check_submitted'',''receipt_submitted'',''coach_replied'',''swap_decided''))';
end $$;

create function security_private.notify_important_submission() returns trigger
language plpgsql security definer set search_path='' as $$
declare event_type text; data jsonb;
begin
  if tg_table_name='form_requests' then
    if not (old.answered_at is null and new.answered_at is not null) then return new; end if;
    event_type := 'form_answered';
    data := jsonb_build_object('request_id',new.id,'form_id',new.form_id);
  elsif tg_table_name='payment_receipts' then
    if tg_op='UPDATE' then
      if not (old.status='declined' and new.status='pending' and new.revision>old.revision) then return new; end if;
    end if;
    event_type := 'receipt_submitted';
    data := jsonb_build_object('receipt_id',new.id);
  elsif tg_table_name='check_ins' then
    event_type := 'checkin_submitted';
    data := jsonb_build_object('checkin_id',new.id);
  elsif tg_table_name='form_checks' then
    event_type := 'form_check_submitted';
    data := jsonb_build_object('form_check_id',new.id);
  elsif tg_table_name='exercise_swap_requests' then
    if new.captain_id=auth.uid() then
      -- answer_pain creates and approves these in one transaction, then sends pain_answered.
      perform pg_catalog.set_config('kochivo.captain_generated_swaps',
        (coalesce(nullif(pg_catalog.current_setting('kochivo.captain_generated_swaps',true),''),'[]')::jsonb
          || jsonb_build_array(new.id))::text,true);
      return new;
    end if;
    event_type := 'swap_requested';
    data := jsonb_build_object('request_id',new.id,'program_exercise_id',new.program_exercise_id);
  else return new;
  end if;
  insert into public.notifications(user_id,type,payload)
    select recipient.id,event_type,data || jsonb_build_object('player_id',new.player_id,
      'display_name',(select full_name from public.profiles where id=new.player_id))
    from public.profiles recipient where recipient.id=new.captain_id
      and recipient.id is distinct from auth.uid() and recipient.suspended_at is null;
  return new;
exception when others then
  -- Notification delivery must never roll back the source submission or resubmission.
  return new;
end $$;
revoke all on function security_private.notify_important_submission() from public,anon,authenticated;
create trigger important_checkin_submitted after insert on public.check_ins
  for each row execute function security_private.notify_important_submission();
create trigger important_form_check_submitted after insert on public.form_checks
  for each row execute function security_private.notify_important_submission();
create trigger important_swap_requested after insert on public.exercise_swap_requests
  for each row execute function security_private.notify_important_submission();
create trigger important_form_answered after update of answered_at on public.form_requests
  for each row execute function security_private.notify_important_submission();
create trigger important_receipt_submitted after insert or update of status,revision on public.payment_receipts
  for each row execute function security_private.notify_important_submission();

create function security_private.notify_coach_replied() returns trigger
language plpgsql security definer set search_path='' as $$
declare data jsonb;
begin
  if not ((old.reviewed_at is null and new.reviewed_at is not null)
    or (new.captain_reply is distinct from old.captain_reply and nullif(btrim(new.captain_reply),'') is not null)) then
    return new;
  end if;
  -- Legacy inbox reviews do not insert chat_messages; that trigger only covers actual chat sends.
  data := case when tg_table_name='check_ins' then jsonb_build_object('kind','checkin','checkin_id',new.id)
    else jsonb_build_object('kind','form_check','form_check_id',new.id) end;
  insert into public.notifications(user_id,type,payload)
    select recipient.id,'coach_replied',data || jsonb_build_object('player_id',new.player_id,
      'captain_name',(select full_name from public.profiles where id=new.captain_id))
    from public.profiles recipient where recipient.id=new.player_id
      and recipient.id is distinct from auth.uid() and recipient.suspended_at is null;
  return new;
exception when others then
  -- Notification delivery must never roll back a captain's review or reply.
  return new;
end $$;
revoke all on function security_private.notify_coach_replied() from public,anon,authenticated;
create trigger important_checkin_replied after update of reviewed_at,captain_reply on public.check_ins
  for each row execute function security_private.notify_coach_replied();
create trigger important_form_check_replied after update of reviewed_at,captain_reply on public.form_checks
  for each row execute function security_private.notify_coach_replied();

create function security_private.notify_swap_decided() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if not (old.status='pending' and new.status in ('approved','declined')) then return new; end if;
  if coalesce(nullif(pg_catalog.current_setting('kochivo.captain_generated_swaps',true),''),'[]')::jsonb ? new.id::text then
    return new;
  end if;
  insert into public.notifications(user_id,type,payload)
    select recipient.id,'swap_decided',jsonb_build_object('player_id',new.player_id,'request_id',new.id,
      'program_exercise_id',new.program_exercise_id,'status',new.status,
      'captain_name',(select full_name from public.profiles where id=new.captain_id))
    from public.profiles recipient where recipient.id=new.player_id
      and recipient.id is distinct from auth.uid() and recipient.suspended_at is null;
  return new;
exception when others then
  -- Notification delivery must never roll back a swap decision or its program edit.
  return new;
end $$;
revoke all on function security_private.notify_swap_decided() from public,anon,authenticated;
create trigger important_swap_decided after update of status on public.exercise_swap_requests
  for each row execute function security_private.notify_swap_decided();
commit;
