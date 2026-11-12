-- T-201: keep existing charts, and make each explicit template-copy action unique.
begin;

alter table public.form_questions add column show_chart boolean not null default true;

-- NULL leaves all pre-existing captain data intact, including intentional copies.
alter table public.forms add column creation_key uuid;
create unique index forms_creation_key on public.forms(captain_id,creation_key)
  where creation_key is not null;

-- Audited 0001-0098: no SQL routine writes/copies form_questions. The app owns
-- both paths. Fail on catalog drift rather than silently omitting a new writer.
-- Read definitions using the same catalog mechanism as the guarded 0098 patches.
do $migration$
declare routine record; definition text;
begin
  for routine in select p.oid from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid=p.pronamespace
    where n.nspname in ('public','security_private','custom_forms_private') and p.prokind='f'
  loop
    definition := pg_catalog.pg_get_functiondef(routine.oid);
    if definition ~* '(insert\s+into|update|merge\s+into)\s+(public\.)?form_questions\M' then
      raise exception 'assessment writer source drift: %; add an exactly-once guarded show_chart patch',routine.oid::regprocedure;
    end if;
  end loop;
end $migration$;

commit;
