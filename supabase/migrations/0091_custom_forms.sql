-- Custom forms are independent of legacy check-ins. IDs are supplied by the app.
create table public.forms (
  id uuid primary key,
  captain_id uuid not null references public.profiles(id),
  title text not null,
  kind text not null check (kind in ('checkin','onboarding','progress','injury','update','custom')),
  schedule jsonb check (schedule is null or (
    jsonb_typeof(schedule) = 'object' and schedule ?& array['every','hour']
    and jsonb_typeof(schedule->'every') = 'string' and schedule->>'every' in ('week','month')
    and jsonb_typeof(schedule->'hour') = 'number' and (schedule->>'hour')::numeric between 0 and 23
    and (schedule->>'hour')::numeric = trunc((schedule->>'hour')::numeric)
    and (not schedule ? 'weekday' or (jsonb_typeof(schedule->'weekday') = 'number'
      and (schedule->>'weekday')::numeric between 0 and 6
      and (schedule->>'weekday')::numeric = trunc((schedule->>'weekday')::numeric)))
    and (not schedule ? 'day' or (jsonb_typeof(schedule->'day') = 'number'
      and (schedule->>'day')::numeric between 1 and 31
      and (schedule->>'day')::numeric = trunc((schedule->>'day')::numeric)))
    and schedule - array['every','weekday','day','hour'] = '{}'::jsonb)),
  remind_after_hours smallint check (remind_after_hours > 0),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id,captain_id)
);
create trigger forms_touch before update on public.forms
  for each row execute function public.touch_updated_at();
create table public.form_questions (
  id uuid primary key,
  form_id uuid not null references public.forms(id) on delete cascade,
  position integer not null check (position >= 0),
  label_ar text not null,
  label_en text not null,
  type text not null check (type in ('number','scale','choice','multi','text','photos','yesno')),
  options jsonb not null default '[]',
  required boolean not null default false,
  maps_to text check (maps_to in ('weight','targetWeight','height','age','sex','experience',
    'trainingDays','sessionMinutes','injuries','medical','allergies','waist','note')),
  alert_on jsonb,
  unique (form_id,position)
);
create table public.form_requests (
  id uuid primary key,
  form_id uuid not null references public.forms(id) on delete restrict,
  player_id uuid not null references public.profiles(id),
  captain_id uuid not null references public.profiles(id),
  sent_at timestamptz not null default now(),
  due_at timestamptz,
  reminded_at timestamptz,
  answered_at timestamptz,
  reviewed_at timestamptz,
  captain_reply text,
  status text generated always as (case when reviewed_at is not null then 'reviewed'
    when answered_at is not null then 'answered' else 'pending' end) stored,
  foreign key (form_id,captain_id) references public.forms(id,captain_id),
  unique (form_id,player_id,sent_at)
);
create table public.form_answers (
  id uuid primary key,
  request_id uuid not null references public.form_requests(id),
  question_id uuid not null references public.form_questions(id),
  value jsonb not null default 'null',
  photo_paths text[] not null default '{}',
  unique (request_id,question_id)
);
create index forms_captain on public.forms(captain_id);
create index form_requests_queue on public.form_requests(captain_id,answered_at desc) where reviewed_at is null;
create index form_requests_pending on public.form_requests(player_id) where answered_at is null;
create index form_requests_player_form on public.form_requests(player_id,form_id);
create index form_answers_question on public.form_answers(question_id);

alter table public.forms enable row level security;
alter table public.form_questions enable row level security;
alter table public.form_requests enable row level security;
alter table public.form_answers enable row level security;
create policy active_caller on public.forms as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy active_caller on public.form_questions as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy active_caller on public.form_requests as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
create policy active_caller on public.form_answers as restrictive for all to authenticated
  using (not (select public.is_suspended())) with check (not (select public.is_suspended()));
grant select,insert,update,delete on public.forms,public.form_questions to authenticated;
grant select on public.form_requests to authenticated;
grant insert (id,form_id,player_id,captain_id,sent_at,due_at) on public.form_requests to authenticated;
grant update (due_at,reminded_at,reviewed_at,captain_reply) on public.form_requests to authenticated;
grant select,insert on public.form_answers to authenticated;
grant update (value,photo_paths) on public.form_answers to authenticated;

create policy forms_owner on public.forms for all to authenticated
  using (captain_id = (select auth.uid()))
  with check (captain_id = (select auth.uid()) and exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'captain'));
-- This bounded lookup breaks the forms -> requests INSERT -> forms RLS cycle.
create schema if not exists custom_forms_private;
grant usage on schema custom_forms_private to authenticated;
create function custom_forms_private.received_form(p_form uuid) returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.form_requests r
    where r.form_id = p_form and r.player_id = (select auth.uid()));
$$;
revoke all on function custom_forms_private.received_form(uuid) from public;
grant execute on function custom_forms_private.received_form(uuid) to authenticated;
create policy forms_player on public.forms for select to authenticated
  using (custom_forms_private.received_form(id));
create policy form_questions_owner on public.form_questions for all to authenticated
  using (exists (select 1 from public.forms f where f.id = form_id and f.captain_id = (select auth.uid())))
  with check (exists (select 1 from public.forms f where f.id = form_id and f.captain_id = (select auth.uid())));
create policy form_questions_player on public.form_questions for select to authenticated using (exists (
  select 1 from public.form_requests r where r.form_id = form_questions.form_id and r.player_id = (select auth.uid())));
create policy form_requests_read on public.form_requests for select to authenticated
  using ((select auth.uid()) in (captain_id,player_id));
create policy form_requests_send on public.form_requests for insert to authenticated with check (
  captain_id = (select auth.uid()) and exists (select 1 from public.forms f
    where f.id = form_id and f.captain_id = (select auth.uid()) and f.archived_at is null)
  and exists (select 1 from public.coach_clients c where c.captain_id = (select auth.uid())
    and c.player_id = form_requests.player_id and c.archived_at is null and not c.pending and c.frozen_at is null
    and c.access_until >= (now() at time zone 'Africa/Cairo')::date));
create policy form_requests_review on public.form_requests for update to authenticated
  using (captain_id = (select auth.uid())) with check (captain_id = (select auth.uid()));
create policy form_answers_read on public.form_answers for select to authenticated using (exists (
  select 1 from public.form_requests r where r.id = request_id and (select auth.uid()) in (r.player_id,r.captain_id)));
create policy form_answers_insert on public.form_answers for insert to authenticated with check (exists (
  select 1 from public.form_requests r where r.id = request_id and r.player_id = (select auth.uid()) and r.reviewed_at is null));
create policy form_answers_update on public.form_answers for update to authenticated
  using (exists (select 1 from public.form_requests r where r.id = request_id and r.player_id = (select auth.uid())))
  with check (exists (select 1 from public.form_requests r where r.id = request_id
    and r.player_id = (select auth.uid()) and r.reviewed_at is null));

-- Lock the parent before writing, so concurrent answers and captain review serialize.
-- Definer rights are confined to trigger execution; players cannot update request timestamps.
create function public.guard_custom_form_answer() returns trigger language plpgsql
  security definer set search_path = '' as $$
declare r public.form_requests;
begin
  select * into r from public.form_requests where id = new.request_id for update;
  if r.id is null or r.player_id is distinct from (select auth.uid()) or r.reviewed_at is not null then
    raise exception 'request is not answerable' using errcode = '42501';
  end if;
  if not exists (select 1 from public.form_questions q where q.id = new.question_id and q.form_id = r.form_id) then
    raise exception 'question belongs to another form' using errcode = '23514';
  end if;
  if exists (select 1 from unnest(new.photo_paths) p where p is null
    or p not like 'forms/' || r.player_id::text || '/' || r.id::text || '/%') then
    raise exception 'invalid form photo path' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_custom_form_answer() from public;
create trigger form_answers_guard before insert or update on public.form_answers
  for each row execute function public.guard_custom_form_answer();
create function public.complete_custom_form_request() returns trigger language plpgsql
  security definer set search_path = '' as $$
begin
  update public.form_requests r set answered_at = case when not exists (
    select 1 from public.form_questions q where q.form_id = r.form_id and q.required
      and not exists (select 1 from public.form_answers a where a.request_id = r.id and a.question_id = q.id
        and (a.value not in ('null'::jsonb,'""'::jsonb,'[]'::jsonb) or cardinality(a.photo_paths) > 0)))
    then coalesce(r.answered_at,now()) else null end
  where r.id = new.request_id and r.player_id = (select auth.uid()) and r.reviewed_at is null;
  return new;
end;
$$;
revoke all on function public.complete_custom_form_request() from public;
create trigger form_answers_complete after insert or update on public.form_answers
  for each row execute function public.complete_custom_form_request();

-- forms/<player>/<request>/<file> shares the private check-in photo bucket.
create policy custom_forms_photo_upload on storage.objects for insert to authenticated with check (
  bucket_id = 'checkin-photos' and split_part(name,'/',1) = 'forms'
  and split_part(name,'/',2) = (select auth.uid())::text and public.player_can_write()
  and exists (select 1 from public.form_requests r where r.id::text = split_part(name,'/',3)
    and r.player_id = (select auth.uid()) and r.reviewed_at is null));
create policy custom_forms_photo_read on storage.objects for select to authenticated using (
  bucket_id = 'checkin-photos' and split_part(name,'/',1) = 'forms'
  and (split_part(name,'/',2) = (select auth.uid())::text or exists (
    select 1 from public.form_answers a join public.form_requests r on r.id = a.request_id
    where name = any(a.photo_paths) and r.captain_id = (select auth.uid())
      and r.player_id::text = split_part(name,'/',2) and r.id::text = split_part(name,'/',3))));
