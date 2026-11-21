-- Join-request notifications landed with a blank player name whenever the new
-- player's profile had an empty full_name at request time. Fall back to a
-- generic label so the coach never sees " requested to join".
create or replace function security_private.notify_join_request() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications(id,user_id,type,payload)
    select new.id,new.captain_id,'join_requested',
      jsonb_build_object('name', coalesce(nullif(btrim(p.full_name), ''), 'لاعب جديد'))
    from public.profiles p where p.id=new.player_id;
  return new;
end;
$$;
revoke all on function security_private.notify_join_request() from public, anon, authenticated;
