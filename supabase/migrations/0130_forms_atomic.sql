begin;

-- The existing answer guard locks the request and relationship before each row;
-- the completion trigger sees the whole statement before its timestamp is visible.
create function public.submit_custom_form_answers(p_request uuid, p_answers jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  perform public.require_active_caller();
  if not exists (select 1 from public.form_requests r where r.id = p_request
    and r.player_id = (select auth.uid()) and r.reviewed_at is null) then
    raise exception 'request is not answerable' using errcode = '42501';
  end if;
  if jsonb_typeof(p_answers) is distinct from 'array' or jsonb_array_length(p_answers) = 0 then
    raise exception 'answers must be a nonempty array' using errcode = '22023';
  end if;
  insert into public.form_answers(id,request_id,question_id,value,photo_paths)
  select (a->>'id')::uuid,p_request,(a->>'question_id')::uuid,
    coalesce(a->'value','null'::jsonb),
    coalesce(array(select jsonb_array_elements_text(a->'photo_paths')), '{}'::text[])
  from jsonb_array_elements(p_answers) a
  on conflict (request_id,question_id) do update
    set value = excluded.value, photo_paths = excluded.photo_paths;
end;
$$;
revoke all on function public.submit_custom_form_answers(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.submit_custom_form_answers(uuid,jsonb) to authenticated;

create function public.save_custom_form(p_form jsonb, p_questions jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare f public.forms; q public.form_questions; item jsonb; idx bigint; base bigint;
begin
  perform public.require_active_caller();
  f := jsonb_populate_record(null::public.forms,p_form);
  if f.captain_id is distinct from (select auth.uid()) then
    raise exception 'form is not owned by caller' using errcode = '42501';
  end if;
  if jsonb_typeof(p_questions) is distinct from 'array' or jsonb_array_length(p_questions) not between 1 and 100 then
    raise exception 'questions must be a nonempty array' using errcode = '22023';
  end if;
  insert into public.forms(id,captain_id,title,kind,schedule,remind_after_hours,creation_key)
  values (f.id,f.captain_id,f.title,f.kind,f.schedule,f.remind_after_hours,f.creation_key)
  on conflict(id) do update set title=excluded.title,kind=excluded.kind,schedule=excluded.schedule,
    remind_after_hours=excluded.remind_after_hours;
  -- The parent upsert serializes saves. Preserve IDs and vacate all positions first.
  select coalesce(max(position)::bigint,0)+jsonb_array_length(p_questions)+1 into base
    from public.form_questions where form_id=f.id;
  update public.form_questions set position=(position+base)::integer where form_id=f.id;
  for item,idx in select value,ordinality from jsonb_array_elements(p_questions) with ordinality loop
    q := jsonb_populate_record(null::public.form_questions,item);
    if q.form_id is distinct from f.id or exists (
      select 1 from public.form_questions where id=q.id and form_id<>f.id) then
      raise exception 'question belongs to another form' using errcode = '23514';
    end if;
    insert into public.form_questions(id,form_id,position,label_ar,label_en,type,options,required,maps_to,alert_on,show_chart)
    values(q.id,f.id,(idx-1)::integer,q.label_ar,q.label_en,q.type,coalesce(q.options,'[]'::jsonb),
      coalesce(q.required,false),q.maps_to,q.alert_on,coalesce(q.show_chart,true))
    on conflict(id) do update set position=excluded.position,label_ar=excluded.label_ar,label_en=excluded.label_en,
      type=excluded.type,options=excluded.options,required=excluded.required,maps_to=excluded.maps_to,
      alert_on=excluded.alert_on,show_chart=excluded.show_chart
    where public.form_questions.form_id=f.id;
    if not found then
      raise exception 'question belongs to another form' using errcode = '23514';
    end if;
  end loop;
  delete from public.form_questions where form_id=f.id
    and id not in (select (value->>'id')::uuid from jsonb_array_elements(p_questions));
end;
$$;
revoke all on function public.save_custom_form(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.save_custom_form(jsonb,jsonb) to authenticated;

-- FK key-share locks permit non-key edits. A share lock also blocks changes to
-- question meaning until the first answer commits and the update trigger can see it.
create function public.lock_custom_form_answer_question() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.form_questions where id=new.question_id for share;
  return new;
end;
$$;
revoke all on function public.lock_custom_form_answer_question() from public,anon,authenticated;
create trigger form_answers_question_lock before insert or update on public.form_answers
  for each row execute function public.lock_custom_form_answer_question();

create function public.lock_answered_question_meaning() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.form_answers where question_id=old.id) and (
    new.type is distinct from old.type or new.maps_to is distinct from old.maps_to
    or exists (select 1 from jsonb_array_elements(old.options) o where not exists (
      select 1 from jsonb_array_elements(new.options) n where n=o))) then
    raise exception 'answered_question_locked' using errcode = 'P3260';
  end if;
  return new;
end;
$$;
revoke all on function public.lock_answered_question_meaning() from public,anon,authenticated;
create trigger form_questions_meaning before update on public.form_questions
  for each row execute function public.lock_answered_question_meaning();

commit;
