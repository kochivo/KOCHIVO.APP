drop policy if exists custom_forms_photo_read on storage.objects;
create policy custom_forms_photo_read on storage.objects for select to authenticated using (
  bucket_id = 'checkin-photos' and split_part(name,'/',1) = 'forms'
  and (split_part(name,'/',2) = (select auth.uid())::text or exists (
    select 1 from public.form_answers a join public.form_requests r on r.id = a.request_id
    where name = any(a.photo_paths) and r.captain_id = (select auth.uid())
      and r.player_id::text = split_part(name,'/',2) and r.id::text = split_part(name,'/',3)
      and public.cycle_photo_allowed(r.player_id))));

drop policy if exists points_read on public.points_log;
create policy points_read on public.points_log for select to authenticated
  using (case when (select public.is_suspended()) then false
    else player_id = (select auth.uid()) or (
      captain_id = (select auth.uid())
      and earned_on >= (public.captain_since(player_id) at time zone public.safe_timezone(player_id))::date
    ) end);
