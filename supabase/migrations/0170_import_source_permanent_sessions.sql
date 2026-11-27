alter policy imported_source_captain on public.imported_plan_sources using (
  captain_id = (select auth.uid()) and not (select public.is_oauth_client())
);

create policy import_source_permanent_session on public.imported_plan_sources
  as restrictive for all to authenticated
  using ((((select auth.jwt()) ->> 'is_anonymous')::boolean) is false)
  with check ((((select auth.jwt()) ->> 'is_anonymous')::boolean) is false);
