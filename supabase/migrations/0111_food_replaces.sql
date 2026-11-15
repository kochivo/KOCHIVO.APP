alter table public.foods
  add column replaces_id uuid references public.foods(id) on delete set null;

create unique index foods_live_replacement_key
  on public.foods (owner_id, replaces_id)
  where replaces_id is not null and archived_at is null;

create function public.check_food_replacement() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.replaces_id is not null and (
    new.owner_id is null or not exists (
      select 1 from public.foods where id = new.replaces_id and owner_id is null
    )
  ) then
    raise exception 'Food replacements must belong to a captain and reference a catalog food'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke execute on function public.check_food_replacement() from public, anon, authenticated;

create trigger foods_check_replacement
before insert or update of replaces_id, owner_id on public.foods
for each row execute function public.check_food_replacement();
