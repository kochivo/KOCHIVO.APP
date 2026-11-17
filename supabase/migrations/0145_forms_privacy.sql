begin;

alter table public.form_questions add column retired_at timestamptz;

-- T-290 keeps a former captain's read of answers given while the link was active;
-- only edits to the old review or reply close when the link ends.
alter policy form_requests_review on public.form_requests
  using (captain_id = (select auth.uid()) and exists (
    select 1 from public.coach_clients c where c.player_id = form_requests.player_id
      and c.captain_id = form_requests.captain_id and c.archived_at is null and not c.pending))
  with check (captain_id = (select auth.uid()) and exists (
    select 1 from public.coach_clients c where c.player_id = form_requests.player_id
      and c.captain_id = form_requests.captain_id and c.archived_at is null and not c.pending));

-- Patch the installed definitions so their locks, grants and newer behavior survive.
do $migration$
declare patch record; definition text;
begin
  for patch in select * from (values
    ('public.guard_custom_form_answer()',
      $old$if not found then
    raise exception 'request is not answerable'$old$,
      $new$if not found or not public.player_can_write() then
    raise exception 'request is not answerable'$new$),
    ('public.guard_custom_form_answer()',
      $old$q.id = new.question_id and q.form_id = r.form_id$old$,
      $new$q.id = new.question_id and q.form_id = r.form_id
      and (q.retired_at is null or exists (
        select 1 from jsonb_array_elements(r.question_snapshot) snapshot
        where snapshot->>'id' = q.id::text) or exists (
        select 1 from public.form_answers a where a.request_id = r.id and a.question_id = q.id))$new$),
    ('public.save_custom_form(jsonb,jsonb)',
      $old$delete from public.form_questions where form_id=f.id
    and id not in (select (value->>'id')::uuid from jsonb_array_elements(p_questions));$old$,
      -- Retiring even unanswered omissions avoids relying on answers hidden by RLS
      -- after a transfer. No historical question or answer is destroyed.
      -- Reset omitted positions after the active rows, otherwise the save's
      -- position-vacating step doubles retired positions on every autosave.
      $new$update public.form_questions retired_question set retired_at=coalesce(retired_question.retired_at,now()),
    position=(jsonb_array_length(p_questions)+omitted.ordinal-1)::integer
  from (select id,row_number() over (order by position,id) as ordinal from public.form_questions
    where form_id=f.id and id not in (
      select (value->>'id')::uuid from jsonb_array_elements(p_questions))) omitted
  where retired_question.id=omitted.id;$new$),
    -- A question restored to the editor with its old id must come back to life.
    ('public.save_custom_form(jsonb,jsonb)',
      $old$show_chart=excluded.show_chart$old$,
      $new$show_chart=excluded.show_chart,retired_at=null$new$),
    ('public.snapshot_custom_form_request()',
      $old$from public.form_questions q where q.form_id = new.form_id;$old$,
      $new$from public.form_questions q where q.form_id = new.form_id and q.retired_at is null;$new$)
  ) as patches(signature,old_sql,new_sql) loop
    definition := pg_catalog.pg_get_functiondef(patch.signature::regprocedure);
    if (length(definition)-length(replace(definition,patch.old_sql,'')))/length(patch.old_sql) <> 1 then
      raise exception 'Forms privacy source drift: %',patch.signature;
    end if;
    execute replace(definition,patch.old_sql,patch.new_sql);
  end loop;
end $migration$;

commit;
