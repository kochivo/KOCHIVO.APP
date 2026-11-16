begin;

-- Nullable for legacy requests: do not invent historical questions by backfilling.
alter table public.form_requests add column question_snapshot jsonb
  check (question_snapshot is null or jsonb_typeof(question_snapshot) = 'array');

create or replace function public.snapshot_custom_form_request() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Serialize against save_custom_form's parent upsert.
  perform 1 from public.forms where id = new.form_id for share;
  select coalesce(jsonb_agg(to_jsonb(q) order by q.position), '[]'::jsonb)
    into new.question_snapshot from public.form_questions q where q.form_id = new.form_id;
  return new;
end;
$$;
revoke all on function public.snapshot_custom_form_request() from public,anon,authenticated;
create trigger form_requests_snapshot before insert on public.form_requests
  for each row execute function public.snapshot_custom_form_request();

create or replace function public.complete_custom_form_request() returns trigger language plpgsql
  security definer set search_path = '' as $$
begin
  update public.form_requests r set answered_at = case when not exists (
    select 1 from jsonb_array_elements(coalesce(r.question_snapshot, (
      select coalesce(jsonb_agg(to_jsonb(q)), '[]'::jsonb) from public.form_questions q
      where q.form_id = r.form_id and (r.answered_at is null or exists (
        select 1 from public.form_answers a where a.request_id = r.id and a.question_id = q.id))
    ))) q where (q->>'required')::boolean
      and exists (select 1 from public.form_questions live where live.id = (q->>'id')::uuid)
      and not exists (select 1 from public.form_answers a where a.request_id = r.id and a.question_id = (q->>'id')::uuid
        and (a.value not in ('null'::jsonb,'""'::jsonb,'[]'::jsonb) or cardinality(a.photo_paths) > 0)))
    then coalesce(r.answered_at,now()) else null end
  where r.id = new.request_id and r.player_id = (select auth.uid()) and r.reviewed_at is null;
  return new;
end;
$$;
revoke all on function public.complete_custom_form_request() from public,anon,authenticated;

commit;
