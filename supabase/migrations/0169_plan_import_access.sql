alter policy imported_source_captain on public.imported_plan_sources using (
  captain_id = (select auth.uid()) and not (select public.is_oauth_client())
  and (select (auth.jwt() ->> 'is_anonymous')::boolean) is not true
);

alter function public.admin_import_plan(uuid,uuid,text,text,jsonb) set schema security_private;
alter function public.admin_find_import_captain(text) set schema security_private;

do $guard$
declare
  target regprocedure;
  definition text;
begin
  foreach target in array array[
    'security_private.admin_import_plan(uuid,uuid,text,text,jsonb)'::regprocedure,
    'security_private.admin_find_import_captain(text)'::regprocedure
  ] loop
    definition := pg_get_functiondef(target);
    if strpos(definition, 'not public.is_admin()') = 0 then raise exception 'Import authorization source drift'; end if;
    execute replace(definition, 'not public.is_admin()',
      'not public.is_admin() or coalesce((auth.jwt() ->> ''is_anonymous'')::boolean, false)');
  end loop;
end;
$guard$;

-- SQL-standard bodies bind the private functions at definition time. Callers
-- retain EXECUTE through these entrypoints without USAGE on the private schema.
create function public.admin_import_plan(p_id uuid, p_captain uuid, p_kind text, p_title text, p_plan jsonb)
returns uuid language sql security invoker set search_path = ''
begin atomic
  return security_private.admin_import_plan(p_id, p_captain, p_kind, p_title, p_plan);
end;

create function public.admin_find_import_captain(p_email text)
returns table(id uuid, full_name text, email text)
language sql stable security invoker set search_path = ''
begin atomic
  select * from security_private.admin_find_import_captain(p_email);
end;

revoke all on function public.admin_import_plan(uuid,uuid,text,text,jsonb),
  public.admin_find_import_captain(text) from public, anon, authenticated;
grant execute on function public.admin_import_plan(uuid,uuid,text,text,jsonb),
  public.admin_find_import_captain(text) to authenticated;
notify pgrst, 'reload schema';
